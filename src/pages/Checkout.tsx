import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, addDoc, serverTimestamp, doc, onSnapshot, query, where, getDocs, updateDoc, getDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { formatPrice, resizeImage, calculateDistance, reverseGeocode } from '../lib/utils';
import { Truck, MapPin, Smartphone, ShoppingBag, QrCode, CreditCard, Tag, X, Upload, Plus } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { SUPER_ADMIN_CONFIG } from '../constants';
import { Coupon, Shop, SystemSettings } from '../types';
import { sendNotification } from '../components/NotificationCenter';

const Checkout = () => {
  const { profile } = useAuth();
  const { items, totalPrice, clearCart } = useCart();
  const [address, setAddress] = useState('');
  const [customerCoords, setCustomerCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [shopCoords, setShopCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [distanceKm, setDistanceKm] = useState<number>(0);
  const [selectedAddressId, setSelectedAddressId] = useState<string | 'new'>('new');
  const [isDetecting, setIsDetecting] = useState(false);

  const handleDetectLocation = () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser.');
      return;
    }

    setIsDetecting(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        try {
          const addressString = await reverseGeocode(latitude, longitude);
          setCustomerCoords({ lat: latitude, lng: longitude });
          setAddress(addressString);
          setSelectedAddressId('new');
        } catch (error) {
          setCustomerCoords({ lat: latitude, lng: longitude });
        } finally {
          setIsDetecting(false);
        }
      },
      (err) => {
        setIsDetecting(false);
        let message = 'Failed to detect location.';
        if (err.code === err.PERMISSION_DENIED) {
          message = 'Location permission denied. Please enable it in your browser settings.';
        } else if (err.code === err.TIMEOUT) {
          message = 'Location request timed out. Please try again.';
        } else if (err.code === err.POSITION_UNAVAILABLE) {
          message = 'Location information is unavailable.';
        }
        alert(message);
      },
      { enableHighAccuracy: true, timeout: 20000, maximumAge: 0 }
    );
  };

  const [specialInstructions, setSpecialInstructions] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'cod' | 'upi'>('cod');
  const [paymentProof, setPaymentProof] = useState<string | null>(null);
  const [showProofModal, setShowProofModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [couponCode, setCouponCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<Coupon | null>(null);
  const [couponError, setCouponError] = useState('');
  const [adminSettings, setAdminSettings] = useState<SystemSettings>({ 
    upiId: SUPER_ADMIN_CONFIG.upiId, 
    upiQR: SUPER_ADMIN_CONFIG.upiQR, 
    isUpiEnabled: true,
    isCodEnabled: true,
    baseDeliveryCharge: 0,
    orderPercentageCharge: 0,
    peakHourSurcharge: 0,
    isPeakHourActive: false,
    weatherSurcharge: 0,
    isWeatherSurchargeActive: false,
    globalMinOrderAmount: 0,
    deliveryPayoutBase: 0,
    deliveryPayoutPercentage: 0,
    vendorCommissionPercentage: 0,
    banners: [],
    supportEmail: '',
    supportPhone: '',
    baseDeliveryDistance: 3,
    deliveryChargePerKmBeyondBase: 0,
    gstType: 'percentage',
    gstValue: 0
  });
  const navigate = useNavigate();

  const [hasSetInitialAddress, setHasSetInitialAddress] = useState(false);

  // Set initial address from saved addresses
  React.useEffect(() => {
    if (profile?.addresses && profile.addresses.length > 0 && !hasSetInitialAddress) {
      const firstAddress = profile.addresses[0];
      setSelectedAddressId(firstAddress.id);
      setAddress(firstAddress.fullAddress);
      if (firstAddress.lat && firstAddress.lng) {
        setCustomerCoords({ lat: firstAddress.lat, lng: firstAddress.lng });
      }
      setHasSetInitialAddress(true);
    }
  }, [profile?.addresses, hasSetInitialAddress]);

  // Handle address selection from saved addresses
  const handleSelectSavedAddress = (addressId: string) => {
    const savedAddress = profile?.addresses?.find(a => a.id === addressId);
    if (savedAddress) {
      setSelectedAddressId(addressId);
      setAddress(savedAddress.fullAddress);
      if (savedAddress.lat && savedAddress.lng) {
        setCustomerCoords({ lat: savedAddress.lat, lng: savedAddress.lng });
      }
    }
  };

  React.useEffect(() => {
    const fetchShopCoords = async () => {
      if (items.length > 0) {
        const shopId = items[0].shopId;
        if (shopId) {
          const shopSnap = await getDoc(doc(db, 'shops', shopId));
          if (shopSnap.exists()) {
            const shopData = shopSnap.data() as Shop;
            if (shopData.lat && shopData.lng) {
              setShopCoords({ lat: shopData.lat, lng: shopData.lng });
            }
          }
        }
      }
    };
    fetchShopCoords();
  }, [items]);

  React.useEffect(() => {
    if (customerCoords && shopCoords) {
      const dist = calculateDistance(customerCoords.lat, customerCoords.lng, shopCoords.lat, shopCoords.lng);
      setDistanceKm(dist);
    } else {
      setDistanceKm(0);
    }
  }, [customerCoords, shopCoords]);

  React.useEffect(() => {
    const unsub = onSnapshot(doc(db, 'settings', 'payment'), (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        setAdminSettings(prev => ({ 
          ...prev,
          upiId: data.upiId ?? SUPER_ADMIN_CONFIG.upiId, 
          upiQR: data.upiQR ?? SUPER_ADMIN_CONFIG.upiQR,
          isUpiEnabled: data.isUpiEnabled ?? true,
          isCodEnabled: data.isCodEnabled ?? true,
          baseDeliveryCharge: data.baseDeliveryCharge ?? 0,
          orderPercentageCharge: data.orderPercentageCharge ?? 0,
          peakHourSurcharge: data.peakHourSurcharge ?? 0,
          isPeakHourActive: data.isPeakHourActive ?? false,
          weatherSurcharge: data.weatherSurcharge ?? 0,
          isWeatherSurchargeActive: data.isWeatherSurchargeActive ?? false,
          globalMinOrderAmount: data.globalMinOrderAmount ?? 0,
          deliveryPayoutBase: data.deliveryPayoutBase ?? 0,
          deliveryPayoutPercentage: data.deliveryPayoutPercentage ?? 0,
          vendorCommissionPercentage: data.vendorCommissionPercentage ?? 0,
          baseDeliveryDistance: data.baseDeliveryDistance ?? 3,
          deliveryChargePerKmBeyondBase: data.deliveryChargePerKmBeyondBase ?? 0,
          gstType: data.gstType ?? 'percentage',
          gstValue: data.gstValue ?? 0
        }));

        // If current payment method is disabled, switch to the other one
        setPaymentMethod(prev => {
          if (prev === 'cod' && data.isCodEnabled === false && data.isUpiEnabled !== false) return 'upi';
          if (prev === 'upi' && data.isUpiEnabled === false && data.isCodEnabled !== false) return 'cod';
          return prev;
        });
      }
    });
    return () => unsub();
  }, []);

  const handleApplyCoupon = async () => {
    if (!couponCode) return;
    setCouponError('');
    try {
      const q = query(collection(db, 'coupons'), where('code', '==', couponCode.toUpperCase()), where('active', '==', true));
      const snap = await getDocs(q);
      if (snap.empty) {
        setCouponError('Invalid or expired coupon code');
        return;
      }
      const coupon = { id: snap.docs[0].id, ...snap.docs[0].data() } as Coupon;
      if (totalPrice < coupon.minOrderAmount) {
        setCouponError(`Min order amount for this coupon is ₹${coupon.minOrderAmount}`);
        return;
      }
      setAppliedCoupon(coupon);
      setCouponCode('');
    } catch (error) {
      console.error('Error applying coupon:', error);
      setCouponError('Failed to apply coupon');
    }
  };

  // Calculate delivery charge based on settings
  const percentageCharge = (totalPrice * adminSettings.orderPercentageCharge) / 100;
  
  // Distance based delivery charge
  let distanceCharge = 0;
  let baseDeliveryCharge = adminSettings.baseDeliveryCharge;
  const baseDistance = adminSettings.baseDeliveryDistance || 3;

  // If distance is detected, calculate distance charge
  if (distanceKm > 0) {
    // Add extra charge for distance beyond base distance
    if (distanceKm > baseDistance && adminSettings.deliveryChargePerKmBeyondBase) {
      distanceCharge = Math.ceil(distanceKm - baseDistance) * adminSettings.deliveryChargePerKmBeyondBase;
    }
  }

  const deliveryCharge = 
    baseDeliveryCharge + 
    percentageCharge + 
    distanceCharge +
    (adminSettings.isPeakHourActive ? adminSettings.peakHourSurcharge : 0) + 
    (adminSettings.isWeatherSurchargeActive ? adminSettings.weatherSurcharge : 0);

  const discountAmount = appliedCoupon 
    ? (appliedCoupon.discountType === 'percentage' 
        ? Math.min((totalPrice * appliedCoupon.discountValue) / 100, appliedCoupon.maxDiscount || Infinity)
        : appliedCoupon.discountValue)
    : 0;

  const subtotalAfterDiscount = totalPrice - discountAmount;

  // Calculate GST
  let gstAmount = 0;
  if (adminSettings.gstValue && adminSettings.gstValue > 0) {
    if (adminSettings.gstType === 'percentage') {
      gstAmount = (subtotalAfterDiscount * adminSettings.gstValue) / 100;
    } else {
      gstAmount = adminSettings.gstValue;
    }
  }

  const finalTotal = subtotalAfterDiscount + deliveryCharge + gstAmount;
  const isDistanceEstimated = !!(customerCoords && shopCoords);

  const handleImageUpload = async (file: File) => {
    try {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = async () => {
        const base64 = reader.result as string;
        const resized = await resizeImage(base64);
        setPaymentProof(resized);
      };
    } catch (error) {
      console.error('Error uploading image:', error);
    }
  };

  const handlePlaceOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;

    if (!address.trim()) {
      alert('Please enter or detect your delivery address before placing the order.');
      return;
    }

    if (paymentMethod === 'upi' && !paymentProof) {
      alert("Please upload payment proof for UPI payment.");
      return;
    }
    
    if (totalPrice < adminSettings.globalMinOrderAmount) {
      alert(`Minimum order amount is ₹${adminSettings.globalMinOrderAmount}`);
      return;
    }

    setLoading(true);

    try {
      const path = 'orders';
      const hasGroceries = items.some(item => item.isGrocery);
      const shopIds = Array.from(new Set(items.map(item => item.shopId).filter(Boolean)));
      
      let shopName = '';
      let shopAddress = '';

      if (shopIds.length > 0) {
        try {
          const shopSnap = await getDoc(doc(db, 'shops', shopIds[0]));
          if (shopSnap.exists()) {
            const shopData = shopSnap.data();
            shopName = shopData.name;
            shopAddress = shopData.address || shopData.description || ''; // Fallback to description if address is missing
          }
        } catch (err) {
          console.error('Error fetching shop details for order:', err);
        }
      }

      // Calculate Revenue Split
      const vendorRevenue = (totalPrice - discountAmount) * (1 - (adminSettings.vendorCommissionPercentage || 0) / 100);
      const deliveryRevenue = (adminSettings.deliveryPayoutBase || 0) + (deliveryCharge * (adminSettings.deliveryPayoutPercentage || 0) / 100);
      const adminRevenue = ((totalPrice - discountAmount) * ((adminSettings.vendorCommissionPercentage || 0) / 100)) + (deliveryCharge - deliveryRevenue);

      const orderData: any = {
        customerId: profile.uid,
        customerName: profile.fullName || '',
        customerMobile: profile.mobileNumber || '',
        items,
        shopIds,
        shopName: shopName || '',
        shopAddress: shopAddress || '',
        specialInstructions: specialInstructions || '',
        totalPrice: finalTotal,
        deliveryCharge: deliveryCharge,
        discountAmount,
        couponCode: appliedCoupon?.code || null,
        gstAmount,
        distanceKm,
        vendorRevenue,
        deliveryRevenue,
        adminRevenue,
        status: 'pending',
        address,
        customerLat: customerCoords?.lat || null,
        customerLng: customerCoords?.lng || null,
        city: profile.city || 'General',
        paymentMethod,
        paymentStatus: 'pending',
        paymentProof: paymentMethod === 'upi' ? paymentProof : null,
        hasGroceries,
        createdAt: serverTimestamp(),
      };

      const orderRef = await addDoc(collection(db, path), orderData).catch(error => {
        handleFirestoreError(error, OperationType.CREATE, path);
        throw error;
      });

      // Send notifications to vendors
      for (const shopId of shopIds) {
        try {
          const shopSnap = await getDoc(doc(db, 'shops', shopId));
          if (shopSnap.exists()) {
            const shopData = shopSnap.data() as Shop;
            if (shopData.ownerId) {
              await sendNotification({
                userId: shopData.ownerId,
                title: 'New Order Received!',
                message: `You have a new order from ${profile.fullName} for ${formatPrice(finalTotal)}. Order ID: ${orderRef.id.slice(-6)}`,
                type: 'new_order',
                orderId: orderRef.id
              });
            }
          }
        } catch (err) {
          console.error('Error notifying vendor:', err);
        }
      }

      if (appliedCoupon) {
        await updateDoc(doc(db, 'coupons', appliedCoupon.id), {
          usageCount: (appliedCoupon.usageCount || 0) + 1
        });
      }

      clearCart();
      navigate(`/track/${orderRef.id}`);
    } catch (error) {
      console.error("Order error:", error);
      alert("Failed to place order. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12">
      <div className="space-y-10 pb-12">
        <div className="space-y-2">
          <h1 className="text-4xl font-black text-navy-900 tracking-tight uppercase">Checkout</h1>
          <p className="text-gray-400 font-bold uppercase tracking-widest text-xs">Final step to your treats!</p>
        </div>
        
        <form onSubmit={handlePlaceOrder} className="space-y-8">
          <section className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-2xl shadow-navy-100 space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3 text-navy-900">
                <div className="w-10 h-10 bg-navy-50 rounded-xl flex items-center justify-center text-navy-900">
                  <MapPin size={22} strokeWidth={3} />
                </div>
                <h2 className="text-xl font-black uppercase tracking-tight">Delivery Spot</h2>
              </div>
            </div>

            {profile?.addresses && profile.addresses.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                {profile.addresses.map((addr) => (
                  <button
                    key={addr.id}
                    type="button"
                    onClick={() => {
                      setSelectedAddressId(addr.id);
                      setAddress(addr.fullAddress);
                      if (addr.lat && addr.lng) {
                        setCustomerCoords({ lat: addr.lat, lng: addr.lng });
                      } else {
                        setCustomerCoords(null);
                      }
                    }}
                    className={`p-4 rounded-2xl border-2 text-left transition-all ${
                      selectedAddressId === addr.id
                        ? 'border-navy-900 bg-navy-50'
                        : 'border-gray-100 hover:border-navy-200'
                    }`}
                  >
                    <p className="text-[10px] font-black text-navy-400 uppercase tracking-widest mb-1">{addr.label}</p>
                    <p className="text-xs font-bold text-navy-900 line-clamp-2">{addr.fullAddress}</p>
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => {
                    setSelectedAddressId('new');
                    setAddress('');
                  }}
                  className={`p-4 rounded-2xl border-2 border-dashed text-left transition-all flex items-center justify-center space-x-2 ${
                    selectedAddressId === 'new'
                      ? 'border-navy-900 bg-navy-50 text-navy-900'
                      : 'border-gray-200 text-gray-400 hover:border-navy-300'
                  }`}
                >
                  <Plus size={16} />
                  <span className="text-xs font-black uppercase tracking-widest">New Address</span>
                </button>
              </div>
            )}

            <textarea
              required
              placeholder="Building, Room, or specific landmark..."
              className="w-full p-5 bg-navy-50 border-2 border-transparent rounded-[1.5rem] focus:outline-none focus:border-navy-500 focus:bg-white transition-all h-32 font-bold text-navy-900 placeholder:text-gray-300"
              value={address}
              onChange={(e) => {
                setAddress(e.target.value);
                if (selectedAddressId !== 'new') setSelectedAddressId('new');
              }}
            />
            
            <button
              type="button"
              disabled={isDetecting}
              onClick={handleDetectLocation}
              className={`w-full py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all flex items-center justify-center space-x-2 disabled:opacity-50 ${
                customerCoords ? 'bg-green-100 text-green-600 border border-green-200' : 'bg-navy-900 text-white shadow-lg shadow-navy-100'
              }`}
            >
              <MapPin size={16} />
              <span>{isDetecting ? 'Detecting...' : (customerCoords ? 'Location Pinned ✓' : 'Pin My Current Location')}</span>
            </button>
          </section>

          <section className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-2xl shadow-navy-100 space-y-6">
            <div className="flex items-center space-x-3 text-navy-900">
              <div className="w-10 h-10 bg-navy-50 rounded-xl flex items-center justify-center text-navy-900">
                <Tag size={22} strokeWidth={3} />
              </div>
              <h2 className="text-xl font-black uppercase tracking-tight">Special Request</h2>
            </div>
            <textarea
              placeholder="e.g. Extra spicy, no onions, leave at door..."
              className="w-full p-5 bg-navy-50 border-2 border-transparent rounded-[1.5rem] focus:outline-none focus:border-navy-500 focus:bg-white transition-all h-24 font-bold text-navy-900 placeholder:text-gray-300"
              value={specialInstructions}
              onChange={(e) => setSpecialInstructions(e.target.value)}
            />
          </section>

          <section className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-2xl shadow-navy-100 space-y-6">
            <div className="flex items-center space-x-3 text-navy-900">
              <div className="w-10 h-10 bg-navy-50 rounded-xl flex items-center justify-center text-navy-900">
                <CreditCard size={22} strokeWidth={3} />
              </div>
              <h2 className="text-xl font-black uppercase tracking-tight">Payment Method</h2>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {adminSettings.isCodEnabled !== false && (
                <button
                  type="button"
                  onClick={() => setPaymentMethod('cod')}
                  className={`p-5 rounded-2xl border-4 transition-all flex flex-col items-center space-y-3 ${
                    paymentMethod === 'cod' ? 'border-navy-900 bg-navy-50' : 'border-gray-50 hover:border-navy-100'
                  }`}
                >
                  <Truck size={24} className={paymentMethod === 'cod' ? 'text-navy-900' : 'text-gray-300'} strokeWidth={3} />
                  <span className="font-black text-[10px] uppercase tracking-widest">Cash on Delivery</span>
                </button>
              )}
              {adminSettings.isUpiEnabled !== false && (
                <button
                  type="button"
                  onClick={() => setPaymentMethod('upi')}
                  className={`p-5 rounded-2xl border-4 transition-all flex flex-col items-center space-y-3 ${
                    paymentMethod === 'upi' ? 'border-navy-900 bg-navy-50' : 'border-gray-50 hover:border-navy-100'
                  }`}
                >
                  <QrCode size={24} className={paymentMethod === 'upi' ? 'text-navy-900' : 'text-gray-300'} strokeWidth={3} />
                  <span className="font-black text-[10px] uppercase tracking-widest">UPI Scanner</span>
                </button>
              )}
            </div>

            <AnimatePresence>
              {paymentMethod === 'upi' && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mt-6 p-6 bg-navy-50 rounded-[2rem] border-2 border-navy-100 space-y-6 overflow-hidden"
                >
                  <div className="text-center space-y-4">
                    <div className="flex flex-col items-center space-y-2">
                      <p className="text-[10px] text-navy-400 font-black uppercase tracking-widest">Scan to Pay</p>
                      <div className="w-48 h-48 bg-white p-4 rounded-3xl border-2 border-navy-100 shadow-xl">
                        <img 
                          src={adminSettings.upiQR || undefined} 
                          alt="UPI QR Code" 
                          className="w-full h-full object-contain"
                        />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[10px] text-navy-400 font-black uppercase tracking-widest">UPI ID</p>
                      <div className="flex items-center justify-center space-x-2">
                        <p className="text-xl font-black text-navy-900 select-all tracking-tighter">{adminSettings.upiId}</p>
                        <button 
                          type="button"
                          onClick={() => {
                            navigator.clipboard.writeText(adminSettings.upiId);
                            alert('UPI ID copied to clipboard!');
                          }}
                          className="p-2 bg-navy-100 text-navy-900 rounded-xl hover:bg-navy-200 transition-all active:scale-90"
                        >
                          <Smartphone size={16} strokeWidth={3} />
                        </button>
                      </div>
                      <p className="text-[10px] text-accent-600 font-black uppercase tracking-widest">Pay exactly {formatPrice(finalTotal)}</p>
                      
                      <div className="pt-4 space-y-3">
                        <p className="text-[10px] text-navy-400 font-black uppercase tracking-widest">Upload Payment Proof</p>
                        <div className="flex items-center space-x-4">
                          <label className="flex-1 cursor-pointer bg-white border-2 border-dashed border-navy-200 rounded-2xl p-4 hover:border-navy-900 transition-all group">
                            <div className="flex flex-col items-center space-y-1">
                              <Upload size={20} className="text-navy-300 group-hover:text-navy-900 transition-colors" />
                              <span className="text-[8px] font-black text-navy-400 uppercase tracking-widest group-hover:text-navy-900 transition-colors">
                                {paymentProof ? 'Change Screenshot' : 'Upload Screenshot'}
                              </span>
                            </div>
                            <input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) handleImageUpload(file);
                              }}
                            />
                          </label>
                          {paymentProof && (
                            <button 
                              type="button"
                              onClick={() => setShowProofModal(true)}
                              className="w-16 h-16 rounded-xl overflow-hidden border-2 border-navy-100 flex-shrink-0 hover:border-navy-900 transition-all active:scale-95"
                            >
                              <img src={paymentProof || undefined} alt="Proof" className="w-full h-full object-cover" />
                            </button>
                          )}
                        </div>
                      </div>

                      <p className="text-[8px] text-navy-400 font-bold uppercase tracking-widest mt-2">Order will be processed after Admin verifies payment</p>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </section>

          <button
            type="submit"
            disabled={loading || items.length === 0}
            className="w-full bg-navy-900 text-white py-5 rounded-[1.5rem] font-black text-xl hover:bg-navy-800 transition-all shadow-2xl shadow-navy-200 disabled:opacity-50 active:scale-95 uppercase tracking-tighter"
          >
            {loading ? 'Processing...' : `Place Order • ${formatPrice(finalTotal)}`}
          </button>
        </form>
      </div>

      <div className="space-y-8">
        <div className="bg-white p-8 rounded-[3rem] border border-gray-100 shadow-2xl shadow-navy-100 sticky top-24 space-y-8">
          <div className="flex items-center space-x-3 border-b border-gray-50 pb-4">
            <div className="w-10 h-10 bg-navy-900 rounded-xl flex items-center justify-center text-white">
              <ShoppingBag size={20} strokeWidth={3} />
            </div>
            <h3 className="text-2xl font-black text-navy-900 tracking-tight uppercase">Bag Summary</h3>
          </div>
          
          <div className="space-y-6">
            <div className="space-y-4 max-h-[30rem] overflow-y-auto pr-2 custom-scrollbar">
              {items.map(item => (
                <div key={item.id} className="flex items-center space-x-4 group">
                  <div className="w-16 h-16 rounded-2xl overflow-hidden flex-shrink-0 border border-gray-50">
                    <img src={item.image || undefined} alt={item.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" referrerPolicy="no-referrer" />
                  </div>
                  <div className="flex-1 min-w-0 space-y-0.5">
                    <p className="font-black text-navy-900 text-sm truncate group-hover:text-navy-600 transition-colors uppercase tracking-tight">{item.name}</p>
                    <p className="text-gray-400 text-[10px] font-bold uppercase tracking-widest">{item.quantity} x {formatPrice(item.price)}</p>
                  </div>
                  <span className="font-black text-navy-900 text-sm">{formatPrice(item.price * item.quantity)}</span>
                </div>
              ))}
            </div>
            
            <div className="border-t-2 border-dashed border-gray-100 pt-8 space-y-4">
              {/* Coupon Section */}
              <div className="space-y-3">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Have a coupon?</p>
                {appliedCoupon ? (
                  <div className="flex items-center justify-between bg-accent-50 p-4 rounded-2xl border border-accent-100">
                    <div className="flex items-center space-x-3">
                      <Tag size={16} className="text-accent-600" />
                      <div>
                        <p className="text-xs font-black text-navy-900 uppercase tracking-tight">{appliedCoupon.code}</p>
                        <p className="text-[8px] font-bold text-accent-600 uppercase tracking-widest">Applied Successfully</p>
                      </div>
                    </div>
                    <button 
                      onClick={() => setAppliedCoupon(null)}
                      className="text-gray-400 hover:text-red-500 transition-colors"
                    >
                      <X size={16} strokeWidth={3} />
                    </button>
                  </div>
                ) : (
                  <div className="flex space-x-2">
                    <input
                      type="text"
                      placeholder="ENTER CODE"
                      className="flex-1 px-4 py-3 bg-navy-50 border-2 border-transparent rounded-xl focus:outline-none focus:border-navy-500 focus:bg-white transition-all font-black text-xs uppercase tracking-widest text-navy-900 placeholder:text-gray-300"
                      value={couponCode}
                      onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                    />
                    <button
                      type="button"
                      onClick={handleApplyCoupon}
                      className="px-6 py-3 bg-navy-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-navy-800 transition-all active:scale-95"
                    >
                      Apply
                    </button>
                  </div>
                )}
                {couponError && <p className="text-[9px] font-bold text-red-500 uppercase tracking-widest ml-1">{couponError}</p>}
              </div>

              <div className="flex justify-between text-sm font-bold">
                <span className="text-gray-400 uppercase tracking-widest">Items Total</span>
                <span className="text-navy-900">{formatPrice(totalPrice)}</span>
              </div>
              {discountAmount > 0 && (
                <div className="flex justify-between text-sm font-bold">
                  <span className="text-accent-600 uppercase tracking-widest">Coupon Discount</span>
                  <span className="text-accent-600">-{formatPrice(discountAmount)}</span>
                </div>
              )}
              
              <div className="space-y-2 border-t border-gray-50 pt-4">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Charges Breakdown</p>
                
                {customerCoords && shopCoords ? (
                  <div className="flex justify-between text-xs font-bold">
                    <span className="text-gray-500">Distance from shop</span>
                    <span className="text-navy-900">{distanceKm.toFixed(1)} km</span>
                  </div>
                ) : (
                  <div className="flex justify-between text-xs font-bold">
                    <span className="text-gray-500">Distance from shop</span>
                    <span className="text-accent-600">Detect location to estimate</span>
                  </div>
                )}

                {baseDeliveryCharge > 0 && (
                  <div className="flex justify-between text-xs font-bold">
                    <span className="text-gray-500">Base Delivery Fee</span>
                    <span className="text-navy-900">{formatPrice(baseDeliveryCharge)}</span>
                  </div>
                )}
                
                {percentageCharge > 0 && (
                  <div className="flex justify-between text-xs font-bold">
                    <span className="text-gray-500">Order Processing Fee ({adminSettings.orderPercentageCharge}%)</span>
                    <span className="text-navy-900">{formatPrice(percentageCharge)}</span>
                  </div>
                )}

                {distanceCharge > 0 && (
                  <div className="flex justify-between text-xs font-bold">
                    <span className="text-gray-500">Distance Surcharge ({Math.ceil(distanceKm - (adminSettings.baseDeliveryDistance || 3))} km)</span>
                    <span className="text-navy-900">{formatPrice(distanceCharge)}</span>
                  </div>
                )}
                
                {adminSettings.isPeakHourActive && adminSettings.peakHourSurcharge > 0 && (
                  <div className="flex justify-between text-xs font-bold">
                    <span className="text-accent-600">Peak Hour Surcharge</span>
                    <span className="text-accent-600">{formatPrice(adminSettings.peakHourSurcharge)}</span>
                  </div>
                )}
                
                {adminSettings.isWeatherSurchargeActive && adminSettings.weatherSurcharge > 0 && (
                  <div className="flex justify-between text-xs font-bold">
                    <span className="text-accent-600">Weather Surcharge</span>
                    <span className="text-accent-600">{formatPrice(adminSettings.weatherSurcharge)}</span>
                  </div>
                )}

                {gstAmount > 0 && (
                  <div className="flex justify-between text-xs font-bold">
                    <span className="text-gray-500">GST ({adminSettings.gstType === 'percentage' ? `${adminSettings.gstValue}%` : 'Fixed'})</span>
                    <span className="text-navy-900">{formatPrice(gstAmount)}</span>
                  </div>
                )}
              </div>

              <div className="flex justify-between text-3xl font-black text-navy-900 pt-6 border-t border-gray-50">
                <span className="uppercase tracking-tighter">TOTAL</span>
                <span>{formatPrice(finalTotal)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
      {showProofModal && paymentProof && (
        <div className="fixed inset-0 bg-navy-900/90 backdrop-blur-md z-[100] flex items-center justify-center p-4" onClick={() => setShowProofModal(false)}>
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="relative max-w-4xl w-full h-full flex items-center justify-center"
            onClick={e => e.stopPropagation()}
          >
            <button 
              onClick={() => setShowProofModal(false)}
              className="absolute -top-12 right-0 w-10 h-10 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center text-white transition-all z-10"
            >
              <X size={20} strokeWidth={3} />
            </button>
            <img 
              src={paymentProof || undefined} 
              alt="Payment Proof" 
              className="max-w-full max-h-full object-contain rounded-2xl shadow-2xl"
              referrerPolicy="no-referrer"
            />
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default Checkout;
