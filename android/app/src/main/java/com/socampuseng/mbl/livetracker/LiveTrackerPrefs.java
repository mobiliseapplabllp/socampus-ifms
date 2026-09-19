package com.socampuseng.mbl.livetracker;

import android.content.Context;
import android.content.SharedPreferences;

/**
 * Service, plugin aur receivers ke beech ka single source of truth.
 * Watchdog restart par service ko URL/token yahin se milte hain - JS involve nahi hota,
 * isliye app kill hone ke baad bhi upload chalta rehta hai.
 */
class LiveTrackerPrefs {

    private static final String FILE = "live_tracker_prefs";

    private static final String KEY_ENABLED = "enabled";
    private static final String KEY_URL = "url";
    private static final String KEY_TOKEN = "token";
    private static final String KEY_POINTS = "points";
    private static final String KEY_STARTED_AT = "started_at";
    private static final String KEY_LAST_FIX_AT = "last_fix_at";
    private static final String KEY_LAST_LAT = "last_lat";
    private static final String KEY_LAST_LNG = "last_lng";
    private static final String KEY_LAST_SPEED = "last_speed";
    private static final String KEY_LAST_ACCURACY = "last_accuracy";
    private static final String KEY_LAST_UPLOAD = "last_upload";
    private static final String KEY_LAST_GPS_SPEED = "last_gps_speed";
    private static final String KEY_DISTANCE = "distance_m";
    private static final String KEY_LAST_SPEED_TRUSTED = "last_speed_trusted";

    // Debug screen se badalne wale config - default wahi hain jo pehle hardcoded the
    private static final String KEY_GPS_INTERVAL = "gps_interval_ms";
    private static final String KEY_SPEED_LIMIT = "speed_limit_kmh";
    private static final String KEY_URL_CUSTOM = "url_custom";

    // Module trip - service isi se jaanti hai ki fix trip_points me bhi likhna hai.
    // localStorage wala activeTrip sirf JS guards ke liye hai, service use padh nahi sakti.
    private static final String KEY_TRIP_MODULE = "trip_module";
    private static final String KEY_TRIP_ID = "trip_id";
    private static final String KEY_TRIP_STARTED_AT = "trip_started_at";

    static final long DEFAULT_GPS_INTERVAL_MS = 60_000L;
    static final float DEFAULT_SPEED_LIMIT_KMH = 50f;

    private final SharedPreferences sp;

    LiveTrackerPrefs(Context ctx) {
        this.sp = ctx.getApplicationContext().getSharedPreferences(FILE, Context.MODE_PRIVATE);
    }

    boolean isEnabled() {
        return sp.getBoolean(KEY_ENABLED, false);
    }

    void setEnabled(boolean enabled) {
        sp.edit().putBoolean(KEY_ENABLED, enabled).apply();
    }

    String getUrl() {
        return sp.getString(KEY_URL, "");
    }

    void setUrl(String url) {
        sp.edit().putString(KEY_URL, url).apply();
    }

    String getToken() {
        return sp.getString(KEY_TOKEN, "");
    }

    void setToken(String token) {
        sp.edit().putString(KEY_TOKEN, token).apply();
    }

    int getPoints() {
        return sp.getInt(KEY_POINTS, 0);
    }

    long getStartedAt() {
        return sp.getLong(KEY_STARTED_AT, 0L);
    }

    long getLastFixAt() {
        return sp.getLong(KEY_LAST_FIX_AT, 0L);
    }

    double getLastLat() {
        return Double.longBitsToDouble(sp.getLong(KEY_LAST_LAT, 0L));
    }

    double getLastLng() {
        return Double.longBitsToDouble(sp.getLong(KEY_LAST_LNG, 0L));
    }

    float getLastSpeed() {
        return sp.getFloat(KEY_LAST_SPEED, 0f);
    }

    float getLastAccuracy() {
        return sp.getFloat(KEY_LAST_ACCURACY, 0f);
    }

    String getLastUpload() {
        return sp.getString(KEY_LAST_UPLOAD, "-");
    }

    void setLastUpload(String result) {
        sp.edit().putString(KEY_LAST_UPLOAD, result).apply();
    }

    /** GPS ki apni (Doppler) speed - sirf comparison ke liye rakhi hai */
    float getLastGpsSpeed() {
        return sp.getFloat(KEY_LAST_GPS_SPEED, 0f);
    }

    /** false = aakhri fix ki GPS speed bharosemand nahi thi (0 maani gayi) */
    boolean isLastSpeedTrusted() {
        return sp.getBoolean(KEY_LAST_SPEED_TRUSTED, false);
    }

    /** Session ka total distance, metres me */
    float getDistance() {
        return sp.getFloat(KEY_DISTANCE, 0f);
    }

    void addDistance(float metres) {
        sp.edit().putFloat(KEY_DISTANCE, getDistance() + metres).apply();
    }

    /**
     * true = URL debug screen se badla gaya hai. Aisa ho to start() use overwrite
     * nahi karta, warna har Start par environment wala URL wapas aa jaata.
     */
    boolean isUrlCustom() {
        return sp.getBoolean(KEY_URL_CUSTOM, false);
    }

    void setUrlCustom(boolean custom) {
        sp.edit().putBoolean(KEY_URL_CUSTOM, custom).apply();
    }

    boolean hasActiveTrip() {
        return !getTripModule().isEmpty() && !getTripId().isEmpty();
    }

    String getTripModule() {
        return sp.getString(KEY_TRIP_MODULE, "");
    }

    String getTripId() {
        return sp.getString(KEY_TRIP_ID, "");
    }

    long getTripStartedAt() {
        return sp.getLong(KEY_TRIP_STARTED_AT, 0L);
    }

    /** commit() - watchdog restart turant hua to bhi flag disk par hona chahiye */
    void setActiveTrip(String module, String id, long startedAt) {
        sp.edit()
                .putString(KEY_TRIP_MODULE, module)
                .putString(KEY_TRIP_ID, id)
                .putLong(KEY_TRIP_STARTED_AT, startedAt)
                .commit();
    }

    void clearActiveTrip() {
        sp.edit()
                .remove(KEY_TRIP_MODULE)
                .remove(KEY_TRIP_ID)
                .remove(KEY_TRIP_STARTED_AT)
                .commit();
    }

    /** GPS har kitne millisecond par - debug screen se badalta hai */
    long getGpsIntervalMs() {
        return sp.getLong(KEY_GPS_INTERVAL, DEFAULT_GPS_INTERVAL_MS);
    }

    void setGpsIntervalMs(long ms) {
        sp.edit().putLong(KEY_GPS_INTERVAL, ms).apply();
    }

    float getSpeedLimitKmh() {
        return sp.getFloat(KEY_SPEED_LIMIT, DEFAULT_SPEED_LIMIT_KMH);
    }

    void setSpeedLimitKmh(float kmh) {
        sp.edit().putFloat(KEY_SPEED_LIMIT, kmh).apply();
    }

    /** Start par counters saaf - har session ka apna count aur start time. */
    void resetSession() {
        sp.edit()
                .putInt(KEY_POINTS, 0)
                .putLong(KEY_STARTED_AT, System.currentTimeMillis())
                .putLong(KEY_LAST_FIX_AT, 0L)
                .putLong(KEY_LAST_LAT, 0L)
                .putLong(KEY_LAST_LNG, 0L)
                .putFloat(KEY_LAST_SPEED, 0f)
                .putFloat(KEY_LAST_GPS_SPEED, 0f)
                .putFloat(KEY_DISTANCE, 0f)
                .putString(KEY_LAST_UPLOAD, "-")
                .apply();
    }

    /**
     * Naya fix - counters badhao. Watchdog restart ke baad bhi count chalta rehta hai.
     * speed = maani gayi speed (bharosemand na ho to 0), gpsSpeed = GPS ki kachchi reading.
     */
    int recordFix(double lat, double lng, float speed, float gpsSpeed, float accuracy, long time,
                  boolean speedTrusted) {
        int points = getPoints() + 1;
        sp.edit()
                .putInt(KEY_POINTS, points)
                .putLong(KEY_LAST_FIX_AT, time)
                .putLong(KEY_LAST_LAT, Double.doubleToRawLongBits(lat))
                .putLong(KEY_LAST_LNG, Double.doubleToRawLongBits(lng))
                .putFloat(KEY_LAST_SPEED, speed)
                .putFloat(KEY_LAST_GPS_SPEED, gpsSpeed)
                .putFloat(KEY_LAST_ACCURACY, accuracy)
                .putBoolean(KEY_LAST_SPEED_TRUSTED, speedTrusted)
                .apply();
        return points;
    }
}
