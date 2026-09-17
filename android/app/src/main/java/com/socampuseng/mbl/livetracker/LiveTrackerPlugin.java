package com.socampuseng.mbl.livetracker;

import android.Manifest;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.location.LocationManager;
import android.net.Uri;
import android.os.Build;
import android.os.PowerManager;
import android.provider.Settings;

import androidx.core.app.NotificationManagerCompat;
import androidx.core.content.ContextCompat;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;
import com.google.android.gms.common.api.ResolvableApiException;
import com.google.android.gms.location.LocationRequest;
import com.google.android.gms.location.LocationServices;
import com.google.android.gms.location.LocationSettingsRequest;
import com.google.android.gms.location.Priority;

/**
 * Duty-time live location tracking. Poori tarah alag hai concierge wale
 * capacitor-location-tracker-sqlite plugin se - alag service, alag notification,
 * alag prefs. Dono ek saath chal sakte hain.
 */
@CapacitorPlugin(
        name = "LiveTracker",
        permissions = {
                @Permission(alias = "location", strings = {
                        Manifest.permission.ACCESS_FINE_LOCATION,
                        Manifest.permission.ACCESS_COARSE_LOCATION
                }),
                @Permission(alias = "notifications", strings = {
                        Manifest.permission.POST_NOTIFICATIONS
                })
        }
)
public class LiveTrackerPlugin extends Plugin {

    /** Ek hi call me card ki saari 4 rows + running stats. */
    @PluginMethod
    public void checkStatus(PluginCall call) {
        call.resolve(buildStatus());
    }

    /**
     * Is session ke saare points - map par path draw karne ke liye.
     * Har point me upload ka result bhi hai, taaki dikhe ki kaunsa gaya kaunsa nahi.
     */
    @PluginMethod
    public void getSessionPoints(PluginCall call) {
        try {
            JSObject ret = new JSObject();
            ret.put("points", LivePointsDb.getInstance(getContext()).getAll());
            call.resolve(ret);
        } catch (Exception e) {
            call.reject("Failed to read points: " + e.getMessage(), e);
        }
    }

    /** Debug screen - abhi ke test config. */
    @PluginMethod
    public void getConfig(PluginCall call) {
        LiveTrackerPrefs prefs = new LiveTrackerPrefs(getContext());
        JSObject ret = new JSObject();
        ret.put("gpsIntervalSec", prefs.getGpsIntervalMs() / 1000L);
        ret.put("speedLimitKmh", prefs.getSpeedLimitKmh());
        ret.put("url", prefs.getUrl());
        ret.put("urlCustom", prefs.isUrlCustom());
        ret.put("running", prefs.isEnabled());
        call.resolve(ret);
    }

    /**
     * Debug screen se config badalna. Tracking chal rahi ho to service dobara
     * start hoti hai - naya interval tabhi lagta hai. Session bhi reset hota hai,
     * warna do alag settings ke points ek hi count me mil jaate.
     */
    @PluginMethod
    public void setConfig(PluginCall call) {
        try {
            Context ctx = getContext();
            LiveTrackerPrefs prefs = new LiveTrackerPrefs(ctx);

            Integer intervalSec = call.getInt("gpsIntervalSec");
            if (intervalSec != null && intervalSec >= 1) {
                prefs.setGpsIntervalMs(intervalSec * 1000L);
            }
            Double limit = call.getDouble("speedLimitKmh");
            if (limit != null && limit > 0) {
                prefs.setSpeedLimitKmh(limit.floatValue());
            }
            if (Boolean.TRUE.equals(call.getBoolean("resetUrl"))) {
                // Wapas default par - agla start() environment wala URL bhar dega
                prefs.setUrlCustom(false);
            } else {
                String url = call.getString("url");
                if (url != null && !url.trim().isEmpty()) {
                    prefs.setUrl(url.trim());
                    prefs.setUrlCustom(true);
                }
            }

            boolean restarted = false;
            if (prefs.isEnabled()) {
                ctx.stopService(new Intent(ctx, LiveTrackerService.class));
                prefs.resetSession();
                LivePointsDb.getInstance(ctx).clear();

                Intent i = new Intent(ctx, LiveTrackerService.class);
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                    ctx.startForegroundService(i);
                } else {
                    ctx.startService(i);
                }
                restarted = true;
            }

            JSObject ret = buildStatus();
            ret.put("restarted", restarted);
            call.resolve(ret);
        } catch (Exception e) {
            call.reject("Failed to apply config: " + e.getMessage(), e);
        }
    }

    private JSObject buildStatus() {
        Context ctx = getContext();
        JSObject ret = new JSObject();

        ret.put("gps", isGpsEnabled(ctx));
        ret.put("location", hasAlwaysAllow(ctx));
        ret.put("battery", isBatteryOptimizationIgnored(ctx));
        ret.put("notifications", areNotificationsEnabled(ctx));

        // FINE grant hua ya nahi - JS isse decide karta hai ki runtime dialog
        // dikhana hai ya seedha app settings kholni hai (Android 11+ pe background
        // permission dialog se maangi hi nahi ja sakti)
        ret.put("fineGranted", ContextCompat.checkSelfPermission(
                ctx, Manifest.permission.ACCESS_FINE_LOCATION) == PackageManager.PERMISSION_GRANTED);

        LiveTrackerPrefs prefs = new LiveTrackerPrefs(ctx);
        ret.put("running", prefs.isEnabled());
        ret.put("points", prefs.getPoints());
        ret.put("startedAt", prefs.getStartedAt());
        ret.put("lastFixAt", prefs.getLastFixAt());
        ret.put("lastLat", prefs.getLastLat());
        ret.put("lastLng", prefs.getLastLng());
        ret.put("lastUpload", prefs.getLastUpload());
        ret.put("distance", prefs.getDistance());
        ret.put("lastGpsSpeed", prefs.getLastGpsSpeed());
        ret.put("lastSpeed", prefs.getLastSpeed());
        ret.put("speedLimitKmh", prefs.getSpeedLimitKmh());
        ret.put("gpsIntervalSec", prefs.getGpsIntervalMs() / 1000L);
        return ret;
    }

    // ---------------------------------------------------------------- checks

    private boolean isGpsEnabled(Context ctx) {
        LocationManager lm = (LocationManager) ctx.getSystemService(Context.LOCATION_SERVICE);
        if (lm == null) return false;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
            return lm.isLocationEnabled();
        }
        return lm.isProviderEnabled(LocationManager.GPS_PROVIDER)
                || lm.isProviderEnabled(LocationManager.NETWORK_PROVIDER);
    }

    private boolean hasAlwaysAllow(Context ctx) {
        boolean fine = ContextCompat.checkSelfPermission(
                ctx, Manifest.permission.ACCESS_FINE_LOCATION) == PackageManager.PERMISSION_GRANTED;
        if (!fine) return false;
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.Q) return true;
        return ContextCompat.checkSelfPermission(
                ctx, Manifest.permission.ACCESS_BACKGROUND_LOCATION) == PackageManager.PERMISSION_GRANTED;
    }

    private boolean isBatteryOptimizationIgnored(Context ctx) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.M) return true;
        PowerManager pm = (PowerManager) ctx.getSystemService(Context.POWER_SERVICE);
        return pm != null && pm.isIgnoringBatteryOptimizations(ctx.getPackageName());
    }

    private boolean areNotificationsEnabled(Context ctx) {
        return NotificationManagerCompat.from(ctx).areNotificationsEnabled();
    }

    // ------------------------------------------------------------- shortcuts

    /**
     * GPS master toggle. Play Services ka in-app dialog dikhata hai - user ek tap me
     * on kar deta hai, app chhode bina. Dialog na bane to system location settings.
     */
    @PluginMethod
    public void openGpsSettings(final PluginCall call) {
        if (isGpsEnabled(getContext())) {
            call.resolve(new JSObject().put("opened", false));
            return;
        }

        LocationRequest req = new LocationRequest.Builder(Priority.PRIORITY_HIGH_ACCURACY, 60_000).build();
        LocationSettingsRequest settingsRequest = new LocationSettingsRequest.Builder()
                .addLocationRequest(req)
                .setAlwaysShow(true)
                .build();

        LocationServices.getSettingsClient(getContext())
                .checkLocationSettings(settingsRequest)
                .addOnSuccessListener(r -> call.resolve(new JSObject().put("opened", false)))
                .addOnFailureListener(e -> {
                    // Result ka intezaar nahi karte - card resume par khud re-check karta hai
                    if (e instanceof ResolvableApiException && getActivity() != null) {
                        try {
                            ((ResolvableApiException) e).startResolutionForResult(getActivity(), 9001);
                            call.resolve(new JSObject().put("opened", true));
                            return;
                        } catch (Exception ignored) {
                            // dialog nahi bana - neeche fallback
                        }
                    }
                    boolean opened = tryStartActivity(new Intent(Settings.ACTION_LOCATION_SOURCE_SETTINGS));
                    call.resolve(new JSObject().put("opened", opened));
                });
    }

    /**
     * FINE abhi tak nahi hai to runtime dialog (ek tap). Uske baad background
     * "Allow all the time" sirf app settings se hi mil sakti hai (Android 11+).
     */
    @PluginMethod
    public void openLocationPermission(PluginCall call) {
        boolean fine = ContextCompat.checkSelfPermission(
                getContext(), Manifest.permission.ACCESS_FINE_LOCATION) == PackageManager.PERMISSION_GRANTED;

        if (!fine) {
            requestPermissionForAlias("location", call, "locationPermCallback");
            return;
        }
        call.resolve(new JSObject().put("opened", openAppDetailsSettings()));
    }

    @PermissionCallback
    private void locationPermCallback(PluginCall call) {
        boolean fine = ContextCompat.checkSelfPermission(
                getContext(), Manifest.permission.ACCESS_FINE_LOCATION) == PackageManager.PERMISSION_GRANTED;
        // FINE mil gaya par background abhi baaki hai - seedha settings bhej do
        boolean opened = fine && !hasAlwaysAllow(getContext()) && openAppDetailsSettings();
        call.resolve(new JSObject().put("opened", opened));
    }

    @PluginMethod
    public void openBatterySettings(PluginCall call) {
        boolean opened = false;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M
                && !isBatteryOptimizationIgnored(getContext())) {
            Intent direct = new Intent(Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS);
            direct.setData(Uri.parse("package:" + getContext().getPackageName()));
            opened = tryStartActivity(direct);
            if (!opened) {
                opened = tryStartActivity(new Intent(Settings.ACTION_IGNORE_BATTERY_OPTIMIZATION_SETTINGS));
            }
        }
        if (!opened) {
            opened = openAppDetailsSettings();
        }
        call.resolve(new JSObject().put("opened", opened));
    }

    @PluginMethod
    public void openNotificationSettings(PluginCall call) {
        // Android 13+ pe pehle runtime dialog try karo - ek tap me ho jaata hai
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU
                && ContextCompat.checkSelfPermission(getContext(), Manifest.permission.POST_NOTIFICATIONS)
                != PackageManager.PERMISSION_GRANTED) {
            requestPermissionForAlias("notifications", call, "notifPermCallback");
            return;
        }
        call.resolve(new JSObject().put("opened", openNotificationSettingsScreen()));
    }

    @PermissionCallback
    private void notifPermCallback(PluginCall call) {
        boolean opened = !areNotificationsEnabled(getContext()) && openNotificationSettingsScreen();
        call.resolve(new JSObject().put("opened", opened));
    }

    private boolean openNotificationSettingsScreen() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            Intent i = new Intent(Settings.ACTION_APP_NOTIFICATION_SETTINGS);
            i.putExtra(Settings.EXTRA_APP_PACKAGE, getContext().getPackageName());
            if (tryStartActivity(i)) return true;
        }
        return openAppDetailsSettings();
    }

    /** Ye hamesha kaam karta hai - har shortcut ki aakhri fallback. */
    private boolean openAppDetailsSettings() {
        Intent i = new Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS);
        i.setData(Uri.parse("package:" + getContext().getPackageName()));
        return tryStartActivity(i);
    }

    private boolean tryStartActivity(Intent intent) {
        try {
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            getContext().startActivity(intent);
            return true;
        } catch (Exception ignored) {
            return false;
        }
    }

    // ------------------------------------------------------------ start/stop

    @PluginMethod
    public void start(PluginCall call) {
        Context ctx = getContext();

        if (!hasAlwaysAllow(ctx)) {
            call.reject("Location permission (Always allow) is not granted");
            return;
        }
        if (!isGpsEnabled(ctx)) {
            call.reject("Location services are turned off");
            return;
        }

        String url = call.getString("url", "");
        String token = call.getString("token", "");
        if (url == null || url.isEmpty()) {
            call.reject("Upload URL is required");
            return;
        }

        try {
            LiveTrackerPrefs prefs = new LiveTrackerPrefs(ctx);
            // Debug screen se URL badla gaya ho to usi ko rakho - warna har Start par
            // environment wala URL wapas set ho jaata aur test URL kaam ka na rehta
            if (!prefs.isUrlCustom()) {
                prefs.setUrl(url);
            }
            prefs.setToken(token == null ? "" : token);
            prefs.resetSession();
            // Naya session = naya path. Purane points map par nahi aane chahiye
            LivePointsDb.getInstance(ctx).clear();
            prefs.setEnabled(true);

            Intent i = new Intent(ctx, LiveTrackerService.class);
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                ctx.startForegroundService(i);
            } else {
                ctx.startService(i);
            }
            call.resolve(buildStatus());
        } catch (Exception e) {
            call.reject("Failed to start tracking: " + e.getMessage(), e);
        }
    }

    @PluginMethod
    public void stop(PluginCall call) {
        try {
            Context ctx = getContext();
            // Flag pehle - service onDestroy isi se decide karti hai ki watchdog
            // cancel karna hai ya nahi
            new LiveTrackerPrefs(ctx).setEnabled(false);
            ctx.stopService(new Intent(ctx, LiveTrackerService.class));
            call.resolve(buildStatus());
        } catch (Exception e) {
            call.reject("Failed to stop tracking: " + e.getMessage(), e);
        }
    }
}
