package com.socampuseng.mbl.livetracker;

import android.app.AlarmManager;
import android.app.PendingIntent;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.os.Build;
import android.os.SystemClock;
import android.util.Log;

/**
 * Har 5 minute par jaagta hai, service ko dobara start karta hai (already chal rahi
 * ho to bas onStartCommand call hota hai), aur agla alarm khud lagata hai.
 *
 * Self-chaining isliye hai ki agar OEM service ko maar de to bhi chain zinda rahe -
 * service ko apna alarm lagane ka mauka na mile tab bhi.
 */
public class LiveWatchdogReceiver extends BroadcastReceiver {

    private static final long WATCHDOG_INTERVAL_MS = 5 * 60 * 1000L;

    @Override
    public void onReceive(Context context, Intent intent) {
        if (!new LiveTrackerPrefs(context).isEnabled()) {
            return;
        }

        try {
            Intent serviceIntent = new Intent(context, LiveTrackerService.class);
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                context.startForegroundService(serviceIntent);
            } else {
                context.startService(serviceIntent);
            }
        } catch (Exception e) {
            // Android 12+ background-start restriction. ACCESS_BACKGROUND_LOCATION
            // hone par normally allowed hai, par OEM ya edge case me block ho sakta
            // hai - chain phir bhi chalti rahni chahiye
            Log.w("LiveTracker", "watchdog start blocked: " + e.getMessage());
        }

        scheduleNext(context);
    }

    private void scheduleNext(Context context) {
        AlarmManager am = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);
        if (am == null) return;

        PendingIntent pi = LiveTrackerService.watchdogIntent(context);
        long triggerAt = SystemClock.elapsedRealtime() + WATCHDOG_INTERVAL_MS;

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            if (am.canScheduleExactAlarms()) {
                am.setExactAndAllowWhileIdle(AlarmManager.ELAPSED_REALTIME_WAKEUP, triggerAt, pi);
            } else {
                am.setAndAllowWhileIdle(AlarmManager.ELAPSED_REALTIME_WAKEUP, triggerAt, pi);
            }
        } else if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            am.setExactAndAllowWhileIdle(AlarmManager.ELAPSED_REALTIME_WAKEUP, triggerAt, pi);
        } else {
            am.set(AlarmManager.ELAPSED_REALTIME_WAKEUP, triggerAt, pi);
        }
    }
}
