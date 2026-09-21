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
    /** Server isi se client (tenant) pehchaanta hai - environment.referUrl */
    private static final String KEY_REFERER = "referer";
    private static final String KEY_POINTS = "points";
    private static final String KEY_STARTED_AT = "started_at";
    private static final String KEY_LAST_FIX_AT = "last_fix_at";
    private static final String KEY_LAST_LAT = "last_lat";
    private static final String KEY_LAST_LNG = "last_lng";
    private static final String KEY_LAST_SPEED = "last_speed";
    private static final String KEY_LAST_ACCURACY = "last_accuracy";
    private static final String KEY_LAST_UPLOAD = "last_upload";
    /** Server ne aakhri ping kab store kiya (fix ka waqt) - minute me ek hi bhejte hain */
    private static final String KEY_LAST_PING_AT = "last_ping_at";
    private static final String KEY_LAST_GPS_SPEED = "last_gps_speed";
    private static final String KEY_DISTANCE = "distance_m";
    private static final String KEY_LAST_SPEED_TRUSTED = "last_speed_trusted";
    /** Speed GPS se nahi, doori/time se nikli hai - notification me "~" ke saath */
    private static final String KEY_LAST_SPEED_EST = "last_speed_est";
    /** Session ki sabse tez speed (km/h) - testing me dikhta hai ki GPS ne kya padha */
    private static final String KEY_MAX_SPEED = "max_speed_kmh";

    // Debug screen se badalne wale config - default wahi hain jo pehle hardcoded the
    private static final String KEY_GPS_INTERVAL = "gps_interval_ms";
    private static final String KEY_SPEED_LIMIT = "speed_limit_kmh";
    private static final String KEY_URL_CUSTOM = "url_custom";

    // Module trip - service isi se jaanti hai ki fix trip_points me bhi likhna hai.
    // localStorage wala activeTrip sirf JS guards ke liye hai, service use padh nahi sakti.
    private static final String KEY_TRIP_MODULE = "trip_module";
    private static final String KEY_TRIP_ID = "trip_id";
    private static final String KEY_TRIP_STARTED_AT = "trip_started_at";

    // Adaptive interval + location filter - sab debug screen se badalne layak
    private static final String KEY_ADAPTIVE = "adaptive";
    private static final String KEY_MIN_INTERVAL = "min_interval_ms";
    private static final String KEY_MAX_INTERVAL = "max_interval_ms";
    private static final String KEY_ACC_GOOD = "acc_good_m";
    private static final String KEY_ACC_REJECT = "acc_reject_m";

    // Abhi ka interval aur uski wajah - notification/card me dikhane ke liye
    private static final String KEY_CUR_INTERVAL = "cur_interval_ms";
    private static final String KEY_CUR_REASON = "cur_reason";

    // Activity Recognition ka aakhri jawab
    private static final String KEY_ACTIVITY = "activity";
    private static final String KEY_ACTIVITY_AT = "activity_at";

    // Anchor = aakhri pakki jagah. Location filter isi se tay karta hai ki naya
    // fix asli chalna hai ya location ka koodna
    private static final String KEY_ANCHOR_LAT = "anchor_lat";
    private static final String KEY_ANCHOR_LNG = "anchor_lng";
    private static final String KEY_ANCHOR_ACC = "anchor_acc";
    private static final String KEY_ANCHOR_AT = "anchor_at";

    static final long DEFAULT_GPS_INTERVAL_MS = 60_000L;
    static final float DEFAULT_SPEED_LIMIT_KMH = 50f;
    static final long DEFAULT_MIN_INTERVAL_MS = 15_000L;
    static final long DEFAULT_MAX_INTERVAL_MS = 300_000L;
    static final float DEFAULT_ACC_GOOD_M = 50f;
    static final float DEFAULT_ACC_REJECT_M = 150f;

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

    String getReferer() {
        return sp.getString(KEY_REFERER, "");
    }

    void setReferer(String referer) {
        sp.edit().putString(KEY_REFERER, referer).apply();
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

    long getLastPingAt() {
        return sp.getLong(KEY_LAST_PING_AT, 0L);
    }

    void setLastPingAt(long at) {
        sp.edit().putLong(KEY_LAST_PING_AT, at).apply();
    }

    /** GPS ki apni (Doppler) speed - sirf comparison ke liye rakhi hai */
    float getLastGpsSpeed() {
        return sp.getFloat(KEY_LAST_GPS_SPEED, 0f);
    }

    /** false = aakhri fix ki GPS speed bharosemand nahi thi (0 maani gayi) */
    boolean isLastSpeedTrusted() {
        return sp.getBoolean(KEY_LAST_SPEED_TRUSTED, false);
    }

    boolean isLastSpeedEstimated() {
        return sp.getBoolean(KEY_LAST_SPEED_EST, false);
    }

    float getMaxSpeedKmh() {
        return sp.getFloat(KEY_MAX_SPEED, 0f);
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

    // ------------------------------------------------------------ adaptive

    /** true = speed ke hisaab se interval, false = fixed gpsInterval (test ke liye) */
    boolean isAdaptive() {
        return sp.getBoolean(KEY_ADAPTIVE, true);
    }

    void setAdaptive(boolean adaptive) {
        sp.edit().putBoolean(KEY_ADAPTIVE, adaptive).apply();
    }

    long getMinIntervalMs() {
        return sp.getLong(KEY_MIN_INTERVAL, DEFAULT_MIN_INTERVAL_MS);
    }

    void setMinIntervalMs(long ms) {
        sp.edit().putLong(KEY_MIN_INTERVAL, ms).apply();
    }

    long getMaxIntervalMs() {
        return sp.getLong(KEY_MAX_INTERVAL, DEFAULT_MAX_INTERVAL_MS);
    }

    void setMaxIntervalMs(long ms) {
        sp.edit().putLong(KEY_MAX_INTERVAL, ms).apply();
    }

    float getAccGoodM() {
        return sp.getFloat(KEY_ACC_GOOD, DEFAULT_ACC_GOOD_M);
    }

    void setAccGoodM(float m) {
        sp.edit().putFloat(KEY_ACC_GOOD, m).apply();
    }

    float getAccRejectM() {
        return sp.getFloat(KEY_ACC_REJECT, DEFAULT_ACC_REJECT_M);
    }

    void setAccRejectM(float m) {
        sp.edit().putFloat(KEY_ACC_REJECT, m).apply();
    }

    long getCurrentIntervalMs() {
        return sp.getLong(KEY_CUR_INTERVAL, 0L);
    }

    String getIntervalReason() {
        return sp.getString(KEY_CUR_REASON, "-");
    }

    void setIntervalState(long ms, String reason) {
        sp.edit().putLong(KEY_CUR_INTERVAL, ms).putString(KEY_CUR_REASON, reason).apply();
    }

    // ------------------------------------------------------------ activity

    /** "Still" / "Walking" / "Running" / "Cycling" / "Riding" - khaali = abhi pata nahi */
    String getActivity() {
        return sp.getString(KEY_ACTIVITY, "");
    }

    long getActivityAt() {
        return sp.getLong(KEY_ACTIVITY_AT, 0L);
    }

    void setActivity(String label, long at) {
        sp.edit().putString(KEY_ACTIVITY, label).putLong(KEY_ACTIVITY_AT, at).apply();
    }

    // -------------------------------------------------------------- anchor

    boolean hasAnchor() {
        return sp.getLong(KEY_ANCHOR_AT, 0L) > 0;
    }

    double getAnchorLat() {
        return Double.longBitsToDouble(sp.getLong(KEY_ANCHOR_LAT, 0L));
    }

    double getAnchorLng() {
        return Double.longBitsToDouble(sp.getLong(KEY_ANCHOR_LNG, 0L));
    }

    float getAnchorAcc() {
        return sp.getFloat(KEY_ANCHOR_ACC, 0f);
    }

    long getAnchorAt() {
        return sp.getLong(KEY_ANCHOR_AT, 0L);
    }

    void setAnchor(double lat, double lng, float acc, long at) {
        sp.edit()
                .putLong(KEY_ANCHOR_LAT, Double.doubleToRawLongBits(lat))
                .putLong(KEY_ANCHOR_LNG, Double.doubleToRawLongBits(lng))
                .putFloat(KEY_ANCHOR_ACC, acc)
                .putLong(KEY_ANCHOR_AT, at)
                .apply();
    }

    /** Jagah wahi, bas "abhi bhi yahin hoon" ki pushti - anchor ko purana hone se bachata hai */
    void touchAnchor(long at, float acc) {
        sp.edit()
                .putLong(KEY_ANCHOR_AT, at)
                .putFloat(KEY_ANCHOR_ACC, Math.min(acc, getAnchorAcc()))
                .apply();
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
                .putFloat(KEY_MAX_SPEED, 0f)
                .putLong(KEY_LAST_PING_AT, 0L)
                .putLong(KEY_ANCHOR_AT, 0L)
                .putLong(KEY_CUR_INTERVAL, 0L)
                .putString(KEY_CUR_REASON, "start")
                .apply();
    }

    /**
     * Naya fix - counters badhao. Watchdog restart ke baad bhi count chalta rehta hai.
     * speed = maani gayi speed (bharosemand na ho to 0), gpsSpeed = GPS ki kachchi reading.
     */
    int recordFix(double lat, double lng, float speed, float gpsSpeed, float accuracy, long time,
                  boolean speedTrusted, boolean speedEstimated) {
        int points = getPoints() + 1;
        float kmh = speed * 3.6f;
        sp.edit()
                .putInt(KEY_POINTS, points)
                .putLong(KEY_LAST_FIX_AT, time)
                .putLong(KEY_LAST_LAT, Double.doubleToRawLongBits(lat))
                .putLong(KEY_LAST_LNG, Double.doubleToRawLongBits(lng))
                .putFloat(KEY_LAST_SPEED, speed)
                .putFloat(KEY_LAST_GPS_SPEED, gpsSpeed)
                .putFloat(KEY_LAST_ACCURACY, accuracy)
                .putBoolean(KEY_LAST_SPEED_TRUSTED, speedTrusted)
                .putBoolean(KEY_LAST_SPEED_EST, speedEstimated)
                .putFloat(KEY_MAX_SPEED, Math.max(getMaxSpeedKmh(), kmh))
                .apply();
        return points;
    }
}
