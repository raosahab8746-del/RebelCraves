import React, { useEffect, useState } from 'react';
import { collection, doc, onSnapshot, query, updateDoc, setDoc, serverTimestamp, where } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { Order, UserProfile } from '../types';
import { useAuth } from '../context/AuthContext';
import { motion, AnimatePresence } from 'motion/react';
import { Truck, MapPin, CheckCircle2, Phone, Navigation, CreditCard, Settings, Upload, Clock, CloudRain, Store, Bell, RotateCcw, X, List, AlertCircle, Package } from 'lucide-react';
import { updateOrderStatus } from '../services/orderService';
import { sendNotification } from '../components/NotificationCenter';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Use CDN for Leaflet marker icons
const markerIcon = 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png';
const markerShadow = 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});
L.Marker.prototype.options.icon = DefaultIcon;

const RecenterMap = ({ position }: { position: [number, number] }) => {
  const map = useMap();
  useEffect(() => {
    map.setView(position);
  }, [position, map]);
  return null;
};

const DeliveryMapModal = ({ order, onClose, partnerLocation }: { order: Order; onClose: () => void; partnerLocation: { lat: number; lng: number } | null }) => {
  const customerPos: [number, number] = [order.customerLat || 0, order.customerLng || 0];
  const partnerPos: [number, number] | null = partnerLocation ? [partnerLocation.lat, partnerLocation.lng] : null;

  return (
    <div className="fixed inset-0 bg-navy-900/90 backdrop-blur-md z-[100] flex items-center justify-center p-4" onClick={onClose}>
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-[3rem] w-full max-w-5xl h-[80vh] overflow-hidden flex flex-col shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        <div className="p-6 border-b border-gray-100 flex justify-between items-center">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 bg-red-50 text-red-500 rounded-2xl flex items-center justify-center">
              <MapPin size={24} strokeWidth={3} />
            </div>
            <div>
              <h2 className="text-xl font-black text-navy-900 uppercase tracking-tight">Delivery Map</h2>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest truncate max-w-xs">{order.address}</p>
            </div>
          </div>
          <button onClick={onClose} className="w-12 h-12 bg-navy-50 rounded-2xl flex items-center justify-center text-navy-400 hover:bg-navy-100 hover:text-navy-900 transition-all">
            <X size={24} strokeWidth={3} />
          </button>
        </div>
        
        <div className="flex-1 relative">
          {order.customerLat && order.customerLng ? (
            <MapContainer center={customerPos} zoom={15} className="w-full h-full z-0">
              <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
              <Marker position={customerPos}>
                <Popup>Customer Location</Popup>
              </Marker>
              {partnerPos && (
                <Marker position={partnerPos}>
                  <Popup>Your Location</Popup>
                </Marker>
              )}
              <RecenterMap position={customerPos} />
            </MapContainer>
          ) : (
            <div className="w-full h-full bg-navy-50 flex flex-col items-center justify-center text-navy-200 space-y-4">
              <AlertCircle size={64} strokeWidth={1} />
              <p className="font-black uppercase tracking-widest text-xs">Customer coordinates not available</p>
              <a 
                href={`https://maps.google.com/?q=${encodeURIComponent(order.address)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="px-6 py-3 bg-navy-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest"
              >
                Open in Google Maps
              </a>
            </div>
          )}
          
          {order.customerLat && order.customerLng && (
            <div className="absolute bottom-8 left-8 right-8 z-[1000] flex justify-between items-end pointer-events-none">
              <div className="bg-white/90 backdrop-blur p-6 rounded-[2rem] border border-white/20 shadow-2xl pointer-events-auto space-y-4 max-w-xs">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-blue-500 text-white rounded-xl flex items-center justify-center">
                    <Navigation size={20} strokeWidth={3} />
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Navigation</p>
                    <p className="text-sm font-black text-navy-900 uppercase tracking-tight">Ready to deliver</p>
                  </div>
                </div>
                <a 
                  href={`https://www.google.com/maps/dir/?api=1&destination=${order.customerLat},${order.customerLng}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full bg-navy-900 text-white py-3 rounded-xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center space-y-2 hover:bg-navy-800 transition-all"
                >
                  <Navigation size={14} />
                  <span>Start Navigation</span>
                </a>
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
};

const DeliveryDashboard = () => {
  const { profile } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [isSharingLocation, setIsSharingLocation] = useState(profile?.isActive || false);
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'processing' | 'packed' | 'delivered'>('all');
  const [selectedOrderForMap, setSelectedOrderForMap] = useState<Order | null>(null);
  const [currentPartnerLoc, setCurrentPartnerLoc] = useState<{ lat: number; lng: number } | null>(null);

  useEffect(() => {
    if (profile && profile.isActive !== undefined) {
      setIsSharingLocation(profile.isActive);
    }
  }, [profile?.isActive]);

  const toggleOnlineStatus = async () => {
    if (!profile) return;
    const newStatus = !isSharingLocation;
    setIsSharingLocation(newStatus);
    try {
      await updateDoc(doc(db, 'users', profile.uid), { isActive: newStatus });
    } catch (error) {
      console.error("Error updating online status:", error);
    }
  };

  const [orderFilter, setOrderFilter] = useState<'active' | 'past'>('active');

  useEffect(() => {
    if (!profile) return;

    const path = 'orders';
    const q = query(
      collection(db, path),
      where('deliveryPartnerId', '==', profile.uid)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const ordersData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Order));
      setOrders(ordersData);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, path);
    });

    return () => unsubscribe();
  }, [profile]);

  useEffect(() => {
    let interval: any;
    if (isSharingLocation && profile) {
      interval = setInterval(() => {
        if ("geolocation" in navigator) {
          navigator.geolocation.getCurrentPosition(
            (position) => {
              const { latitude, longitude } = position.coords;
              setCurrentPartnerLoc({ lat: latitude, lng: longitude });
              const path = `locations/${profile.uid}`;
              setDoc(doc(db, 'locations', profile.uid), {
                deliveryPartnerId: profile.uid,
                lat: latitude,
                lng: longitude,
                updatedAt: serverTimestamp(),
              }).catch(error => {
                handleFirestoreError(error, OperationType.WRITE, path);
              });
            },
            (err) => {
              console.error("Geolocation error:", err);
              if (err.code === err.PERMISSION_DENIED) {
                setIsSharingLocation(false);
                alert("Location permission denied. Please enable it to share your live location with customers.");
              }
            },
            { enableHighAccuracy: true, timeout: 10000 }
          );
        }
      }, 5000);
    }
    return () => clearInterval(interval);
  }, [isSharingLocation, profile]);

  const updateStatus = async (orderId: string, status: Order['status']) => {
    const order = orders.find(o => o.id === orderId);
    if (!order) return;
    try {
      await updateOrderStatus(order, status);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `orders/${orderId}`);
    }
  };

  const handleNotify = async (order: Order) => {
    try {
      await sendNotification({
        userId: order.customerId,
        title: 'Order Status Update',
        message: 'Your order is at your doorstep! Please reach there to collect it.',
        type: 'order_update',
        orderId: order.id
      });
      alert('Notification sent to customer!');
    } catch (error) {
      console.error('Error sending notification:', error);
    }
  };

  const totalEarnings = React.useMemo(() => {
    return orders
      .filter(o => o.status === 'delivered')
      .reduce((sum, order) => sum + (order.deliveryRevenue || 0), 0);
  }, [orders]);

  const filteredOrders = orders
    .filter(o => {
      if (orderFilter === 'active') {
        if (o.status === 'delivered' || o.status === 'cancelled') return false;
        if (statusFilter === 'all') return true;
        if (statusFilter === 'pending') return o.status === 'assigned';
        if (statusFilter === 'processing') return o.status === 'picked_up' || o.status === 'out_for_delivery' || o.status === 'arrived';
        return true;
      } else {
        return o.status === 'delivered' || o.status === 'cancelled';
      }
    })
    .sort((a, b) => {
      const timeA = a.createdAt?.toMillis ? a.createdAt.toMillis() : 0;
      const timeB = b.createdAt?.toMillis ? b.createdAt.toMillis() : 0;
      return sortOrder === 'newest' ? timeB - timeA : timeA - timeB;
    });

  return (
    <div className="space-y-10 pb-20">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 px-2">
        <div className="space-y-1">
          <h1 className="text-4xl font-black text-navy-900 tracking-tight uppercase">Delivery Hub</h1>
          <p className="text-gray-400 font-bold uppercase tracking-widest text-xs">Manage your active deliveries</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex bg-navy-50 p-1.5 rounded-2xl border border-navy-100">
            {(['all', 'pending', 'processing', 'delivered'] as const).map(filter => (
              <button
                key={filter}
                onClick={() => setStatusFilter(filter)}
                className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                  statusFilter === filter 
                    ? 'bg-navy-900 text-white shadow-lg' 
                    : 'text-navy-400 hover:text-navy-900'
                }`}
              >
                {filter}
              </button>
            ))}
          </div>

          <select 
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value as any)}
            className="bg-white border-2 border-navy-100 rounded-2xl text-[10px] font-black uppercase tracking-widest text-navy-900 px-4 py-3 focus:outline-none focus:border-navy-900 shadow-sm"
          >
            <option value="newest">Newest First</option>
            <option value="oldest">Oldest First</option>
          </select>
        </div>
      </div>

      {/* Status & Earnings */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <motion.div
          whileHover={{ y: -4 }}
          whileTap={{ scale: 0.98 }}
          onClick={toggleOnlineStatus}
          className={`p-8 rounded-[2.5rem] cursor-pointer flex items-center justify-between transition-all shadow-xl ${
            isSharingLocation 
              ? 'bg-accent-500 text-navy-900 shadow-accent-100' 
              : 'bg-navy-50 text-navy-300 border-2 border-navy-100 shadow-none'
          }`}
        >
          <div className="flex items-center space-x-6">
            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${isSharingLocation ? 'bg-navy-900 text-accent-500' : 'bg-navy-100 text-navy-300'}`}>
              <Navigation size={28} strokeWidth={3} className={isSharingLocation ? 'animate-pulse' : ''} />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest opacity-60">Your Status</p>
              <p className="text-2xl font-black uppercase tracking-tighter">{isSharingLocation ? 'Live & Active' : 'Offline'}</p>
            </div>
          </div>
          <div className={`w-14 h-7 rounded-full relative transition-all ${isSharingLocation ? 'bg-navy-900' : 'bg-navy-200'}`}>
            <div className={`absolute top-1 w-5 h-5 rounded-full bg-white transition-all ${isSharingLocation ? 'left-8' : 'left-1'}`} />
          </div>
        </motion.div>

        <div className="bg-navy-900 p-8 rounded-[2.5rem] shadow-2xl shadow-navy-200 flex items-center justify-between text-white">
          <div className="flex items-center space-x-6">
            <div className="w-14 h-14 bg-white/10 rounded-2xl flex items-center justify-center text-accent-500">
              <CreditCard size={28} strokeWidth={3} />
            </div>
            <div>
              <p className="text-[10px] font-black text-navy-300 uppercase tracking-widest">Today's Earnings</p>
              <p className="text-3xl font-black tracking-tighter">₹{totalEarnings.toFixed(2)}</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-[10px] font-black text-navy-300 uppercase tracking-widest">Completed</p>
            <p className="text-2xl font-black">{orders.filter(o => o.status === 'delivered').length}</p>
          </div>
        </div>
      </div>

      {/* Orders Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {filteredOrders.length > 0 ? (
          filteredOrders.map(order => (
            <motion.div
              key={order.id}
              layout
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-white rounded-[2.5rem] border border-gray-100 shadow-2xl shadow-navy-100 overflow-hidden flex flex-col group hover:shadow-navy-200 transition-all"
            >
              {/* Card Header */}
              <div className="p-6 border-b border-gray-50 flex justify-between items-start">
                <div className="flex items-center space-x-4">
                  <div className="w-14 h-14 bg-blue-500 text-white rounded-full flex items-center justify-center text-xl font-black shadow-lg shadow-blue-100">
                    {order.customerName ? order.customerName[0].toUpperCase() : 'C'}
                  </div>
                  <div>
                    <h3 className="font-black text-navy-900 text-lg tracking-tight leading-none">{order.customerName || 'Customer'}</h3>
                    <p className="text-gray-500 font-bold text-sm mt-1">{order.customerMobile}</p>
                  </div>
                </div>
                <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest ${
                  order.status === 'delivered' ? 'bg-green-100 text-green-600' :
                  order.status === 'cancelled' ? 'bg-red-100 text-red-600' :
                  'bg-blue-500 text-white shadow-md shadow-blue-100'
                }`}>
                  {order.status.replace('_', ' ')}
                </span>
              </div>

              {/* Location & Vendor */}
              <div className="px-6 py-4 space-y-4 border-b border-gray-50">
                <button 
                  onClick={() => setSelectedOrderForMap(order)}
                  className="w-full flex items-center space-x-4 group cursor-pointer text-left"
                >
                  <div className="w-10 h-10 bg-red-50 text-red-500 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
                    <MapPin size={20} strokeWidth={3} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest">Location</p>
                    <p className="text-navy-900 font-bold text-sm truncate">{order.address}</p>
                  </div>
                </button>

                <div className="flex items-center space-x-4">
                  <div className="w-10 h-10 bg-blue-50 text-blue-500 rounded-2xl flex items-center justify-center">
                    <Store size={20} strokeWidth={3} />
                  </div>
                  <div>
                    <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest">Vendor</p>
                    <p className="text-navy-900 font-bold text-sm">{order.shopName || 'Shop'}</p>
                  </div>
                </div>
              </div>

              {/* Items */}
              <div className="px-6 py-4 flex-grow">
                <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4">Order Items</h4>
                <div className="space-y-2">
                  {order.items?.map((item, index) => (
                    <div key={item.id} className="flex items-center justify-between bg-gray-50/50 p-2 rounded-xl border border-gray-100">
                      <p className="text-navy-900 font-bold text-xs">{item.name}</p>
                      <div className="bg-white text-navy-900 px-2 py-0.5 rounded-lg font-black text-[10px] border border-gray-100">
                        x{item.quantity}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Footer Actions */}
              <div className="p-6 bg-gray-50/50 space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-black text-navy-900 uppercase tracking-tight">Final Amount</h4>
                  <span className="text-blue-600 font-black text-xl tracking-tighter">₹{order.totalPrice.toFixed(2)}</span>
                </div>
                
                <div className="grid grid-cols-3 gap-3">
                  <a 
                    href={`tel:${order.customerMobile}`}
                    className="bg-green-500 text-white h-12 rounded-2xl font-black text-[10px] uppercase tracking-widest flex flex-col items-center justify-center space-y-1 hover:bg-green-600 transition-all shadow-lg shadow-green-100 active:scale-95"
                  >
                    <Phone size={16} strokeWidth={3} />
                    <span>Call</span>
                  </a>
                  <button 
                    onClick={() => handleNotify(order)}
                    className="bg-purple-500 text-white h-12 rounded-2xl font-black text-[10px] uppercase tracking-widest flex flex-col items-center justify-center space-y-1 hover:bg-purple-600 transition-all shadow-lg shadow-purple-100 active:scale-95"
                  >
                    <Bell size={16} strokeWidth={3} />
                    <span>Notify</span>
                  </button>
                  
                  {order.status === 'assigned' && (
                    <button
                      onClick={() => updateStatus(order.id, 'picked_up')}
                      className="bg-blue-500 text-white h-12 rounded-2xl font-black text-[10px] uppercase tracking-widest flex flex-col items-center justify-center space-y-1 hover:bg-blue-600 transition-all shadow-lg shadow-blue-100 active:scale-95"
                    >
                      <CheckCircle2 size={16} strokeWidth={3} />
                      <span>Picked Up</span>
                    </button>
                  )}
                  {order.status === 'picked_up' && (
                    <button
                      onClick={async () => {
                        try {
                          await updateOrderStatus(order, 'out_for_delivery', {
                            etaMins: order.etaMins || 15
                          });
                        } catch (error) {
                          console.error(error);
                        }
                      }}
                      className="bg-blue-500 text-white h-12 rounded-2xl font-black text-[10px] uppercase tracking-widest flex flex-col items-center justify-center space-y-1 hover:bg-blue-600 transition-all shadow-lg shadow-blue-100 active:scale-95"
                    >
                      <Navigation size={16} strokeWidth={3} />
                      <span>Start</span>
                    </button>
                  )}
                  {order.status === 'out_for_delivery' && (
                    <button
                      onClick={() => updateStatus(order.id, 'arrived')}
                      className="bg-blue-500 text-white h-12 rounded-2xl font-black text-[10px] uppercase tracking-widest flex flex-col items-center justify-center space-y-1 hover:bg-blue-600 transition-all shadow-lg shadow-blue-100 active:scale-95"
                    >
                      <CheckCircle2 size={16} strokeWidth={3} />
                      <span>Arrived</span>
                    </button>
                  )}
                  {order.status === 'arrived' && (
                    <button
                      onClick={() => updateStatus(order.id, 'delivered')}
                      className="bg-blue-500 text-white h-12 rounded-2xl font-black text-[10px] uppercase tracking-widest flex flex-col items-center justify-center space-y-1 hover:bg-blue-600 transition-all shadow-lg shadow-blue-100 active:scale-95"
                    >
                      <CheckCircle2 size={16} strokeWidth={3} />
                      <span>Delivered</span>
                    </button>
                  )}
                  {(order.status === 'delivered' || order.status === 'cancelled') && (
                    <div className="bg-gray-200 text-gray-400 h-12 rounded-2xl font-black text-[10px] uppercase tracking-widest flex flex-col items-center justify-center space-y-1">
                      <CheckCircle2 size={16} strokeWidth={3} />
                      <span>Done</span>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          ))
        ) : (
          <div className="col-span-full text-center py-20 bg-white rounded-[3rem] border-4 border-dashed border-navy-50 flex flex-col items-center justify-center space-y-6">
            <div className="w-24 h-24 bg-navy-50 rounded-[2rem] flex items-center justify-center text-navy-100 rotate-12">
              <Truck size={48} strokeWidth={1} />
            </div>
            <div className="space-y-1">
              <p className="text-xl font-black text-navy-900 uppercase tracking-tight">Quiet on the road</p>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">No orders found for this filter.</p>
            </div>
          </div>
        )}
      </div>

      {/* Map Modal */}
      <AnimatePresence>
        {selectedOrderForMap && (
          <DeliveryMapModal 
            order={selectedOrderForMap} 
            onClose={() => setSelectedOrderForMap(null)}
            partnerLocation={currentPartnerLoc}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default DeliveryDashboard;
