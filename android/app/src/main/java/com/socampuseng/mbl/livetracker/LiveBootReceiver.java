package com.socampuseng.mbl.livetracker;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.os.Build;
import android.util.Log;

/**
 * Reboot ke baad tracking wapas chalu. Android 15 me kuch foreground service types
 * BOOT_COMPLETED se launch nahi ho sakte, par "location" un types me nahi hai -
 * isliye yeh allowed hai.
 */
public class LiveBootReceiver extends BroadcastReceiver {

    @Override
    public void onReceive(Context context, Intent intent) {
        String action = intent.getAction();
        boolean isBoot = Intent.ACTION_BOOT_COMPLETED.equals(action)
                || Intent.ACTION_LOCKED_BOOT_COMPLETED.equals(action)
                || "android.intent.action.QUICKBOOT_POWERON".equals(action)
                || "com.htc.intent.action.QUICKBOOT_POWERON".equals(action);

        if (!isBoot) return;
        if (!new LiveTrackerPrefs(context).isEnabled()) return;

        try {
            Intent serviceIntent = new Intent(context, LiveTrackerService.class);
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                context.startForegroundService(serviceIntent);
            } else {
                context.startService(serviceIntent);
            }
        } catch (Exception e) {
            Log.w("LiveTracker", "boot start blocked: " + e.getMessage());
        }
    }
}
