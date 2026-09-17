package com.socampuseng.mbl.livetracker;

import android.content.Context;
import android.media.AudioAttributes;
import android.media.AudioManager;
import android.media.MediaPlayer;
import android.media.RingtoneManager;
import android.net.Uri;
import android.os.Build;
import android.os.Handler;
import android.os.Looper;
import android.os.VibrationEffect;
import android.os.Vibrator;
import android.util.Log;

/**
 * Overspeed hone par chhota sa danger alert - ~4 second ka alarm sound aur vibration.
 * Loop nahi karta; bike chalate waqt lagatar bajta alarm khud ek khatra hai.
 *
 * ALARM stream par bajta hai taaki phone silent/DND me ho tab bhi sunai de -
 * safety alert ka matlab hi tabhi hai.
 */
class SpeedAlarm {

    private static final String TAG = "LiveTracker";
    private static final long PLAY_MS = 4000L;

    private final Context ctx;
    private final Handler handler = new Handler(Looper.getMainLooper());

    private MediaPlayer player;

    SpeedAlarm(Context ctx) {
        this.ctx = ctx.getApplicationContext();
    }

    void trigger() {
        playSound();
        vibrate();
    }

    private void playSound() {
        stopSound(); // pichla abhi baj raha ho to pehle band

        try {
            Uri uri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_ALARM);
            if (uri == null) {
                uri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION);
            }
            if (uri == null) return;

            player = new MediaPlayer();
            player.setAudioAttributes(new AudioAttributes.Builder()
                    .setUsage(AudioAttributes.USAGE_ALARM)
                    .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                    .build());
            player.setDataSource(ctx, uri);
            player.setLooping(true); // PLAY_MS tak - sound chhoti ho to bhi gap na rahe
            player.prepare();
            player.start();

            handler.postDelayed(this::stopSound, PLAY_MS);
        } catch (Exception e) {
            Log.w(TAG, "speed alarm sound failed: " + e.getMessage());
            stopSound();
        }
    }

    private void stopSound() {
        if (player == null) return;
        try {
            if (player.isPlaying()) player.stop();
            player.release();
        } catch (Exception ignored) {
            // already released
        } finally {
            player = null;
        }
    }

    /** Helmet pehne hue sound sunai na de to jeb me vibration mehsoos ho jaayegi. */
    private void vibrate() {
        try {
            Vibrator v = (Vibrator) ctx.getSystemService(Context.VIBRATOR_SERVICE);
            if (v == null || !v.hasVibrator()) return;

            long[] pattern = { 0, 400, 200, 400, 200, 400 };
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                v.vibrate(VibrationEffect.createWaveform(pattern, -1),
                        new AudioAttributes.Builder()
                                .setUsage(AudioAttributes.USAGE_ALARM)
                                .build());
            } else {
                v.vibrate(pattern, -1);
            }
        } catch (Exception e) {
            Log.w(TAG, "speed alarm vibrate failed: " + e.getMessage());
        }
    }

    void release() {
        handler.removeCallbacksAndMessages(null);
        stopSound();
    }
}
