# Notification Management Guide

Complete guide to manage, configure, and troubleshoot push notifications in RebelCraves.

---

## 1. Send Notifications from Backend

Use the helper functions in `src/services/pushNotificationService.ts`:

### Send to Specific User
```typescript
import { sendPushNotificationToUser } from './src/services/pushNotificationService';

await sendPushNotificationToUser(
  'userId123',
  'Order Ready! 🍽️',
  'Your order is ready for pickup',
  { orderId: 'order123', type: 'order' }
);
```

### Send Order Status Update
```typescript
import { sendOrderNotification } from './src/services/pushNotificationService';

// Status options: 'confirmed' | 'preparing' | 'out_for_delivery' | 'delivered' | 'cancelled'
await sendOrderNotification('userId123', 'order123', 'out_for_delivery');
```

### Send Broadcast to All Users
```typescript
import { sendBroadcastNotification } from './src/services/pushNotificationService';

await sendBroadcastNotification(
  'Special Offer! 🎉',
  'Get 50% off on all orders today'
);
```

### Example Express Endpoint
```typescript
app.post('/api/send-notification', async (req, res) => {
  try {
    const { userId, title, message, data } = req.body;
    
    await sendPushNotificationToUser(userId, title, message, data);
    
    res.json({ success: true, message: 'Notification sent' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
```

---

## 2. Test Notifications

### Option A: Firebase Console (Easiest)

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Select your project
3. Navigate to **Cloud Messaging**
4. Click **Create your first campaign**
5. Fill in notification details:
   - Title: "Test Notification"
   - Message: "This is a test!"
6. Target: Select "Single Device"
7. Paste your test device's FCM token
8. Review and send

**Where to get FCM Token:**
- Open app console: `F12` → Console tab
- Look for: `Push token: ...`
- Or check Firestore: Users → Your User Doc → `fcmToken` field

### Option B: Backend Endpoint

Create a test endpoint:
```typescript
app.post('/api/test-notification', async (req, res) => {
  const { userId } = req.body;
  
  try {
    await sendPushNotificationToUser(
      userId,
      'Test Notification 🧪',
      'If you see this, notifications work!'
    );
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
```

Test with curl:
```bash
curl -X POST http://localhost:3000/api/test-notification \
  -H "Content-Type: application/json" \
  -d '{"userId":"your-user-id"}'
```

### Test Scenarios

**Foreground (App Open):**
- Keep app open
- Send notification
- Should see toast notification with sound

**Background (App Closed):**
- Close/minimize app
- Send notification
- Should see native OS notification

**Lock Screen (Mobile):**
- Lock phone
- Send notification
- Notification appears on lock screen

---

## 3. Configure Notification Behavior

### Change Notification Sound

Edit [src/components/NotificationCenter.tsx](src/components/NotificationCenter.tsx#L34):

```typescript
useEffect(() => {
  // Replace URL with your desired sound
  audioRef.current = new Audio('YOUR_AUDIO_URL_HERE');
  
  if ('Notification' in window && Notification.permission === 'default') {
    Notification.requestPermission();
  }
}, []);
```

**Sound Resources:**
- [Mixkit](https://mixkit.co/free-sound-effects/notification/) - Free notification sounds
- [Freesound](https://freesound.org/) - Community sounds
- [Zapsplat](https://www.zapsplat.com/) - Free SFX
- [Notification Sounds](https://www.notificationsounds.com/)

**Sound URL Format:**
```typescript
// Direct MP3 URL
audioRef.current = new Audio('https://example.com/sound.mp3');

// Or local file
audioRef.current = new Audio('/sounds/notification.mp3');
```

### Change Toast Display Duration

Find the `setTimeout` in [src/components/NotificationCenter.tsx](src/components/NotificationCenter.tsx):

```typescript
// Show toast for 7 seconds (default is 5)
setTimeout(() => {
  setShowToast(null);
}, 7000); // milliseconds: 7000 = 7 seconds
```

### Disable Sound Alert

In [src/components/NotificationCenter.tsx](src/components/NotificationCenter.tsx), find the audio play section:

```typescript
// Comment out or remove this block to disable sound:
/*
if (audioRef.current) {
  audioRef.current.currentTime = 0;
  audioRef.current.play().catch(e => console.log('Audio play failed:', e));
}
*/
```

### Customize Toast Appearance

Edit [src/components/NotificationCenter.tsx](src/components/NotificationCenter.tsx) to modify:
- Toast position: `fixed top-4 right-4`
- Animation duration
- Colors and styling
- Icon display

---

## 4. Monitor Notifications

### Browser Console Logs

Open DevTools (`F12`) → Console tab:

```javascript
// Check if service worker is registered
navigator.serviceWorker.ready.then(reg => {
  console.log('Service Worker ready:', reg);
});

// Listen for messages from service worker
navigator.serviceWorker.addEventListener('message', event => {
  console.log('Message from Service Worker:', event.data);
});

// Check if user has FCM token
// (Replace 'userId' with actual user ID)
db.collection('users').doc('userId').get().then(doc => {
  console.log('User data:', doc.data());
  console.log('FCM Token:', doc.data()?.fcmToken);
});
```

### Firebase Console Analytics

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Select project → **Cloud Messaging**
3. View notification campaigns
4. Check:
   - **Impressions**: How many devices received it
   - **Conversions**: How many tapped it
   - **Failures**: Any delivery issues

### Firestore Notifications Collection

Check notifications stored in database:

1. Firebase Console → **Firestore Database**
2. Collection: `notifications`
3. View notification documents with:
   - `userId`: Who received it
   - `createdAt`: When it was sent
   - `read`: Whether user viewed it
   - `title`, `message`: Content
   - `type`: Type of notification

---

## 5. Key Files & Their Roles

| File | Purpose | Key Changes |
|------|---------|-------------|
| `src/lib/firebase.ts` | FCM initialization & setup | Initialize messaging, add foreground handler |
| `src/App.tsx` | Handle incoming push events | Save notifications to Firestore |
| `src/components/NotificationCenter.tsx` | Display in-app notifications | Sound URL, toast duration, styling |
| `public/sw.js` | Handle background notifications | Background push handler, click actions |
| `src/services/pushNotificationService.ts` | Backend notification helpers | Send functions, payload formatting |

---

## 6. Troubleshooting

### Problem: Notifications Not Arriving

**Check 1: FCM Token is Saved**
```javascript
// In browser console
db.collection('users').doc(userId).get().then(doc => {
  const token = doc.data()?.fcmToken;
  if (!token) {
    console.error('User has no FCM token!');
  } else {
    console.log('FCM Token saved:', token);
  }
});
```

**Check 2: User Granted Permission**
```javascript
console.log('Notification permission:', Notification.permission);
// Should be 'granted'
```

**Check 3: Service Worker Registered**
```javascript
navigator.serviceWorker.getRegistrations().then(regs => {
  console.log('Registered Service Workers:', regs);
});
```

### Problem: Sound Not Playing

**Solution:**
```typescript
// Add error handling in NotificationCenter.tsx
audioRef.current.play().catch(e => {
  console.error('Audio play failed:', e);
  console.log('Possible reasons:');
  console.log('1. Browser muted');
  console.log('2. Invalid audio URL');
  console.log('3. CORS issue');
  console.log('4. User interaction required');
});
```

**Fix:**
1. Check browser audio permissions
2. Verify sound URL is accessible
3. Test with different sound URL
4. Check CORS headers if using external source

### Problem: Service Worker Not Working

**Solution:**
1. **Clear cache:**
   - Open DevTools → Storage tab
   - Click "Clear site data"
   - Reload page

2. **Check registered SWs:**
   - DevTools → Application tab
   - Service Workers section
   - Unregister old/broken ones

3. **Verify sw.js location:**
   - Must be in `public/` folder
   - Must be served from root (`/sw.js`)

### Problem: Notifications Show But Don't Navigate

**Check notification data structure:**
```javascript
// Should include these fields
{
  type: 'order',
  orderId: 'order123'
}
```

**Check service worker click handler:**
- Open DevTools → Console
- Send test notification
- Click it
- Watch console for errors

### Problem: Background Notifications Don't Show

**Possible causes:**
1. User has not granted notification permission
2. App not registered for FCM
3. Payload format incorrect
4. Service worker not registered

**Debug:**
```javascript
// Check all permissions
console.log('Notification permission:', Notification.permission);
console.log('Service Worker:', 'serviceWorker' in navigator);

// Request permissions if needed
if (Notification.permission === 'default') {
  Notification.requestPermission().then(result => {
    console.log('Permission result:', result);
  });
}
```

---

## 7. Production Checklist

Before deploying to production:

- [ ] Firebase Admin SDK configured on backend
- [ ] Firebase service account key secured (not in git)
- [ ] Notification endpoints tested
- [ ] Sound URL is accessible in production
- [ ] Service worker deployed correctly
- [ ] CORS headers configured (if needed)
- [ ] Firestore security rules allow notification writes
- [ ] Test notifications work on all devices
- [ ] Monitor notification delivery in Firebase Console
- [ ] Set up error logging/alerts

---

## 8. Quick Reference Commands

```bash
# Test locally
npm run dev

# Build for production
npm run build

# Check TypeScript errors
npm run lint

# View console logs in production
# Open DevTools F12 → Console
```

---

## 9. Notification Payload Format

### Example Push Notification Payload

```json
{
  "notification": {
    "title": "Order Ready 🍽️",
    "body": "Your order is ready for pickup!"
  },
  "data": {
    "type": "order",
    "orderId": "12345",
    "status": "ready"
  },
  "token": "user-fcm-token"
}
```

### Order Status Notifications

| Status | Title | Message |
|--------|-------|---------|
| confirmed | Order Confirmed ✅ | Your order has been confirmed by the vendor. |
| preparing | Order Preparing 👨‍🍳 | Your order is being prepared. |
| out_for_delivery | Out for Delivery 🚚 | Your order is on the way! |
| delivered | Order Delivered 📦 | Your order has been delivered. |
| cancelled | Order Cancelled ❌ | Your order has been cancelled. |

---

## 10. Contact & Support

For issues or questions:
1. Check this guide first
2. Review browser console logs
3. Check Firebase Cloud Messaging documentation
4. Verify all setup steps in `NOTIFICATIONS_SETUP.md`

---

**Last Updated:** April 2026  
**Version:** 1.0
