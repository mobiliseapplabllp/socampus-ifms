package com.socampuseng.mbl;
import android.os.Bundle;
import com.locationtracker.sqlite.LocationTrackerPlugin;
import com.socampuseng.mbl.livetracker.LiveTrackerPlugin;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
  @Override
  public void onCreate(Bundle savedInstanceState) {
    registerPlugin(LocationTrackerPlugin.class);  // concierge trip tracking
    registerPlugin(LiveTrackerPlugin.class);      // duty-time live tracking
    super.onCreate(savedInstanceState);
  }
}
