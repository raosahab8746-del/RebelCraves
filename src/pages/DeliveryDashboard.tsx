import React, { useEffect, useState } from 'react';
import { collection, doc, onSnapshot, query, updateDoc, setDoc, serverTimestamp, where } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Order } from '../types';
import { useAuth } from '../context/AuthContext';
import { Geolocation } from '@capacitor/geolocation';
import { motion } from 'motion/react';
import { MapPin, Phone, Clock, Package, CheckCircle2, AlertTriangle } from 'lucide-react';

const DeliveryDashboard = () => {
  const { profile } = useAuth();

  const [orders, setOrders] = useState<Order[]>([]);
  const [isSharingLocation, setIsSharingLocation] = useState(false);
  const [currentPartnerLoc, setCurrentPartnerLoc] = useState<{ lat: number; lng: number } | null>(null);
  const [orderFilter, setOrderFilter] = useState<'all' | 'assigned' | 'in_delivery' | 'completed'>('assigned');
  const [sortOrder, setSortOrder] = useState<'oldest' | 'newest'>('oldest');

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
    <div className="p-6 space-y-8 pb-20">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="space-y-1">
          <h1 className="text-4xl font-black text-navy-900 tracking-tight uppercase">Delivery Hub</h1>
          <p className="text-gray-400 font-bold uppercase tracking-widest text-xs">Manage deliveries & locations</p>
        </div>
        
        <motion.button
          whileHover={{ y: -2 }}
          whileTap={{ scale: 0.98 }}
          onClick={toggleOnlineStatus}
          className={`px-6 py-3 rounded-2xl cursor-pointer flex items-center space-x-3 transition-all shadow-lg font-black uppercase tracking-widest text-[10px] ${
            isSharingLocation 
              ? 'bg-green-500 text-white shadow-green-100' 
              : 'bg-gray-400 text-white shadow-gray-100'
          }`}
        >
          <div className={`w-3 h-3 rounded-full ${isSharingLocation ? 'bg-white animate-pulse' : 'bg-white/50'}`} />
          {isSharingLocation ? 'ONLINE (Tracking)' : 'OFFLINE'}
        </motion.button>
      </div>

      {/* Current Location Display */}
      {currentPartnerLoc && (
        <div className="bg-gradient-to-r from-blue-50 to-blue-100 p-6 rounded-[2rem] border border-blue-200 shadow-lg shadow-blue-100">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 bg-blue-500 text-white rounded-full flex items-center justify-center">
              <MapPin size={24} strokeWidth={2} />
            </div>
            <div>
              <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest">Current Location</p>
              <p className="text-lg font-black text-navy-900">Lat: {currentPartnerLoc.lat.toFixed(4)} | Lng: {currentPartnerLoc.lng.toFixed(4)}</p>
            </div>
          </div>
        </div>
      )}

      {/* Orders Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-navy-900 p-8 rounded-[2.5rem] shadow-2xl shadow-navy-200 text-white flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-[10px] font-black text-navy-300 uppercase tracking-widest">Assigned Orders</p>
            <p className="text-3xl font-black tracking-tighter">
              {orders.filter(o => o.status === 'assigned').length}
            </p>
          </div>
          <div className="w-14 h-14 bg-white/10 rounded-2xl flex items-center justify-center text-accent-500">
            <Package size={28} strokeWidth={3} />
          </div>
        </div>

        <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-xl shadow-navy-50 flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">In Delivery</p>
            <p className="text-3xl font-black text-navy-900 tracking-tighter">
              {orders.filter(o => o.status === 'out_for_delivery').length}
            </p>
          </div>
          <div className="w-14 h-14 bg-orange-50 text-orange-500 rounded-2xl flex items-center justify-center">
            <AlertTriangle size={28} strokeWidth={3} />
          </div>
        </div>

        <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-xl shadow-navy-50 flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Completed Today</p>
            <p className="text-3xl font-black text-navy-900 tracking-tighter">
              {orders.filter(o => o.status === 'delivered').length}
            </p>
          </div>
          <div className="w-14 h-14 bg-green-50 text-green-500 rounded-2xl flex items-center justify-center">
            <CheckCircle2 size={28} strokeWidth={3} />
          </div>
        </div>
      </div>

      {/* Orders List */}
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <h2 className="text-2xl font-black text-navy-900 tracking-tight uppercase">Active Deliveries</h2>
          <div className="flex items-center space-x-3">
            <div className="flex space-x-2">
              {[
                { value: 'assigned', label: 'Assigned' },
                { value: 'in_delivery', label: 'In Delivery' },
                { value: 'completed', label: 'Completed' },
                { value: 'all', label: 'All' }
              ].map(filter => (
                <button
                  key={filter.value}
                  onClick={() => setOrderFilter(filter.value as any)}
                  className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                    orderFilter === filter.value ? 'bg-navy-900 text-white shadow-lg shadow-navy-100' : 'bg-navy-50 text-navy-400 hover:bg-navy-100'
                  }`}
                >
                  {filter.label}
                </button>
              ))}
            </div>
            <select 
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value as any)}
              className="bg-navy-50 border-none rounded-xl text-[10px] font-black uppercase tracking-widest text-navy-900 px-4 py-2 focus:ring-2 focus:ring-navy-500"
            >
              <option value="oldest">Oldest First (Priority)</option>
              <option value="newest">Newest First</option>
            </select>
          </div>
        </div>

        {/* Orders Grid */}
        <div className="space-y-4">
          {orders
            .filter(o => {
              if (orderFilter === 'assigned') return o.status === 'assigned';
              if (orderFilter === 'in_delivery') return o.status === 'out_for_delivery';
              if (orderFilter === 'completed') return o.status === 'delivered';
              return true;
            })
            .sort((a, b) => {
              const timeA = a.createdAt?.toMillis ? a.createdAt.toMillis() : 0;
              const timeB = b.createdAt?.toMillis ? b.createdAt.toMillis() : 0;
              return sortOrder === 'oldest' ? timeA - timeB : timeB - timeA;
            })
            .map((order, index) => {
              const createdTime = order.createdAt?.toDate?.()?.getTime?.() || Date.now();
              const currentTime = Date.now();
              const minutesOld = Math.floor((currentTime - createdTime) / 60000);
              
              return (
                <motion.div
                  key={order.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className={`p-6 rounded-[2rem] border shadow-lg hover:shadow-xl transition-all ${
                    order.status === 'assigned' 
                      ? 'bg-yellow-50 border-yellow-200 shadow-yellow-100' 
                      : order.status === 'out_for_delivery'
                      ? 'bg-blue-50 border-blue-200 shadow-blue-100'
                      : 'bg-green-50 border-green-200 shadow-green-100'
                  }`}
                >
                  <div className="flex flex-col md:flex-row justify-between items-start gap-6">
                    {/* Order Info */}
                    <div className="flex-1 space-y-4">
                      <div className="flex items-start justify-between">
                        <div className="space-y-2">
                          <div className="flex items-center space-x-3">
                            <h3 className="text-xl font-black text-navy-900">Order #{order.id.slice(0, 8)}</h3>
                            {order.status === 'assigned' && (
                              <span className="text-[8px] font-black bg-red-500 text-white px-2 py-1 rounded-md animate-pulse uppercase tracking-widest">
                                Priority
                              </span>
                            )}
                          </div>
                          <p className="text-sm font-bold text-gray-600">{order.customerName}</p>
                          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{order.customerMobile}</p>
                        </div>
                        <div className="text-right">
                          <div className="flex items-center space-x-1 text-orange-600 mb-2">
                            <Clock size={16} />
                            <span className="text-xs font-black uppercase tracking-widest">
                              {minutesOld < 2 ? 'Just now' : minutesOld < 60 ? `${minutesOld}m ago` : `${Math.floor(minutesOld / 60)}h ago`}
                            </span>
                          </div>
                          <span className={`text-[10px] font-black px-3 py-1 rounded-lg uppercase tracking-widest border ${
                            order.status === 'delivered' ? 'bg-green-100 text-green-700 border-green-300' : 
                            order.status === 'out_for_delivery' ? 'bg-blue-100 text-blue-700 border-blue-300' :
                            'bg-yellow-100 text-yellow-700 border-yellow-300'
                          }`}>
                            {order.status.replace('_', ' ')}
                          </span>
                        </div>
                      </div>

                      {/* Items */}
                      <div className="bg-white/60 p-4 rounded-lg space-y-2">
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Items</p>
                        {order.items.map((item, idx) => (
                          <p key={idx} className="text-sm font-bold text-navy-900">
                            {item.quantity}x {item.name}
                          </p>
                        ))}
                      </div>

                      {/* Delivery Address */}
                      <div className="bg-white/60 p-4 rounded-lg">
                        <div className="flex items-start space-x-3">
                          <MapPin size={16} className="text-navy-900 mt-1 shrink-0" />
                          <div>
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Delivery Address</p>
                            <p className="text-sm font-bold text-navy-900">{order.address}</p>
                          </div>
                        </div>
                      </div>

                      {/* Special Instructions */}
                      {order.specialInstructions && (
                        <div className="bg-accent-50 border border-accent-200 p-4 rounded-lg">
                          <p className="text-[10px] font-black text-accent-600 uppercase tracking-widest mb-1">Special Instructions</p>
                          <p className="text-sm text-navy-900">{order.specialInstructions}</p>
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex flex-col space-y-3 min-w-[180px]">
                      <a
                        href={`tel:${order.customerMobile}`}
                        className="w-full bg-green-500 text-white rounded-xl px-4 py-3 font-black uppercase tracking-widest text-[10px] hover:bg-green-600 transition-colors flex items-center justify-center space-x-2 shadow-lg"
                      >
                        <Phone size={16} />
                        <span>Call Customer</span>
                      </a>

                      {order.status === 'assigned' && (
                        <button
                          onClick={async () => {
                            await updateDoc(doc(db, 'orders', order.id), {
                              status: 'out_for_delivery',
                              statusUpdatedAt: serverTimestamp()
                            });
                          }}
                          className="w-full bg-blue-500 text-white rounded-xl px-4 py-3 font-black uppercase tracking-widest text-[10px] hover:bg-blue-600 transition-colors shadow-lg"
                        >
                          Mark In Delivery
                        </button>
                      )}

                      {order.status === 'out_for_delivery' && (
                        <button
                          onClick={async () => {
                            await updateDoc(doc(db, 'orders', order.id), {
                              status: 'delivered',
                              deliveredAt: serverTimestamp(),
                              statusUpdatedAt: serverTimestamp()
                            });
                          }}
                          className="w-full bg-green-500 text-white rounded-xl px-4 py-3 font-black uppercase tracking-widest text-[10px] hover:bg-green-600 transition-colors shadow-lg"
                        >
                          Mark Delivered
                        </button>
                      )}

                      {order.status !== 'delivered' && (
                        <a
                          href={`https://maps.google.com/?q=${encodeURIComponent(order.address)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="w-full bg-navy-900 text-white rounded-xl px-4 py-3 font-black uppercase tracking-widest text-[10px] hover:bg-navy-800 transition-colors text-center shadow-lg"
                        >
                          Open in Maps
                        </a>
                      )}
                    </div>
                  </div>
                </motion.div>
              );
            })}

          {orders.filter(o => {
            if (orderFilter === 'assigned') return o.status === 'assigned';
            if (orderFilter === 'in_delivery') return o.status === 'out_for_delivery';
            if (orderFilter === 'completed') return o.status === 'delivered';
            return true;
          }).length === 0 && (
            <div className="text-center py-12">
              <Package size={48} className="mx-auto text-gray-300 mb-4" />
              <p className="text-lg font-bold text-gray-500">No orders to display</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DeliveryDashboard;