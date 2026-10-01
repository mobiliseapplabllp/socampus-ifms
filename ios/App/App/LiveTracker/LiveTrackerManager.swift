import Foundation
import CoreLocation
import UIKit

/// Android ki LiveTrackerService ka jawab. Farak sirf do hain (LIVE-TRACKING.md section 14):
///
///  1. **Interval fixed hai** - har 60 second par ek ping. iOS me "GPS band karke alarm se
///     jagana" ho hi nahi sakta (app suspend ho jaati hai aur khud jaag nahi sakti),
///     isliye adaptive wala poora logic yahan hai hi nahi.
///  2. **Zinda rehne ka tarika** - foreground service ki jagah `allowsBackgroundLocationUpdates`.
///     Updates chalte rehte hain, isliye app suspend nahi hoti aur timer bhi chalta rehta hai.
///
/// Baaki sab Android jaisa: wahi location filter, wahi speed trust, wahi SQLite schema,
/// wahi ping payload, wahi overspeed niyam.
final class LiveTrackerManager: NSObject, CLLocationManagerDelegate {

    static let shared = LiveTrackerManager()

    private let manager = CLLocationManager()
    /// Sirf "abhi ek fix do" ke liye alag manager. Chalti hui updates ko chhede bina
    /// har minute ek taaza fix maang lete hain - khada aadmi ho to updates aati hi nahi
    private let kickManager = CLLocationManager()
    private let prefs = LiveTrackerPrefs.shared
    private let db = LivePointsDb.shared

    // MARK: - constants (Android wale hi numbers)

    /// Chalte hue itni doori par ek point - Android ke ~200m spacing se ghana,
    /// kyunki yahan interval nahi badalta. Trip ka map isse seedha banta hai
    private let MOVING_DISTANCE_FILTER: CLLocationDistance = 50
    /// GPS speed tabhi maano jab fix itna pakka ho
    private let SPEED_TRUST_ACCURACY_M: Double = 50
    private let SPEED_ACCURACY_MAX_MS: Double = 5
    /// Isse purana fix = cached location (relaunch par aati hai) - speed nahi
    private let STALE_FIX_S: Double = 15
    /// 180 km/h - isse upar = location koodi hai
    private let MAX_PLAUSIBLE_SPEED_MS: Double = 50
    private let MIN_DISTANCE_STEP_M: Double = 10
    /// 3 km/h se kam = khada
    private let STILL_DISPLAY_MS: Double = 3 / 3.6
    private let ANCHOR_MAX_AGE_MS: Double = 10 * 60 * 1000
    private let KMH_PER_MS: Double = 3.6
    /// Alarm dobara tabhi jab speed re-arm se neeche aake wapas limit paar kare
    private let SPEED_REARM_GAP_KMH: Double = 5
    /// App mar jaye to iOS isse bahar nikalte hi dobara launch karta hai
    private let ANCHOR_REGION_RADIUS: CLLocationDistance = 150
    private let ANCHOR_REGION_ID = "live-tracker-anchor"

    // MARK: - state

    private var timer: Timer?
    private var overspeedArmed = false

    private override init() {
        super.init()
        manager.delegate = self
        manager.desiredAccuracy = kCLLocationAccuracyNearestTenMeters
        manager.distanceFilter = MOVING_DISTANCE_FILTER
        // iOS khud pause kar de to app so jaayegi aur ping rukti rahegi
        manager.pausesLocationUpdatesAutomatically = false
        manager.activityType = .automotiveNavigation

        kickManager.delegate = self
        kickManager.desiredAccuracy = kCLLocationAccuracyNearestTenMeters
    }

    // MARK: - permission

    var authStatus: CLAuthorizationStatus {
        if #available(iOS 14.0, *) { return manager.authorizationStatus }
        return CLLocationManager.authorizationStatus()
    }

    var hasAlwaysAllow: Bool { authStatus == .authorizedAlways }

    /// iOS 14+ ka "Precise Location" - off ho to location 1-3 km ki aati hai, tracking bekaar
    var hasPreciseLocation: Bool {
        if #available(iOS 14.0, *) {
            return manager.accuracyAuthorization == .fullAccuracy
        }
        return true   // iOS 13 me ye concept hi nahi tha
    }

    /// Phone ka master toggle. Apple main thread par call karne se mana karta hai
    static func locationServicesEnabled() -> Bool {
        CLLocationManager.locationServicesEnabled()
    }

    // MARK: - start / stop

    /// `start()` sirf tab chalta hai jab Always mil chuki ho - plugin pehle jaanch karta hai
    func start() {
        DispatchQueue.main.async {
            guard self.hasAlwaysAllow else {
                NSLog("LiveTracker: start ignored - Always permission nahi hai")
                return
            }

            self.manager.allowsBackgroundLocationUpdates = true
            if #available(iOS 11.0, *) {
                self.manager.showsBackgroundLocationIndicator = true
            }
            self.manager.distanceFilter = self.MOVING_DISTANCE_FILTER
            self.manager.startUpdatingLocation()

            // App mar jaye to wapas laane ke do jaal - dono par bharosa nahi,
            // isliye dono lagate hain
            self.manager.startMonitoringSignificantLocationChanges()

            self.startTimer()
            self.overspeedArmed = false
            NSLog("LiveTracker: started (iOS)")
        }
    }

    func stop() {
        DispatchQueue.main.async {
            self.stopTimer()
            self.manager.stopUpdatingLocation()
            self.manager.stopMonitoringSignificantLocationChanges()
            self.clearAnchorRegion()
            self.manager.allowsBackgroundLocationUpdates = false
            NSLog("LiveTracker: stopped (iOS)")
        }
    }

    /// App ko iOS ne background me dobara launch kiya (location event / SLC / region) -
    /// AppDelegate yahi bulata hai. Android ke boot receiver + watchdog ka jawab.
    func resumeIfEnabled() {
        guard prefs.enabled, hasAlwaysAllow else { return }
        NSLog("LiveTracker: resume - prefs me tracking on hai")
        start()
    }

    var isRunning: Bool { timer != nil }

    // MARK: - 60 second ka timer

    private func startTimer() {
        stopTimer()
        let every = max(prefs.pingEveryMs / 1000, 15)
        let t = Timer(timeInterval: every, repeats: true) { [weak self] _ in
            self?.tick()
        }
        // Scroll/animation ke waqt bhi chale
        RunLoop.main.add(t, forMode: .common)
        timer = t
    }

    private func stopTimer() {
        timer?.invalidate()
        timer = nil
    }

    /// Har minute ek fix - **khada ho tab bhi**.
    ///
    /// Pehle yahan sirf `distanceFilter` hataya jaata tha, par jagah na badle to
    /// CoreLocation naya fix deta hi nahi (simulator par 6 minute me sirf 2 point aaye the).
    /// `requestLocation()` zabardasti ek fix deta hai - isi se har minute wali ping pakki hoti hai.
    private func tick() {
        guard prefs.enabled else { return }
        kickManager.requestLocation()
    }

    // MARK: - fix aana

    /// Dono manager ka fix yahin aata hai - chalte hue wala (har ~50 m) aur
    /// minute wala (kickManager). Aage ka hisaab dono ke liye ek hi hai
    func locationManager(_ manager: CLLocationManager, didUpdateLocations locations: [CLLocation]) {
        guard let loc = locations.last else { return }
        handleFix(loc)
    }

    func locationManager(_ manager: CLLocationManager, didFailWithError error: Error) {
        // kickManager ka fail hona aam hai (fix na mila) - tracking rukti nahi,
        // agle minute phir koshish hogi
        NSLog("LiveTracker: location error \(error.localizedDescription)")
    }

    /// App mar chuki ho to iOS ise paar karte hi app ko background me launch kar deta hai
    func locationManager(_ manager: CLLocationManager, didExitRegion region: CLRegion) {
        guard region.identifier == ANCHOR_REGION_ID else { return }
        resumeIfEnabled()
    }

    // MARK: - Android ke handleFix ka tarjuma

    private func handleFix(_ loc: CLLocation) {
        let lat = loc.coordinate.latitude
        let lng = loc.coordinate.longitude
        let accuracy = loc.horizontalAccuracy
        let fixTime = loc.timestamp.timeIntervalSince1970 * 1000
        let now = Date().timeIntervalSince1970 * 1000

        // ---- 1. Speed - sirf pakki reading par
        let trusted = isSpeedTrusted(loc, accuracy: accuracy)
        var speedMs = trusted ? max(loc.speed, 0) : 0
        if trusted && speedMs < STILL_DISPLAY_MS { speedMs = 0 }
        var kmh = speedMs * KMH_PER_MS

        // ---- 2. Location filter - asli chalna ya GPS ka shor? (Android jaisa hi)
        let good = prefs.accGoodM
        let reject = prefs.accRejectM

        var accepted = true
        var reason = "ok"
        var addedM: Double = 0
        var derivedKmh: Double = -1

        var anchorDist: Double = 0
        let hasAnchor = prefs.hasAnchor
        if hasAnchor {
            anchorDist = CLLocation(latitude: prefs.anchorLat, longitude: prefs.anchorLng)
                .distance(from: CLLocation(latitude: lat, longitude: lng))
        }
        let dt = hasAnchor ? fixTime - prefs.anchorAt : 0

        if hasAnchor && dt <= 0 {
            // Anchor se purana (cached) fix - relaunch par aksar aata hai
            accepted = false
            reason = "stale fix"
        } else if accuracy <= 0 || accuracy > reject {
            accepted = false
            reason = "accuracy > \(Int(reject))m"
        } else if !hasAnchor {
            reason = "ok (first)"
            setAnchor(lat: lat, lng: lng, acc: accuracy, at: fixTime)
        } else if accuracy > good && dt > ANCHOR_MAX_AGE_MS {
            // Der tak sirf kharab fix aaye - shayad sach me hil gaya. Nayi jagah maano,
            // par koodne ka shak hai isliye distance mat jodo
            reason = "anchor reset"
            setAnchor(lat: lat, lng: lng, acc: accuracy, at: fixTime)
        } else if accuracy > good && anchorDist <= 2 * accuracy {
            accepted = false
            reason = "stayed at anchor"
        } else {
            let drift = anchorDist <= max(prefs.anchorAcc + accuracy, MIN_DISTANCE_STEP_M)
            let seconds = dt / 1000
            let jump = seconds > 0 && (anchorDist / seconds) > MAX_PLAUSIBLE_SPEED_MS

            if jump {
                reason = "jump, not counted"
                setAnchor(lat: lat, lng: lng, acc: accuracy, at: fixTime)
            } else if drift {
                // Jagah wahi - anchor mat khisakao, bas "abhi bhi yahin" ki pushti
                reason = "ok"
                prefs.touchAnchor(at: fixTime, acc: accuracy)
            } else {
                reason = "ok"
                if seconds > 0 {
                    derivedKmh = anchorDist / seconds * KMH_PER_MS
                }
                addedM = anchorDist
                prefs.addDistance(anchorDist)
                setAnchor(lat: lat, lng: lng, acc: accuracy, at: fixTime)
            }
        }

        // ---- 3. Speed pakki na ho par hilna sabit ho to doori/time wali speed
        var estimated = false
        if !trusted && derivedKmh >= 0 && accuracy <= good {
            kmh = derivedKmh
            estimated = true
        }

        // ---- 4. Overspeed - session/trip me ek hi baar
        let limit = prefs.speedLimitKmh
        var alarmed = false
        if kmh >= limit {
            if !overspeedArmed && !prefs.alarmPlayed {
                alarmed = true
                overspeedArmed = true
                prefs.alarmPlayed = true
                SpeedAlert.shared.fire(speedKmh: kmh, limitKmh: limit)
            }
        } else if kmh < limit - SPEED_REARM_GAP_KMH {
            overspeedArmed = false
        }

        // ---- 5. Stats (status aur debug screen ke liye)
        prefs.points += 1
        prefs.lastFixAt = now
        prefs.lastLat = lat
        prefs.lastLng = lng
        prefs.lastSpeed = kmh / KMH_PER_MS
        prefs.lastGpsSpeed = max(loc.speed, 0)
        prefs.lastAccuracy = accuracy
        prefs.lastSpeedTrusted = trusted
        prefs.lastSpeedEstimated = estimated
        if kmh > prefs.maxSpeedKmh { prefs.maxSpeedKmh = kmh }

        // ---- 6. Save + (minute me ek baar) ping
        let battery = LiveUploader.batteryPercent()
        let intervalS = Int(prefs.pingEveryMs / 1000)

        // Trip ki pehchaan abhi pakad lo - upload me 15s lag sakte hain, us beech
        // trip end ho gayi to point galat trip me chala jaayega
        let tripModule = prefs.hasActiveTrip ? prefs.tripModule : nil
        let tripId = prefs.hasActiveTrip ? prefs.tripId : nil

        if let m = tripModule, let t = tripId {
            db.insertTrip(module: m, id: t, lat: lat, lng: lng, speedKmh: kmh,
                          accuracy: accuracy, time: now, accepted: accepted, reason: reason,
                          distM: addedM, intervalS: intervalS, battery: battery)
        }

        let rowId = db.insert(lat: lat, lng: lng, speedKmh: kmh, accuracy: accuracy,
                              time: now, alarmed: alarmed, accepted: accepted, reason: reason,
                              distM: addedM, intervalS: intervalS, battery: battery)

        // Server minute me ek hi ping rakhta hai - baaki "skipped". Ghane points
        // phone ki SQLite me rehte hain taaki trip ka path poora bane
        let sinceMs = fixTime - prefs.lastPingAt
        if prefs.lastPingAt > 0 && sinceMs >= 0 && sinceMs < prefs.pingEveryMs {
            let result = "held \(Int(sinceMs / 1000))s"
            db.setUploadResult(rowId: rowId, result: result)
            return
        }

        LiveUploader.shared.upload(lat: lat, lng: lng, kmh: kmh, accuracy: accuracy,
                                   fixTime: now, battery: battery) { [weak self] result in
            guard let self = self else { return }
            // Store hua to agla minute yahan se. Skip / fail par agla fix phir koshish karega
            if result.hasPrefix("2") && !result.hasSuffix("skipped") {
                self.prefs.lastPingAt = fixTime
            }
            self.prefs.lastUpload = result
            self.db.setUploadResult(rowId: rowId, result: result)
        }
    }

    /// Android ke isSpeedTrusted ka tarjuma - kharab reading ki speed 0 maani jaati hai
    private func isSpeedTrusted(_ loc: CLLocation, accuracy: Double) -> Bool {
        guard loc.speed >= 0 else { return false }
        if abs(loc.timestamp.timeIntervalSinceNow) > STALE_FIX_S { return false }
        if accuracy <= 0 || accuracy > SPEED_TRUST_ACCURACY_M { return false }
        if #available(iOS 10.0, *) {
            if loc.speedAccuracy >= 0 && loc.speedAccuracy > SPEED_ACCURACY_MAX_MS { return false }
        }
        return loc.speed <= MAX_PLAUSIBLE_SPEED_MS
    }

    // MARK: - region (app mar jaye to wapas laane ka jaal)

    /// Anchor jahan bhi set ho, region wahin. Pehle ye sirf "asli chalne" wale case me
    /// lagta tha - matlab jo banda punch in karke khada hi raha, uski app kill hone par
    /// koi jaal hi nahi bachta tha (SLC ke 500 m ka intezaar karna padta)
    private func setAnchor(lat: Double, lng: Double, acc: Double, at: Double) {
        prefs.setAnchor(lat: lat, lng: lng, acc: acc, at: at)
        armAnchorRegion(lat: lat, lng: lng)
    }

    private func armAnchorRegion(lat: Double, lng: Double) {
        clearAnchorRegion()
        guard CLLocationManager.isMonitoringAvailable(for: CLCircularRegion.self) else { return }
        let region = CLCircularRegion(
            center: CLLocationCoordinate2D(latitude: lat, longitude: lng),
            radius: ANCHOR_REGION_RADIUS,
            identifier: ANCHOR_REGION_ID
        )
        region.notifyOnExit = true
        region.notifyOnEntry = false
        manager.startMonitoring(for: region)
    }

    private func clearAnchorRegion() {
        for r in manager.monitoredRegions where r.identifier == ANCHOR_REGION_ID {
            manager.stopMonitoring(for: r)
        }
    }
}
