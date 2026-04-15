# Background Push Notifications Setup Guide

## Problem Fixed
Notifications were only displaying when the app was in the foreground (like Swiggy/Zomato showing notifications even when app is closed).

## Solutions Implemented

### 1. **Firebase Cloud Messaging Integration** (firebase.ts)
- Initialized Firebase Cloud Messaging (FCM) for web
- Added foreground message handler
- Messages are now properly handled even when app is in background

### 2. **Enhanced Push Notification Handler** (App.tsx)
- Notifications received while app is foreground are saved to Firestore
- This ensures they appear in your notification center
- Added click handlers for navigation

### 3. **Improved Service Worker** (public/sw.js)
- Better handling of background push events
- Proper notification display with required properties
- Click handlers that navigate to relevant pages (orders, etc.)
- Sends messages to app when user clicks notification

### 4. **Backend Notification Service** (NEW: src/services/pushNotificationService.ts)
- Methods to send notifications via Firebase Admin SDK
- Support for individual user and broadcast notifications
- Order status update notifications

---

## Backend Setup Required

### Step 1: Install Firebase Admin SDK

```bash
npm install firebase-admin
```

### Step 2: Get Firebase Admin Credentials
1. Go to [Firebase Console](https://console.firebase.google.com)
2. Select your project
3. Go to **Project Settings** → **Service Accounts** tab
4. Click **Generate New Private Key**
5. Save the JSON file as `firebase-admin-key.json` in your project root

### Step 3: Initialize Firebase Admin in Your Backend

```typescript
import * as admin from 'firebase-admin';
const serviceAccount = require('./firebase-admin-key.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "your-project-id.firebaseio.com"
});
```

### Step 4: Send Notifications from Backend

```typescript
import { sendPushNotificationToUser, sendOrderNotification } from './src/services/pushNotificationService';

// Send notification to specific user
await sendPushNotificationToUser(
  'userId123',
  'Order Ready! 🍽️',
  'Your order is ready for pickup',
  { orderId: 'order123', type: 'order' }
);

// Send order status update
await sendOrderNotification('userId123', 'order123', 'out_for_delivery');

// Send broadcast notification
await sendBroadcastNotification(
  'Special Offer! 🎉',
  'Get 50% off on all orders today'
);
```

---

## How It Works Now

### On Web (PWA):
1. Backend sends push notification via FCM
2. Service worker receives it (even if app is closed)
3. Browser displays notification
4. When user clicks notification:
   - App opens/focuses
   - Service worker sends message to app
   - App navigates to relevant page

### On Mobile (Capacitor):
1. Backend sends push notification via FCM
2. Capacitor plugin receives it:
   - **Foreground**: Handler saves to Firestore → appears in NotificationCenter
   - **Background**: Native notification displayed by OS
   - When user taps: App handles navigation

### In-App Display:
1. NotificationCenter component monitors Firestore `notifications` collection
2. Shows toast notifications in real-time
3. Displays in notification bell icon
4. Maintains notification history

---

## Testing

### Test Foreground Notification:
```bash
# Keep app open and trigger notification from backend
# You should see toast + sound
```

### Test Background Notification:
```bash
# Minimize app or lock phone
# Trigger notification from backend
# Native notification should appear on screen
```

### Simulate from Firebase Console:
1. Go to Firebase Console → Cloud Messaging
2. Create a new campaign
3. Send test notification to your device

---

## Key Files Modified

| File | Changes |
|------|---------|
| `src/lib/firebase.ts` | Added FCM initialization and foreground handler |
| `src/App.tsx` | Enhanced push notification listener to save to Firestore |
| `public/sw.js` | Improved background push handling |
| `src/services/pushNotificationService.ts` | NEW: Backend notification helpers |

---

## Troubleshooting

### Notifications not showing in background?
- Ensure user has granted notification permission
- Check FCM token is saved: User doc should have `fcmToken` field
- Verify notification payload format in backend

### Notification appears but doesn't navigate?
- Check notification data includes proper fields (orderId, type)
- Ensure service worker is properly registered: `navigator.serviceWorker.ready`

### FCM Token not saving?
- User must be logged in when permission is requested
- Check Firestore security rules allow write to user doc

### Service Worker not updating?
- Clear browser cache: DevTools → Storage → Clear site data
- Unregister old service workers: Application tab → Service Workers
- Reload page

---

## Security Considerations

1. **Never commit firebase-admin-key.json** - Add to .gitignore
2. **Use environment variables** for sensitive keys
3. **Validate user permissions** before sending sensitive notifications
4. **Rate limit** notification sending to prevent abuse

---

## Next Steps

1. Set up Firebase Admin SDK in your backend
2. Create API endpoints that send notifications
3. Trigger notifications on order events (order placed, out for delivery, etc.)
4. Test on both web and mobile platforms
5. Monitor notification delivery in Firebase Console

Your app will now display notifications like Swiggy/Zomato! 🎉
