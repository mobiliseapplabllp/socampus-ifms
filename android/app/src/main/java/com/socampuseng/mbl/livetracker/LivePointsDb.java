package com.socampuseng.mbl.livetracker;

import android.content.ContentValues;
import android.content.Context;
import android.database.Cursor;
import android.database.sqlite.SQLiteDatabase;
import android.database.sqlite.SQLiteOpenHelper;

import org.json.JSONArray;
import org.json.JSONObject;

/**
 * Do table, ek hi GPS stream:
 *
 * live_points - home page wali tracking ka log. Server par data pehle hi ja chuka hota
 *   hai, ye sirf map/verification ke liye hai. Cap 1000, purane apne aap hatte hain.
 *
 * trip_points - kisi module (complaint / concierge / pms) ki trip ka path. Yahi
 *   track_arr banta hai aur distance isi par tika hai - isliye yahan KOI cap nahi,
 *   aur koi query bina module_type + specific_id ke isko delete nahi karti.
 *
 * Alag table isliye ki live wali cap query galti se bhi trip ka data na uda sake.
 */
class LivePointsDb extends SQLiteOpenHelper {

    private static final String DB = "live_tracker_points.db";
    /** Production se pehle version 1 hi - schema badle to app reinstall. */
    private static final int VERSION = 1;
    private static final String TABLE = "live_points";
    private static final String TRIP_TABLE = "trip_points";

    /** ~17 ghante @ 1 point/min. Isse zyada ka koi matlab nahi. */
    private static final int MAX_POINTS = 1000;

    private static LivePointsDb instance;

    static synchronized LivePointsDb getInstance(Context ctx) {
        if (instance == null) {
            instance = new LivePointsDb(ctx.getApplicationContext());
        }
        return instance;
    }

    private LivePointsDb(Context context) {
        super(context, DB, null, VERSION);
    }

    @Override
    public void onCreate(SQLiteDatabase db) {
        db.execSQL("CREATE TABLE IF NOT EXISTS " + TABLE + " (" +
                "id INTEGER PRIMARY KEY AUTOINCREMENT," +
                "lat REAL," +
                "lng REAL," +
                "speed REAL," +
                "accuracy REAL," +
                "time INTEGER," +
                "upload TEXT," +
                // 1 = is fix par overspeed alarm baja tha (sirf threshold cross hone par,
                // lagataar 50+ chalne par nahi)
                "alarmed INTEGER DEFAULT 0," +
                FILTER_COLUMNS +
                ")");
        createTripTable(db);
    }

    /**
     * Har row me filter ka faisla bhi - point kharab ho tab bhi save hota hai, sirf
     * padhte waqt (map line, trip km, track_arr) chhanta jaata hai. Seema baad me
     * badli to data wahi rahega.
     *   accepted   1 = path me gino, 0 = location koodi / accuracy kharab
     *   reason     kyun - map par tap karke dikhta hai
     *   dist_m     is fix par distance me kitna juda (0 = drift / reject)
     *   interval_s us waqt GPS kitne second par tha
     */
    private static final String FILTER_COLUMNS =
            "accepted INTEGER DEFAULT 1," +
            "reason TEXT," +
            "dist_m REAL DEFAULT 0," +
            "interval_s INTEGER DEFAULT 0";

    private void createTripTable(SQLiteDatabase db) {
        db.execSQL("CREATE TABLE IF NOT EXISTS " + TRIP_TABLE + " (" +
                "id INTEGER PRIMARY KEY AUTOINCREMENT," +
                "module_type TEXT," +   // 'complaint' | 'concierge' | 'pms'
                "specific_id TEXT," +   // ticket_id / concierge_id / pms_id
                "lat REAL," +
                "lng REAL," +
                "speed REAL," +         // km/h
                "accuracy REAL," +
                "time INTEGER," +
                FILTER_COLUMNS +
                ")");
        db.execSQL("CREATE INDEX IF NOT EXISTS idx_trip ON " + TRIP_TABLE +
                " (module_type, specific_id, id)");
    }

    @Override
    public void onUpgrade(SQLiteDatabase db, int oldVersion, int newVersion) {
        recreate(db);
    }

    /**
     * Pehle ke builds me version 4 tak gaya tha - bina uninstall ke install hua to
     * SQLite downgrade par crash karta. Testing ka data hai, saaf karke nayi table.
     */
    @Override
    public void onDowngrade(SQLiteDatabase db, int oldVersion, int newVersion) {
        recreate(db);
    }

    private void recreate(SQLiteDatabase db) {
        db.execSQL("DROP TABLE IF EXISTS " + TABLE);
        db.execSQL("DROP TABLE IF EXISTS " + TRIP_TABLE);
        onCreate(db);
    }

    long insert(double lat, double lng, float speedKmh, float accuracy, long time, boolean alarmed,
                boolean accepted, String reason, float distM, int intervalSec) {
        SQLiteDatabase db = getWritableDatabase();
        ContentValues cv = new ContentValues();
        cv.put("accepted", accepted ? 1 : 0);
        cv.put("reason", reason);
        cv.put("dist_m", distM);
        cv.put("interval_s", intervalSec);
        cv.put("lat", lat);
        cv.put("lng", lng);
        cv.put("speed", speedKmh);
        cv.put("accuracy", accuracy);
        cv.put("time", time);
        cv.put("upload", "-");
        cv.put("alarmed", alarmed ? 1 : 0);
        long id = db.insert(TABLE, null, cv);

        db.execSQL("DELETE FROM " + TABLE + " WHERE id <= (" +
                "SELECT MAX(id) FROM " + TABLE + ") - " + MAX_POINTS);
        return id;
    }

    /** Upload ka result baad me aata hai - usi row par likh do. */
    void setUploadResult(long id, String result) {
        if (id <= 0) return;
        ContentValues cv = new ContentValues();
        cv.put("upload", result);
        getWritableDatabase().update(TABLE, cv, "id = ?", new String[]{ String.valueOf(id) });
    }

    void clear() {
        getWritableDatabase().delete(TABLE, null, null);
    }

    JSONArray getAll() {
        JSONArray arr = new JSONArray();
        Cursor c = null;
        try {
            c = getReadableDatabase().rawQuery(
                    "SELECT lat, lng, speed, accuracy, time, upload, alarmed, accepted, reason, dist_m, interval_s FROM "
                            + TABLE + " ORDER BY id ASC", null);
            while (c.moveToNext()) {
                JSONObject o = new JSONObject();
                o.put("lat", c.getDouble(0));
                o.put("lng", c.getDouble(1));
                o.put("speed", c.getDouble(2));
                o.put("accuracy", c.getDouble(3));
                o.put("time", c.getLong(4));
                o.put("upload", c.getString(5));
                o.put("alarmed", c.getInt(6) == 1);
                o.put("accepted", c.isNull(7) || c.getInt(7) == 1);
                o.put("reason", c.isNull(8) ? "" : c.getString(8));
                o.put("dist", c.getDouble(9));
                o.put("interval", c.getInt(10));
                arr.put(o);
            }
        } catch (Exception ignored) {
            // corrupt row - jo mila wahi laut do
        } finally {
            if (c != null) c.close();
        }
        return arr;
    }

    // ------------------------------------------------------------ trip_points

    void insertTrip(String moduleType, String specificId,
                    double lat, double lng, float speedKmh, float accuracy, long time,
                    boolean accepted, String reason, float distM, int intervalSec) {
        ContentValues cv = new ContentValues();
        cv.put("accepted", accepted ? 1 : 0);
        cv.put("reason", reason);
        cv.put("dist_m", distM);
        cv.put("interval_s", intervalSec);
        cv.put("module_type", moduleType);
        cv.put("specific_id", specificId);
        cv.put("lat", lat);
        cv.put("lng", lng);
        cv.put("speed", speedKmh);
        cv.put("accuracy", accuracy);
        cv.put("time", time);
        getWritableDatabase().insert(TRIP_TABLE, null, cv);
    }

    /** Ek trip ka poora path, pehle point se aakhri tak - yahi track_arr banega. */
    JSONArray getTrip(String moduleType, String specificId) {
        JSONArray arr = new JSONArray();
        Cursor c = null;
        try {
            c = getReadableDatabase().rawQuery(
                    "SELECT lat, lng, speed, accuracy, time, accepted, reason, dist_m, interval_s FROM " + TRIP_TABLE +
                            " WHERE module_type = ? AND specific_id = ? ORDER BY id ASC",
                    new String[]{ moduleType, specificId });
            while (c.moveToNext()) {
                JSONObject o = new JSONObject();
                o.put("lat", c.getDouble(0));
                o.put("lng", c.getDouble(1));
                o.put("speed", c.getDouble(2));
                o.put("accuracy", c.getDouble(3));
                o.put("time", c.getLong(4));
                o.put("accepted", c.isNull(5) || c.getInt(5) == 1);
                o.put("reason", c.isNull(6) ? "" : c.getString(6));
                o.put("dist", c.getDouble(7));
                o.put("interval", c.getInt(8));
                arr.put(o);
            }
        } catch (Exception ignored) {
            // corrupt row - jo mila wahi laut do
        } finally {
            if (c != null) c.close();
        }
        return arr;
    }

    /** Sirf ek trip ka data - doosri trips aur live_points ko nahi chhuta. */
    void clearTrip(String moduleType, String specificId) {
        getWritableDatabase().delete(TRIP_TABLE,
                "module_type = ? AND specific_id = ?",
                new String[]{ moduleType, specificId });
    }
}
