# Preserve Firebase classes from obfuscation
-keep class com.google.firebase.** { *; }
-keep class com.google.android.gms.** { *; }

# Firebase Analytics specific rules
-keep class com.google.firebase.analytics.** { *; }
-keep class com.google.android.gms.measurement.** { *; }

# Firebase Cloud Messaging (FCM) specific rules
-keep class com.google.firebase.messaging.** { *; }
-keep class com.google.android.gms.gcm.** { *; }

# Firebase Realtime Database specific rules
-keep class com.google.firebase.database.** { *; }

# Firebase Firestore specific rules
-keep class com.google.firebase.firestore.** { *; }

# Firebase Authentication specific rules
-keep class com.google.firebase.auth.** { *; }

# Firebase Remote Config specific rules
-keep class com.google.firebase.remoteconfig.** { *; }

# Firebase Storage specific rules
-keep class com.google.firebase.storage.** { *; }

# Firebase Functions specific rules
-keep class com.google.firebase.functions.** { *; }

# Prevent Firebase from being stripped out
-dontwarn com.google.firebase.**
-dontwarn com.google.android.gms.**

# Keep the class used for dynamic linking in Firebase SDK
-keep class com.google.firebase.dynamiclinks.** { *; }

# Keep methods used for Firebase Installation (needed for persistence)
-keep class com.google.firebase.installations.** { *; }

# Prevent optimization of Firebase services
-keep class com.google.firebase.messaging.FirebaseMessagingService { *; }
-keep class com.google.firebase.auth.FirebaseAuth { *; }

# Keep all the methods required for Firebase Push Notifications
-keep class com.google.firebase.messaging.FirebaseMessaging { *; }
