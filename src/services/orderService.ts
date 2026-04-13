import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Order } from '../types';
import { sendNotification } from '../components/NotificationCenter';

export const updateOrderStatus = async (order: Order, newStatus: Order['status'], additionalData: any = {}) => {
  const orderRef = doc(db, 'orders', order.id);
  await updateDoc(orderRef, {
    status: newStatus,
    updatedAt: serverTimestamp(),
    ...additionalData
  });

  // Send notification to customer
  let title = '';
  let message = '';

  switch (newStatus) {
    case 'assigned':
      title = 'Order Assigned';
      message = 'A delivery partner has been assigned to your order.';
      break;
    case 'picked_up':
      title = 'Order Picked Up';
      message = 'Your order has been picked up from the shop.';
      break;
    case 'out_for_delivery':
      title = 'Out for Delivery';
      message = 'Your order is on the way to your address!';
      break;
    case 'arrived':
      title = 'Partner Arrived';
      message = 'Your delivery partner has arrived at your location.';
      break;
    case 'delivered':
      title = 'Order Delivered';
      message = 'Enjoy your meal! Your order has been delivered.';
      break;
    case 'cancelled':
      title = 'Order Cancelled';
      message = `Your order has been cancelled. Reason: ${additionalData.cancellationReason || 'N/A'}`;
      break;
  }

  if (title && message) {
    await sendNotification({
      userId: order.customerId,
      title,
      message,
      type: 'order_update',
      orderId: order.id
    });
  }

  // If assigned, notify the delivery partner
  if (newStatus === 'assigned' && (additionalData.deliveryPartnerId || order.deliveryPartnerId)) {
    const partnerId = additionalData.deliveryPartnerId || order.deliveryPartnerId;
    await sendNotification({
      userId: partnerId,
      title: 'New Order Assigned!',
      message: `You have been assigned a new order. Order ID: ${order.id.slice(-6)}`,
      type: 'assignment',
      orderId: order.id
    });
  }
};

export const verifyPayment = async (order: Order) => {
  const orderRef = doc(db, 'orders', order.id);
  await updateDoc(orderRef, {
    paymentStatus: 'paid',
    updatedAt: serverTimestamp()
  });

  await sendNotification({
    userId: order.customerId,
    title: 'Payment Verified!',
    message: 'Your UPI payment has been verified. Your order is now being processed.',
    type: 'order_update',
    orderId: order.id
  });
};
