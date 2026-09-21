package com.socampuseng.mbl.livetracker;

import java.util.Locale;

/**
 * Agla GPS fix kitni der baad - field engineer ke asli din ke hisaab se.
 * Usool: 1-2 point zyada chalenge, kam nahi.
 *
 * CHAL RAHA HAI -> har ~200m par ek point (speed ke hisaab se), 15s..30s. Traffic
 *                  (15-20 km/h) me bhi 30s se zyada nahi - galiyon ke mod na chhootein.
 *                  Ghatna turant, badhna tabhi jab lagataar 2 fix dono kahein - brake
 *                  wali ek dheemi reading interval nahi badhati. Ek fix me max +15s.
 * RUKA HAI      -> aakhri baar kab (pakka) hila, uske hisaab se:
 *                    < 3 min   : jo chal raha tha wahi   (red light, traffic jam)
 *                    3 - 6 min : 60s                     (petrol pump, chai)
 *                    6 - 10 min: 2 min                   (site par pahuncha)
 *                    10 min+   : 5 min                   (site par kaam - sabse kam load)
 * HILNA PAKKA   -> ek "hila" kaafi nahi - andar GPS koodta hai, red light par 10m
 *                  khisakta hai. Hilna tab maano jab:
 *                    - 8 km/h+ ki chaal ho, ya 100m+ door gaya ho (dheema shor nahi), aur
 *                    - lagataar 2 fix hile, aur doosra ruki jagah se pehle se ZYADA door ho.
 *                      Kood me location jaake wapas aati hai, asli chalne me door hoti jaati hai.
 *                  Pehla "hila" = turant 15s, agla fix faisla karega. Jhootha nikla to wapas
 *                  purana interval, ghadi zero nahi hoti. Sensor bhi sirf 15s karwata hai -
 *                  pakka GPS ke 2 fix hi karte hain.
 * JAGANA        -> phone hila (motion sensor) ya Activity ne "chalne laga" kaha:
 *                  90s tak 15s par jaanch. GPS ne hilna pakda to "resumed" - cycle 15s se
 *                  dobara. Nahi pakda to wapas purana dheema interval. Motion ki 2 jaanch
 *                  lagataar bekaar = 3 min motion sensor ansuna (Activity tab bhi jagaye).
 *
 * Jo bhi faisla ho, aakhir me min..max (default 15s..5min) me clamp hota hai.
 */
final class IntervalController {

    /** Chalte hue har ~200m par ek point - traffic ki galiyan/mod bhi path me aayein */
    private static final float TARGET_SPACING_M = 200f;
    /** Isse dheema = paidal / GPS ka shor - interval ke liye "hila" nahi */
    private static final float WALK_KMH = 8f;
    /** Itna door chala gaya to speed kam dikhe tab bhi hila (lambe gap me speed ghat jaati hai) */
    private static final float FAR_M = 100f;
    /** Hila par speed pata nahi */
    private static final long MOVED_UNKNOWN_MS = 30_000L;
    /** Chalte hue isse lamba kabhi nahi - 15 km/h traffic par bhi ~125m par ek point */
    private static final long MOVING_MAX_MS = 30_000L;
    /** Chalte hue interval ek fix me isse zyada nahi badhta */
    private static final long MOVING_GROW_STEP_MS = 15_000L;

    /** Itni der ruke tak kuch mat badlo - red light / jam */
    private static final long HOLD_STILL_MS = 3 * 60_000L;
    private static final long STOP_SHORT_MS = 6 * 60_000L;     // 3-6 min  -> 60s
    private static final long STOP_MEDIUM_MS = 10 * 60_000L;   // 6-10 min -> 2 min, uske baad max
    /**
     * Motion sensor na ho to phone ke hilne ka pata sirf GPS se chalega - tab rukne par
     * bhi 2 min se zyada mat so, warna bike 5 min me 5 km nikal jaayegi
     */
    private static final long NO_SENSOR_STOP_MAX_MS = 2 * 60_000L;

    /** Sensor/Activity ke jagaane par itni der 15s par dekho - dobara bajne se nahi badhta */
    private static final long PROBE_MS = 90_000L;
    /** Itni motion jaanch lagataar bekaar gayi to thoda aaram */
    private static final int FREE_MOTION_PROBES = 2;
    private static final long MOTION_COOLDOWN_MS = 3 * 60_000L;

    private final long minMs;
    private final long maxMs;
    private final long stopMaxMs;

    private long currentMs;
    private String reason = "start";
    /** Aakhri baar kab PAKKA hila - session shuru ko bhi "abhi hila" maante hain */
    private long lastMovedAt;
    /** Pichhla fix pakka chalte hue tha - agla "hila" seedha maan lo */
    private boolean movingConfirmed = false;
    /** Pichhle chalte fix ne kaunsa interval maanga tha - badhne ke liye dono ki haami */
    private long prevTargetMs;

    /** Pichhla fix "hila" tha par abhi pakka nahi - agla fix batayega */
    private boolean pendingMove = false;
    /** Pehle "hila" fix ki ruki jagah se doori */
    private float pendingDistM;
    /** Aakhri ruki jagah (achhi accuracy wala, na hila fix) */
    private boolean hasBase = false;
    private double baseLat;
    private double baseLng;
    /** Isse kharab fix ko ruki jagah mat banao */
    private static final float BASE_MAX_ACC_M = 50f;

    /** Jaanch chal rahi hai */
    private boolean probing = false;
    /** true = GPS ki ek-fix jaanch, false = sensor/Activity ki 90s jaanch */
    private boolean gpsProbe = false;
    private long probeUntil = 0L;
    private String probeWhy = "";
    private boolean probeByMotion = false;
    /** Jaanch se pehle ka interval - jhootha nikla to yahin wapas */
    private long probeSavedMs;

    /** Motion ki kitni jaanch lagataar bekaar gayi */
    private int failedMotionProbes = 0;
    /** Iske pehle motion sensor ko ansuna karo */
    private long motionMuteUntil = 0L;

    IntervalController(long minMs, long maxMs, long startAt, boolean hasMotionSensor) {
        this.minMs = minMs;
        this.maxMs = Math.max(maxMs, minMs);
        this.stopMaxMs = hasMotionSensor ? this.maxMs : Math.min(this.maxMs, NO_SENSOR_STOP_MAX_MS);
        this.currentMs = this.minMs;
        this.prevTargetMs = this.minMs;
        this.lastMovedAt = startAt;
    }

    long currentMs() {
        return currentMs;
    }

    String reason() {
        return reason;
    }

    /** Algorithm ne pakka maan liya hai ki abhi chal rahe hain (2 fix mile hain) */
    boolean movingConfirmed() {
        return movingConfirmed;
    }

    /** Kitni der se ruka hai (notification ke liye) */
    long stillForMs(long now) {
        return Math.max(0L, now - lastMovedAt);
    }

    /**
     * Phone hila / Activity badli. Faisla GPS karega - yahan sirf aankh kholte hain.
     * Return true = interval badla, GPS request dobara karni hogi.
     */
    boolean onWake(String why, boolean motion, long now) {
        if (probing && !gpsProbe) {
            return false;   // jaanch chal rahi hai - lambi mat karo
        }
        if (movingConfirmed || now - lastMovedAt < HOLD_STILL_MS) {
            return false;   // chal hi rahe hain / abhi ruke - interval pehle se tez hai
        }
        if (motion && now < motionMuteUntil) {
            return false;   // ek jagah phone chal raha hai - thoda aaram
        }
        startProbe(why, false, motion, now + PROBE_MS);
        return set(minMs, "woke: " + why + ", checking");
    }

    /**
     * Har naye fix ke baad. Return true = interval badla, GPS request dobara karni hogi.
     *
     * @param moved       location filter ne kaha pichhli jagah se hila (ya pakki speed 3+)
     * @param kmh         speed (pakki GPS ya doori/time se, jo bada); -1 = pata nahi
     * @param movedM      hila to kitne metre (anchor se), warna 0
     * @param informative false = accuracy itni kharab ki fix se kuch pata hi nahi chalta
     * @param lat         fix ki jagah
     * @param lng         fix ki jagah
     * @param accuracy    fix ki accuracy (m)
     * @param now         fix ka waqt
     */
    boolean onFix(boolean moved, float kmh, float movedM, boolean informative,
                  double lat, double lng, float accuracy, long now) {
        boolean real = moved && (kmh >= WALK_KMH || kmh < 0 || movedM >= FAR_M);

        if (real && !movingConfirmed) {
            if (!pendingMove) {
                // Pehla "hila" - andar ka kood ya asli chalna? Turant 15s, agla fix batayega
                pendingMove = true;
                pendingDistM = hasBase ? distanceM(baseLat, baseLng, lat, lng) : movedM;
                if (!probing) {
                    startProbe("gps", true, false, now);
                }
                long before = currentMs;
                set(minMs, speedText("moved?", kmh) + ", checking");
                return currentMs != before;
            }
            // Doosra "hila" - ruki jagah se aur door gaya? Nahi to location kood ke wapas aayi
            if (hasBase && distanceM(baseLat, baseLng, lat, lng) <= pendingDistM) {
                real = false;
            }
        }

        if (real) {
            pendingMove = false;
            long wasStillFor = now - lastMovedAt;
            boolean wasProbing = probing;
            clearProbe();
            failedMotionProbes = 0;
            motionMuteUntil = 0L;
            lastMovedAt = now;
            boolean wasConfirmed = movingConfirmed;
            movingConfirmed = true;

            if (!wasConfirmed && (wasProbing || wasStillFor >= HOLD_STILL_MS)) {
                // Ruk ke chala - poora cycle 15s se dobara. Speed lambe gap se nikli ho to
                // bharosa nahi (1 min chala + 4 min khada = 6 km/h), asli agle fix se
                prevTargetMs = minMs;
                return set(minMs, "resumed after " + human(wasStillFor));
            }
            long want = movingInterval(kmh);
            long next;
            if (want <= currentMs) {
                next = want;                                    // ghatna turant
            } else {
                // Badhna tabhi jab pichhla fix bhi yahi kahe, aur ek baar me max +15s
                next = Math.max(currentMs,
                        Math.min(Math.min(want, prevTargetMs), currentMs + MOVING_GROW_STEP_MS));
            }
            prevTargetMs = want;
            return set(next, speedText("moving", kmh));
        }

        // ---- hila nahi (ya itna dheema ki shor hai, ya kood ke wapas aaya)
        if (informative) {
            movingConfirmed = false;
            pendingMove = false;
            prevTargetMs = minMs;
            if (accuracy > 0f && accuracy <= BASE_MAX_ACC_M) {
                hasBase = true;
                baseLat = lat;
                baseLng = lng;
            }
        }

        long before = currentMs;
        if (probing) {
            if (gpsProbe && !informative) {
                return false;   // kharab fix se jaanch ka faisla nahi - agla dekho
            }
            if (!gpsProbe && now < probeUntil) {
                reason = "woke: " + probeWhy + ", checking";
                return false;
            }
            // Jaanch bekaar - hila nahi. Purane interval par wapas, ghadi wahi ki wahi
            if (probeByMotion && ++failedMotionProbes >= FREE_MOTION_PROBES) {
                failedMotionProbes = 0;
                motionMuteUntil = now + MOTION_COOLDOWN_MS;
            }
            currentMs = probeSavedMs;
            clearProbe();
        }

        long stillFor = now - lastMovedAt;
        if (stillFor < HOLD_STILL_MS) {
            // Red light / jam - jo chal raha tha wahi, hari batti par kuch na chhoote
            reason = "stopped " + human(stillFor) + ", kept";
            return currentMs != before;
        }
        long target;
        if (stillFor < STOP_SHORT_MS) {
            target = 60_000L;
        } else if (stillFor < STOP_MEDIUM_MS) {
            target = 120_000L;
        } else {
            target = maxMs;
        }
        target = Math.min(target, stopMaxMs);
        // Rukne par sirf badhao - pehle se lamba ho to chhota mat karo
        set(Math.max(currentMs, target), "stopped " + human(stillFor));
        return currentMs != before;
    }

    private void startProbe(String why, boolean gps, boolean motion, long until) {
        if (!probing) {
            probeSavedMs = currentMs;
        }
        probing = true;
        gpsProbe = gps;
        probeWhy = why;
        probeByMotion = motion;
        probeUntil = until;
    }

    private void clearProbe() {
        probing = false;
        gpsProbe = false;
        probeByMotion = false;
        probeUntil = 0L;
    }

    private long movingInterval(float kmh) {
        if (kmh < 0) {
            return MOVED_UNKNOWN_MS;
        }
        long ms = (long) (TARGET_SPACING_M / (Math.max(kmh, WALK_KMH) / 3.6f) * 1000f);
        return Math.min(ms, MOVING_MAX_MS);
    }

    /** Do jagah ke beech metre (haversine) - Android ke bina, taaki test me bhi chale */
    static float distanceM(double lat1, double lng1, double lat2, double lng2) {
        double r = 6_371_000d;
        double dLat = Math.toRadians(lat2 - lat1);
        double dLng = Math.toRadians(lng2 - lng1);
        double h = Math.sin(dLat / 2) * Math.sin(dLat / 2)
                + Math.cos(Math.toRadians(lat1)) * Math.cos(Math.toRadians(lat2))
                * Math.sin(dLng / 2) * Math.sin(dLng / 2);
        return (float) (r * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h)));
    }

    private static String speedText(String prefix, float kmh) {
        return kmh >= 0 ? String.format(Locale.US, "%s %.0f km/h", prefix, kmh) : prefix;
    }

    private boolean set(long ms, String why) {
        long clamped = Math.max(minMs, Math.min(maxMs, ms));
        boolean changed = clamped != currentMs;
        currentMs = clamped;
        reason = why;
        return changed;
    }

    static String human(long ms) {
        long s = ms / 1000L;
        if (s < 60) return s + "s";
        if (s % 60 == 0) return (s / 60) + "m";
        return (s / 60) + "m " + (s % 60) + "s";
    }
}
