# Live Tracking (Android) — kaise kaam karta hai

> Duty-time background location tracking + per-ticket trips.
> Ye doc isliye hai ki aage koi badlav karte waqt **logic na toote**. Java na aati ho tab bhi
> ye padh kar pata chal jayega ki kaun si file kya karti hai, kaun sa number kyun set hai,
> aur kya chhedne se kya bigdega.
>
> Jo bhi badlo, uske saath ye doc bhi update karna.

---

## 1. Ek nazar me

```
Angular (WebView)                    Java (native)
─────────────────                    ─────────────────────────────────────────
app.component.ts                     LiveTrackerPlugin.java     ← JS ka darwaza
  Punch In/Out          ──bridge──►    start / stop / startTrip / endTrip
  permission card                        │
                                         ▼
live-tracker.service.ts              LiveTrackerService.java    ← asli mazdoor
  registerPlugin('LiveTracker')        GPS fix → filter → SQLite → server ping
                                         │
complaint-cards.component.ts             ├── IntervalController.java   (agla fix kab)
  Start Trip / End Trip                  ├── LivePointsDb.java         (SQLite)
                                         ├── LiveTrackerPrefs.java     (settings/state)
                                         └── SpeedAlarm.java           (overspeed hooter)

                                     LiveWatchdogReceiver  (har 5 min zinda rakhna)
                                     LiveBootReceiver      (reboot ke baad chalu)
                                     LiveActivityReceiver  (Still / Walking / Riding)
```

**Sabse zaroori baat:** WebView (Angular) app band hote hi mar jaata hai. Isliye tracking
poori tarah native me hai. JS sirf "chalu karo / band karo" bolta hai. Uske baad service ko
JS ki zaroorat nahi — url, token, trip id sab `LiveTrackerPrefs` (SharedPreferences) me
likhe hote hain.

---

## 2. File-wise kaam

| File | Kaam |
|---|---|
| `LiveTrackerPlugin.java` | JS ke saare call: start, stop, startTrip, endTrip, checkStatus, getSessionPoints, getConfig/setConfig, permission screens kholna |
| `LiveTrackerService.java` | Foreground service — GPS lena, filter, overspeed, notification, SQLite insert, server ping |
| `IntervalController.java` | Sirf ek faisla: **agla GPS fix kitni der baad** |
| `LivePointsDb.java` | SQLite — `live_points` (duty session) + `trip_points` (ticket wali trip) |
| `LiveTrackerPrefs.java` | SharedPreferences — url, token, referer, enabled, active trip, session stats. **Native ka localStorage** |
| `SpeedAlarm.java` | Overspeed hooter — AudioTrack se bana 2 second ka two-tone + vibration |
| `LiveWatchdogReceiver.java` | Har 5 min AlarmManager se jaagta hai, service zinda hai ya nahi dekhta |
| `LiveBootReceiver.java` | Phone reboot ke baad tracking wapas chalu |
| `LiveActivityReceiver.java` | Google Activity Recognition — Still / Walking / Running / Cycling / Riding |
| `AndroidManifest.xml` | `<service>` + 3 `<receiver>` + saari permissions |
| `MainActivity.java` | Tracking se alag — Android 15/16 ka edge-to-edge (section 12) |

> `capacitor-location-tracker-sqlite` (concierge wala plugin) **alag cheez hai**, usse
> kuch lena-dena nahi. Usme haath nahi lagana.

---

## 3. Punch In se ping tak — poora flow

```
1. Angular:  liveTracker.start()
                → url = environment.liveLocationUrl
                  token = localStorage 'token1'
                  referer = environment.referUrl

2. Plugin.start():
     - permission check (Always allow) → na ho to reject
     - GPS on hai? → na ho to reject
     - prefs me url / token / referer likho
     - prefs.resetSession()           (counters zero, alarm_played = false)
     - LivePointsDb.clear()           (purane session ke points hatao)
     - prefs.setEnabled(true)         ← sabse zaroori flag
     - startForegroundService(LiveTrackerService)

3. Service.onCreate():
     - WakeLock (CPU sota na rahe)
     - Notification (Android 8+ ka niyam: 5 second ke andar dikhani padti hai)
     - FusedLocationProvider se updates maango
     - Significant motion sensor + Activity Recognition chalu
     - Watchdog alarm (5 min)

4. Har fix par handleFix():
     a. speed nikalo (trust check ke saath)
     b. location filter — asli chalna ya GPS ka shor?
     c. IntervalController se agla interval poochho
     d. overspeed? → hooter (session me ek baar)
     e. notification update
     f. alag thread me: SQLite me insert, aur (minute me ek baar) server ping
```

Punch Out par ulta: `prefs.setEnabled(false)` → `stopService()` → `onDestroy()` me GPS
callback hatao, WakeLock chhodo, watchdog cancel, notification hatao.

---

## 4. Location filter — "asli chalna" kya hai

Ye `LiveTrackerService.handleFix()` me hai. Iske bina khade-khade hi "20 km chal liya"
ban jaata tha, aur map par 200 m ke jhatke dikhte the.

Filter **anchor** par chalta hai — aakhri pakki jagah. Har naye fix ko anchor se naapa
jaata hai:

| Halat | Faisla | `accepted` | distance me juda? |
|---|---|---|---|
| Fix anchor se purana (cached) | `stale fix` | 0 | nahi |
| accuracy > 150 m (reject seema) | `accuracy > 150m` | 0 | nahi |
| Pehla fix | `ok (first)` | 1 | — |
| Accuracy kharab + anchor 10 min purana | `anchor reset` | 1 | nahi |
| Accuracy kharab par anchor ke 2× daayre me | `stayed at anchor` | 0 | nahi |
| Doori < (dono ki accuracy ka jod) | `ok` (drift) | 1 | nahi |
| Speed > 180 km/h nikli | `jump, not counted` | 1 | nahi |
| Baaki sab | `ok` | 1 | **haan** |

**Zaroori:** kharab fix bhi SQLite me **save hota hai**, `accepted = 0` aur `reason` ke
saath. Chhantai padhte waqt hoti hai (map ki line, trip ke km, trek_path). Isse baad me
seema badalni ho to purana data bhi kaam aata hai.

### Speed ka bharosa (`isSpeedTrusted`)

GPS ki apni (Doppler) speed tabhi maani jaati hai jab:
- fix me speed ho (tower/Wi-Fi location me hoti hi nahi)
- fix 15 second se purana na ho
- accuracy ≤ **50 m**
- Android 8+ par speed ki apni galti ≤ **5 m/s**
- speed ≤ 180 km/h

Bharosa na ho to speed **0** maani jaati hai. Movement pakka ho to doori/time se nikali
hui speed use hoti hai (notification me `~` ke saath dikhti hai).

---

## 5. Interval — agla fix kitni der baad

Poora logic `IntervalController.java` me hai. Usool: **1-2 point zyada le lo, kam mat lo.**

```
CHAL RAHA HAI  → har ~200 m par ek point, 15s se 30s ke beech
                 (15-20 km/h traffic me bhi 30s se zyada nahi — mod na chhooten)
                 Ghatna turant. Badhna tabhi jab lagataar 2 fix dono kahein,
                 aur ek baar me max +15s.

RUKA HAI       → aakhri pakki harkat kitni der pehle:
                   < 3 min    : jo chal raha tha wahi   (red light, jam)
                   3 – 6 min  : 60s                      (petrol pump, chai)
                   6 – 10 min : 2 min                    (site par pahuncha)
                   10 min+    : 5 min                    (site par kaam)

HILNA PAKKA    → ek "hila" kaafi nahi. Pakka tab:
                   - 8 km/h+ ki chaal, ya 100 m+ ki doori, AUR
                   - lagataar 2 fix hile, aur doosra fix pehle se aur door ho
                 (kood me location jaake wapas aati hai, asli chalne me door hoti jaati hai)

JAGANA         → motion sensor baja ya Activity ne "chalne laga" kaha:
                 90s tak 15s par jaanch. GPS ne hilna pakda → cycle 15s se dobara.
                 Nahi pakda → wapas purana dheema interval.
                 2 jaanch lagataar bekaar → 3 min motion sensor ansuna.
```

Aakhir me hamesha **min (15s) aur max (5 min)** ke beech clamp hota hai.

### Constants — chhedne se pehle padho

| Constant | Value | Badalne par kya hoga |
|---|---|---|
| `TARGET_SPACING_M` | 200 m | Kam = zyada points, zyada battery. Zyada = path me mod katne lagenge |
| `WALK_KMH` | 8 km/h | Isse dheemi chaal "hilna" nahi maani jaati. Ghatane par GPS ka shor "chalna" ban jaayega |
| `FAR_M` | 100 m | Speed na mile par itni doori se hilna maana jaata hai |
| `MOVING_MAX_MS` | 30s | Chalte hue interval isse lamba kabhi nahi |
| `MOVING_GROW_STEP_MS` | 15s | Ek fix me interval itna hi badh sakta hai (brake ki ek reading se na kood jaye) |
| `HOLD_STILL_MS` | 3 min | Itni der ruke tak interval nahi badhta (red light) |
| `STOP_SHORT_MS` / `STOP_MEDIUM_MS` | 6 / 10 min | Rukne ki seediyan |
| `NO_SENSOR_STOP_MAX_MS` | 2 min | Motion sensor na ho to rukne par bhi 2 min se zyada mat so |
| `PROBE_MS` | 90s | Jagane ke baad kitni der 15s par dekhna |
| `MOTION_COOLDOWN_MS` | 3 min | Bekaar motion jaanch ke baad aaram |
| `BASE_MAX_ACC_M` | 50 m | Isse kharab fix ko "ruki jagah" nahi maana jaata |

Debug screen se badalne wale (prefs me): `min interval 15s`, `max interval 5 min`,
`speed limit 50 km/h`, `accuracy good 50 m`, `accuracy reject 150 m`, aur URL.

---

## 6. Server par ping

**Endpoint:** `POST {liveLocationUrl}` → `.../api/gps-mobile/ping`

```json
{
  "lat": 28.469259,
  "lng": 77.305391,
  "speed": 24.6,
  "recorded_at": "2026-09-29 14:32:10",
  "accuracy": 8.4,
  "battery": 76,
  "activity": "Riding"
}
```

**Headers:**
```
Authorization: Bearer <token>        ← prefs se (Angular ka localStorage 'token1')
Referer: https://socampus.../         ← prefs se (environment.referUrl)
Content-Type: application/json
```

> ⚠️ **`Referer` aur `Referer1` alag cheezein hain.** Angular ka interceptor `Referer1`
> bhejta hai — wo **sirf CORS proxy ke liye** hai. Native seedha server par jaata hai,
> isliye wahan **asli `Referer`** chahiye. Ye na ho to server **403** deta hai.

**Throttle:** `PING_EVERY_MS = 60_000` — GPS chahe 15s par aaye, server par **minute me
ek hi ping**. Beech wale fix SQLite me phir bhi save hote hain (trip ka path ghana rahe).

**Jawab:**

| Server | Notification me | Matlab |
|---|---|---|
| `{"stored": true}` | `200 stored` | point save ho gaya |
| `{"skipped": true}` | `200 skipped` | is minute ka point pehle se tha |
| 4xx/5xx | `403 <msg>` | server ka apna message dikhta hai |
| — | `held 45s` | minute poora nahi hua, ping bheji hi nahi |

`prefs.setLastPingAt()` **sirf success par** aage badhta hai. Fail/skip par agla fix
dobara koshish karega.

> **Abhi retry nahi hai.** Net na ho to wo ping chali gayi (fail = drop). Ye jaan-boojh kar
> aisa hai. Chahiye to `upload_result` 2xx na hone wale points ko baad me bhejna padega.

---

## 7. Trip (ticket wali) — "ek tracking, do table"

**Sabse zaroori niyam: trip apni nayi tracking kabhi shuru nahi karti.** Wahi duty wali
GPS chalti hai, bas uska fix do jagah likha jaata hai.

```
Start Trip (Angular)
  → server: POST gps-mobile/start-trip (multipart: selfie, vehicle photo, remark, mode)
  → server se trip_id milta hai          ← trip_id ka asli maalik SERVER hai
  → localStorage me activeTrip save       ← sirf guard ke liye
  → native startTrip(module, id)          ← prefs me trip_module + trip_id

har fix → live_points me insert (hamesha)
        → trip_points me bhi insert (jab tak trip chalu hai)

End Trip
  → SQLite se trip ke points padho → trek_path banao
  → server: POST gps-mobile/end-trip (trek_path + photos)
  → SUCCESS ke baad hi points delete + prefs/localStorage saaf
```

`trek_path` ka ek point:
```json
{ "lat": 28.46, "lng": 77.30, "speed": 24.6,
  "recorded_at": "2026-09-29 14:32:10", "accuracy": 8.4, "battery": 76 }
```

### Guards (inhe todna nahi)

| Guard | Kahan | Kyun |
|---|---|---|
| Tracking band ho to Start Trip nahi | Plugin + Angular | trip ka path hi nahi banega |
| Ek waqt me ek hi trip | Plugin `hasActiveTrip()` + localStorage | do trip ke points mil jaate |
| Trip chalu ho to **punch out nahi** | `Plugin.stop()` + `app.component.ts` | tracking band = trip ka path beech me kat jaata |
| End Trip success se pehle points delete nahi | `trip-end.component.ts` | API fail hui to path hamesha ke liye chala jaata |

`localStorage` ka `activeTrip` **sirf in guards ke liye** hai — trip ki asli pehchaan
server ka `gps_mobile_trip.trip_id` hai.

---

## 8. Overspeed hooter

- Limit prefs se — default **50 km/h** (debug screen se badalti hai)
- Speed bharosemand ho tabhi ginti hai (section 4)
- **Ek session/trip me ek hi baar** — `alarm_played` flag prefs me
- Flag `start()` aur `startTrip()`/`endTrip()` par reset hota hai, yani har nayi trip ka
  apna ek hooter
- Awaaz `SpeedAlarm.java` me **AudioTrack se banti hai** (740 Hz / 980 Hz, 2 second,
  fade in-out) — koi ringtone file nahi, isliye phone ke silent profile par bhi
  `USAGE_ALARM` se bajti hai. Saath me vibration `{0, 400, 200, 400}`
- Re-arm: speed limit se 5 km/h neeche aake dobara paar kare, tabhi phir se armed

---

## 9. App band / kill / reboot par kya hota hai

| Halat | Kya hota hai | Kis file se |
|---|---|---|
| App background me | kuch nahi bigadta | — |
| App swipe se band | service zinda rehti hai | manifest `stopWithTask="false"` |
| Android ne RAM ke liye maar di | Android khud wapas chalu karta hai | `START_STICKY` |
| OEM (Xiaomi/Oppo) ne maar di | har 5 min alarm service wapas chalu karta hai | `LiveWatchdogReceiver` |
| Phone reboot | boot par wapas chalu | `LiveBootReceiver` |

Teenon receiver pehli line me `prefs.isEnabled()` dekhte hain — `false` hua to chup-chaap
wapas so jaate hain. **Isiliye `enabled` flag sabse zaroori hai** aur `start()` me service
chalu karne se *pehle* likha jaata hai.

Watchdog **self-chaining** hai — har baar jaag kar agla alarm khud lagata hai, taaki OEM
service ko maar de tab bhi chain zinda rahe.

---

## 10. Data kahan-kahan rehta hai

**SharedPreferences — `live_tracker_prefs.xml`** (native ka localStorage):

| Key | Kya |
|---|---|
| `enabled` | tracking on/off — sabse zaroori flag |
| `url`, `token`, `referer` | ping ke liye, `start()` me likhe jaate hain |
| `trip_module`, `trip_id`, `trip_started_at` | chalu trip |
| `points`, `distance_m`, `started_at`, `last_fix_at` | session stats |
| `last_lat/lng/speed/accuracy`, `max_speed_kmh` | notification aur status ke liye |
| `last_ping_at` | minute wala throttle |
| `alarm_played` | hooter ek baar |
| `anchor_*` | location filter ka anchor |
| `gps_interval_ms`, `speed_limit_kmh`, `min/max_interval_ms`, `acc_good_m`, `acc_reject_m`, `url_custom` | debug screen se badalne wale |

**SQLite — `live_tracker_points.db`** (VERSION **1**):

```sql
live_points (id, lat, lng, speed, accuracy, time, upload, alarmed,
             accepted, reason, dist_m, interval_s, battery)

trip_points (id, module_type, specific_id, lat, lng, speed, accuracy, time,
             accepted, reason, dist_m, interval_s, battery)
```

- `live_points` me **max 1000 row** (`MAX_POINTS`) — purane apne aap kat jaate hain
- `live_points` `start()` par saaf hota hai (naya session = naya path)
- `trip_points` sirf End Trip success par us trip ke liye saaf hote hain

> ⚠️ **DB version abhi 1 hai aur `onUpgrade` table drop kar deta hai.** Testing ke liye
> jaan-boojh kar aisa hai — schema badlo to app ka data clear karke dobara install karna.
> Asli users aane se pehle ye tay karna hoga ki version badha kar migration likhna hai
> ya nahi.

---

## 11. Angular side ka jhanjhat (jo aksar bhoola jaata hai)

| Cheez | Kahan | Dhyan |
|---|---|---|
| `isSupported()` | `live-tracker.service.ts` | abhi `capacitor && android`. Web par sab kuch khaali laut'ta hai — isliye web me native call mat karo |
| Punch status → tracking | `app.component.ts` | `IN` par hamesha chalu; `OUT` par tabhi band jab server ka asli jawab ho (BehaviorSubject ki default `false` par nahi) |
| `trackingSyncBusy` | `app.component.ts` | do call ek saath na chalein |
| Punch out se pehle trip check | `app.component.ts` + Plugin | dono jagah — API call se **pehle** |
| Permission refresh | `App.addListener('appStateChange')` | Settings se wapas aate hi card hara ho jaaye |
| `trip_id` | `complaint-cards` → `trip-end` | server ka `gps_mobile_trip.trip_id`, localStorage ka nahi |

---

## 12. `MainActivity.java` — ye tracking ka hissa nahi hai

Ye Android 15/16 ka **edge-to-edge** sambhalta hai: WebView ko system bars ke andar
margin se laata hai aur bars ki khali jagah me do patti (upar primary `#283897`,
neeche safed) rakhta hai, aur JS se saare `--ion-safe-area-*` ko `0px` kar deta hai.

Isiliye `global.scss` me safe-area ka koi rule **nahi** hai — poora hisaab native me hai.

> Ye code Capacitor **5** ki wajah se likhna pada — Cap 5 me insets ka koi handling nahi
> hai. Capacitor **7/8** me ye kaam framework khud karta hai (`SystemBars` plugin).
> **Agar kabhi Capacitor upgrade karo to `MainActivity` ka ye block hata dena**, warna
> padding aur margin dono lagenge aur upar-neeche double gap dikhega.

---

## 13. Jo abhi nahi hai (jaanbujh kar ya pending)

| Cheez | Haal |
|---|---|
| Ping fail par retry | nahi hai — fail = drop (tay kiya hua) |
| Token refresh native tak pahunchana | **pending** — token sirf `start()` par jaata hai. Angular me token refresh hua to native ke paas purana hi rahega |
| `state === 'completed'` wali trip | pending |
| DB migration | pending — abhi drop & recreate |
| iOS | alag hai, section 14 |

---

## 14. iOS — kya bana hai

| | Android | iOS (plan) |
|---|---|---|
| Interval | adaptive 15s–5 min | **fixed 60s** — koi adaptive logic nahi |
| Zinda rehna | foreground service + notification | `allowsBackgroundLocationUpdates` + blue bar |
| Mar jaane par wapas | watchdog har 5 min | SLC + region (~150 m) + visits — hilne par |
| Reboot | boot receiver | ignore |
| Force-quit | bach jaata hai | ❌ nahi bachta — hilne par wapas |
| Hooter | AudioTrack | local notification + sound |
| Trip ka path | 15s par ghana | continuous updates se ~50 m par SQLite me likhna (ping phir bhi 1/min) |
| Permissions | GPS, Always, Battery opt, Notif, Activity | Location Services, **Always**, **Precise**, **Background App Refresh**, Notifications, (Low Power warning) |

Jo **same** hai: plugin ke method naam, Angular ka code, ping ka payload aur headers,
SQLite ka schema, location filter ka ganit, trip ka flow, server ki har cheez.

### iOS ki file (`ios/App/App/LiveTracker/`)

| File | Android me iska jodidar |
|---|---|
| `LiveTrackerPlugin.swift` + `.m` | `LiveTrackerPlugin.java` (`.m` ka macro = Android ka `registerPlugin()`) |
| `LiveTrackerManager.swift` | `LiveTrackerService.java` |
| `LiveTrackerPrefs.swift` | `LiveTrackerPrefs.java` (UserDefaults = SharedPreferences) |
| `LivePointsDb.swift` | `LivePointsDb.java` (asli sqlite3, wahi schema) |
| `LiveUploader.swift` | Service ka `upload()` |
| `SpeedAlert.swift` | `SpeedAlarm.java` (AudioTrack ki jagah local notification) |
| `AppDelegate.swift` me `resumeIfEnabled()` | `LiveBootReceiver` + watchdog |

### iOS me 60 second ka ping kaise aata hai

```
startUpdatingLocation()  →  app suspend nahi hoti, timer chalta rehta hai
distanceFilter = 50 m    →  chalte hue har ~50 m par fix (trip ka path ghana)
Timer har 60s            →  khade hone par koi update nahi aata, isliye filter ko
                            kuch der ke liye None kar dete hain - fix aate hi wapas 50 m
```

Yani **chalte hue ghane point SQLite me**, aur **server par minute me ek ping** — Android
jaisa hi nateeja, alag tarike se.

### iOS ke permission card

Side menu me **do alag card** hain (`app.component.html`) — Android wala aur iOS wala —
taaki ek platform ka badlav doosre ko na tode. Rows `app.component.ts` ke
`buildAndroidPermissions()` / `buildIosPermissions()` se bante hain.

iOS ke rows: Location Services · **Location Always** · **Precise Location** ·
**Background App Refresh** · Notifications, aur neeche Low Power Mode ki chetavni
(jo `allGranted` me nahi ginti).

`action: 'allow'` wale row app ke andar prompt dikhate hain (Location Always,
Notifications), `action: 'settings'` wale seedha app ka Settings page kholte hain —
wahan Precise aur Background App Refresh dono ek hi screen par milte hain.

> **iOS har prompt zindagi me ek baar hi dikhata hai.** Engineer ne ek baar
> "Keep Only While Using" ya "Don't Allow" daba diya to dobara prompt nahi aayega —
> uske baad sirf Settings ka rasta bachta hai. Isliye pehli baar wala flow chhedna nahi.

### iOS me jo nahi hai

- Adaptive interval (`IntervalController` ka koi jawab nahi — fixed 60s)
- Activity Recognition (payload me `activity: "Unknown"` jaata hai)
- Foreground notification wali diagnostics (blue status bar hi dikhta hai)
- Force-quit se bachav (banda ~150 m hile ya app khole, tab wapas chalu)

Saath me dono platform ke liye ek jaal: **backend cron** — punched-in engineer ki ping
20 min se na aaye to push notification ("Location updates stopped — tap to resume").
Engineer tap kare → app khule → cold start par tracking apne aap chalu ho jaati hai.

---

## 15. Kuch todna na ho to ye mat karna

1. **`Referer` ko `Referer1` mat karna** native me → seedha 403.
2. **`prefs.setEnabled(true)` service start se pehle** hi likhna — baad me likha to
   watchdog/boot receiver ko lagega tracking band hai.
3. **`stop()` me trip ka check mat hatana** — chalu trip ka path kat jaayega.
4. **`trip_points` End Trip API ke success se pehle delete mat karna.**
5. **Interval ke constants ek saath kai mat badalna** — ek badlo, device par naapo.
   (Ye saare numbers simulator par 7 scenario × 30 seed chala kar tay hue the.)
6. **Speed trust ki 50 m wali seema mat ghatana** — 25 m par 120 km/h ki ride ki speed
   kat jaati thi aur overspeed kabhi baja hi nahi.
7. **Kharab fix ko insert karna band mat karna** — `accepted = 0` ke saath save hona
   zaroori hai, warna baad me pata hi nahi chalega ki fix aaya tha ya nahi.
8. **DB ka schema badlo to version bhi** — aur tab app ka data clear karna padega.
9. **Web par native call mat karna** — `isSupported()` pehle check karo.
10. **Capacitor upgrade karo to `MainActivity` ka edge-to-edge block hatao** (section 12).

---

## 16. Testing ke waqt kahan dekhein

- **Notification** — sabse tez zariya: aakhri fix ka time, interval aur uski wajah,
  distance, max speed, ping ka result (`200 stored` / `held 45s` / `403 ...`), aur
  `Late: … · asked Nx` (Fused ne der ki to kitni baar khud maanga).
- **Side menu → Availability ke bagal me (i)** — poora session ka path map par,
  har point ke saath `accepted` aur `reason`.
- **Debug screen** (Availability par 5 taps) — interval, speed limit, accuracy ki seemaen
  aur URL yahin se badalti hain, bina naya build banaye.
- **`adb logcat -s LiveTracker`** — har ping ka code aur lat/lng.
