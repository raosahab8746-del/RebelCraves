import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Order, DeliveryLocation } from '../types';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix marker icon issue
const markerIcon = 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png';
const markerShadow = 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png';

L.Marker.prototype.options.icon = L.icon({
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

// Auto recenter map
const RecenterMap = ({ position }: { position: [number, number] }) => {
  const map = useMap();
  useEffect(() => {
    map.setView(position);
  }, [position]);
  return null;
};

const OrderTracking = () => {
  const { orderId } = useParams();

  const [order, setOrder] = useState<Order | null>(null);
  const [location, setLocation] = useState<DeliveryLocation | null>(null);
  const [loading, setLoading] = useState(true);

  // 🔥 LISTEN ORDER + LOCATION
  useEffect(() => {
    if (!orderId) return;

    let unsubscribeLocation: any;

    const unsubscribeOrder = onSnapshot(
      doc(db, 'orders', orderId),
      (docSnap) => {
        if (docSnap.exists()) {
          const data = { id: docSnap.id, ...docSnap.data() } as Order;
          setOrder(data);

          // 🔥 Listen delivery partner location
          if (data.deliveryPartnerId) {
            if (unsubscribeLocation) unsubscribeLocation();

            unsubscribeLocation = onSnapshot(
              doc(db, 'locations', data.deliveryPartnerId),
              (locSnap) => {
                if (locSnap.exists()) {
                  setLocation(locSnap.data() as DeliveryLocation);
                }
              }
            );
          }
        }
        setLoading(false);
      }
    );

    return () => {
      unsubscribeOrder();
      if (unsubscribeLocation) unsubscribeLocation();
    };
  }, [orderId]);

  // ---------------- UI ----------------

  if (loading) return <div className="p-10 text-center">Loading tracking...</div>;
  if (!order) return <div className="p-10 text-center">Order not found</div>;

  const deliveryPos: [number, number] | null =
    location ? [location.lat, location.lng] : null;

  const customerPos: [number, number] | null =
    order.customerLat && order.customerLng
      ? [order.customerLat, order.customerLng]
      : null;

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-6">

      <h1 className="text-3xl font-bold">
        Track Order #{order.id.slice(0, 6)}
      </h1>

      {/* STATUS */}
      <div className="bg-gray-100 p-4 rounded-xl">
        <p><b>Status:</b> {order.status}</p>
        {order.etaMins && (
          <p><b>ETA:</b> {order.etaMins} mins</p>
        )}
      </div>

      {/* MAP */}
      <div className="h-[450px] rounded-xl overflow-hidden shadow">
        {deliveryPos ? (
          <MapContainer
            center={deliveryPos}
            zoom={15}
            style={{ height: '100%', width: '100%' }}
          >
            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />

            {/* Delivery Boy */}
            <Marker position={deliveryPos}>
              <Popup>Delivery Partner</Popup>
            </Marker>

            {/* Customer */}
            {customerPos && (
              <Marker position={customerPos}>
                <Popup>Your Location</Popup>
              </Marker>
            )}

            <RecenterMap position={deliveryPos} />
          </MapContainer>
        ) : (
          <div className="h-full flex items-center justify-center">
            Finding delivery partner...
          </div>
        )}
      </div>

      {/* DELIVERY INFO */}
      <div className="bg-white p-6 rounded-xl shadow space-y-2">
        <h2 className="font-bold text-lg">Delivery Details</h2>
        <p><b>Address:</b> {order.address}</p>
        <p><b>Customer:</b> {order.customerName}</p>
        {order.deliveryPartnerMobile && (
          <a href={`tel:${order.deliveryPartnerMobile}`} className="text-blue-600">
            Call Delivery Partner
          </a>
        )}
      </div>

      {/* ITEMS */}
      <div className="bg-white p-6 rounded-xl shadow space-y-2">
        <h2 className="font-bold text-lg">Order Items</h2>
        {order.items.map(item => (
          <div key={item.id} className="flex justify-between">
            <span>{item.name} x{item.quantity}</span>
            <span>₹{item.price * item.quantity}</span>
          </div>
        ))}
      </div>

      {/* TOTAL */}
      <div className="bg-green-50 p-6 rounded-xl text-xl font-bold">
        Total: ₹{order.totalPrice}
      </div>

    </div>
  );
};

export default OrderTracking;