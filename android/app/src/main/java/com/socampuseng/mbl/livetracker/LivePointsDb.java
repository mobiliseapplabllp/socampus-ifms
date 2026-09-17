package com.socampuseng.mbl.livetracker;

import android.content.ContentValues;
import android.content.Context;
import android.database.Cursor;
import android.database.sqlite.SQLiteDatabase;
import android.database.sqlite.SQLiteOpenHelper;

import org.json.JSONArray;
import org.json.JSONObject;

/**
 * Session ke points sirf **verify karne** ke liye rakhe jaate hain - map par path
 * dikhane ke liye. Upload ka model wahi hai: fail hua to point khatam, koi retry nahi.
 * Ye table us faisle ko badalti nahi, bas testing me dikhata hai ki kaunse minute
 * ka fix aaya aur kaunsa miss hua.
 *
 * Start par table saaf ho jaati hai, aur purane points cap se upar hone par
 * sabse purane hatte jaate hain - ye log hai, archive nahi.
 */
class LivePointsDb extends SQLiteOpenHelper {

    private static final String DB = "live_tracker_points.db";
    private static final int VERSION = 2;
    private static final String TABLE = "live_points";

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
    }

    @Override
    public void onUpgrade(SQLiteDatabase db, int oldVersion, int newVersion) {
        db.execSQL("DROP TABLE IF EXISTS " + TABLE);
        onCreate(db);
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
}
