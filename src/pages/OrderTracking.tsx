import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { doc, onSnapshot, updateDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { Order, DeliveryLocation } from '../types';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { motion, AnimatePresence } from 'motion/react';
import { Package, Truck, CheckCircle2, MapPin, Phone, CreditCard, XCircle, AlertCircle, User } from 'lucide-react';

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

const OrderTracking = () => {
  const { orderId } = useParams();
  const [order, setOrder] = useState<Order | null>(null);
  const [location, setLocation] = useState<DeliveryLocation | null>(null);
  const [loading, setLoading] = useState(true);
  const [isCancelling, setIsCancelling] = useState(false);
  const [cancelModal, setCancelModal] = useState<{ isOpen: boolean; reason: string }>({
    isOpen: false,
    reason: ''
  });
  const [proofImage, setProofImage] = useState<string | null>(null);

  useEffect(() => {
    if (!orderId) return;

    let unsubLoc: (() => void) | undefined;
    const orderPath = `orders/${orderId}`;
    
    const unsubOrder = onSnapshot(doc(db, 'orders', orderId), (docSnap) => {
      if (docSnap.exists()) {
        const orderData = { id: docSnap.id, ...docSnap.data() } as Order;
        setOrder(orderData);

        if (orderData.deliveryPartnerId) {
          // Clean up previous location listener if it exists
          if (unsubLoc) {
            unsubLoc();
          }
          
          const locPath = `locations/${orderData.deliveryPartnerId}`;
          unsubLoc = onSnapshot(doc(db, 'locations', orderData.deliveryPartnerId), (locSnap) => {
            if (locSnap.exists()) {
              setLocation(locSnap.data() as DeliveryLocation);
            }
          }, (error) => {
            handleFirestoreError(error, OperationType.GET, locPath);
          });
        }
      }
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, orderPath);
    });

    return () => {
      unsubOrder();
      if (unsubLoc) {
        unsubLoc();
      }
    };
  }, [orderId]);

  if (loading) return <div className="flex items-center justify-center h-64">Loading tracking...</div>;
  if (!order) return <div>Order not found.</div>;

  const isUpiPending = order.paymentMethod === 'upi' && order.paymentStatus === 'pending';

  const displaySteps = [
    { 
      key: 'pending', 
      label: isUpiPending ? 'Verifying Payment' : 'Order Placed', 
      icon: isUpiPending ? CreditCard : Package 
    },
    { key: 'assigned', label: 'Partner Assigned', icon: User },
    { key: 'picked_up', label: 'Picked Up', icon: Package },
    { key: 'out_for_delivery', label: 'On the Way', icon: Truck },
    { key: 'arrived', label: 'Arrived', icon: MapPin },
    { key: 'delivered', label: 'Delivered', icon: CheckCircle2 },
  ];

  const currentStepIndex = displaySteps.findIndex(s => s.key === order.status);

  return (
    <div className="max-w-6xl mx-auto space-y-10">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 px-2">
        <div className="space-y-2">
          <h1 className="text-4xl font-black text-navy-900 tracking-tight uppercase">Track Order</h1>
          <p className="text-gray-400 font-bold uppercase tracking-widest text-xs">Order ID: <span className="text-navy-600">#{order.id.slice(0, 8)}</span></p>
        </div>
        <div className="flex items-center space-x-4">
          <AnimatePresence>
            {(order.status === 'pending' || order.status === 'assigned') && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="flex items-center space-x-3"
              >
                <button
                  onClick={() => setCancelModal({ isOpen: true, reason: '' })}
                  disabled={isCancelling}
                  className="bg-red-500 text-white px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-red-600 transition-all shadow-xl shadow-red-100 active:scale-95 flex items-center space-x-2"
                >
                  <XCircle size={16} />
                  <span>{isCancelling ? 'Cancelling...' : 'Cancel Order'}</span>
                </button>
              </motion.div>
            )}
          </AnimatePresence>
          
          {order.status !== 'cancelled' && (
            <div className="bg-accent-50 text-accent-700 px-6 py-3 rounded-2xl font-black text-sm flex items-center space-x-3 shadow-sm border border-accent-100">
              <div className="w-2.5 h-2.5 bg-accent-500 rounded-full animate-ping" />
              <span className="uppercase tracking-tighter">
                {order.status === 'delivered' ? 'Order Delivered' : 
                 order.status === 'out_for_delivery' ? `Reaching in ${order.etaMins || 15} mins` :
                 order.status === 'arrived' ? 'Partner Arrived' :
                 order.status === 'picked_up' ? 'Picked by Delivery Boy' :
                 'Arriving Fast'}
              </span>
            </div>
          )}
        </div>
      </div>

      {order.status === 'cancelled' && (
        <div className="bg-red-50 border-2 border-red-100 p-8 rounded-[3rem] flex flex-col items-center justify-center text-center space-y-4">
          <div className="w-16 h-16 bg-red-100 rounded-2xl flex items-center justify-center text-red-500">
            <AlertCircle size={32} strokeWidth={3} />
          </div>
          <div className="space-y-1">
            <h2 className="text-2xl font-black text-red-600 uppercase tracking-tight">Order Cancelled</h2>
            <p className="text-xs font-bold text-red-400 uppercase tracking-widest">This order has been cancelled and will not be delivered.</p>
            <p className="text-sm font-medium text-red-500 mt-2">By: <span className="uppercase">{order.cancelledBy || 'Unknown'}</span></p>
            {order.cancellationReason && (
              <p className="text-sm font-medium text-red-500">Reason: {order.cancellationReason}</p>
            )}
          </div>
        </div>
      )}

      {isUpiPending && order.status !== 'cancelled' && (
        <div className="bg-orange-50 border-2 border-orange-100 p-8 rounded-[3rem] flex flex-col items-center justify-center text-center space-y-4">
          <div className="w-16 h-16 bg-orange-100 rounded-2xl flex items-center justify-center text-orange-500">
            <CreditCard size={32} strokeWidth={3} className="animate-pulse" />
          </div>
          <div className="space-y-1">
            <h2 className="text-2xl font-black text-orange-600 uppercase tracking-tight">Payment Verification</h2>
            <p className="text-xs font-bold text-orange-400 uppercase tracking-widest">We are waiting for the Admin to verify your UPI payment.</p>
            <p className="text-sm font-medium text-orange-500 mt-2">The order will be processed once the payment is confirmed.</p>
          </div>
        </div>
      )}

      {/* Status Progress Bar */}
      <div className="bg-white p-10 rounded-[3rem] border border-gray-100 shadow-2xl shadow-navy-100">
        <div className="relative flex justify-between">
          <div className="absolute top-1/2 left-0 w-full h-2 bg-navy-50 -translate-y-1/2 z-0 rounded-full" />
          <div 
            className="absolute top-1/2 left-0 h-2 bg-navy-900 -translate-y-1/2 z-0 transition-all duration-1000 ease-out rounded-full shadow-lg shadow-navy-200" 
            style={{ width: `${(currentStepIndex / (displaySteps.length - 1)) * 100}%` }}
          />
          {displaySteps.map((step, index) => {
            const Icon = step.icon;
            const isActive = index <= currentStepIndex;
            const isCurrent = index === currentStepIndex;
            return (
              <div key={step.key} className="relative z-10 flex flex-col items-center space-y-4">
                <motion.div 
                  initial={false}
                  animate={{ 
                    scale: isCurrent ? 1.2 : 1,
                    backgroundColor: isActive ? 'var(--color-navy-900)' : '#fff'
                  }}
                  className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all shadow-xl ${
                    isActive ? 'text-white shadow-navy-200' : 'border-4 border-navy-50 text-navy-100 shadow-none'
                  }`}
                >
                  <Icon size={24} strokeWidth={3} />
                </motion.div>
                <span className={`text-[10px] font-black uppercase tracking-widest ${isActive ? 'text-navy-900' : 'text-gray-300'}`}>
                  {step.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        {/* Map View */}
        <div className="lg:col-span-2 bg-white rounded-[3rem] border border-gray-100 shadow-2xl shadow-navy-100 overflow-hidden h-[500px] relative">
          {location ? (
            <MapContainer center={[location.lat, location.lng]} zoom={15} className="w-full h-full">
              <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
              <Marker position={[location.lat, location.lng]}>
                <Popup>RebelCraves Partner is here!</Popup>
              </Marker>
              {order.customerLat && order.customerLng && (
                <Marker position={[order.customerLat, order.customerLng]}>
                  <Popup>Your Delivery Location</Popup>
                </Marker>
              )}
              <RecenterMap position={[location.lat, location.lng]} />
            </MapContainer>
          ) : (
            <div className="w-full h-full bg-navy-50 flex flex-col items-center justify-center text-navy-200 space-y-6">
              <div className="relative">
                <MapPin size={80} className="animate-bounce" strokeWidth={1} />
                <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-12 h-3 bg-navy-200/50 rounded-full blur-sm animate-pulse" />
              </div>
              <p className="font-black uppercase tracking-widest text-xs">Finding your RebelCraves partner...</p>
            </div>
          )}
        </div>

        {/* Order Details Sidebar */}
        <div className="space-y-8">
          <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-xl shadow-navy-50 space-y-6">
            <div className="flex items-center space-x-3 text-navy-900">
              <div className="w-10 h-10 bg-navy-50 rounded-xl flex items-center justify-center text-navy-900">
                <Truck size={22} strokeWidth={3} />
              </div>
              <h3 className="text-xl font-black uppercase tracking-tight">Delivery Info</h3>
            </div>
            <div className="space-y-5">
              <div className="flex items-start space-x-4 group">
                <div className="w-10 h-10 bg-gray-50 rounded-xl flex items-center justify-center text-gray-400 group-hover:bg-navy-50 group-hover:text-navy-900 transition-colors">
                  <MapPin size={20} strokeWidth={3} />
                </div>
                <div className="space-y-0.5">
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Drop Location</p>
                  <p className="text-sm font-bold text-navy-900 leading-relaxed">{order.address}</p>
                </div>
              </div>
              {order.deliveryPartnerMobile ? (
                <a href={`tel:${order.deliveryPartnerMobile}`} className="flex items-start space-x-4 group hover:bg-navy-50 p-2 -mx-2 rounded-xl transition-colors cursor-pointer">
                  <div className="w-10 h-10 bg-gray-50 rounded-xl flex items-center justify-center text-gray-400 group-hover:bg-navy-100 group-hover:text-navy-900 transition-colors">
                    <Phone size={20} strokeWidth={3} />
                  </div>
                  <div className="space-y-0.5">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Contact Partner</p>
                    <p className="text-sm font-bold text-navy-900">{order.deliveryPartnerName || 'Assigning soon...'}</p>
                    <span className="text-xs font-medium text-navy-600">{order.deliveryPartnerMobile}</span>
                  </div>
                </a>
              ) : (
                <div className="flex items-start space-x-4 group p-2 -mx-2">
                  <div className="w-10 h-10 bg-gray-50 rounded-xl flex items-center justify-center text-gray-400">
                    <Phone size={20} strokeWidth={3} />
                  </div>
                  <div className="space-y-0.5">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Contact Partner</p>
                    <p className="text-sm font-bold text-navy-900">{order.deliveryPartnerName || 'Assigning soon...'}</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-xl shadow-navy-50 space-y-6">
            <div className="flex items-center space-x-3 text-navy-900">
              <div className="w-10 h-10 bg-navy-50 rounded-xl flex items-center justify-center text-navy-900">
                <CreditCard size={22} strokeWidth={3} />
              </div>
              <h3 className="text-xl font-black uppercase tracking-tight">Payment</h3>
            </div>
            <div className="space-y-5">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Method</p>
                  <p className="text-sm font-black text-navy-900 uppercase tracking-tighter">{order.paymentMethod}</p>
                </div>
                <div className={`px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest ${
                  order.paymentStatus === 'paid' 
                    ? 'bg-green-50 text-green-600 border border-green-100' 
                    : 'bg-accent-50 text-accent-600 border border-accent-100'
                }`}>
                  {order.paymentStatus === 'paid' ? 'Paid' : 'Pending'}
                </div>
              </div>
              {order.paymentMethod === 'upi' && order.paymentStatus === 'pending' && (
                <div className="p-5 bg-navy-50 rounded-2xl border-2 border-navy-100 space-y-2">
                  <p className="text-[10px] text-navy-400 font-black uppercase tracking-widest">Pay to UPI ID</p>
                  <p className="text-lg font-black text-navy-900 select-all tracking-tighter">rebelcraves@okaxis</p>
                  <p className="text-[10px] text-gray-400 font-bold leading-tight">Show screenshot to partner or wait for verification</p>
                  {order.paymentProof && (
                    <button 
                      onClick={() => setProofImage(order.paymentProof!)}
                      className="text-[10px] text-navy-900 font-black hover:underline uppercase tracking-widest mt-2 block"
                    >
                      View Uploaded Proof
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-xl shadow-navy-50 space-y-6">
            <div className="flex items-center space-x-3 text-navy-900">
              <div className="w-10 h-10 bg-navy-50 rounded-xl flex items-center justify-center text-navy-900">
                <Package size={22} strokeWidth={3} />
              </div>
              <h3 className="text-xl font-black uppercase tracking-tight">Summary</h3>
            </div>
            <div className="space-y-3">
              {order.items.map(item => (
                <div key={item.id} className="flex justify-between text-sm font-bold">
                  <span className="text-gray-500 uppercase tracking-tight text-xs">{item.quantity}x {item.name}</span>
                  <span className="text-navy-900">₹{item.price * item.quantity}</span>
                </div>
              ))}
              <div className="border-t-2 border-dashed border-gray-100 pt-4 mt-4 flex justify-between items-end">
                <span className="text-xs font-black text-gray-400 uppercase tracking-widest">Total Paid</span>
                <span className="text-2xl font-black text-navy-900 tracking-tighter">₹{order.totalPrice}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {proofImage && (
        <div className="fixed inset-0 bg-navy-900/90 backdrop-blur-md z-[100] flex items-center justify-center p-4" onClick={() => setProofImage(null)}>
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="relative max-w-4xl w-full h-full flex items-center justify-center"
            onClick={e => e.stopPropagation()}
          >
            <button 
              onClick={() => setProofImage(null)}
              className="absolute -top-12 right-0 w-10 h-10 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center text-white transition-all z-10"
            >
              <XCircle size={24} strokeWidth={3} />
            </button>
            <img 
              src={proofImage || undefined} 
              alt="Payment Proof" 
              className="max-w-full max-h-full object-contain rounded-2xl shadow-2xl"
              referrerPolicy="no-referrer"
            />
          </motion.div>
        </div>
      )}

      {cancelModal.isOpen && (
        <div className="fixed inset-0 bg-navy-900/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-[2rem] p-8 max-w-md w-full shadow-2xl"
          >
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-black text-navy-900 uppercase tracking-tighter">Cancel Order</h2>
              <button
                onClick={() => setCancelModal({ isOpen: false, reason: '' })}
                className="w-10 h-10 bg-navy-50 rounded-full flex items-center justify-center text-navy-400 hover:bg-navy-100 hover:text-navy-900 transition-colors"
              >
                <XCircle size={20} strokeWidth={3} />
              </button>
            </div>
            
            <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Reason for Cancellation</label>
                <textarea
                  required
                  value={cancelModal.reason}
                  onChange={(e) => setCancelModal({ ...cancelModal, reason: e.target.value })}
                  placeholder="Enter reason (Mandatory)"
                  className="w-full px-4 py-3 bg-navy-50 border-2 border-transparent rounded-2xl focus:outline-none focus:border-navy-500 focus:bg-white transition-all font-bold text-navy-900 resize-none h-24"
                />
              </div>

              <div className="flex space-x-4">
                <button
                  onClick={() => setCancelModal({ isOpen: false, reason: '' })}
                  className="flex-1 px-6 py-4 border-2 border-navy-100 rounded-2xl text-xs font-black uppercase tracking-widest text-navy-400 hover:bg-navy-50 transition-all"
                >
                  Back
                </button>
                <button
                  onClick={async () => {
                    if (!orderId) return;
                    if (!cancelModal.reason.trim()) {
                      alert("Please provide a reason for cancellation.");
                      return;
                    }
                    setIsCancelling(true);
                    const path = `orders/${orderId}`;
                    try {
                      await updateDoc(doc(db, 'orders', orderId), { 
                        status: 'cancelled',
                        paymentStatus: 'pending',
                        cancellationReason: cancelModal.reason || 'No reason provided',
                        cancelledBy: 'customer'
                      });
                      setCancelModal({ isOpen: false, reason: '' });
                    } catch (error) {
                      handleFirestoreError(error, OperationType.UPDATE, path);
                    } finally {
                      setIsCancelling(false);
                    }
                  }}
                  disabled={isCancelling}
                  className="flex-1 px-6 py-4 bg-red-500 text-white rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-red-600 transition-all shadow-xl shadow-red-100 disabled:opacity-50"
                >
                  {isCancelling ? 'Cancelling...' : 'Confirm Cancel'}
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default OrderTracking;
