package com.socampuseng.mbl;

import android.graphics.Color;
import android.os.Bundle;
import android.view.Gravity;
import android.view.View;
import android.view.ViewGroup;
import android.webkit.WebView;
import android.widget.FrameLayout;

import androidx.coordinatorlayout.widget.CoordinatorLayout;
import androidx.core.graphics.Insets;
import androidx.core.view.ViewCompat;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsCompat;
import androidx.core.view.WindowInsetsControllerCompat;

import com.locationtracker.sqlite.LocationTrackerPlugin;
import com.socampuseng.mbl.livetracker.LiveTrackerPlugin;

import com.getcapacitor.BridgeActivity;

/**
 * Android 15 se edge-to-edge zabardasti lagta hai (16 me to purana opt-out bhi kaam
 * nahi karta), yani app ki screen status bar aur navigation bar ke NEECHE tak chali
 * jaati hai. Usse title status bar me ghus jaata tha aur footer/fab navigation ke peeche.
 *
 * Yahan poori WebView ko hi utna hata dete hain jitni system bars ki jagah hai, aur
 * us khali jagah par apni do patti rakh dete hain (upar primary, neeche safed).
 * Isse web side par kuch karna hi nahi padta - na ion-header, na ion-footer, na
 * ion-modal - sab apne aap bars ke andar rehte hain.
 */
public class MainActivity extends BridgeActivity {

  private View topStrip;
  private View bottomStrip;

  @Override
  public void onCreate(Bundle savedInstanceState) {
    registerPlugin(LocationTrackerPlugin.class);  // concierge trip tracking
    registerPlugin(LiveTrackerPlugin.class);      // duty-time live tracking
    super.onCreate(savedInstanceState);

    WindowCompat.setDecorFitsSystemWindows(getWindow(), false);
    setupBars();
  }

  private void setupBars() {
    final WebView webView = getBridge() != null ? getBridge().getWebView() : null;
    if (webView == null || !(webView.getParent() instanceof ViewGroup)) {
      return;
    }
    final ViewGroup parent = (ViewGroup) webView.getParent();

    // Status bar par safed icon (patti primary hai), navigation par kaale (patti safed)
    WindowInsetsControllerCompat controller =
        WindowCompat.getInsetsController(getWindow(), webView);
    controller.setAppearanceLightStatusBars(false);
    controller.setAppearanceLightNavigationBars(true);

    topStrip = addStrip(parent, Gravity.TOP, getPrimaryColor());
    bottomStrip = addStrip(parent, Gravity.BOTTOM, Color.WHITE);

    ViewCompat.setOnApplyWindowInsetsListener(webView, (View v, WindowInsetsCompat insets) -> {
      Insets in = insets.getInsets(
          WindowInsetsCompat.Type.systemBars() | WindowInsetsCompat.Type.displayCutout());

      // WebView ko bars ke andar le aao - margin se, padding se nahi. Padding se wo
      // jagah WebView ke andar hi rehti aur page ka apna rang dikhta
      ViewGroup.LayoutParams lp = v.getLayoutParams();
      if (lp instanceof ViewGroup.MarginLayoutParams) {
        ViewGroup.MarginLayoutParams m = (ViewGroup.MarginLayoutParams) lp;
        if (m.topMargin != in.top || m.bottomMargin != in.bottom
            || m.leftMargin != in.left || m.rightMargin != in.right) {
          m.topMargin = in.top;
          m.bottomMargin = in.bottom;
          m.leftMargin = in.left;
          m.rightMargin = in.right;
          v.setLayoutParams(m);
        }
      }

      setStripHeight(topStrip, in.top);
      setStripHeight(bottomStrip, in.bottom);

      // Web ko ab safe-area ki zaroorat nahi - jagah yahin chhod di gayi hai. Ionic
      // apne aap env() se value uthata hai, isliye zero karna zaroori hai
      webView.evaluateJavascript(
          "(function(){var s=document.documentElement.style;"
              + "s.setProperty('--ion-safe-area-top','0px');"
              + "s.setProperty('--ion-safe-area-bottom','0px');"
              + "s.setProperty('--ion-safe-area-left','0px');"
              + "s.setProperty('--ion-safe-area-right','0px');})()", null);

      // insets aage bhi jaane do - Capacitor ka keyboard handling inhi par tika hai
      return insets;
    });
    ViewCompat.requestApplyInsets(webView);
  }

  /** Bars ki khali jagah bharne wali patti - WebView ke peeche, poori chaudai me */
  private View addStrip(ViewGroup parent, int gravity, int color) {
    View strip = new View(this);
    strip.setBackgroundColor(color);

    // Capacitor ka parent CoordinatorLayout hai - usme FrameLayout wale params do to
    // gravity (upar/neeche) kho jaati hai aur dono patti upar chipak jaati hain
    ViewGroup.LayoutParams lp;
    if (parent instanceof CoordinatorLayout) {
      CoordinatorLayout.LayoutParams clp = new CoordinatorLayout.LayoutParams(
          ViewGroup.LayoutParams.MATCH_PARENT, 0);
      clp.gravity = gravity;
      lp = clp;
    } else {
      lp = new FrameLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, 0, gravity);
    }
    parent.addView(strip, 0, lp);
    return strip;
  }

  private void setStripHeight(View strip, int height) {
    if (strip == null || strip.getLayoutParams() == null
        || strip.getLayoutParams().height == height) {
      return;
    }
    ViewGroup.LayoutParams lp = strip.getLayoutParams();
    lp.height = height;
    strip.setLayoutParams(lp);
  }

  /** Wahi primary jo theme/variables.scss me hai - status bar patti usi rang ki */
  private int getPrimaryColor() {
    return Color.parseColor("#283897");
  }
}
