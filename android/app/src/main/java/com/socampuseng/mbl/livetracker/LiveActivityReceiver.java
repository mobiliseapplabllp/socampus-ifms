package com.socampuseng.mbl.livetracker;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.os.Build;
import android.util.Log;

import com.google.android.gms.location.ActivityTransition;
import com.google.android.gms.location.ActivityTransitionEvent;
import com.google.android.gms.location.ActivityTransitionResult;
import com.google.android.gms.location.DetectedActivity;

import java.util.List;

/**
 * Activity Recognition ke badlav (still -> walking / vehicle ...) yahan aate hain.
 *
 * Iska ek hi kaam: jab GPS lamba interval par so raha ho aur user chalne lage, to
 * service ko turant jagana. Interval ka number phir bhi GPS speed hi tay karti hai.
 */
public class LiveActivityReceiver extends BroadcastReceiver {

    static final String ACTION = "com.socampuseng.mbl.livetracker.ACTIVITY";

    @Override
    public void onReceive(Context context, Intent intent) {
        if (!ActivityTransitionResult.hasResult(intent)) {
            return;
        }
        ActivityTransitionResult result = ActivityTransitionResult.extractResult(intent);
        if (result == null) {
            return;
        }
        List<ActivityTransitionEvent> events = result.getTransitionEvents();
        if (events == null || events.isEmpty()) {
            return;
        }

        // Ek saath kai aayein to sabse naya hi maayne rakhta hai
        ActivityTransitionEvent last = events.get(events.size() - 1);
        boolean leftStill = last.getActivityType() == DetectedActivity.STILL
                && last.getTransitionType() == ActivityTransition.ACTIVITY_TRANSITION_EXIT;
        String label = leftStill ? "Moving" : label(last.getActivityType());

        LiveTrackerPrefs prefs = new LiveTrackerPrefs(context);
        prefs.setActivity(label, System.currentTimeMillis());
        Log.d("LiveTracker", "activity -> " + label);

        if (!prefs.isEnabled()) {
            return;
        }

        // Still par kuch nahi karna - dheema karna GPS ka kaam hai.
        // Baaki sab (Still se bahar bhi) par service ko jagao, hilna GPS pakka karega
        Intent svc = new Intent(context, LiveTrackerService.class);
        svc.setAction(LiveTrackerService.ACTION_ACTIVITY);
        svc.putExtra(LiveTrackerService.EXTRA_ACTIVITY, label);
        svc.putExtra(LiveTrackerService.EXTRA_MOVING,
                leftStill || last.getActivityType() != DetectedActivity.STILL);
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                context.startForegroundService(svc);
            } else {
                context.startService(svc);
            }
        } catch (Exception e) {
            Log.w("LiveTracker", "activity -> service start blocked: " + e.getMessage());
        }
    }

    static String label(int type) {
        switch (type) {
            case DetectedActivity.STILL:
                return "Still";
            case DetectedActivity.WALKING:
                return "Walking";
            case DetectedActivity.RUNNING:
                return "Running";
            case DetectedActivity.ON_BICYCLE:
                return "Cycling";
            case DetectedActivity.IN_VEHICLE:
                return "Riding";
            default:
                return "";
        }
    }
}
