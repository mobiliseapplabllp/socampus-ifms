#import <Foundation/Foundation.h>
#import <Capacitor/Capacitor.h>

// Capacitor plugin ko ObjC runtime se dhoondhta hai, isliye ye macro zaroori hai.
// Android me MainActivity me registerPlugin() likhna padta hai - iOS me ye file hi kaafi hai.
// Naam "LiveTracker" wahi hai jo Android me aur jo registerPlugin('LiveTracker') me hai.
CAP_PLUGIN(LiveTrackerPlugin, "LiveTracker",
           CAP_PLUGIN_METHOD(checkStatus, CAPPluginReturnPromise);
           CAP_PLUGIN_METHOD(start, CAPPluginReturnPromise);
           CAP_PLUGIN_METHOD(stop, CAPPluginReturnPromise);
           CAP_PLUGIN_METHOD(getSessionPoints, CAPPluginReturnPromise);
           CAP_PLUGIN_METHOD(getConfig, CAPPluginReturnPromise);
           CAP_PLUGIN_METHOD(setConfig, CAPPluginReturnPromise);
           CAP_PLUGIN_METHOD(startTrip, CAPPluginReturnPromise);
           CAP_PLUGIN_METHOD(getTripPoints, CAPPluginReturnPromise);
           CAP_PLUGIN_METHOD(endTrip, CAPPluginReturnPromise);
           CAP_PLUGIN_METHOD(clearTrip, CAPPluginReturnPromise);
           CAP_PLUGIN_METHOD(getActiveTrip, CAPPluginReturnPromise);
           CAP_PLUGIN_METHOD(openGpsSettings, CAPPluginReturnPromise);
           CAP_PLUGIN_METHOD(openLocationPermission, CAPPluginReturnPromise);
           CAP_PLUGIN_METHOD(openBatterySettings, CAPPluginReturnPromise);
           CAP_PLUGIN_METHOD(openNotificationSettings, CAPPluginReturnPromise);
           CAP_PLUGIN_METHOD(openActivityPermission, CAPPluginReturnPromise);
           CAP_PLUGIN_METHOD(openPreciseLocation, CAPPluginReturnPromise);
           CAP_PLUGIN_METHOD(openBackgroundRefresh, CAPPluginReturnPromise);
)
