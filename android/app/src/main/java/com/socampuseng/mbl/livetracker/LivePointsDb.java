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
    private static final int VERSION = 3;
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
                "alarmed INTEGER DEFAULT 0" +
                ")");
        createTripTable(db);
    }

    private void createTripTable(SQLiteDatabase db) {
        db.execSQL("CREATE TABLE IF NOT EXISTS " + TRIP_TABLE + " (" +
                "id INTEGER PRIMARY KEY AUTOINCREMENT," +
                "module_type TEXT," +   // 'complaint' | 'concierge' | 'pms'
                "specific_id TEXT," +   // ticket_id / concierge_id / pms_id
                "lat REAL," +
                "lng REAL," +
                "speed REAL," +         // km/h
                "accuracy REAL," +
                "time INTEGER" +
                ")");
        db.execSQL("CREATE INDEX IF NOT EXISTS idx_trip ON " + TRIP_TABLE +
                " (module_type, specific_id, id)");
    }

    @Override
    public void onUpgrade(SQLiteDatabase db, int oldVersion, int newVersion) {
        // live_points sirf log hai - purane schema ko drop karna safe hai
        if (oldVersion < 2) {
            db.execSQL("DROP TABLE IF EXISTS " + TABLE);
            onCreate(db);
        }
        // trip_points kabhi drop nahi hoti - aage ke upgrades me bhi ALTER hi karna
        createTripTable(db);
    }

    long insert(double lat, double lng, float speedKmh, float accuracy, long time, boolean alarmed) {
        SQLiteDatabase db = getWritableDatabase();
        ContentValues cv = new ContentValues();
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
                    "SELECT lat, lng, speed, accuracy, time, upload, alarmed FROM " + TABLE + " ORDER BY id ASC", null);
            while (c.moveToNext()) {
                JSONObject o = new JSONObject();
                o.put("lat", c.getDouble(0));
                o.put("lng", c.getDouble(1));
                o.put("speed", c.getDouble(2));
                o.put("accuracy", c.getDouble(3));
                o.put("time", c.getLong(4));
                o.put("upload", c.getString(5));
                o.put("alarmed", c.getInt(6) == 1);
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
                    double lat, double lng, float speedKmh, float accuracy, long time) {
        ContentValues cv = new ContentValues();
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
                    "SELECT lat, lng, speed, accuracy, time FROM " + TRIP_TABLE +
                            " WHERE module_type = ? AND specific_id = ? ORDER BY id ASC",
                    new String[]{ moduleType, specificId });
            while (c.moveToNext()) {
                JSONObject o = new JSONObject();
                o.put("lat", c.getDouble(0));
                o.put("lng", c.getDouble(1));
                o.put("speed", c.getDouble(2));
                o.put("accuracy", c.getDouble(3));
                o.put("time", c.getLong(4));
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
