package com.socampuseng.mbl.livetracker;

import android.content.Context;
import android.media.AudioAttributes;
import android.media.AudioFormat;
import android.media.AudioManager;
import android.media.AudioTrack;
import android.os.Build;
import android.os.Handler;
import android.os.Looper;
import android.os.VibrationEffect;
import android.os.Vibrator;
import android.util.Log;

/**
 * Overspeed hone par 2 second ka chhota hooter aur vibration.
 *
 * Awaaz yahin banti hai (do sur ki siren), phone ki ringtone nahi - ringtone har phone
 * par alag hoti hai aur lambi bhi, jabki yahan ek hi jaisi chhoti chetavni chahiye.
 * Isi wajah se APK me koi sound file bhi nahi jodni padti.
 *
 * ALARM stream par bajta hai taaki phone silent/DND me ho tab bhi sunai de -
 * safety alert ka matlab hi tabhi hai. Loop nahi karta; bike chalate waqt lagatar
 * bajta alarm khud ek khatra hai.
 */
class SpeedAlarm {

    private static final String TAG = "LiveTracker";
    private static final long PLAY_MS = 2000L;

    private static final int SAMPLE_RATE = 22050;
    /** Hooter ke do sur - 250ms me badalte hain, isi se "siren" wala ehsaas aata hai */
    private static final double TONE_LOW_HZ = 740;
    private static final double TONE_HIGH_HZ = 980;
    private static final int TONE_SWAP_MS = 250;
    /** Shuru/aakhir me 5ms ka fade - warna "tak" ki awaaz aati hai */
    private static final int FADE_SAMPLES = SAMPLE_RATE / 200;

    private final Context ctx;
    private final Handler handler = new Handler(Looper.getMainLooper());

    private AudioTrack track;

    SpeedAlarm(Context ctx) {
        this.ctx = ctx.getApplicationContext();
    }

    void trigger() {
        playHooter();
        vibrate();
    }

    private void playHooter() {
        stopSound();    // pichla abhi baj raha ho to pehle band

        try {
            short[] pcm = buildHooter();
            int bytes = pcm.length * 2;

            track = new AudioTrack(
                    new AudioAttributes.Builder()
                            .setUsage(AudioAttributes.USAGE_ALARM)
                            .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                            .build(),
                    new AudioFormat.Builder()
                            .setEncoding(AudioFormat.ENCODING_PCM_16BIT)
                            .setSampleRate(SAMPLE_RATE)
                            .setChannelMask(AudioFormat.CHANNEL_OUT_MONO)
                            .build(),
                    bytes,
                    AudioTrack.MODE_STATIC,
                    AudioManager.AUDIO_SESSION_ID_GENERATE);

            track.write(pcm, 0, pcm.length);
            track.play();

            // Bajne ke baad khud saaf ho jaye - warna memory pakde rehta hai
            handler.postDelayed(this::stopSound, PLAY_MS + 300L);
        } catch (Exception e) {
            Log.w(TAG, "speed alarm sound failed: " + e.getMessage());
            stopSound();
        }
    }

    /** Do sur ki siren - har 250ms par sur badalta hai */
    private short[] buildHooter() {
        int total = (int) (SAMPLE_RATE * PLAY_MS / 1000L);
        int swap = SAMPLE_RATE * TONE_SWAP_MS / 1000;
        short[] pcm = new short[total];

        double amp = Short.MAX_VALUE * 0.85;
        double phase = 0;
        for (int i = 0; i < total; i++) {
            boolean high = ((i / swap) % 2) == 1;
            double hz = high ? TONE_HIGH_HZ : TONE_LOW_HZ;
            // Phase jod ke chalte hain - sur badalne par awaaz tootti nahi
            phase += 2 * Math.PI * hz / SAMPLE_RATE;

            double gain = 1.0;
            if (i < FADE_SAMPLES) {
                gain = (double) i / FADE_SAMPLES;
            } else if (i > total - FADE_SAMPLES) {
                gain = (double) (total - i) / FADE_SAMPLES;
            }
            pcm[i] = (short) (Math.sin(phase) * amp * gain);
        }
        return pcm;
    }

    private void stopSound() {
        if (track == null) return;
        try {
            if (track.getPlayState() == AudioTrack.PLAYSTATE_PLAYING) {
                track.stop();
            }
            track.release();
        } catch (Exception ignored) {
            // already released
        } finally {
            track = null;
        }
    }

    /** Helmet pehne hue sound sunai na de to jeb me vibration mehsoos ho jaayegi. */
    private void vibrate() {
        try {
            Vibrator v = (Vibrator) ctx.getSystemService(Context.VIBRATOR_SERVICE);
            if (v == null || !v.hasVibrator()) return;

            long[] pattern = { 0, 400, 200, 400 };
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
