import Foundation
import UIKit

/// Server par ping - payload aur headers **bilkul Android jaise** (LIVE-TRACKING.md section 6).
/// Angular ka `Referer1` sirf CORS proxy ke liye hai; native seedha server par jaata hai,
/// isliye yahan asli `Referer` jaata hai - na ho to server 403 deta hai.
final class LiveUploader {

    static let shared = LiveUploader()

    private let prefs = LiveTrackerPrefs.shared

    private init() {}

    /// Server ka format - India ka time, bina timezone ke: 2026-09-29 14:32:10
    private lazy var stamp: DateFormatter = {
        let f = DateFormatter()
        f.dateFormat = "yyyy-MM-dd HH:mm:ss"
        f.locale = Locale(identifier: "en_US_POSIX")
        f.timeZone = TimeZone(identifier: "Asia/Kolkata")
        return f
    }()

    /// Phone ki battery (0-100), na mile to -1
    static func batteryPercent() -> Int {
        UIDevice.current.isBatteryMonitoringEnabled = true
        let level = UIDevice.current.batteryLevel
        guard level >= 0 else { return -1 }
        return Int((level * 100).rounded())
    }

    /// Result string wahi jo Android me hai - "200 stored" / "200 skipped" / "403 ..." / "no network"
    func upload(lat: Double, lng: Double, kmh: Double, accuracy: Double,
                fixTime: Double, battery: Int, completion: @escaping (String) -> Void) {

        let urlString = prefs.url
        guard !urlString.isEmpty, let url = URL(string: urlString) else {
            completion("no url")
            return
        }

        var body: [String: Any] = [
            "lat": lat,
            "lng": lng,
            "speed": (kmh * 10).rounded() / 10,
            "recorded_at": stamp.string(from: Date(timeIntervalSince1970: fixTime / 1000)),
            "accuracy": (accuracy * 10).rounded() / 10
        ]
        if battery >= 0 {
            body["battery"] = battery
        }
        // iOS me abhi Activity Recognition nahi hai (LIVE-TRACKING.md section 14) -
        // payload ka aakar Android jaisa rakhne ke liye "Unknown" bhejte hain
        body["activity"] = "Unknown"

        var req = URLRequest(url: url)
        req.httpMethod = "POST"
        req.timeoutInterval = 15
        req.setValue("application/json", forHTTPHeaderField: "Content-Type")
        req.setValue("application/json", forHTTPHeaderField: "Accept")

        let token = prefs.token
        if !token.isEmpty {
            req.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        }
        let referer = prefs.referer
        if !referer.isEmpty {
            req.setValue(referer, forHTTPHeaderField: "Referer")
        }

        req.httpBody = try? JSONSerialization.data(withJSONObject: body)

        // App background me kabhi bhi suspend ho sakti hai - iOS se thodi mohlat maang
        // lete hain taaki ping beech me na kate
        var taskId: UIBackgroundTaskIdentifier = .invalid
        taskId = UIApplication.shared.beginBackgroundTask(withName: "live-ping") {
            if taskId != .invalid {
                UIApplication.shared.endBackgroundTask(taskId)
                taskId = .invalid
            }
        }

        let finish: (String) -> Void = { result in
            completion(result)
            if taskId != .invalid {
                UIApplication.shared.endBackgroundTask(taskId)
                taskId = .invalid
            }
        }

        URLSession.shared.dataTask(with: req) { data, response, error in
            if let error = error {
                NSLog("LiveTracker: upload failed \(error.localizedDescription)")
                finish(Self.shortError(error))
                return
            }

            let code = (response as? HTTPURLResponse)?.statusCode ?? 0
            NSLog("LiveTracker: ping \(code) \(lat),\(lng)")

            guard (200..<300).contains(code) else {
                // Server wajah bhi bhejta hai - {"msg": "GPS Mobile is not enabled..."}
                var msg = ""
                if let data = data,
                   let obj = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
                   let m = obj["msg"] as? String {
                    msg = " " + m
                }
                finish("\(code)\(msg)")
                return
            }

            if let data = data,
               let obj = try? JSONSerialization.jsonObject(with: data) as? [String: Any] {
                if obj["skipped"] as? Bool == true { finish("\(code) skipped"); return }
                if obj["stored"] as? Bool == true { finish("\(code) stored"); return }
            }
            finish("\(code) OK")
        }.resume()
    }

    /// Debug screen ki patli line me poora error nahi samata - farak sirf itna chahiye:
    /// net tha ya nahi, server tak pahuncha ya nahi
    private static func shortError(_ e: Error) -> String {
        let ns = e as NSError
        switch ns.code {
        case NSURLErrorNotConnectedToInternet, NSURLErrorNetworkConnectionLost:
            return "no network"
        case NSURLErrorTimedOut:
            return "timeout"
        case NSURLErrorCannotFindHost, NSURLErrorCannotConnectToHost:
            return "host error"
        default:
            return "error \(ns.code)"
        }
    }
}
