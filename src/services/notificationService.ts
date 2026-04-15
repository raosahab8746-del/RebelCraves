import { PushNotifications } from '@capacitor/push-notifications';

export const initNotifications = async () => {
  const permission = await PushNotifications.requestPermissions();

  if (permission.receive !== 'granted') return;

  await PushNotifications.register();

  PushNotifications.addListener('registration', token => {
    console.log('FCM Token:', token.value);
  });

  PushNotifications.addListener('pushNotificationReceived', notification => {
    console.log('Notification:', notification);
  });
};