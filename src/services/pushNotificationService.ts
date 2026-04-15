/**
 * Backend Push Notification Service
 * Handles sending push notifications via Firebase Cloud Messaging
 */

import * as admin from 'firebase-admin';
import { db } from '../lib/firebase';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';

// Initialize Firebase Admin SDK (this should be done in your backend server)
// const serviceAccount = require('../../firebase-admin-key.json');
// admin.initializeApp({
//   credential: admin.credential.cert(serviceAccount),
//   databaseURL: "your-database-url"
// });

/**
 * Send a push notification to a specific user
 */
export async function sendPushNotificationToUser(
  userId: string,
  title: string,
  body: string,
  data?: Record<string, string>
) {
  try {
    // Get user's FCM token from Firestore
    const userDocSnap = await getDoc(doc(db, 'users', userId));
    if (!userDocSnap.exists()) {
      console.log('User not found');
      return;
    }

    const userdata = userDocSnap.data();
    const fcmToken = userdata?.fcmToken;

    if (!fcmToken) {
      console.log('User has no FCM token');
      return;
    }

    // Send notification using Firebase Admin SDK
    const message = {
      notification: {
        title,
        body
      },
      data: data || {},
      token: fcmToken
    };

    const response = await admin.messaging().send(message);
    console.log('Push notification sent successfully:', response);
    return response;
  } catch (error) {
    console.error('Error sending push notification:', error);
    throw error;
  }
}

/**
 * Send a broadcast notification to all users
 */
export async function sendBroadcastNotification(
  title: string,
  body: string,
  data?: Record<string, string>
) {
  try {
    // Get all users with valid FCM tokens
    const usersSnapshot = await getDocs(
      query(collection(db, 'users'), where('fcmToken', '!=', null))
    );

    const promises = [];
    for (const userDoc of usersSnapshot.docs) {
      const fcmToken = userDoc.data().fcmToken;
      if (fcmToken) {
        const message = {
          notification: {
            title,
            body
          },
          data: data || {},
          token: fcmToken
        };
        promises.push(admin.messaging().send(message));
      }
    }

    const results = await Promise.all(promises);
    console.log(`Broadcast notification sent to ${results.length} users`);
    return results;
  } catch (error) {
    console.error('Error sending broadcast notification:', error);
    throw error;
  }
}

/**
 * Send a notification about an order update
 */
export async function sendOrderNotification(
  userId: string,
  orderId: string,
  status: 'confirmed' | 'preparing' | 'out_for_delivery' | 'delivered' | 'cancelled'
) {
  const statusMessages = {
    confirmed: { title: 'Order Confirmed ✅', body: 'Your order has been confirmed by the vendor.' },
    preparing: { title: 'Order Preparing 👨‍🍳', body: 'Your order is being prepared.' },
    out_for_delivery: { title: 'Out for Delivery 🚚', body: 'Your order is on the way!' },
    delivered: { title: 'Order Delivered 📦', body: 'Your order has been delivered.' },
    cancelled: { title: 'Order Cancelled ❌', body: 'Your order has been cancelled.' }
  };

  const message = statusMessages[status];
  await sendPushNotificationToUser(userId, message.title, message.body, {
    type: 'order',
    orderId,
    status
  });
}
