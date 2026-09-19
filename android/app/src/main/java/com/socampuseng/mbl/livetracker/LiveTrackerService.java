package com.socampuseng.mbl.livetracker;

import android.Manifest;
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
import android.location.Location;
import android.os.Build;
import android.os.IBinder;
import android.os.PowerManager;
import android.os.SystemClock;
import android.util.Log;

import androidx.annotation.Nullable;
import androidx.core.app.ActivityCompat;
import androidx.core.app.NotificationCompat;

import com.google.android.gms.location.FusedLocationProviderClient;
import com.google.android.gms.location.LocationCallback;
import com.google.android.gms.location.LocationRequest;
import com.google.android.gms.location.LocationResult;
import com.google.android.gms.location.LocationServices;
import com.google.android.gms.location.Priority;
import com.socampuseng.mbl.MainActivity;

import org.json.JSONObject;

import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.Locale;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

/**
 * Duty-time live tracking: har 1 minute par ek fix, seedha server par POST,
 * aur wahi fix notification me bhi dikh jaata hai.
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
    private static final long WATCHDOG_INTERVAL_MS = 5 * 60 * 1000L;

    /** Alarm limit par bajta hai, dobara tabhi jab speed re-arm se neeche aake
     *  wapas limit paar kare - warna har fix par bajta rahega. */
    private static final float SPEED_REARM_GAP_KMH = 5f;
    private static final float KMH_PER_MS = 3.6f;

    /** GPS speed tabhi maani jaati hai jab fix itna pakka ho */
    private static final float SPEED_TRUST_ACCURACY_M = 20f;
    /** Android 8+ GPS speed ki apni galti bhi batata hai - isse zyada ho to reading chhodo */
    private static final float SPEED_ACCURACY_MAX_MS = 3f;
    /** Isse purana fix = cached location (service restart par aati hai) - speed nahi */
    private static final long STALE_FIX_MS = 15_000L;
    /** 180 km/h - isse upar = location koodi hai, asli chalna nahi */
    private static final float MAX_PLAUSIBLE_SPEED_MS = 50f;
    /** Isse kam hilna GPS drift maana jaayega, distance me nahi judega */
    private static final float MIN_DISTANCE_STEP_M = 10f;

    /** true = pichla fix limit se upar tha, alarm baj chuka hai */
    private boolean overspeedArmed = false;

    private FusedLocationProviderClient fused;
    private LocationCallback callback;
    private PowerManager.WakeLock wakeLock;
    private LiveTrackerPrefs prefs;
    private SpeedAlarm speedAlarm;
    private LivePointsDb points;

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

        fused = LocationServices.getFusedLocationProviderClient(this);
        startLocationUpdates();
        scheduleWatchdog();
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        // Watchdog / START_STICKY restart par intent null hota hai - koi dikkat nahi,
        // saara state prefs me hai
        scheduleWatchdog();
        return START_STICKY;
    }

    // ------------------------------------------------------------- location

    private void startLocationUpdates() {
        if (ActivityCompat.checkSelfPermission(this, Manifest.permission.ACCESS_FINE_LOCATION)
                != PackageManager.PERMISSION_GRANTED) {
            Log.w(TAG, "Location permission gone - stopping");
            prefs.setEnabled(false);
            stopSelf();
            return;
        }

        long interval = prefs.getGpsIntervalMs();
        Log.d(TAG, "requesting location every " + (interval / 1000) + "s");

        LocationRequest req = new LocationRequest.Builder(Priority.PRIORITY_HIGH_ACCURACY, interval)
                .setMinUpdateIntervalMillis(Math.max(5_000L, interval / 2))
                // Koi distance filter nahi - user khada ho tab bhi har minute point
                // chahiye, warna "app zinda hai" ka pata hi nahi chalega
                .setMinUpdateDistanceMeters(0)
                .setWaitForAccurateLocation(false)
                .build();

        callback = new LocationCallback() {
            @Override
            public void onLocationResult(LocationResult result) {
                if (result == null) return;
                Location loc = result.getLastLocation();
                if (loc == null) return;
                handleFix(loc);
            }
        };

        fused.requestLocationUpdates(req, callback, getMainLooper());
    }

    private void handleFix(Location loc) {
        final double lat = loc.getLatitude();
        final double lng = loc.getLongitude();
        final float gpsSpeed = loc.hasSpeed() ? loc.getSpeed() : 0f;
        final float accuracy = loc.hasAccuracy() ? loc.getAccuracy() : 0f;
        final long now = System.currentTimeMillis();
        final float prevAccuracy = prefs.getLastAccuracy();

        // Pichle fix se doori - sirf distance ke liye. Speed ab isse NAHI nikalti.
        float movedM = 0f;
        long dtMs = 0L;
        double prevLat = prefs.getLastLat();
        double prevLng = prefs.getLastLng();
        long prevTime = prefs.getLastFixAt();
        if (prevTime > 0 && (prevLat != 0 || prevLng != 0)) {
            float[] d = new float[1];
            Location.distanceBetween(prevLat, prevLng, lat, lng, d);
            movedM = d[0];
            dtMs = now - prevTime;
        }

        // Speed = us pal ki GPS (Doppler) speed. Position se nahi nikalte - andar phone
        // ki location tower <-> GPS me koodti hai, aur us "koodne" ko chalna maan kar
        // khade phone par bhi overspeed aa jaati thi.
        final boolean speedTrusted = isSpeedTrusted(loc, accuracy);
        final float speed = speedTrusted ? gpsSpeed : 0f;

        // Distance: dono fix ki galti jod ke dekho. Pichla fix ±400m (tower) aur naya ±10m
        // ho to 300m ka farak asli chalna nahi, location ka koodna hai.
        boolean drift = movedM <= Math.max(prevAccuracy + accuracy, MIN_DISTANCE_STEP_M);
        boolean jump = dtMs > 0 && movedM / (dtMs / 1000f) > MAX_PLAUSIBLE_SPEED_MS;
        if (!drift && !jump) {
            prefs.addDistance(movedM);
        }

        prefs.recordFix(lat, lng, speed, gpsSpeed, accuracy, now, speedTrusted);
        // Bharosemand speed na ho to overspeed ka faisla hi mat lo - alarm ki haalat
        // (armed / re-arm) bhi waisi hi rehti hai
        final boolean alarmed = speedTrusted && checkOverspeed(speed);
        updateNotification();

        // Ongoing notification laal hoti hai par wo ek hi jagah update hoti rehti hai -
        // ye alag alert har overspeed reading ka apna record chhod jaata hai
        if (speedTrusted && speed * KMH_PER_MS >= prefs.getSpeedLimitKmh()) {
            postOverspeedAlert(speed * KMH_PER_MS, lat, lng, now, alarmed);
        }

        // Trip ki pehchaan fix ke waqt hi pakad lo - upload me 15s lag sakte hain,
        // us beech trip end ho gayi to point galat trip me na chala jaye
        final String tripModule = prefs.hasActiveTrip() ? prefs.getTripModule() : null;
        final String tripId = prefs.hasActiveTrip() ? prefs.getTripId() : null;

        uploadExecutor.execute(() -> {
            // Wahi fix, doosri manzil - koi nayi GPS request nahi
            if (tripModule != null) {
                points.insertTrip(tripModule, tripId, lat, lng, speed * KMH_PER_MS, accuracy, now);
            }
            long rowId = points.insert(lat, lng, speed * KMH_PER_MS, accuracy, now, alarmed);
            String result = upload(lat, lng, speed);
            prefs.setLastUpload(result);
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
     * Hysteresis: 50 par bajao, 45 se neeche aane par hi dobara armed hota hai.
     * Bina iske 49.8/50.2 ke beech jhoolti speed har fix par alarm baja degi.
     */
    private boolean checkOverspeed(float speedMs) {
        float kmh = speedMs * KMH_PER_MS;
        float limit = prefs.getSpeedLimitKmh();

        if (!overspeedArmed && kmh >= limit) {
            overspeedArmed = true;
            Log.d(TAG, "overspeed " + kmh + " km/h - alarm");
            speedAlarm.trigger();
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
    private String upload(double lat, double lng, float speed) {
        String url = prefs.getUrl();
        if (url == null || url.isEmpty()) {
            return "no url";
        }

        HttpURLConnection conn = null;
        try {
            JSONObject body = new JSONObject();
            body.put("lat", lat);
            body.put("lng", lng);
            body.put("speed", speed);

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

            byte[] payload = body.toString().getBytes(StandardCharsets.UTF_8);
            try (OutputStream os = conn.getOutputStream()) {
                os.write(payload);
            }

            int code = conn.getResponseCode();
            Log.d(TAG, "upload " + code + " " + lat + "," + lng);
            return code + (code >= 200 && code < 300 ? " OK" : "");
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
        String speedText = prefs.isLastSpeedTrusted()
                ? String.format(Locale.US, "%.1f km/h", kmh)
                : "— km/h";

        String title;
        String summary;
        if (lastFix > 0) {
            title = overspeed
                    ? String.format(Locale.US, "⚠ OVERSPEED · %.0f km/h", kmh)
                    : String.format(Locale.US, "%.6f, %.6f",
                            prefs.getLastLat(), prefs.getLastLng());
            summary = String.format(Locale.US, "%s · %s · %d pts · %s",
                    speedText,
                    clock.format(new Date(lastFix)),
                    points,
                    prefs.getLastUpload());
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
        if (fused != null && callback != null) {
            fused.removeLocationUpdates(callback);
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
