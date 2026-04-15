import React, { useEffect, useState } from 'react';
import { collection, doc, onSnapshot, query, updateDoc, setDoc, serverTimestamp, where } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Order } from '../types';
import { useAuth } from '../context/AuthContext';
import { Geolocation } from '@capacitor/geolocation';

const DeliveryDashboard = () => {
  const { profile } = useAuth();

  const [orders, setOrders] = useState<Order[]>([]);
  const [isSharingLocation, setIsSharingLocation] = useState(false);
  const [currentPartnerLoc, setCurrentPartnerLoc] = useState<{ lat: number; lng: number } | null>(null);

  // ✅ LOAD DELIVERY ORDERS
  useEffect(() => {
    if (!profile) return;

    const q = query(
      collection(db, 'orders'),
      where('deliveryPartnerId', '==', profile.uid)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Order[];

      setOrders(data);
    });

    return () => unsubscribe();
  }, [profile]);

  // ✅ TOGGLE ONLINE / OFFLINE
  const toggleOnlineStatus = async () => {
    if (!profile) return;

    const newStatus = !isSharingLocation;
    setIsSharingLocation(newStatus);

    await updateDoc(doc(db, 'users', profile.uid), {
      isActive: newStatus
    });
  };

  // ✅ 🔥 MAIN LOCATION TRACKING FIX
  useEffect(() => {
    let interval: any;

    const startTracking = async () => {
      try {
        // 🔥 Request permission
        const permission = await Geolocation.requestPermissions();

        if (permission.location !== 'granted') {
          alert("Please allow location permission");
          setIsSharingLocation(false);
          return;
        }

        interval = setInterval(async () => {
          try {
            const position = await Geolocation.getCurrentPosition({
              enableHighAccuracy: true
            });

            const { latitude, longitude } = position.coords;

            setCurrentPartnerLoc({
              lat: latitude,
              lng: longitude
            });

            // 🔥 SAVE TO FIRESTORE
            await setDoc(doc(db, 'locations', profile!.uid), {
              deliveryPartnerId: profile!.uid,
              lat: latitude,
              lng: longitude,
              updatedAt: serverTimestamp()
            });

            console.log("Location Updated:", latitude, longitude);

          } catch (err) {
            console.error("Location fetch error:", err);
          }
        }, 5000);

      } catch (err) {
        console.error("Permission error:", err);
      }
    };

    if (isSharingLocation && profile) {
      startTracking();
    }

    return () => clearInterval(interval);
  }, [isSharingLocation, profile]);

  return (
    <div className="p-6 space-y-6">

      <h1 className="text-3xl font-bold">Delivery Dashboard</h1>

      {/* STATUS TOGGLE */}
      <button
        onClick={toggleOnlineStatus}
        className={`px-6 py-3 rounded-xl text-white font-bold ${
          isSharingLocation ? 'bg-green-500' : 'bg-gray-400'
        }`}
      >
        {isSharingLocation ? 'ONLINE (Tracking)' : 'OFFLINE'}
      </button>

      {/* LOCATION DISPLAY */}
      {currentPartnerLoc && (
        <div className="bg-gray-100 p-4 rounded-xl">
          <p><b>Lat:</b> {currentPartnerLoc.lat}</p>
          <p><b>Lng:</b> {currentPartnerLoc.lng}</p>
        </div>
      )}

      {/* ORDERS */}
      <div className="space-y-4">
        {orders.map(order => (
          <div key={order.id} className="p-4 border rounded-xl">
            <h2 className="font-bold">{order.customerName}</h2>
            <p>{order.address}</p>
            <p>Status: {order.status}</p>
          </div>
        ))}
      </div>

    </div>
  );
};

export default DeliveryDashboard;