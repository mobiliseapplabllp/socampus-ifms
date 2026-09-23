package com.socampuseng.mbl.livetracker;

import android.Manifest;
import android.annotation.SuppressLint;
import android.app.AlarmManager;
import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.content.pm.ServiceInfo;
import android.graphics.Color;
import android.hardware.Sensor;
import android.hardware.SensorManager;
import android.hardware.TriggerEvent;
import android.hardware.TriggerEventListener;
import android.location.Location;
import android.os.Build;
import android.os.Handler;
import android.os.IBinder;
import android.os.Looper;
import android.os.BatteryManager;
import android.os.PowerManager;
import android.os.SystemClock;
import android.util.Log;

import androidx.annotation.Nullable;
import androidx.core.app.ActivityCompat;
import androidx.core.app.NotificationCompat;

import com.google.android.gms.location.ActivityRecognition;
import com.google.android.gms.location.ActivityTransition;
import com.google.android.gms.location.ActivityTransitionRequest;
import com.google.android.gms.location.CurrentLocationRequest;
import com.google.android.gms.location.DetectedActivity;
import com.google.android.gms.location.FusedLocationProviderClient;
import com.google.android.gms.location.LocationCallback;
import com.google.android.gms.location.LocationRequest;
import com.google.android.gms.location.LocationResult;
import com.google.android.gms.location.LocationServices;
import com.google.android.gms.location.Priority;
import com.socampuseng.mbl.MainActivity;

import org.json.JSONObject;

import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.text.SimpleDateFormat;
import java.util.ArrayList;
import java.util.Date;
import java.util.List;
import java.util.Locale;
import java.util.TimeZone;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

/**
 * Duty-time live tracking: har fix seedha server par POST, aur wahi fix notification
 * me bhi dikh jaata hai. Interval speed ke hisaab se badalta hai (IntervalController),
 * 15s se 5 min ke beech.
 *
 * Notification jaan-boojh kar detailed hai - backend ready hone tak yahi testing
 * ka zariya hai. Phone raat bhar chhod do, subah notification bata degi ki
 * kitne points aaye aur last fix kab tha.
 */
public class LiveTrackerService extends Service {

    private static final String TAG = "LiveTracker";
    private static final String CHANNEL_ID = "live_location_channel";
    private static final int NOTIF_ID = 4201;

    /** Overspeed alerts alag channel par - user inhe alag se mute kar sake */
    private static final String ALERT_CHANNEL_ID = "live_overspeed_channel";

    // GPS interval aur speed limit ab prefs se aate hain (debug screen se badalte hain),
    // taaki har test ke liye naya build na banana pade

    static final String WATCHDOG_ACTION = "com.socampuseng.mbl.livetracker.WATCHDOG";

    /** LiveActivityReceiver se - user ki activity badli */
    static final String ACTION_ACTIVITY = "com.socampuseng.mbl.livetracker.ACTIVITY_CHANGED";
    static final String EXTRA_ACTIVITY = "activity";
    static final String EXTRA_MOVING = "moving";
    /** Plugin se - config/permission badli, activity updates dobara lagao */
    static final String ACTION_REFRESH = "com.socampuseng.mbl.livetracker.REFRESH";
    private static final long WATCHDOG_INTERVAL_MS = 5 * 60 * 1000L;

    /** Alarm limit par bajta hai, dobara tabhi jab speed re-arm se neeche aake
     *  wapas limit paar kare - warna har fix par bajta rahega. */
    private static final float SPEED_REARM_GAP_KMH = 5f;
    private static final float KMH_PER_MS = 3.6f;

    /** GPS speed tabhi maani jaati hai jab fix itna pakka ho */
    private static final float SPEED_TRUST_ACCURACY_M = 50f;   // 25 par 120 km/h wali ride ki speed kat gayi thi
    /** Android 8+ GPS speed ki apni galti bhi batata hai - isse zyada ho to reading chhodo */
    private static final float SPEED_ACCURACY_MAX_MS = 5f;
    /** Isse purana fix = cached location (service restart par aati hai) - speed nahi */
    private static final long STALE_FIX_MS = 15_000L;
    /** 180 km/h - isse upar = location koodi hai, asli chalna nahi */
    private static final float MAX_PLAUSIBLE_SPEED_MS = 50f;
    /** Isse kam hilna GPS drift maana jaayega, distance me nahi judega */
    private static final float MIN_DISTANCE_STEP_M = 10f;
    /** 3 km/h se kam = khada. "1.4 km/h" dekh ke user sochta hai app galat hai */
    private static final float STILL_DISPLAY_MS = 3f / 3.6f;
    /** Anchor itna purana (sirf kharab fix aa rahe the) to naye fix ko nayi jagah maano */
    private static final long ANCHOR_MAX_AGE_MS = 10 * 60 * 1000L;
    /**
     * Server minute me ek hi ping rakhta hai, baaki "skipped". Isse jaldi bhejna bekaar -
     * ghane points (15-30s) phone ki SQLite / trip_points me rehte hain, server par live
     * location 1/min
     */
    private static final long PING_EVERY_MS = 60_000L;
    /**
     * Fix itna late ho (interval ke upar) to khud maango. 16:45:50 wale test me 5m interval
     * par agla fix 16:52 tak nahi aaya - Fused lambe interval par der kar deta hai
     * (andar GPS lock, Doze, battery saver). Wait mat karo, getCurrentLocation se jagao
     */
    private static final long LATE_GRACE_MS = 45_000L;

    /** true = pichla fix limit se upar tha, alarm baj chuka hai */
    private boolean overspeedArmed = false;

    private FusedLocationProviderClient fused;
    private LocationCallback callback;
    private PowerManager.WakeLock wakeLock;
    private LiveTrackerPrefs prefs;
    private SpeedAlarm speedAlarm;
    private LivePointsDb points;
    private IntervalController intervals;

    /**
     * Significant motion - phone ka hardware sensor. User uth ke chalne lage / bike chale
     * to kuch second me ek baar bajta hai. Sensor hub par chalta hai, battery na ke barabar.
     * Ek baar bajne ke baad band ho jaata hai - isliye har baar dobara lagate hain.
     */
    private SensorManager sensorManager;
    private Sensor motionSensor;
    private final TriggerEventListener motionListener = new TriggerEventListener() {
        @Override
        public void onTrigger(TriggerEvent event) {
            armMotionSensor();
            onWake("motion", true);
        }
    };

    /** Abhi GPS se kis interval par request lagi hai - badle tabhi dobara request */
    private long requestedIntervalMs = 0L;
    private boolean activityRegistered = false;
    /** Late fix ki jaanch - main thread par, har fix / request ke baad dobara lagti hai */
    private final Handler handler = new Handler(Looper.getMainLooper());
    private final Runnable lateCheck = this::checkLateFix;
    /** Is session me kitni baar khud fix maangna pada - notification ke liye */
    private int lateKicks = 0;

    /** Aakhri fix filter se pass hua ya nahi - sirf notification ke liye */
    private String lastFilter = "-";

    /** Upload aur notification build - dono main thread se hatakar. */
    private final ExecutorService uploadExecutor = Executors.newSingleThreadExecutor();

    private final SimpleDateFormat clock = new SimpleDateFormat("HH:mm:ss", Locale.US);

    @Override
    public void onCreate() {
        super.onCreate();
        prefs = new LiveTrackerPrefs(this);
        speedAlarm = new SpeedAlarm(this);
        points = LivePointsDb.getInstance(this);

        createChannel();
        startInForeground(buildNotification());

        PowerManager pm = (PowerManager) getSystemService(POWER_SERVICE);
        if (pm != null) {
            wakeLock = pm.newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "LiveTracker:WakeLock");
            if (!wakeLock.isHeld()) {
                wakeLock.acquire();
            }
        }

        sensorManager = (SensorManager) getSystemService(SENSOR_SERVICE);
        motionSensor = sensorManager != null
                ? sensorManager.getDefaultSensor(Sensor.TYPE_SIGNIFICANT_MOTION) : null;
        if (motionSensor == null) {
            Log.w(TAG, "no significant motion sensor - stop interval capped at 2m");
        }
        intervals = new IntervalController(prefs.getMinIntervalMs(), prefs.getMaxIntervalMs(),
                System.currentTimeMillis(), motionSensor != null);
        armMotionSensor();

        fused = LocationServices.getFusedLocationProviderClient(this);
        if (prefs.isAdaptive()) {
            prefs.setIntervalState(intervals.currentMs(), intervals.reason());
            startLocationUpdates(intervals.currentMs());
        } else {
            prefs.setIntervalState(prefs.getGpsIntervalMs(), "fixed");
            startLocationUpdates(prefs.getGpsIntervalMs());
        }
        ensureActivityUpdates();
        scheduleWatchdog();
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        // startForegroundService() ke baad Android 5s me startForeground() maangta hai -
        // service pehle se chal rahi ho tab bhi (watchdog / activity receiver). Har baar
        // bula dena surakshit hai, notification wahi rehti hai
        try {
            startInForeground(buildNotification());
        } catch (Exception e) {
            Log.w(TAG, "startForeground in onStartCommand failed: " + e.getMessage());
        }

        String action = intent != null ? intent.getAction() : null;
        if (ACTION_ACTIVITY.equals(action)) {
            onActivityChanged(
                    intent.getStringExtra(EXTRA_ACTIVITY),
                    intent.getBooleanExtra(EXTRA_MOVING, false));
        }

        // Watchdog / START_STICKY restart par intent null hota hai - koi dikkat nahi,
        // saara state prefs me hai
        ensureActivityUpdates();
        scheduleWatchdog();
        // Handler Doze me so sakta hai, watchdog alarm nahi - dono se jaanch
        checkLateFix();
        return START_STICKY;
    }

    // ------------------------------------------------------------- activity

    private void onActivityChanged(String label, boolean moving) {
        if (moving) {
            onWake(label == null || label.isEmpty() ? "activity" : label.toLowerCase(Locale.US), false);
        } else {
            updateNotification();
        }
    }

    /**
     * Motion sensor / Activity ne kaha "shayad chal pade". GPS ko turant 15s par jagao -
     * hilna sach hai ya nahi, wo agle fix batayenge (IntervalController.onWake)
     */
    private void onWake(String why, boolean motion) {
        if (prefs.isAdaptive() && intervals != null
                && intervals.onWake(why, motion, System.currentTimeMillis())) {
            Log.d(TAG, "woke by " + why);
            prefs.setIntervalState(intervals.currentMs(), intervals.reason());
            startLocationUpdates(intervals.currentMs());
        }
        updateNotification();
    }

    private void armMotionSensor() {
        if (sensorManager == null || motionSensor == null) {
            return;
        }
        try {
            sensorManager.requestTriggerSensor(motionListener, motionSensor);
        } catch (Exception e) {
            Log.w(TAG, "motion sensor arm failed: " + e.getMessage());
        }
    }

    static boolean hasActivityPermission(Context ctx) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.Q) {
            return true;    // 9 aur neeche - install par hi mil jaati hai
        }
        return ActivityCompat.checkSelfPermission(ctx, Manifest.permission.ACTIVITY_RECOGNITION)
                == PackageManager.PERMISSION_GRANTED;
    }

    /**
     * Activity ke sirf BADLAV par jagata hai (still/walking/running/cycling/riding) -
     * lagataar nahi. Sensor hub par chalta hai, battery na ke barabar.
     */
    @SuppressLint("MissingPermission")
    private void ensureActivityUpdates() {
        if (activityRegistered || !hasActivityPermission(this)) {
            return;
        }
        int[] types = {
                DetectedActivity.STILL,
                DetectedActivity.WALKING,
                DetectedActivity.RUNNING,
                DetectedActivity.ON_BICYCLE,
                DetectedActivity.IN_VEHICLE
        };
        List<ActivityTransition> transitions = new ArrayList<>();
        for (int t : types) {
            transitions.add(new ActivityTransition.Builder()
                    .setActivityType(t)
                    .setActivityTransition(ActivityTransition.ACTIVITY_TRANSITION_ENTER)
                    .build());
        }
        // "Still se bahar" - Google ka sabse pehla ishara ki user hilne laga, Riding/Walking
        // pakka hone se pehle hi aa jaata hai
        transitions.add(new ActivityTransition.Builder()
                .setActivityType(DetectedActivity.STILL)
                .setActivityTransition(ActivityTransition.ACTIVITY_TRANSITION_EXIT)
                .build());
        try {
            ActivityRecognition.getClient(this)
                    .requestActivityTransitionUpdates(
                            new ActivityTransitionRequest(transitions), activityIntent(this))
                    .addOnSuccessListener(v -> activityRegistered = true)
                    .addOnFailureListener(e -> Log.w(TAG, "activity updates failed: " + e.getMessage()));
        } catch (Exception e) {
            Log.w(TAG, "activity updates error: " + e.getMessage());
        }
    }

    @SuppressLint("MissingPermission")
    private void removeActivityUpdates() {
        if (!activityRegistered) {
            return;
        }
        try {
            ActivityRecognition.getClient(this).removeActivityTransitionUpdates(activityIntent(this));
        } catch (Exception ignored) {
            // permission hat gayi ho to bhi band karte waqt kuch nahi bigadta
        }
        activityRegistered = false;
    }

    /**
     * MUTABLE zaroori hai - Google isi intent me activity ki jaankari bhar ke bhejta hai.
     * IMMUTABLE rakha to receiver ko khaali intent milega.
     */
    static PendingIntent activityIntent(Context ctx) {
        Intent i = new Intent(ctx.getApplicationContext(), LiveActivityReceiver.class);
        i.setAction(LiveActivityReceiver.ACTION);
        int flags = PendingIntent.FLAG_UPDATE_CURRENT;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            flags |= PendingIntent.FLAG_MUTABLE;
        }
        return PendingIntent.getBroadcast(ctx.getApplicationContext(), 2, i, flags);
    }

    // ------------------------------------------------------------- location

    /**
     * GPS request lagao - interval badalne par bhi yahi, purani hata ke nayi.
     * Ek hi callback, ek hi stream - koi module apni alag request nahi banata.
     */
    private void startLocationUpdates(long interval) {
        if (ActivityCompat.checkSelfPermission(this, Manifest.permission.ACCESS_FINE_LOCATION)
                != PackageManager.PERMISSION_GRANTED) {
            Log.w(TAG, "Location permission gone - stopping");
            prefs.setEnabled(false);
            stopSelf();
            return;
        }
        if (interval == requestedIntervalMs && callback != null) {
            return;
        }
        Log.d(TAG, "requesting location every " + (interval / 1000) + "s");

        LocationRequest req = new LocationRequest.Builder(Priority.PRIORITY_HIGH_ACCURACY, interval)
                // Interval se jaldi nahi - koi aur app GPS tez chala rahi ho tab bhi hamari
                // min seema (15s) na tootey
                .setMinUpdateIntervalMillis(interval)
                // Koi distance filter nahi - user khada ho tab bhi point chahiye,
                // warna "app zinda hai" ka pata hi nahi chalega
                .setMinUpdateDistanceMeters(0)
                .setWaitForAccurateLocation(false)
                .build();

        if (callback == null) {
            callback = new LocationCallback() {
                @Override
                public void onLocationResult(LocationResult result) {
                    if (result == null) return;
                    Location loc = result.getLastLocation();
                    if (loc == null) return;
                    handleFix(loc);
                }
            };
        } else {
            fused.removeLocationUpdates(callback);
        }

        fused.requestLocationUpdates(req, callback, getMainLooper());
        requestedIntervalMs = interval;
        armLateCheck();
    }

    private void armLateCheck() {
        handler.removeCallbacks(lateCheck);
        handler.postDelayed(lateCheck, Math.max(requestedIntervalMs, 1000L) + LATE_GRACE_MS);
    }

    /** Interval + 45s ho gaye aur fix nahi aaya - Fused ke bharose mat baitho, khud maango */
    @SuppressLint("MissingPermission")
    private void checkLateFix() {
        if (fused == null || !prefs.isEnabled() || requestedIntervalMs <= 0) {
            return;
        }
        long lateMs = lateByMs();
        if (lateMs > LATE_GRACE_MS) {
            lateKicks++;
            Log.w(TAG, "fix late by " + (lateMs / 1000) + "s - asking for current location");
            try {
                // Cache wala nahi (wo purana hota hai, filter "stale" maan ke phenk deta) -
                // naya fix, 30s tak koshish
                CurrentLocationRequest req = new CurrentLocationRequest.Builder()
                        .setPriority(Priority.PRIORITY_HIGH_ACCURACY)
                        .setMaxUpdateAgeMillis(0)
                        .setDurationMillis(30_000L)
                        .build();
                fused.getCurrentLocation(req, null)
                        .addOnSuccessListener(loc -> {
                            // Stream wala fix bhi saath me aa gaya ho to handleFix use
                            // "stale" maan ke chhod deta hai - double point nahi banega
                            if (loc != null) handleFix(loc);
                        })
                        .addOnFailureListener(e -> Log.w(TAG, "current location failed: " + e.getMessage()));
            } catch (Exception e) {
                Log.w(TAG, "current location error: " + e.getMessage());
            }
            updateNotification();
        }
        armLateCheck();
    }

    /** Agla fix kitna late hai (0 = time par) */
    private long lateByMs() {
        long lastFix = prefs.getLastFixAt();
        if (lastFix <= 0 || requestedIntervalMs <= 0) {
            return 0L;
        }
        return Math.max(0L, System.currentTimeMillis() - lastFix - requestedIntervalMs);
    }

    private void handleFix(Location loc) {
        armLateCheck();
        final double lat = loc.getLatitude();
        final double lng = loc.getLongitude();
        final float gpsSpeed = loc.hasSpeed() ? loc.getSpeed() : 0f;
        final float accuracy = loc.hasAccuracy() ? loc.getAccuracy() : 0f;
        final long now = System.currentTimeMillis();

        // ---- 1. Speed = us pal ki GPS (Doppler) speed, sirf pakki reading par.
        // Position se nahi nikalte - andar location tower <-> GPS me koodti hai.
        final boolean speedTrusted = isSpeedTrusted(loc, accuracy);
        float speedMs = speedTrusted ? gpsSpeed : 0f;
        if (speedTrusted && speedMs < STILL_DISPLAY_MS) {
            speedMs = 0f;
        }
        final float kmh = speedMs * KMH_PER_MS;

        // ---- 2. Location filter - asli chalna ya location ka koodna?
        // Doori/time ka hisaab FIX ke asli waqt se - callback ke waqt se nahi. GPS request
        // dobara lagte hi Android ek purani cached location turant de deta hai; callback
        // time se naapne par wo "180 km/h ka jump" ban jaati thi.
        final long fixTime = loc.getTime();
        final boolean accepted;
        final String filterReason;
        float addedM = 0f;
        // Pichhli jagah se sach me hila? Interval isi par tay hota hai
        boolean movedEvidence = false;
        // Hila to doori / time - GPS ki apni speed na mile to yahi speed chalti hai
        float derivedKmh = -1f;
        boolean stale = false;

        float good = prefs.getAccGoodM();
        float reject = prefs.getAccRejectM();
        boolean hasAnchor = prefs.hasAnchor();
        float anchorDist = 0f;
        if (hasAnchor) {
            float[] d = new float[1];
            Location.distanceBetween(prefs.getAnchorLat(), prefs.getAnchorLng(), lat, lng, d);
            anchorDist = d[0];
        }
        long dt = hasAnchor ? fixTime - prefs.getAnchorAt() : 0L;

        if (hasAnchor && dt <= 0) {
            // Anchor se purana (cached) fix - na jagah badlo, na interval ka faisla lo
            accepted = false;
            stale = true;
            filterReason = "stale fix";
        } else if (accuracy <= 0f || accuracy > reject) {
            accepted = false;
            filterReason = "accuracy > " + (int) reject + "m";
        } else if (!hasAnchor) {
            accepted = true;
            filterReason = "ok (first)";
            prefs.setAnchor(lat, lng, accuracy, fixTime);
        } else if (accuracy > good && dt > ANCHOR_MAX_AGE_MS) {
            // Der tak sirf kharab fix aaye - shayad andar hi andar sach me hil gaya.
            // Nayi jagah maano, par koodne ka shak hai isliye distance mat jodo
            accepted = true;
            filterReason = "anchor reset";
            movedEvidence = true;
            prefs.setAnchor(lat, lng, accuracy, fixTime);
        } else if (accuracy > good && anchorDist <= 2f * accuracy) {
            // Anchor naye fix ke (2x) daayre me hai - hilna sabit nahi hua, khada hai
            accepted = false;
            filterReason = "stayed at anchor";
        } else {
            accepted = true;
            // Dono ki galti jod ke dekho - usse kam = GPS ka shor, chalna nahi
            float anchorAcc = prefs.getAnchorAcc();
            boolean drift = anchorDist <= Math.max(anchorAcc + accuracy, MIN_DISTANCE_STEP_M);
            boolean jump = anchorDist / (dt / 1000f) > MAX_PLAUSIBLE_SPEED_MS;
            if (jump) {
                // 180 km/h se tez = location koodi. Nayi jagah le lo, par na distance,
                // na "hila" - warna ek bounce interval ko tez kar deta
                filterReason = "jump, not counted";
                prefs.setAnchor(lat, lng, accuracy, fixTime);
            } else if (drift) {
                // Jagah wahi - anchor mat khisakao, bas "abhi bhi yahin" ki pushti.
                // Dheere chalne ki doori isse jama hoti rehti hai aur kuch fix baad judti hai
                filterReason = "ok";
                prefs.touchAnchor(fixTime, accuracy);
            } else {
                filterReason = "ok";
                movedEvidence = true;
                derivedKmh = anchorDist / (dt / 1000f) * KMH_PER_MS;
                addedM = anchorDist;
                prefs.addDistance(anchorDist);
                prefs.setAnchor(lat, lng, accuracy, fixTime);
            }
        }
        lastFilter = accepted ? filterReason : "rejected: " + filterReason;
        final float distAdded = addedM;

        // ---- 3. Agla interval - pichhli jagah se mila ke
        if (prefs.isAdaptive() && intervals != null && !stale) {
            // Hila = location ne saboot diya, ya pakki GPS speed khud 3 km/h+ bata rahi hai.
            // Speed: pakki GPS wali, na mile to doori/time se nikali
            boolean moved = movedEvidence || (speedTrusted && kmh >= 3f);
            // Dono me jo bada - 14:18 wale test me GPS 0.0 bol raha tha jabki 2 min me
            // 460m hil chuke the. Doori jhooth nahi bolti
            float kmhForInterval = Math.max(speedTrusted ? kmh : -1f, derivedKmh);
            // Accuracy hi kharab ho to fix se kuch pata nahi - na chalna, na rukna
            boolean informative = accuracy > 0f && accuracy <= reject;
            if (intervals.onFix(moved, kmhForInterval, movedEvidence ? anchorDist : 0f,
                    informative, lat, lng, accuracy, fixTime)) {
                startLocationUpdates(intervals.currentMs());
            }
            prefs.setIntervalState(intervals.currentMs(), intervals.reason());
        }
        final int intervalSec = (int) (prefs.getCurrentIntervalMs() / 1000L);

        // ---- 4. Jo speed dikhegi / server jaayegi / overspeed dekhega.
        // Pehli pasand GPS ki apni (Doppler) reading. Wo na mile par agar algorithm ne
        // pakka kar liya ho ki chal rahe hain, to doori/time wali speed chalegi - 120 km/h
        // wali ride me Doppler kat jaane se ek bhi overspeed nahi pakdi gayi thi.
        // Khade phone ka bounce isme nahi aata, wahan chalna pakka hota hi nahi
        boolean movingSure = intervals != null && prefs.isAdaptive()
                ? intervals.movingConfirmed()
                : movedEvidence;
        boolean estimated = !speedTrusted && derivedKmh >= 0f && movingSure
                && accuracy > 0f && accuracy <= good;
        final float finalKmh = estimated ? derivedKmh : kmh;
        final boolean haveSpeed = speedTrusted || estimated;

        prefs.recordFix(lat, lng, finalKmh / KMH_PER_MS, gpsSpeed, accuracy, now,
                speedTrusted, estimated);

        // ---- 5. Overspeed
        final boolean alarmed = haveSpeed && checkOverspeed(finalKmh);

        updateNotification();

        // Ongoing notification laal hoti hai par wo ek hi jagah update hoti rehti hai -
        // ye alag alert har overspeed reading ka apna record chhod jaata hai
        if (haveSpeed && finalKmh >= prefs.getSpeedLimitKmh()) {
            postOverspeedAlert(finalKmh, lat, lng, now, alarmed);
        }

        // Trip ki pehchaan fix ke waqt hi pakad lo - upload me 15s lag sakte hain,
        // us beech trip end ho gayi to point galat trip me na chala jaye
        final String tripModule = prefs.hasActiveTrip() ? prefs.getTripModule() : null;
        final String tripId = prefs.hasActiveTrip() ? prefs.getTripId() : null;

        // Battery ek hi baar - point ke saath save bhi hoti hai aur ping me bhi jaati hai
        final int batteryPct = batteryPercent();

        uploadExecutor.execute(() -> {
            // Wahi fix, doosri manzil - koi nayi GPS request nahi. Har fix save hota hai,
            // kharab wala bhi - accepted/reason ke saath. Chhantna padhte waqt hota hai.
            if (tripModule != null) {
                points.insertTrip(tripModule, tripId, lat, lng, finalKmh, accuracy, now,
                        accepted, filterReason, distAdded, intervalSec, batteryPct);
            }
            long rowId = points.insert(lat, lng, finalKmh, accuracy, now, alarmed,
                    accepted, filterReason, distAdded, intervalSec, batteryPct);
            String result;
            long sinceMs = fixTime - prefs.getLastPingAt();
            if (prefs.getLastPingAt() > 0 && sinceMs >= 0 && sinceMs < PING_EVERY_MS) {
                // Minute poora nahi hua - server skip hi karega, call bachao
                result = "held " + (sinceMs / 1000L) + "s";
            } else {
                result = upload(lat, lng, finalKmh, accuracy, fixTime, batteryPct);
                // Store hua to agla minute yahan se. Skip / fail par agla fix phir koshish karega
                if (result.startsWith("2") && !result.endsWith("skipped")) {
                    prefs.setLastPingAt(fixTime);
                }
                prefs.setLastUpload(result);
            }
            points.setUploadResult(rowId, result);
            updateNotification();
        });
    }

    /**
     * GPS speed tabhi maano jab reading pakki ho. Pehle test me 60s par ±37m wale fix
     * ne paidal par 19 km/h aur bike par 0 diya tha - wo sab yahin chhant jaati hain.
     * Chhati hui reading ki speed 0 maani jaati hai aur overspeed me gini nahi jaati.
     */
    private boolean isSpeedTrusted(Location loc, float accuracy) {
        if (!loc.hasSpeed()) {
            return false;       // tower / Wi-Fi location me speed hoti hi nahi
        }
        long ageMs = (SystemClock.elapsedRealtimeNanos() - loc.getElapsedRealtimeNanos()) / 1_000_000L;
        if (ageMs > STALE_FIX_MS) {
            return false;       // service restart par aane wali purani cached location
        }
        if (accuracy <= 0f || accuracy > SPEED_TRUST_ACCURACY_M) {
            return false;
        }
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O
                && loc.hasSpeedAccuracy()
                && loc.getSpeedAccuracyMetersPerSecond() > SPEED_ACCURACY_MAX_MS) {
            return false;
        }
        return loc.getSpeed() <= MAX_PLAUSIBLE_SPEED_MS;
    }

    /**
     * Hooter ek baar - trip ke andar ek, trip khatam hone par agli ke liye phir se ek.
     * Bina trip wali riding me tracking session me ek. Baar-baar bajta hooter bike par
     * khud khatra hai, aur record ke liye overspeed notification aur table to har
     * reading par bante hi hain.
     *
     * Hysteresis: 50 par bajao, 45 se neeche aane par hi dobara armed hota hai.
     */
    private boolean checkOverspeed(float kmh) {
        float limit = prefs.getSpeedLimitKmh();

        if (!overspeedArmed && kmh >= limit) {
            overspeedArmed = true;
            if (prefs.isAlarmPlayed()) {
                Log.d(TAG, "overspeed " + kmh + " km/h - hooter is session me baj chuka");
                return false;
            }
            Log.d(TAG, "overspeed " + kmh + " km/h - hooter");
            speedAlarm.trigger();
            prefs.setAlarmPlayed(true);
            return true;
        }
        if (overspeedArmed && kmh < limit - SPEED_REARM_GAP_KMH) {
            overspeedArmed = false;
        }
        return false;
    }

    private boolean isOverspeed() {
        return prefs.getLastSpeed() * KMH_PER_MS >= prefs.getSpeedLimitKmh();
    }

    // --------------------------------------------------------------- upload

    /**
     * Fire and forget - fail hua to point khatam, koi retry/queue nahi.
     * Return value sirf notification me dikhane ke liye hai taaki testing me
     * pata chale ki server kya jawab de raha hai.
     */
    /**
     * Live location ping - {lat, lng, speed (km/h), recorded_at (IST), accuracy (m)}.
     * Server jawab deta hai {status, stored, skipped} - wahi notification me dikhta hai.
     */
    private String upload(double lat, double lng, float kmh, float accuracy, long fixTime,
                          int battery) {
        String url = prefs.getUrl();
        if (url == null || url.isEmpty()) {
            return "no url";
        }

        HttpURLConnection conn = null;
        try {
            JSONObject body = new JSONObject();
            body.put("lat", lat);
            body.put("lng", lng);
            body.put("speed", Math.round(kmh * 10f) / 10d);
            body.put("recorded_at", recordedAt(fixTime));
            body.put("accuracy", Math.round(accuracy * 10f) / 10d);
            if (battery >= 0) {
                body.put("battery", battery);
            }
            // Us fix ke waqt engineer kya kar raha tha - Activity Recognition se
            // (Still / Walking / Running / Cycling / Riding). Punch ke waqt ye bhejne
            // ka matlab nahi tha, wahan engineer khada hi hota hai
            String activity = prefs.getActivity();
            body.put("activity", activity == null || activity.isEmpty() ? "Unknown" : activity);

            conn = (HttpURLConnection) new URL(url).openConnection();
            conn.setRequestMethod("POST");
            conn.setConnectTimeout(15_000);
            conn.setReadTimeout(15_000);
            conn.setDoOutput(true);
            conn.setRequestProperty("Content-Type", "application/json");
            conn.setRequestProperty("Accept", "application/json");

            String token = prefs.getToken();
            if (token != null && !token.isEmpty()) {
                conn.setRequestProperty("Authorization", "Bearer " + token);
            }
            // Angular wala Referer1 sirf proxy ke liye hai - native seedha jaata hai, to Referer
            String referer = prefs.getReferer();
            if (referer != null && !referer.isEmpty()) {
                conn.setRequestProperty("Referer", referer);
            }

            byte[] payload = body.toString().getBytes(StandardCharsets.UTF_8);
            try (OutputStream os = conn.getOutputStream()) {
                os.write(payload);
            }

            int code = conn.getResponseCode();
            Log.d(TAG, "ping " + code + " " + lat + "," + lng);
            if (code < 200 || code >= 300) {
                // Server wajah bhi bhejta hai - {"msg": "GPS Mobile is not enabled..."}
                return code + serverMessage(conn.getErrorStream());
            }
            try {
                JSONObject res = new JSONObject(readBody(conn.getInputStream()));
                if (res.optBoolean("skipped", false)) return code + " skipped";
                if (res.optBoolean("stored", false)) return code + " stored";
            } catch (Exception ignored) {
                // Jawab JSON nahi - 2xx hai to pahunch gaya maano
            }
            return code + " OK";
        } catch (Exception e) {
            Log.w(TAG, "upload failed: " + e.getMessage());
            return shortError(e);
        } finally {
            if (conn != null) conn.disconnect();
        }
    }

    /**
     * Notification ki patli line me poora exception naam nahi samata, aur testing me
     * farak sirf itna chahiye: network tha ya nahi, server tak pahuncha ya nahi.
     */
    /** Phone ki battery (0-100), na mile to -1 */
    private int batteryPercent() {
        try {
            BatteryManager bm = (BatteryManager) getSystemService(BATTERY_SERVICE);
            if (bm != null) {
                int pct = bm.getIntProperty(BatteryManager.BATTERY_PROPERTY_CAPACITY);
                if (pct >= 0 && pct <= 100) {
                    return pct;
                }
            }
        } catch (Exception e) {
            Log.w(TAG, "battery read failed: " + e.getMessage());
        }
        return -1;
    }

    /** Server ka format - India ka time, bina timezone ke: 2026-09-19 12:30:00 */
    private static String recordedAt(long ms) {
        SimpleDateFormat f = new SimpleDateFormat("yyyy-MM-dd HH:mm:ss", Locale.US);
        f.setTimeZone(TimeZone.getTimeZone("Asia/Kolkata"));
        return f.format(new Date(ms));
    }

    /** Error jawab se msg / error nikaalo - notification me dikhane ke liye */
    private static String serverMessage(@Nullable InputStream in) {
        if (in == null) {
            return "";
        }
        try {
            JSONObject res = new JSONObject(readBody(in));
            String msg = res.optString("msg", res.optString("error", ""));
            return msg.isEmpty() ? "" : " " + msg;
        } catch (Exception e) {
            return "";
        }
    }

    private static String readBody(InputStream in) throws java.io.IOException {
        try (InputStream is = in; ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            byte[] buf = new byte[1024];
            int n;
            while ((n = is.read(buf)) != -1 && out.size() < 16_384) {
                out.write(buf, 0, n);
            }
            return out.toString("UTF-8");
        }
    }

    private String shortError(Exception e) {
        String name = e.getClass().getSimpleName();
        switch (name) {
            case "UnknownHostException":
                return "no network";
            case "SocketTimeoutException":
                return "timeout";
            case "ConnectException":
            case "NoRouteToHostException":
                return "no connect";
            case "SSLException":
            case "SSLHandshakeException":
                return "ssl error";
            default:
                return name.replace("Exception", "");
        }
    }

    // --------------------------------------------------------- notification

    /**
     * Har overspeed reading par ek naya, alag notification - ID unique hai isliye
     * ye replace nahi hote, shade me jama hote rehte hain. Testing me pura record
     * dikh jaata hai ki kab-kab limit paar hui.
     *
     * Ye chup hai: awaaz aur vibration SpeedAlarm ka kaam hai, aur wo sirf threshold
     * cross hone par bajta hai. Har minute beep karna bike par khud ek khatra hai.
     */
    private void postOverspeedAlert(float kmh, double lat, double lng, long time, boolean alarmed) {
        NotificationManager m = (NotificationManager) getSystemService(NOTIFICATION_SERVICE);
        if (m == null) return;

        PendingIntent contentIntent = PendingIntent.getActivity(
                this, 0,
                new Intent(this, MainActivity.class),
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);

        String body = String.format(Locale.US, "%s · %.6f, %.6f",
                clock.format(new Date(time)), lat, lng);

        Notification n = new NotificationCompat.Builder(this, ALERT_CHANNEL_ID)
                .setSubText(alarmed ? "Speed limit crossed" : "Still over limit")
                .setContentTitle(String.format(Locale.US, "⚠ Overspeed · %.0f km/h", kmh))
                .setContentText(body)
                .setStyle(new NotificationCompat.BigTextStyle().bigText(
                        body + "\nLimit: " + (int) prefs.getSpeedLimitKmh() + " km/h"))
                .setSmallIcon(android.R.drawable.ic_dialog_alert)
                .setColor(Color.RED)
                .setContentIntent(contentIntent)
                .setAutoCancel(true)
                .setOnlyAlertOnce(true)
                .setWhen(time)
                .setShowWhen(true)
                .setPriority(NotificationCompat.PRIORITY_DEFAULT)
                .build();

        // Second-level timestamp = har alert ka apna ID, koi doosre ko replace nahi karta
        m.notify((int) (time / 1000L), n);
    }

    private void createChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel c = new NotificationChannel(
                    CHANNEL_ID,
                    "Live Location",
                    NotificationManager.IMPORTANCE_LOW // silent - har minute buzz nahi karegi
            );
            c.setShowBadge(false);

            NotificationChannel alert = new NotificationChannel(
                    ALERT_CHANNEL_ID,
                    "Overspeed Alerts",
                    NotificationManager.IMPORTANCE_DEFAULT
            );
            alert.setDescription("One alert each time speed goes over the limit");
            // Chup - awaaz SpeedAlarm deta hai, warna har minute double beep hoga
            alert.setSound(null, null);
            alert.enableVibration(false);
            alert.setShowBadge(true);

            NotificationManager m = getSystemService(NotificationManager.class);
            if (m != null) {
                m.createNotificationChannel(c);
                m.createNotificationChannel(alert);
            }
        }
    }

    private void startInForeground(Notification n) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            startForeground(NOTIF_ID, n, ServiceInfo.FOREGROUND_SERVICE_TYPE_LOCATION);
        } else {
            startForeground(NOTIF_ID, n);
        }
    }

    /** Pichli baar notification laal thi ya nahi - -1 = abhi tak koi post nahi hui */
    private int lastNotifiedOverspeed = -1;

    private void updateNotification() {
        boolean overspeed = prefs.getLastFixAt() > 0 && isOverspeed();
        Notification n = buildNotification();

        // Colorized background sirf foreground service ki notification par lagta hai.
        // Plain notify() se update karne par Samsung rang badalta nahi - isliye jab
        // overspeed state badle tab startForeground() se dobara post karte hain.
        if (lastNotifiedOverspeed != (overspeed ? 1 : 0)) {
            lastNotifiedOverspeed = overspeed ? 1 : 0;
            try {
                startInForeground(n);
                return;
            } catch (Exception e) {
                Log.w(TAG, "re-post as FGS failed: " + e.getMessage());
            }
        }

        NotificationManager m = (NotificationManager) getSystemService(NOTIFICATION_SERVICE);
        if (m != null) {
            m.notify(NOTIF_ID, n);
        }
    }

    private Notification buildNotification() {
        int points = prefs.getPoints();
        long lastFix = prefs.getLastFixAt();
        long startedAt = prefs.getStartedAt();

        // Collapsed view me hi sab kuch - bike par expand karke dekhna practical nahi.
        // Line 1 = coordinates, Line 2 = speed / time / count / server status
        boolean overspeed = lastFix > 0 && isOverspeed();
        float kmh = prefs.getLastSpeed() * KMH_PER_MS;
        // Chhati hui reading par 0 dikhana jhooth hoga - "khada hai" lagega
        String speedText;
        if (prefs.isLastSpeedTrusted()) {
            speedText = String.format(Locale.US, "%.1f km/h", kmh);
        } else if (prefs.isLastSpeedEstimated()) {
            // Doori se nikli - "~" batata hai ki GPS ki apni reading nahi thi
            speedText = String.format(Locale.US, "~%.1f km/h", kmh);
        } else {
            speedText = "— km/h";
        }

        String title;
        String summary;
        if (lastFix > 0) {
            title = overspeed
                    ? String.format(Locale.US, "⚠ OVERSPEED · %.0f km/h", kmh)
                    : String.format(Locale.US, "%.6f, %.6f",
                            prefs.getLastLat(), prefs.getLastLng());
            summary = String.format(Locale.US, "%s · %s · %d pts · %s · Next %s",
                    speedText,
                    clock.format(new Date(lastFix)),
                    points,
                    prefs.getLastUpload(),
                    IntervalController.human(Math.max(prefs.getCurrentIntervalMs(), 1000L)));
        } else {
            title = "Waiting for first fix...";
            summary = startedAt > 0 ? "Started " + clock.format(new Date(startedAt)) : "Starting...";
        }

        // Upar wo 5 fields jo ride ke doran actually dekhe jaate hain,
        // neeche khali line ke baad baaki diagnostics
        StringBuilder details = new StringBuilder();
        if (lastFix > 0) {
            details.append("Lat:       ").append(String.format(Locale.US, "%.6f", prefs.getLastLat())).append('\n');
            details.append("Lng:       ").append(String.format(Locale.US, "%.6f", prefs.getLastLng())).append('\n');
            details.append("Speed:     ").append(speedText);
            details.append(overspeed ? "  ⚠\n" : "\n");
            details.append("Time:      ").append(clock.format(new Date(lastFix))).append('\n');
            details.append("Server:    ").append(prefs.getLastUpload()).append('\n');
            details.append('\n');
            // GPS ki apni speed alag se - taaki test me dikhe ki wo kitni bharosemand hai
            details.append("GPS speed: ").append(String.format(Locale.US, "%.1f km/h",
                    prefs.getLastGpsSpeed() * KMH_PER_MS)).append('\n');
            details.append("Accuracy:  ").append(String.format(Locale.US, "±%.0f m", prefs.getLastAccuracy())).append('\n');
            details.append("Max speed: ").append(String.format(Locale.US, "%.0f km/h", prefs.getMaxSpeedKmh()))
                    .append("  (limit ").append((int) prefs.getSpeedLimitKmh()).append(")\n");
            details.append("Filter:    ").append(lastFilter).append('\n');
        } else {
            details.append("Waiting for first fix...\n");
            details.append("Server:    ").append(prefs.getLastUpload()).append('\n');
            details.append('\n');
        }
        if (prefs.hasActiveTrip()) {
            details.append("Trip:      ").append(prefs.getTripModule())
                    .append(" #").append(prefs.getTripId());
            long tripStart = prefs.getTripStartedAt();
            if (tripStart > 0) {
                details.append(" · ").append(humanDuration(System.currentTimeMillis() - tripStart));
            }
            details.append('\n');
        }
        details.append("Next:      ").append(IntervalController.human(Math.max(prefs.getCurrentIntervalMs(), 1000L)))
                .append(prefs.isAdaptive() ? "" : " (fixed)").append('\n');
        long lateMs = lateByMs();
        if (lateMs > 0 || lateKicks > 0) {
            details.append("Late:      ").append(lateMs > 0 ? IntervalController.human(lateMs) : "-")
                    .append(" · asked ").append(lateKicks).append("x\n");
        }
        // Fix late hone ki sabse aam wajah - test me dikhe
        PowerManager pmDiag = (PowerManager) getSystemService(POWER_SERVICE);
        if (pmDiag != null) {
            boolean saver = pmDiag.isPowerSaveMode();
            boolean doze = Build.VERSION.SDK_INT >= Build.VERSION_CODES.M && pmDiag.isDeviceIdleMode();
            if (saver || doze) {
                details.append("Power:     ").append(saver ? "Battery saver ON" : "")
                        .append(saver && doze ? " · " : "").append(doze ? "Doze" : "").append('\n');
            }
        }
        String act = prefs.getActivity();
        String actText;
        if (act.isEmpty()) {
            actText = hasActivityPermission(this) ? "—" : "— (no permission)";
        } else {
            // Google sirf badlav par batata hai - purana jawab ho to umar dikhe, bhram na ho
            long ageMin = (System.currentTimeMillis() - prefs.getActivityAt()) / 60000L;
            actText = ageMin >= 1 ? act + " (" + ageMin + "m ago)" : act;
        }
        details.append("Activity:  ").append(actText).append('\n');
        if (prefs.isAdaptive()) {
            details.append("Reason:    ").append(prefs.getIntervalReason()).append('\n');
            if (intervals != null) {
                long stillMs = intervals.stillForMs(System.currentTimeMillis());
                details.append("Still for: ").append(stillMs < 60_000L ? "-" : IntervalController.human(stillMs))
                        .append('\n');
            }
        }
        details.append('\n');
        details.append("Distance:  ").append(humanDistance(prefs.getDistance())).append('\n');
        details.append("Points:    ").append(points).append('\n');
        if (startedAt > 0) {
            details.append("Started:   ").append(clock.format(new Date(startedAt))).append('\n');
            details.append("Duration:  ").append(humanDuration(System.currentTimeMillis() - startedAt));
        }

        PendingIntent contentIntent = PendingIntent.getActivity(
                this, 0,
                new Intent(this, MainActivity.class),
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);

        NotificationCompat.Builder builder = new NotificationCompat.Builder(this, CHANNEL_ID)
                // Header me label - concierge wali "Location Tracker" notification se
                // alag pehchaan ke liye, kyunki dono ek saath dikh sakti hain
                .setSubText(prefs.hasActiveTrip()
                        ? "Live Tracking · Trip #" + prefs.getTripId()
                        : "Live Tracking")
                .setContentTitle(title)
                .setContentText(summary)
                .setStyle(new NotificationCompat.BigTextStyle().bigText(details.toString()))
                .setSmallIcon(android.R.drawable.ic_menu_mylocation)
                .setContentIntent(contentIntent)
                .setOngoing(true)
                .setOnlyAlertOnce(true)
                .setShowWhen(true)
                .setPriority(NotificationCompat.PRIORITY_LOW);

        if (overspeed) {
            // setColorized poora background rangta hai - ye sirf foreground service
            // notifications par kaam karta hai, aur humari wahi hai
            builder.setColorized(true).setColor(Color.RED);
        }

        return builder.build();
    }

    private String humanDistance(float metres) {
        if (metres < 1000f) {
            return String.format(Locale.US, "%.0f m", metres);
        }
        return String.format(Locale.US, "%.2f km", metres / 1000f);
    }

    private String humanDuration(long ms) {
        if (ms < 0) ms = 0;
        long totalMin = ms / 60000L;
        long h = totalMin / 60;
        long m = totalMin % 60;
        return h > 0 ? (h + "h " + m + "m") : (m + "m");
    }

    // -------------------------------------------------------------- watchdog

    /**
     * 5 minute ka self-chaining alarm. WatchdogReceiver khud agla alarm lagata hai,
     * isliye service mar bhi jaye to chain tooti nahi.
     */
    void scheduleWatchdog() {
        AlarmManager am = (AlarmManager) getSystemService(Context.ALARM_SERVICE);
        if (am == null) return;

        PendingIntent pi = watchdogIntent(this);
        long triggerAt = SystemClock.elapsedRealtime() + WATCHDOG_INTERVAL_MS;

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            if (am.canScheduleExactAlarms()) {
                am.setExactAndAllowWhileIdle(AlarmManager.ELAPSED_REALTIME_WAKEUP, triggerAt, pi);
            } else {
                am.setAndAllowWhileIdle(AlarmManager.ELAPSED_REALTIME_WAKEUP, triggerAt, pi);
            }
        } else if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            am.setExactAndAllowWhileIdle(AlarmManager.ELAPSED_REALTIME_WAKEUP, triggerAt, pi);
        } else {
            am.set(AlarmManager.ELAPSED_REALTIME_WAKEUP, triggerAt, pi);
        }
    }

    static PendingIntent watchdogIntent(Context ctx) {
        Intent watchdog = new Intent(ctx.getApplicationContext(), LiveWatchdogReceiver.class);
        watchdog.setAction(WATCHDOG_ACTION);
        return PendingIntent.getBroadcast(
                ctx.getApplicationContext(), 0, watchdog,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
    }

    @Override
    public void onTaskRemoved(Intent rootIntent) {
        // Recents se swipe - 1 second baad restart, agar user ne stop nahi kiya tha
        if (prefs.isEnabled()) {
            AlarmManager am = (AlarmManager) getSystemService(Context.ALARM_SERVICE);
            if (am != null) {
                Intent watchdog = new Intent(getApplicationContext(), LiveWatchdogReceiver.class);
                watchdog.setAction(WATCHDOG_ACTION);
                PendingIntent pi = PendingIntent.getBroadcast(
                        getApplicationContext(), 1, watchdog,
                        PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
                am.set(AlarmManager.ELAPSED_REALTIME_WAKEUP,
                        SystemClock.elapsedRealtime() + 1000, pi);
            }
        }
        super.onTaskRemoved(rootIntent);
    }

    @Override
    public void onDestroy() {
        super.onDestroy();
        handler.removeCallbacks(lateCheck);
        if (fused != null && callback != null) {
            fused.removeLocationUpdates(callback);
        }
        removeActivityUpdates();
        if (sensorManager != null && motionSensor != null) {
            sensorManager.cancelTriggerSensor(motionListener, motionSensor);
        }
        if (wakeLock != null && wakeLock.isHeld()) {
            wakeLock.release();
        }
        uploadExecutor.shutdown();
        if (speedAlarm != null) speedAlarm.release();

        // Watchdog sirf tab cancel karo jab user ne khud stop dabaya ho.
        // OEM ne maara hai to chain chalti rehni chahiye.
        if (!prefs.isEnabled()) {
            AlarmManager am = (AlarmManager) getSystemService(Context.ALARM_SERVICE);
            if (am != null) am.cancel(watchdogIntent(this));
            NotificationManager m = (NotificationManager) getSystemService(NOTIFICATION_SERVICE);
            if (m != null) m.cancel(NOTIF_ID);
        }
    }

    @Nullable
    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }
}
