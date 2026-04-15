import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { formatPrice } from '../lib/utils';
import { Trash2, Plus, Minus, ArrowLeft, ShoppingBag } from 'lucide-react';
import { motion } from 'motion/react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { SUPER_ADMIN_CONFIG } from '../constants';

const Cart = () => {
  const { items, updateQuantity, removeItem, totalPrice } = useCart();
  const navigate = useNavigate();
  const [adminSettings, setAdminSettings] = useState({ 
    baseDeliveryCharge: 0,
    orderPercentageCharge: 0,
    peakHourSurcharge: 0,
    isPeakHourActive: false,
    weatherSurcharge: 0,
    isWeatherSurchargeActive: false,
    globalMinOrderAmount: 0
  });

  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'settings', 'payment'), (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        setAdminSettings({ 
          baseDeliveryCharge: data.baseDeliveryCharge ?? 0,
          orderPercentageCharge: data.orderPercentageCharge ?? 0,
          peakHourSurcharge: data.peakHourSurcharge ?? 0,
          isPeakHourActive: data.isPeakHourActive ?? false,
          weatherSurcharge: data.weatherSurcharge ?? 0,
          isWeatherSurchargeActive: data.isWeatherSurchargeActive ?? false,
          globalMinOrderAmount: data.globalMinOrderAmount ?? 0
        });
      }
    });
    return () => unsub();
  }, []);

  const percentageCharge = (totalPrice * adminSettings.orderPercentageCharge) / 100;
  const deliveryCharge = 
    adminSettings.baseDeliveryCharge + 
    percentageCharge + 
    (adminSettings.isPeakHourActive ? adminSettings.peakHourSurcharge : 0) + 
    (adminSettings.isWeatherSurchargeActive ? adminSettings.weatherSurcharge : 0);

  const finalTotal = totalPrice + deliveryCharge;

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 space-y-8">
        <div className="w-32 h-32 bg-navy-50 rounded-[2.5rem] flex items-center justify-center text-navy-200 shadow-inner">
          <ShoppingBag size={64} strokeWidth={1.5} />
        </div>
        <div className="text-center space-y-2">
          <h2 className="text-3xl font-black text-navy-900 tracking-tight uppercase">Your bag is empty</h2>
          <p className="text-gray-400 font-bold uppercase tracking-widest text-xs">Looks like you haven't added any treats yet!</p>
        </div>
        <Link
          to="/"
          className="bg-navy-900 text-white px-10 py-4 rounded-2xl font-black text-lg hover:bg-navy-800 transition-all flex items-center space-x-3 shadow-xl shadow-navy-100 active:scale-95 uppercase tracking-tighter"
        >
          <ArrowLeft size={22} strokeWidth={3} />
          <span>Browse Treats</span>
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-10">
      <div className="flex items-end justify-between px-2">
        <div className="space-y-1">
          <h1 className="text-4xl font-black text-navy-900 tracking-tight uppercase">Your Bag</h1>
          <p className="text-gray-400 font-bold uppercase tracking-widest text-xs">Ready for checkout?</p>
        </div>
        <span className="text-xs font-black text-navy-600 bg-navy-50 px-4 py-2 rounded-xl">{items.length} Items</span>
      </div>

      <div className="space-y-6">
        {items.map((item) => (
          <motion.div
            key={item.id}
            layout
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="bg-white p-5 rounded-[2.5rem] border border-gray-100 flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-6 shadow-sm hover:shadow-xl hover:shadow-navy-50 transition-all group"
          >
            <div className="flex items-center space-x-4 sm:space-x-6 flex-1 min-w-0">
              <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-3xl overflow-hidden flex-shrink-0">
                <img
                  src={item.image || undefined}
                  alt={item.name}
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                  referrerPolicy="no-referrer"
                />
              </div>
              <div className="flex-1 min-w-0 space-y-1">
                <h3 className="text-lg sm:text-xl font-black text-navy-900 truncate tracking-tight">{item.name}</h3>
                <p className="text-navy-600 font-black text-base sm:text-lg">{formatPrice(item.price)}</p>
              </div>
            </div>
            <div className="flex items-center justify-between sm:justify-end w-full sm:w-auto">
              <div className="flex items-center space-x-2 sm:space-x-3 bg-navy-50 p-1.5 rounded-2xl border border-navy-100">
                <button
                  onClick={() => updateQuantity(item.id, item.quantity - 1)}
                  className="w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center bg-white rounded-xl text-navy-900 hover:bg-navy-100 transition-colors shadow-sm active:scale-90"
                >
                  <Minus size={16} strokeWidth={3} className="sm:w-[18px] sm:h-[18px]" />
                </button>
                <span className="w-5 sm:w-6 text-center font-black text-navy-900 text-base sm:text-lg">{item.quantity}</span>
                <button
                  onClick={() => updateQuantity(item.id, item.quantity + 1)}
                  className="w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center bg-white rounded-xl text-navy-900 hover:bg-navy-100 transition-colors shadow-sm active:scale-90"
                >
                  <Plus size={16} strokeWidth={3} className="sm:w-[18px] sm:h-[18px]" />
                </button>
              </div>
              <button
                onClick={() => removeItem(item.id)}
                className="p-3 text-gray-300 hover:text-red-500 transition-colors sm:ml-4"
              >
                <Trash2 size={20} className="sm:w-[22px] sm:h-[22px]" />
              </button>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="bg-white p-8 rounded-[3rem] border border-gray-100 shadow-2xl shadow-navy-100 space-y-8">
        <div className="space-y-4">
          <div className="flex justify-between text-sm font-bold">
            <span className="text-gray-400 uppercase tracking-widest">Subtotal</span>
            <span className="text-navy-900">{formatPrice(totalPrice)}</span>
          </div>
          <div className="flex justify-between text-sm font-bold">
            <span className="text-gray-400 uppercase tracking-widest">Delivery Fee</span>
            <div className="text-right">
              <span className={deliveryCharge > 0 ? 'text-navy-900' : 'text-accent-600'}>
                {deliveryCharge > 0
                  ? formatPrice(deliveryCharge)
                  : (adminSettings.baseDeliveryCharge === 0 && adminSettings.orderPercentageCharge === 0 && !adminSettings.isPeakHourActive && !adminSettings.isWeatherSurchargeActive)
                    ? 'Calculated at checkout'
                    : 'FREE'}
              </span>
              {(adminSettings.isPeakHourActive || adminSettings.isWeatherSurchargeActive) && (
                <div className="flex flex-col items-end mt-1">
                  {adminSettings.isPeakHourActive && (
                    <span className="text-[8px] font-black text-accent-600 uppercase tracking-widest bg-accent-50 px-1.5 py-0.5 rounded-md border border-accent-100">Peak Surcharge: +₹{adminSettings.peakHourSurcharge}</span>
                  )}
                  {adminSettings.isWeatherSurchargeActive && (
                    <span className="text-[8px] font-black text-accent-600 uppercase tracking-widest bg-accent-50 px-1.5 py-0.5 rounded-md border border-accent-100 mt-0.5">Weather Surcharge: +₹{adminSettings.weatherSurcharge}</span>
                  )}
                </div>
              )}
            </div>
          </div>
          <div className="flex justify-between text-3xl font-black text-navy-900 pt-6 border-t-2 border-dashed border-gray-100">
            <span className="uppercase tracking-tighter">Total</span>
            <span>{formatPrice(finalTotal)}</span>
          </div>
        </div>
        <button
          onClick={() => navigate('/checkout')}
          className="w-full bg-navy-900 text-white py-5 rounded-2xl font-black text-xl hover:bg-navy-800 transition-all shadow-xl shadow-navy-200 active:scale-95 uppercase tracking-tighter"
        >
          Proceed to Checkout
        </button>
      </div>
    </div>
  );
};

export default Cart;
