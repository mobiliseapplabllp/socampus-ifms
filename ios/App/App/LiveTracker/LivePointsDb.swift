import Foundation
import SQLite3

/// Android ke LivePointsDb ka jawab - **bilkul wahi schema**, wahi column naam.
/// Concierge wala plugin iOS par UserDefaults use karta hai; yahan asli SQLite hai,
/// kyunki duty tracking me ek din me 500+ row aati hain aur trip ke point
/// module/trip ke hisaab se chhaantne padte hain.
final class LivePointsDb {

    static let shared = LivePointsDb()

    private let DB_NAME = "live_tracker_points.db"
    private let TABLE = "live_points"
    private let TRIP_TABLE = "trip_points"
    /// ~17 ghante @ 1 point/min - isse zyada rakhne ka koi matlab nahi (Android jaisa hi)
    private let MAX_POINTS = 1000

    private var db: OpaquePointer?
    /// Upload alag thread se aata hai - SQLite ko ek hi kataar me chalate hain
    private let queue = DispatchQueue(label: "livetracker.db")

    private static let SQLITE_TRANSIENT = unsafeBitCast(-1, to: sqlite3_destructor_type.self)

    private init() {
        open()
    }

    private func open() {
        let path = (try? FileManager.default.url(for: .applicationSupportDirectory,
                                                 in: .userDomainMask,
                                                 appropriateFor: nil,
                                                 create: true))?
            .appendingPathComponent(DB_NAME)

        guard let file = path else {
            NSLog("LiveTracker: db path nahi mila")
            return
        }

        if sqlite3_open(file.path, &db) != SQLITE_OK {
            NSLog("LiveTracker: db open fail")
            return
        }

        exec("""
            CREATE TABLE IF NOT EXISTS \(TABLE) (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                lat REAL, lng REAL, speed REAL, accuracy REAL, time INTEGER,
                upload TEXT, alarmed INTEGER DEFAULT 0,
                accepted INTEGER DEFAULT 1, reason TEXT, dist_m REAL DEFAULT 0,
                interval_s INTEGER DEFAULT 0, battery INTEGER DEFAULT -1)
        """)

        exec("""
            CREATE TABLE IF NOT EXISTS \(TRIP_TABLE) (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                module_type TEXT, specific_id TEXT,
                lat REAL, lng REAL, speed REAL, accuracy REAL, time INTEGER,
                accepted INTEGER DEFAULT 1, reason TEXT, dist_m REAL DEFAULT 0,
                interval_s INTEGER DEFAULT 0, battery INTEGER DEFAULT -1)
        """)

        exec("CREATE INDEX IF NOT EXISTS idx_trip ON \(TRIP_TABLE) (module_type, specific_id, id)")
    }

    private func exec(_ sql: String) {
        sqlite3_exec(db, sql, nil, nil, nil)
    }

    // MARK: - live_points (duty session)

    /// Kharab fix bhi save hota hai (accepted = 0) - chhantai padhte waqt hoti hai
    @discardableResult
    func insert(lat: Double, lng: Double, speedKmh: Double, accuracy: Double,
                time: Double, alarmed: Bool, accepted: Bool, reason: String,
                distM: Double, intervalS: Int, battery: Int) -> Int64 {
        queue.sync {
            let sql = """
                INSERT INTO \(TABLE)
                (lat, lng, speed, accuracy, time, upload, alarmed, accepted, reason, dist_m, interval_s, battery)
                VALUES (?,?,?,?,?,?,?,?,?,?,?,?)
            """
            var st: OpaquePointer?
            guard sqlite3_prepare_v2(db, sql, -1, &st, nil) == SQLITE_OK else { return -1 }
            sqlite3_bind_double(st, 1, lat)
            sqlite3_bind_double(st, 2, lng)
            sqlite3_bind_double(st, 3, speedKmh)
            sqlite3_bind_double(st, 4, accuracy)
            sqlite3_bind_int64(st, 5, Int64(time))
            sqlite3_bind_text(st, 6, "-", -1, Self.SQLITE_TRANSIENT)
            sqlite3_bind_int(st, 7, alarmed ? 1 : 0)
            sqlite3_bind_int(st, 8, accepted ? 1 : 0)
            sqlite3_bind_text(st, 9, reason, -1, Self.SQLITE_TRANSIENT)
            sqlite3_bind_double(st, 10, distM)
            sqlite3_bind_int(st, 11, Int32(intervalS))
            sqlite3_bind_int(st, 12, Int32(battery))
            sqlite3_step(st)
            sqlite3_finalize(st)

            let rowId = sqlite3_last_insert_rowid(db)
            // Purane point apne aap kat jaayein - Android jaisa hi
            exec("DELETE FROM \(TABLE) WHERE id <= (SELECT MAX(id) FROM \(TABLE)) - \(MAX_POINTS)")
            return rowId
        }
    }

    func setUploadResult(rowId: Int64, result: String) {
        queue.sync {
            var st: OpaquePointer?
            guard sqlite3_prepare_v2(db, "UPDATE \(TABLE) SET upload = ? WHERE id = ?", -1, &st, nil) == SQLITE_OK else { return }
            sqlite3_bind_text(st, 1, result, -1, Self.SQLITE_TRANSIENT)
            sqlite3_bind_int64(st, 2, rowId)
            sqlite3_step(st)
            sqlite3_finalize(st)
        }
    }

    func clear() {
        queue.sync { exec("DELETE FROM \(TABLE)") }
    }

    /// Session ka poora path - map aur debug screen ke liye
    func getAll() -> [[String: Any]] {
        queue.sync {
            var out: [[String: Any]] = []
            var st: OpaquePointer?
            let sql = """
                SELECT lat, lng, speed, accuracy, time, upload, alarmed,
                       accepted, reason, dist_m, interval_s, battery
                FROM \(TABLE) ORDER BY id ASC
            """
            guard sqlite3_prepare_v2(db, sql, -1, &st, nil) == SQLITE_OK else { return out }
            while sqlite3_step(st) == SQLITE_ROW {
                out.append([
                    "lat": sqlite3_column_double(st, 0),
                    "lng": sqlite3_column_double(st, 1),
                    "speed": sqlite3_column_double(st, 2),
                    "accuracy": sqlite3_column_double(st, 3),
                    "time": Double(sqlite3_column_int64(st, 4)),
                    "upload": text(st, 5),
                    "alarmed": sqlite3_column_int(st, 6) == 1,
                    "accepted": sqlite3_column_int(st, 7) == 1,
                    "reason": text(st, 8),
                    "dist": sqlite3_column_double(st, 9),
                    "interval": Int(sqlite3_column_int(st, 10)),
                    "battery": Int(sqlite3_column_int(st, 11))
                ])
            }
            sqlite3_finalize(st)
            return out
        }
    }

    // MARK: - trip_points (ticket wali trip)

    func insertTrip(module: String, id: String, lat: Double, lng: Double, speedKmh: Double,
                    accuracy: Double, time: Double, accepted: Bool, reason: String,
                    distM: Double, intervalS: Int, battery: Int) {
        queue.sync {
            let sql = """
                INSERT INTO \(TRIP_TABLE)
                (module_type, specific_id, lat, lng, speed, accuracy, time, accepted, reason, dist_m, interval_s, battery)
                VALUES (?,?,?,?,?,?,?,?,?,?,?,?)
            """
            var st: OpaquePointer?
            guard sqlite3_prepare_v2(db, sql, -1, &st, nil) == SQLITE_OK else { return }
            sqlite3_bind_text(st, 1, module, -1, Self.SQLITE_TRANSIENT)
            sqlite3_bind_text(st, 2, id, -1, Self.SQLITE_TRANSIENT)
            sqlite3_bind_double(st, 3, lat)
            sqlite3_bind_double(st, 4, lng)
            sqlite3_bind_double(st, 5, speedKmh)
            sqlite3_bind_double(st, 6, accuracy)
            sqlite3_bind_int64(st, 7, Int64(time))
            sqlite3_bind_int(st, 8, accepted ? 1 : 0)
            sqlite3_bind_text(st, 9, reason, -1, Self.SQLITE_TRANSIENT)
            sqlite3_bind_double(st, 10, distM)
            sqlite3_bind_int(st, 11, Int32(intervalS))
            sqlite3_bind_int(st, 12, Int32(battery))
            sqlite3_step(st)
            sqlite3_finalize(st)
        }
    }

    func getTripPoints(module: String, id: String) -> [[String: Any]] {
        queue.sync {
            var out: [[String: Any]] = []
            var st: OpaquePointer?
            let sql = """
                SELECT lat, lng, speed, accuracy, time, accepted, reason, dist_m, interval_s, battery
                FROM \(TRIP_TABLE) WHERE module_type = ? AND specific_id = ? ORDER BY id ASC
            """
            guard sqlite3_prepare_v2(db, sql, -1, &st, nil) == SQLITE_OK else { return out }
            sqlite3_bind_text(st, 1, module, -1, Self.SQLITE_TRANSIENT)
            sqlite3_bind_text(st, 2, id, -1, Self.SQLITE_TRANSIENT)
            while sqlite3_step(st) == SQLITE_ROW {
                out.append([
                    "lat": sqlite3_column_double(st, 0),
                    "lng": sqlite3_column_double(st, 1),
                    "speed": sqlite3_column_double(st, 2),
                    "accuracy": sqlite3_column_double(st, 3),
                    "time": Double(sqlite3_column_int64(st, 4)),
                    "accepted": sqlite3_column_int(st, 5) == 1,
                    "reason": text(st, 6),
                    "dist": sqlite3_column_double(st, 7),
                    "interval": Int(sqlite3_column_int(st, 8)),
                    "battery": Int(sqlite3_column_int(st, 9))
                ])
            }
            sqlite3_finalize(st)
            return out
        }
    }

    /// Sirf End Trip ke **success** ke baad - warna path hamesha ke liye chala jaayega
    func clearTrip(module: String, id: String) {
        queue.sync {
            var st: OpaquePointer?
            let sql = "DELETE FROM \(TRIP_TABLE) WHERE module_type = ? AND specific_id = ?"
            guard sqlite3_prepare_v2(db, sql, -1, &st, nil) == SQLITE_OK else { return }
            sqlite3_bind_text(st, 1, module, -1, Self.SQLITE_TRANSIENT)
            sqlite3_bind_text(st, 2, id, -1, Self.SQLITE_TRANSIENT)
            sqlite3_step(st)
            sqlite3_finalize(st)
        }
    }

    private func text(_ st: OpaquePointer?, _ col: Int32) -> String {
        guard let c = sqlite3_column_text(st, col) else { return "" }
        return String(cString: c)
    }
}
