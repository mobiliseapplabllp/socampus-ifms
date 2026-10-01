import Foundation

/// Android ke LiveTrackerPrefs ka jawab - wahi kaam, wahi key naam.
/// Manager, plugin aur AppDelegate teeno isi se padhte-likhte hain, isliye app
/// background me dobara launch ho jaye tab bhi url/token/trip yahin se mil jaate hain.
///
/// Android: SharedPreferences  |  iOS: UserDefaults  (dono me data app band hone par bhi bacha rehta hai)
final class LiveTrackerPrefs {

    static let shared = LiveTrackerPrefs()

    private let d = UserDefaults.standard

    // Android wale hi naam - dono taraf grep karna aasan rahe
    private enum K {
        static let enabled = "lt_enabled"
        static let url = "lt_url"
        static let token = "lt_token"
        static let referer = "lt_referer"
        static let urlCustom = "lt_url_custom"

        static let points = "lt_points"
        static let startedAt = "lt_started_at"
        static let lastFixAt = "lt_last_fix_at"
        static let lastLat = "lt_last_lat"
        static let lastLng = "lt_last_lng"
        static let lastSpeed = "lt_last_speed"
        static let lastGpsSpeed = "lt_last_gps_speed"
        static let lastAccuracy = "lt_last_accuracy"
        static let lastUpload = "lt_last_upload"
        static let lastPingAt = "lt_last_ping_at"
        static let distance = "lt_distance_m"
        static let maxSpeed = "lt_max_speed_kmh"
        static let speedTrusted = "lt_last_speed_trusted"
        static let speedEstimated = "lt_last_speed_est"
        static let alarmPlayed = "lt_alarm_played"

        static let tripModule = "lt_trip_module"
        static let tripId = "lt_trip_id"
        static let tripStartedAt = "lt_trip_started_at"

        static let speedLimit = "lt_speed_limit_kmh"
        static let pingEvery = "lt_ping_every_ms"
        static let accGood = "lt_acc_good_m"
        static let accReject = "lt_acc_reject_m"

        static let anchorLat = "lt_anchor_lat"
        static let anchorLng = "lt_anchor_lng"
        static let anchorAcc = "lt_anchor_acc"
        static let anchorAt = "lt_anchor_at"
    }

    // Android jaise hi default - dono platform ek jaisa bartav karein
    static let defaultSpeedLimitKmh: Double = 50
    /// iOS par interval fixed hai - adaptive logic yahan hai hi nahi (LIVE-TRACKING.md section 14)
    static let defaultPingEveryMs: Double = 60_000
    static let defaultAccGoodM: Double = 50
    static let defaultAccRejectM: Double = 150

    private init() {}

    // MARK: - on/off aur server ki settings

    var enabled: Bool {
        get { d.bool(forKey: K.enabled) }
        set { d.set(newValue, forKey: K.enabled) }
    }

    var url: String {
        get { d.string(forKey: K.url) ?? "" }
        set { d.set(newValue, forKey: K.url) }
    }

    var token: String {
        get { d.string(forKey: K.token) ?? "" }
        set { d.set(newValue, forKey: K.token) }
    }

    /// Native seedha server par jaata hai, isliye asli `Referer` - Angular ka `Referer1` sirf proxy ke liye hai
    var referer: String {
        get { d.string(forKey: K.referer) ?? "" }
        set { d.set(newValue, forKey: K.referer) }
    }

    var urlCustom: Bool {
        get { d.bool(forKey: K.urlCustom) }
        set { d.set(newValue, forKey: K.urlCustom) }
    }

    // MARK: - session ke aankde

    var points: Int {
        get { d.integer(forKey: K.points) }
        set { d.set(newValue, forKey: K.points) }
    }

    var startedAt: Double {
        get { d.double(forKey: K.startedAt) }
        set { d.set(newValue, forKey: K.startedAt) }
    }

    var lastFixAt: Double {
        get { d.double(forKey: K.lastFixAt) }
        set { d.set(newValue, forKey: K.lastFixAt) }
    }

    var lastLat: Double {
        get { d.double(forKey: K.lastLat) }
        set { d.set(newValue, forKey: K.lastLat) }
    }

    var lastLng: Double {
        get { d.double(forKey: K.lastLng) }
        set { d.set(newValue, forKey: K.lastLng) }
    }

    /// m/s - Android jaisa hi unit, km/h me badalna UI ka kaam
    var lastSpeed: Double {
        get { d.double(forKey: K.lastSpeed) }
        set { d.set(newValue, forKey: K.lastSpeed) }
    }

    var lastGpsSpeed: Double {
        get { d.double(forKey: K.lastGpsSpeed) }
        set { d.set(newValue, forKey: K.lastGpsSpeed) }
    }

    var lastAccuracy: Double {
        get { d.double(forKey: K.lastAccuracy) }
        set { d.set(newValue, forKey: K.lastAccuracy) }
    }

    var lastUpload: String {
        get { d.string(forKey: K.lastUpload) ?? "-" }
        set { d.set(newValue, forKey: K.lastUpload) }
    }

    /// Server ne aakhri ping kab store ki - minute wala throttle isi par chalta hai
    var lastPingAt: Double {
        get { d.double(forKey: K.lastPingAt) }
        set { d.set(newValue, forKey: K.lastPingAt) }
    }

    var distanceM: Double {
        get { d.double(forKey: K.distance) }
        set { d.set(newValue, forKey: K.distance) }
    }

    var maxSpeedKmh: Double {
        get { d.double(forKey: K.maxSpeed) }
        set { d.set(newValue, forKey: K.maxSpeed) }
    }

    var lastSpeedTrusted: Bool {
        get { d.bool(forKey: K.speedTrusted) }
        set { d.set(newValue, forKey: K.speedTrusted) }
    }

    var lastSpeedEstimated: Bool {
        get { d.bool(forKey: K.speedEstimated) }
        set { d.set(newValue, forKey: K.speedEstimated) }
    }

    /// Hooter session/trip me ek hi baar - app band hokar wapas aaye tab bhi yaad rahe
    var alarmPlayed: Bool {
        get { d.bool(forKey: K.alarmPlayed) }
        set { d.set(newValue, forKey: K.alarmPlayed) }
    }

    func addDistance(_ m: Double) {
        distanceM += m
    }

    // MARK: - trip

    var tripModule: String {
        get { d.string(forKey: K.tripModule) ?? "" }
        set { d.set(newValue, forKey: K.tripModule) }
    }

    var tripId: String {
        get { d.string(forKey: K.tripId) ?? "" }
        set { d.set(newValue, forKey: K.tripId) }
    }

    var tripStartedAt: Double {
        get { d.double(forKey: K.tripStartedAt) }
        set { d.set(newValue, forKey: K.tripStartedAt) }
    }

    var hasActiveTrip: Bool {
        !tripModule.isEmpty && !tripId.isEmpty
    }

    func setActiveTrip(module: String, id: String, at: Double) {
        tripModule = module
        tripId = id
        tripStartedAt = at
    }

    func clearActiveTrip() {
        tripModule = ""
        tripId = ""
        tripStartedAt = 0
    }

    // MARK: - config (debug screen se badalte hain)

    var speedLimitKmh: Double {
        get { d.object(forKey: K.speedLimit) == nil ? Self.defaultSpeedLimitKmh : d.double(forKey: K.speedLimit) }
        set { d.set(newValue, forKey: K.speedLimit) }
    }

    var pingEveryMs: Double {
        get { d.object(forKey: K.pingEvery) == nil ? Self.defaultPingEveryMs : d.double(forKey: K.pingEvery) }
        set { d.set(newValue, forKey: K.pingEvery) }
    }

    var accGoodM: Double {
        get { d.object(forKey: K.accGood) == nil ? Self.defaultAccGoodM : d.double(forKey: K.accGood) }
        set { d.set(newValue, forKey: K.accGood) }
    }

    var accRejectM: Double {
        get { d.object(forKey: K.accReject) == nil ? Self.defaultAccRejectM : d.double(forKey: K.accReject) }
        set { d.set(newValue, forKey: K.accReject) }
    }

    // MARK: - location filter ka anchor (aakhri pakki jagah)

    var hasAnchor: Bool { d.double(forKey: K.anchorAt) > 0 }
    var anchorLat: Double { d.double(forKey: K.anchorLat) }
    var anchorLng: Double { d.double(forKey: K.anchorLng) }
    var anchorAcc: Double { d.double(forKey: K.anchorAcc) }
    var anchorAt: Double { d.double(forKey: K.anchorAt) }

    func setAnchor(lat: Double, lng: Double, acc: Double, at: Double) {
        d.set(lat, forKey: K.anchorLat)
        d.set(lng, forKey: K.anchorLng)
        d.set(acc, forKey: K.anchorAcc)
        d.set(at, forKey: K.anchorAt)
    }

    /// Jagah wahi hai, sirf waqt aage badha do (drift wala case)
    func touchAnchor(at: Double, acc: Double) {
        d.set(at, forKey: K.anchorAt)
        d.set(acc, forKey: K.anchorAcc)
    }

    func clearAnchor() {
        d.removeObject(forKey: K.anchorLat)
        d.removeObject(forKey: K.anchorLng)
        d.removeObject(forKey: K.anchorAcc)
        d.removeObject(forKey: K.anchorAt)
    }

    // MARK: - naya session

    /// Android ke resetSession() jaisa - counters zero, hooter dobara baj sake
    func resetSession() {
        points = 0
        startedAt = Date().timeIntervalSince1970 * 1000
        lastFixAt = 0
        lastLat = 0
        lastLng = 0
        lastSpeed = 0
        lastGpsSpeed = 0
        lastAccuracy = 0
        distanceM = 0
        maxSpeedKmh = 0
        lastUpload = "-"
        lastPingAt = 0
        alarmPlayed = false
        lastSpeedTrusted = false
        lastSpeedEstimated = false
        clearAnchor()
    }
}
