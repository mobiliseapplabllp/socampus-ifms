import Foundation
import Capacitor
import CoreLocation
import UIKit
import UserNotifications

/// Android ke LiveTrackerPlugin ka jawab - **method ke naam bilkul wahi** hain, isliye
/// Angular ka code dono platform par ek hi chalta hai.
///
/// iOS-only do method extra hain (`openPreciseLocation`, `openBackgroundRefresh`) kyunki
/// ye cheezein Android me hoti hi nahi.
@objc(LiveTrackerPlugin)
public class LiveTrackerPlugin: CAPPlugin, CLLocationManagerDelegate {

    private let prefs = LiveTrackerPrefs.shared
    private let tracker = LiveTrackerManager.shared
    private let db = LivePointsDb.shared

    /// Permission maangne ke liye alag manager - tracking wale ko chhedna nahi hai
    private let permissionManager = CLLocationManager()
    private var pendingPermissionCall: CAPPluginCall?

    /// iOS "Always" seedha nahi deta: pehle WhenInUse, phir upgrade ka sheet
    private enum AlwaysStage {
        case idle
        case waitingWhenInUse
        case waitingAlwaysUpgrade
    }
    private var stage: AlwaysStage = .idle
    /// Upgrade sheet ke turant baad iOS ek jhootha `.authorizedWhenInUse` deta hai -
    /// usse "user ne mana kiya" na samajh len, isliye 0.65s ka intezaar
    private var canTreatWhenInUseAsDeclined = false
    private var declineWork: DispatchWorkItem?

    override public func load() {
        permissionManager.delegate = self
    }

    // MARK: - status

    @objc func checkStatus(_ call: CAPPluginCall) {
        buildStatus { call.resolve($0) }
    }

    /// Notification ka haal async aata hai, isliye poora status callback me banta hai
    private func buildStatus(_ done: @escaping ([String: Any]) -> Void) {
        let servicesOn = LiveTrackerManager.locationServicesEnabled()
        let always = tracker.hasAlwaysAllow
        let precise = tracker.hasPreciseLocation
        let auth = tracker.authStatus

        // UIApplication sirf main thread se padhna hota hai. Capacitor plugin ke method
        // background queue par aate hain, par agar kabhi main se aa gaya to main.sync
        // deadlock kar deta - isliye pehle jaanch
        var backgroundRefresh = true
        let readRefresh = { backgroundRefresh = UIApplication.shared.backgroundRefreshStatus == .available }
        if Thread.isMainThread {
            readRefresh()
        } else {
            DispatchQueue.main.sync(execute: readRefresh)
        }
        let lowPower = ProcessInfo.processInfo.isLowPowerModeEnabled

        SpeedAlert.shared.isAuthorized { notif in
            var out: [String: Any] = [
                // Android wale hi naam - Angular ka interface ek hi rehta hai
                "gps": servicesOn,
                "location": always,
                // iOS me battery optimization jaisa kuch hai hi nahi
                "battery": true,
                "notifications": notif,
                // Activity Recognition abhi iOS me use nahi hoti
                "activityPermission": true,
                "fineGranted": auth == .authorizedAlways || auth == .authorizedWhenInUse,

                // iOS-only
                "preciseLocation": precise,
                "backgroundRefresh": backgroundRefresh,
                "lowPowerMode": lowPower,

                "running": self.prefs.enabled,
                "points": self.prefs.points,
                "startedAt": self.prefs.startedAt,
                "lastFixAt": self.prefs.lastFixAt,
                "lastLat": self.prefs.lastLat,
                "lastLng": self.prefs.lastLng,
                "lastUpload": self.prefs.lastUpload,
                "distance": self.prefs.distanceM,
                "lastSpeed": self.prefs.lastSpeed,
                "lastSpeedTrusted": self.prefs.lastSpeedTrusted,
                "lastSpeedEstimated": self.prefs.lastSpeedEstimated,
                "maxSpeedKmh": self.prefs.maxSpeedKmh,
                "lastGpsSpeed": self.prefs.lastGpsSpeed,
                "speedLimitKmh": self.prefs.speedLimitKmh,
                "gpsIntervalSec": Int(self.prefs.pingEveryMs / 1000),

                "tripActive": self.prefs.hasActiveTrip,
                "tripModule": self.prefs.tripModule,
                "tripId": self.prefs.tripId,
                "tripStartedAt": self.prefs.tripStartedAt,

                // iOS me interval fixed hai - adaptive wala logic hai hi nahi
                "adaptive": false,
                "currentIntervalSec": Int(self.prefs.pingEveryMs / 1000),
                "intervalReason": "fixed",
                "activity": ""
            ]
            out["accGoodM"] = self.prefs.accGoodM
            out["accRejectM"] = self.prefs.accRejectM
            done(out)
        }
    }

    // MARK: - start / stop

    @objc func start(_ call: CAPPluginCall) {
        guard tracker.hasAlwaysAllow else {
            call.reject("Location permission (Always allow) is not granted")
            return
        }
        guard LiveTrackerManager.locationServicesEnabled() else {
            call.reject("Location services are turned off")
            return
        }

        let url = call.getString("url") ?? ""
        let token = call.getString("token") ?? ""
        let referer = call.getString("referer") ?? ""
        if url.isEmpty {
            call.reject("Upload URL is required")
            return
        }

        // Debug screen se URL badla gaya ho to usi ko rakho
        if !prefs.urlCustom {
            prefs.url = url
        }
        prefs.token = token
        prefs.referer = referer
        prefs.resetSession()
        db.clear()                    // naya session = naya path
        prefs.enabled = true          // service start se pehle - resume isi par tika hai

        // Overspeed ka hooter notification se bajta hai, to ijazat yahin maang lo
        SpeedAlert.shared.requestPermission()

        tracker.start()
        buildStatus { call.resolve($0) }
    }

    @objc func stop(_ call: CAPPluginCall) {
        // Trip isi tracking par tiki hai - band ki to path beech me kat jaayega
        if prefs.hasActiveTrip {
            call.reject("Finish the active trip before stopping tracking")
            return
        }
        prefs.enabled = false
        tracker.stop()
        buildStatus { call.resolve($0) }
    }

    // MARK: - points

    @objc func getSessionPoints(_ call: CAPPluginCall) {
        call.resolve(["points": db.getAll()])
    }

    // MARK: - config (debug screen)

    @objc func getConfig(_ call: CAPPluginCall) {
        call.resolve([
            "gpsIntervalSec": Int(prefs.pingEveryMs / 1000),
            "speedLimitKmh": prefs.speedLimitKmh,
            "url": prefs.url,
            "urlCustom": prefs.urlCustom,
            "running": prefs.enabled,
            // iOS me adaptive hai hi nahi - debug screen ye sab disabled dikhayegi
            "adaptive": false,
            "minIntervalSec": Int(prefs.pingEveryMs / 1000),
            "maxIntervalSec": Int(prefs.pingEveryMs / 1000),
            "accGoodM": prefs.accGoodM,
            "accRejectM": prefs.accRejectM
        ])
    }

    @objc func setConfig(_ call: CAPPluginCall) {
        if let sec = call.getInt("gpsIntervalSec"), sec >= 15 {
            prefs.pingEveryMs = Double(sec) * 1000
        }
        if let limit = call.getDouble("speedLimitKmh"), limit > 0 {
            prefs.speedLimitKmh = limit
        }
        if let good = call.getDouble("accGoodM"), good > 0 {
            prefs.accGoodM = good
        }
        if let reject = call.getDouble("accRejectM"), reject > 0 {
            prefs.accRejectM = reject
        }
        if call.getBool("resetUrl") == true {
            prefs.urlCustom = false
        } else if let url = call.getString("url"), !url.isEmpty {
            prefs.url = url
            prefs.urlCustom = true
        }

        // Interval badla to timer dobara lagana padega
        var restarted = false
        if prefs.enabled {
            tracker.stop()
            tracker.start()
            restarted = true
        }

        buildStatus { status in
            var out = status
            out["restarted"] = restarted
            call.resolve(out)
        }
    }

    // MARK: - trip

    @objc func startTrip(_ call: CAPPluginCall) {
        let module = call.getString("module") ?? ""
        let id = call.getString("id") ?? ""
        if module.isEmpty || id.isEmpty {
            call.reject("Trip module and id are required")
            return
        }
        guard prefs.enabled else {
            call.reject("Please punch in from the side menu before starting a trip")
            return
        }

        if prefs.hasActiveTrip {
            let same = module == prefs.tripModule && id == prefs.tripId
            if !same {
                call.reject("Another trip is already active (\(prefs.tripModule) #\(prefs.tripId))")
                return
            }
            call.resolve(tripStatus())
            return
        }

        let now = Date().timeIntervalSince1970 * 1000
        prefs.setActiveTrip(module: module, id: id, at: now)
        // Har trip ko apna ek hooter
        prefs.alarmPlayed = false

        // Shuruati point turant - taaki trip ka path ghar se hi shuru ho
        if let lat = call.getDouble("lat"), let lng = call.getDouble("lng") {
            db.insertTrip(module: module, id: id, lat: lat, lng: lng, speedKmh: 0,
                          accuracy: call.getDouble("accuracy") ?? 0, time: now,
                          accepted: true, reason: "trip start",
                          distM: 0, intervalS: Int(prefs.pingEveryMs / 1000),
                          battery: LiveUploader.batteryPercent())
        }

        call.resolve(tripStatus())
    }

    @objc func getTripPoints(_ call: CAPPluginCall) {
        let module = call.getString("module") ?? ""
        let id = call.getString("id") ?? ""
        call.resolve(["points": db.getTripPoints(module: module, id: id)])
    }

    @objc func endTrip(_ call: CAPPluginCall) {
        prefs.clearActiveTrip()
        // Agli trip ka hooter phir se bajna chahiye
        prefs.alarmPlayed = false
        call.resolve(tripStatus())
    }

    /// Points sirf End Trip API ke **success** ke baad hatte hain - Angular ye tab bulata hai
    @objc func clearTrip(_ call: CAPPluginCall) {
        let module = call.getString("module") ?? ""
        let id = call.getString("id") ?? ""
        db.clearTrip(module: module, id: id)
        call.resolve()
    }

    @objc func getActiveTrip(_ call: CAPPluginCall) {
        call.resolve(tripStatus())
    }

    private func tripStatus() -> [String: Any] {
        [
            "active": prefs.hasActiveTrip,
            "module": prefs.tripModule,
            "id": prefs.tripId,
            "startedAt": prefs.tripStartedAt
        ]
    }

    // MARK: - permission wale button

    /// Phone ka master toggle Privacy me hai, wahan seedha nahi ja sakte - app ka page hi khulta hai
    @objc func openGpsSettings(_ call: CAPPluginCall) {
        openAppSettings(call)
    }

    /// Yahi asli kaam karta hai: pehli baar prompt, warna Settings
    @objc func openLocationPermission(_ call: CAPPluginCall) {
        let status = tracker.authStatus

        if status == .authorizedAlways {
            call.resolve(["opened": false, "allowed": true])
            return
        }

        pendingPermissionCall = call
        stage = .idle

        if status == .notDetermined {
            stage = .waitingWhenInUse
            DispatchQueue.main.async { self.permissionManager.requestWhenInUseAuthorization() }
            return
        }

        if status == .authorizedWhenInUse {
            stage = .waitingAlwaysUpgrade
            scheduleDeclineDetection()
            DispatchQueue.main.async { self.permissionManager.requestAlwaysAuthorization() }
            return
        }

        // Ek baar deny ho gaya - iOS dobara prompt nahi dikhata, sirf Settings ka rasta
        pendingPermissionCall = nil
        stage = .idle
        openAppSettings(call)
    }

    /// iOS me battery optimization jaisa kuch nahi - Android se naam ek hi rakha hai
    @objc func openBatterySettings(_ call: CAPPluginCall) {
        call.resolve(["opened": false])
    }

    @objc func openNotificationSettings(_ call: CAPPluginCall) {
        SpeedAlert.shared.isAuthorized { [weak self] granted in
            if granted {
                call.resolve(["opened": false])
                return
            }
            UNUserNotificationCenter.current().getNotificationSettings { settings in
                if settings.authorizationStatus == .notDetermined {
                    SpeedAlert.shared.requestPermission { ok in
                        call.resolve(["opened": false, "allowed": ok])
                    }
                } else {
                    self?.openAppSettings(call)
                }
            }
        }
    }

    /// Android me Physical Activity hai; iOS me abhi Core Motion use hi nahi hoti
    @objc func openActivityPermission(_ call: CAPPluginCall) {
        call.resolve(["opened": false])
    }

    /// iOS-only - "Precise Location" ka toggle app ke apne Settings page par hi hota hai
    @objc func openPreciseLocation(_ call: CAPPluginCall) {
        openAppSettings(call)
    }

    /// iOS-only - Background App Refresh bhi usi page par hota hai
    @objc func openBackgroundRefresh(_ call: CAPPluginCall) {
        openAppSettings(call)
    }

    private func openAppSettings(_ call: CAPPluginCall) {
        DispatchQueue.main.async {
            guard let url = URL(string: UIApplication.openSettingsURLString),
                  UIApplication.shared.canOpenURL(url) else {
                call.resolve(["opened": false])
                return
            }
            UIApplication.shared.open(url)
            call.resolve(["opened": true])
        }
    }

    // MARK: - permission ka jawab

    private func finishPermissionCall(allowed: Bool) {
        declineWork?.cancel()
        declineWork = nil
        canTreatWhenInUseAsDeclined = false
        guard let call = pendingPermissionCall else { return }
        call.resolve(["opened": false, "allowed": allowed])
        pendingPermissionCall = nil
        stage = .idle
    }

    private func scheduleDeclineDetection() {
        declineWork?.cancel()
        canTreatWhenInUseAsDeclined = false
        let work = DispatchWorkItem { [weak self] in
            self?.canTreatWhenInUseAsDeclined = true
        }
        declineWork = work
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.65, execute: work)
    }

    private func handleAuthorizationChange() {
        // Always mil gayi aur tracking on thi - turant chalu kar do
        if tracker.hasAlwaysAllow && prefs.enabled {
            tracker.start()
        }

        guard pendingPermissionCall != nil else { return }

        switch tracker.authStatus {
        case .authorizedAlways:
            finishPermissionCall(allowed: true)

        case .authorizedWhenInUse:
            switch stage {
            case .waitingWhenInUse:
                // Pehla step ho gaya - ab Always ka upgrade sheet
                stage = .waitingAlwaysUpgrade
                scheduleDeclineDetection()
                DispatchQueue.main.async { self.permissionManager.requestAlwaysAuthorization() }
            case .waitingAlwaysUpgrade:
                if canTreatWhenInUseAsDeclined {
                    finishPermissionCall(allowed: false)
                }
            case .idle:
                break
            }

        case .denied, .restricted:
            finishPermissionCall(allowed: false)

        case .notDetermined:
            break

        @unknown default:
            finishPermissionCall(allowed: false)
        }
    }

    public func locationManagerDidChangeAuthorization(_ manager: CLLocationManager) {
        if #available(iOS 14.0, *) {
            handleAuthorizationChange()
        }
    }

    public func locationManager(_ manager: CLLocationManager, didChangeAuthorization status: CLAuthorizationStatus) {
        if #available(iOS 14.0, *) { return }
        handleAuthorizationChange()
    }
}
