package com.socampuseng.mbl;

import android.os.Bundle;
import android.view.View;
import android.webkit.WebView;

import androidx.core.graphics.Insets;
import androidx.core.view.ViewCompat;
import androidx.core.view.WindowInsetsCompat;

import com.locationtracker.sqlite.LocationTrackerPlugin;
import com.socampuseng.mbl.livetracker.LiveTrackerPlugin;

import com.getcapacitor.BridgeActivity;

import java.util.Locale;

public class MainActivity extends BridgeActivity {

  @Override
  public void onCreate(Bundle savedInstanceState) {
    registerPlugin(LocationTrackerPlugin.class);  // concierge trip tracking
    registerPlugin(LiveTrackerPlugin.class);      // duty-time live tracking
    super.onCreate(savedInstanceState);
    sendInsetsToWeb();
  }

  /**
   * Android 15 se edge-to-edge zabardasti lagta hai (16 me to windowOptOutEdgeToEdge...
   * kaam hi nahi karta), yani app ki screen navigation bar ke NEECHE tak jaati hai.
   * Isi wajah se modal ke footer ke button 3-button navigation ke peeche chale jaate the.
   *
   * WebView ka apna safe-area (CSS env()) Android par system bars ki jagah nahi batata,
   * isliye naap yahin se bhej dete hain. CSS me wahi Ionic ke apne variable ban jaate
   * hain, to har footer / modal ko alag se theek karne ki zaroorat nahi padti.
   *
   * Upar wala (status bar) jaan-bujh ke nahi bhejte - wo StatusBar plugin se pehle se
   * sambhala hua hai, dobara padding di to toolbar do baar khisak jaata.
   */
  private void sendInsetsToWeb() {
    final WebView webView = getBridge() != null ? getBridge().getWebView() : null;
    if (webView == null) {
      return;
    }
    ViewCompat.setOnApplyWindowInsetsListener(webView, (View v, WindowInsetsCompat insets) -> {
      Insets bars = insets.getInsets(
          WindowInsetsCompat.Type.systemBars() | WindowInsetsCompat.Type.displayCutout());
      float density = getResources().getDisplayMetrics().density;

      String js = String.format(Locale.US,
          "(function(){var s=document.documentElement.style;"
              + "s.setProperty('--ion-safe-area-bottom','%.0fpx');"
              + "s.setProperty('--ion-safe-area-left','%.0fpx');"
              + "s.setProperty('--ion-safe-area-right','%.0fpx');})()",
          bars.bottom / density, bars.left / density, bars.right / density);

      webView.evaluateJavascript(js, null);
      // insets aage bhi jaane do - Capacitor ka keyboard handling inhi par tika hai
      return insets;
    });
    ViewCompat.requestApplyInsets(webView);
  }
}
