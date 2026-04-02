package com.socampuseng.mbl;
import android.os.Bundle;
import com.locationtracker.sqlite.LocationTrackerPlugin;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
  @Override
  public void onCreate(Bundle savedInstanceState) {
    registerPlugin(LocationTrackerPlugin.class);  // ADD THIS LINE
    super.onCreate(savedInstanceState);
  }
}
