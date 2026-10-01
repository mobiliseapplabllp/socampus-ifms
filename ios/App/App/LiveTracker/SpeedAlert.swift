import Foundation
import UserNotifications
import AudioToolbox

/// Overspeed ka hooter. Android me AudioTrack se 2 second ki awaaz banti hai; iOS me
/// app background me apni marzi se awaaz nahi baja sakti, isliye **local notification**
/// bhejte hain - wo lock screen par bhi bajti hai aur dikhti bhi hai.
///
/// Niyam Android jaisa hi: ek session/trip me **ek hi baar** (`alarmPlayed` flag),
/// aur dobara tabhi jab speed limit se 5 km/h neeche aake phir limit paar kare.
final class SpeedAlert {

    static let shared = SpeedAlert()

    private let CATEGORY = "live_overspeed"

    private init() {}

    /// Notification ki ijazat - punch in ke waqt ek baar maang lete hain
    func requestPermission(completion: ((Bool) -> Void)? = nil) {
        UNUserNotificationCenter.current().requestAuthorization(options: [.alert, .sound, .badge]) { granted, _ in
            completion?(granted)
        }
    }

    func isAuthorized(completion: @escaping (Bool) -> Void) {
        UNUserNotificationCenter.current().getNotificationSettings { s in
            completion(s.authorizationStatus == .authorized || s.authorizationStatus == .provisional)
        }
    }

    /// Ek baar bajao - awaaz + vibration
    func fire(speedKmh: Double, limitKmh: Double) {
        let content = UNMutableNotificationContent()
        content.title = "Overspeed"
        content.body = "\(Int(speedKmh.rounded())) km/h — limit is \(Int(limitKmh.rounded())) km/h"
        // .defaultCritical ke liye Apple se alag "Critical Alerts" entitlement leni padti hai -
        // uske bina notification schedule hi nahi hoti. Normal sound hi kaafi hai
        content.sound = .default
        content.categoryIdentifier = CATEGORY

        let req = UNNotificationRequest(
            identifier: "overspeed-\(Int(Date().timeIntervalSince1970))",
            content: content,
            trigger: nil          // turant
        )
        UNUserNotificationCenter.current().add(req)

        // Screen band ho to bhi jeb me pata chal jaye
        AudioServicesPlaySystemSound(kSystemSoundID_Vibrate)
    }

    /// Backend ke "20 min se location nahi aayi" wale push jaisa hi, par app ke andar se -
    /// abhi use nahi ho raha, aage tracking health ke liye kaam aayega
    func notify(title: String, body: String) {
        let content = UNMutableNotificationContent()
        content.title = title
        content.body = body
        content.sound = .default
        let req = UNNotificationRequest(identifier: UUID().uuidString, content: content, trigger: nil)
        UNUserNotificationCenter.current().add(req)
    }
}
