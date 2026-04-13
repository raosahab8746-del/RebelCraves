import React, { useEffect, useState } from 'react';
import { collection, query, where, orderBy, onSnapshot } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { useAuth } from '../context/AuthContext';
import { Order } from '../types';
import { Package, Calendar, ChevronRight, Clock, CheckCircle, Truck, XCircle, AlertCircle, MapPin } from 'lucide-react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';

const OrderHistory = () => {
  const { user } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const ordersRef = collection(db, 'orders');
    const q = query(
      ordersRef,
      where('customerId', '==', user.uid),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const ordersData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Order[];
      setOrders(ordersData);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'orders');
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending': return <Clock className="text-yellow-500" size={18} />;
      case 'assigned': return <AlertCircle className="text-blue-500" size={18} />;
      case 'picked_up': return <Package className="text-indigo-500" size={18} />;
      case 'out_for_delivery': return <Truck className="text-purple-500" size={18} />;
      case 'arrived': return <MapPin className="text-teal-500" size={18} />;
      case 'delivered': return <CheckCircle className="text-green-500" size={18} />;
      case 'cancelled': return <XCircle className="text-red-500" size={18} />;
      default: return <Clock className="text-gray-500" size={18} />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-50 text-yellow-700 border-yellow-100';
      case 'assigned': return 'bg-blue-50 text-blue-700 border-blue-100';
      case 'picked_up': return 'bg-indigo-50 text-indigo-700 border-indigo-100';
      case 'out_for_delivery': return 'bg-purple-50 text-purple-700 border-purple-100';
      case 'arrived': return 'bg-teal-50 text-teal-700 border-teal-100';
      case 'delivered': return 'bg-green-50 text-green-700 border-green-100';
      case 'cancelled': return 'bg-red-50 text-red-700 border-red-100';
      default: return 'bg-gray-50 text-gray-700 border-gray-100';
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <div className="w-12 h-12 border-4 border-navy-900 border-t-transparent rounded-full animate-spin" />
        <p className="text-gray-400 font-black uppercase tracking-widest text-xs">Fetching your history...</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-10">
      <div className="space-y-2 px-2">
        <h1 className="text-4xl font-black text-navy-900 tracking-tight uppercase">Order History</h1>
        <p className="text-gray-400 font-bold uppercase tracking-widest text-xs">Your past RebelCraves adventures</p>
      </div>

      {orders.length === 0 ? (
        <div className="bg-white p-16 rounded-[3rem] border border-gray-100 shadow-2xl shadow-navy-100 text-center space-y-6">
          <div className="w-24 h-24 bg-navy-50 rounded-[2rem] flex items-center justify-center text-navy-200 mx-auto -rotate-6">
            <Package size={48} strokeWidth={1.5} />
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-black text-navy-900 uppercase tracking-tight">No orders yet!</h2>
            <p className="text-gray-400 font-bold text-sm max-w-xs mx-auto">Your local favorites are just a few taps away. Start your first order now!</p>
          </div>
          <Link 
            to="/" 
            className="inline-block bg-navy-900 text-white px-10 py-4 rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-navy-800 transition-all shadow-xl shadow-navy-100 active:scale-95"
          >
            Explore Menu
          </Link>
        </div>
      ) : (
        <div className="space-y-6">
          {orders.map((order, index) => (
            <motion.div
              key={order.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="group"
            >
              <Link 
                to={`/track/${order.id}`}
                className="block bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-xl shadow-navy-50 hover:shadow-2xl hover:shadow-navy-100 transition-all group-hover:-translate-y-1"
              >
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                  <div className="flex items-start space-x-6">
                    <div className="w-16 h-16 bg-navy-900 rounded-2xl flex items-center justify-center text-white shrink-0 shadow-lg shadow-navy-100">
                      <Package size={24} strokeWidth={2.5} />
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center space-x-3">
                        <span className="text-gray-400 font-black uppercase tracking-widest text-[10px]">Order ID</span>
                        <span className="text-navy-900 font-black text-sm uppercase tracking-tight">#{order.id.slice(-8)}</span>
                      </div>
                      <h3 className="text-xl font-black text-navy-900 tracking-tight uppercase">
                        {order.items.length} {order.items.length === 1 ? 'Item' : 'Items'}
                      </h3>
                      <div className="flex items-center space-x-4 text-gray-400 text-[10px] font-black uppercase tracking-widest pt-1">
                        <div className="flex items-center space-x-1">
                          <Calendar size={12} strokeWidth={3} />
                          <span>{order.createdAt?.toDate ? order.createdAt.toDate().toLocaleDateString() : 'Recently'}</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <Clock size={12} strokeWidth={3} />
                          <span>{order.createdAt?.toDate ? order.createdAt.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Now'}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between md:justify-end md:space-x-8 pt-6 md:pt-0 border-t border-dashed border-gray-50 md:border-0">
                    <div className="text-left md:text-right space-y-1">
                      <p className="text-gray-400 font-black uppercase tracking-widest text-[10px]">Total Amount</p>
                      <p className="text-2xl font-black text-navy-900 tracking-tighter">₹{order.totalPrice}</p>
                    </div>
                    <div className="flex items-center space-x-4">
                      <div className={`flex items-center space-x-2 px-4 py-2 rounded-xl border font-black uppercase tracking-widest text-[10px] ${getStatusColor(order.status)}`}>
                        {getStatusIcon(order.status)}
                        <span>{order.status.replace(/_/g, ' ')}</span>
                      </div>
                      <div className="w-10 h-10 bg-navy-50 rounded-full flex items-center justify-center text-navy-400 group-hover:bg-navy-900 group-hover:text-white transition-all">
                        <ChevronRight size={20} strokeWidth={3} />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Preview Items */}
                <div className="mt-6 flex flex-wrap gap-2">
                  {order.items.slice(0, 3).map((item, i) => (
                    <span key={i} className="bg-gray-50 text-gray-500 px-3 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider">
                      {item.name} x{item.quantity}
                    </span>
                  ))}
                  {order.items.length > 3 && (
                    <span className="text-gray-400 text-[10px] font-bold uppercase tracking-wider self-center ml-1">
                      +{order.items.length - 3} more
                    </span>
                  )}
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
};

export default OrderHistory;
