import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { collection, doc, onSnapshot, query } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { Shop, MenuItem } from '../types';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { Plus, Minus, Clock, Star, ShoppingBag } from 'lucide-react';
import { motion } from 'motion/react';
import { formatPrice } from '../lib/utils';

const ShopDetail = () => {
  const { id } = useParams();
  const { profile } = useAuth();
  const [shop, setShop] = useState<Shop | null>(null);
  const [menu, setMenu] = useState<MenuItem[]>([]);
  const [categories, setCategories] = useState<{id: string, name: string}[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  const { addItem, items, updateQuantity } = useCart();

  useEffect(() => {
    if (!id) return;

    const shopPath = `shops/${id}`;
    const shopRef = doc(db, 'shops', id);
    const unsubShop = onSnapshot(shopRef, (docSnap) => {
      if (docSnap.exists()) {
        setShop({ id: docSnap.id, ...docSnap.data() } as Shop);
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, shopPath);
    });

    const menuPath = `shops/${id}/menu`;
    const menuRef = collection(db, 'shops', id, 'menu');
    const unsubMenu = onSnapshot(menuRef, (snapshot) => {
      const menuData = snapshot.docs
        .map(doc => ({ id: doc.id, shopId: id, ...doc.data() } as MenuItem))
        .filter(item => item.status !== 'inactive' && !item.isOutOfStock);
      setMenu(menuData);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, menuPath);
    });

    const categoriesRef = collection(db, 'shops', id, 'menuCategories');
    const unsubCategories = onSnapshot(categoriesRef, (snapshot) => {
      const catData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as {id: string, name: string}));
      setCategories(catData);
    });

    return () => {
      unsubShop();
      unsubMenu();
      unsubCategories();
    };
  }, [id]);

  if (loading) return <div className="flex items-center justify-center h-64">Loading menu...</div>;
  if (!shop) return <div>Shop not found.</div>;

  if (shop.status === 'closed') {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] space-y-6 text-center">
        <div className="w-24 h-24 bg-red-50 rounded-[2.5rem] flex items-center justify-center text-red-500 rotate-12">
          <Clock size={48} strokeWidth={3} />
        </div>
        <div className="space-y-2">
          <h2 className="text-4xl font-black text-navy-900 uppercase tracking-tighter">{shop.name} is Closed</h2>
          <p className="text-gray-400 font-bold uppercase tracking-widest text-xs max-w-xs mx-auto">
            This shop is currently not accepting orders. Please check back later!
          </p>
        </div>
        <button 
          onClick={() => window.history.back()}
          className="px-8 py-3 bg-navy-900 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-navy-800 transition-all shadow-xl shadow-navy-100"
        >
          Go Back
        </button>
      </div>
    );
  }

  const getItemQuantity = (itemId: string) => {
    return items.find(i => i.id === itemId)?.quantity || 0;
  };

  return (
    <div className="space-y-10">
      {/* Shop Header */}
      <div className="relative h-72 sm:h-80 rounded-[3rem] overflow-hidden shadow-2xl shadow-navy-100">
        <img
          src={shop.image || undefined}
          alt={shop.name}
          className="w-full h-full object-cover"
          referrerPolicy="no-referrer"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-navy-900/80 via-navy-900/20 to-transparent flex items-end p-8 sm:p-12">
          <div className="text-white space-y-4 max-w-2xl">
            <div className="inline-flex items-center space-x-2 bg-accent-500 px-3 py-1 rounded-full text-white text-[10px] font-black uppercase tracking-widest">
              Top Rated
            </div>
            <h1 className="text-4xl sm:text-5xl font-black tracking-tighter uppercase">{shop.name}</h1>
            <p className="text-navy-100 text-sm sm:text-base font-medium line-clamp-2 opacity-90">{shop.description}</p>
            <div className="flex items-center space-x-6 text-sm font-black pt-2">
              <div className="flex items-center space-x-2 bg-white/20 backdrop-blur-md px-4 py-2 rounded-2xl border border-white/20">
                <Clock size={18} className="text-accent-400" />
                <span>{shop.deliveryTime}</span>
              </div>
              <div className="flex items-center space-x-2 bg-white/20 backdrop-blur-md px-4 py-2 rounded-2xl border border-white/20">
                <Star size={18} fill="currentColor" className="text-accent-400" />
                <span>4.5 (250+ Reviews)</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Menu Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        <div className="lg:col-span-2 space-y-8">
          {/* Category Filter Bar */}
          <div className="sticky top-20 z-30 bg-white/80 backdrop-blur-md py-4 border-b border-gray-100 -mx-4 px-4 sm:mx-0 sm:px-0">
            <div className="flex items-center space-x-3 overflow-x-auto custom-scrollbar pb-2">
              <button
                onClick={() => setSelectedCategory('all')}
                className={`px-6 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all border-2 whitespace-nowrap ${
                  selectedCategory === 'all' 
                    ? 'bg-navy-900 text-white border-navy-900 shadow-xl shadow-navy-100' 
                    : 'bg-white text-navy-400 border-gray-100 hover:border-navy-200'
                }`}
              >
                All Items
              </button>
              {categories.map(cat => (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`px-6 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all border-2 whitespace-nowrap ${
                    selectedCategory === cat.id 
                      ? 'bg-navy-900 text-white border-navy-900 shadow-xl shadow-navy-100' 
                      : 'bg-white text-navy-400 border-gray-100 hover:border-navy-200'
                  }`}
                >
                  {cat.name}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between border-b border-gray-100 pb-4">
            <h2 className="text-3xl font-black text-navy-900 tracking-tight uppercase">
              {selectedCategory === 'all' ? 'The Menu' : categories.find(c => c.id === selectedCategory)?.name}
            </h2>
            <span className="text-xs font-black text-navy-400 uppercase tracking-widest">
              {menu.filter(item => selectedCategory === 'all' || item.categoryId === selectedCategory).length} Items
            </span>
          </div>
          <div className="grid grid-cols-1 gap-6">
            {menu
              .filter(item => selectedCategory === 'all' || item.categoryId === selectedCategory)
              .map((item) => {
              const quantity = getItemQuantity(item.id);
              return (
                <motion.div
                  key={item.id}
                  layout
                  className="bg-white p-5 rounded-[2rem] border border-gray-100 flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-6 shadow-sm hover:shadow-xl hover:shadow-navy-50 transition-all group"
                >
                  <div className="flex items-center space-x-4 sm:space-x-6 flex-1 min-w-0">
                    <div className="relative w-24 h-24 sm:w-32 sm:h-32 flex-shrink-0 overflow-hidden rounded-3xl">
                      <img
                        src={item.image || undefined}
                        alt={item.name}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                        referrerPolicy="no-referrer"
                      />
                    </div>
                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-center space-x-2">
                        <span className="text-[10px] font-black text-accent-600 bg-accent-50 px-2 py-0.5 rounded uppercase tracking-wider">{item.category}</span>
                      </div>
                      <h3 className="text-xl font-black text-navy-900 truncate tracking-tight">{item.name}</h3>
                      <p className="text-navy-600 font-black text-lg">{formatPrice(item.price)}</p>
                    </div>
                  </div>
                  <div className="flex items-center self-start sm:self-auto space-x-2 sm:space-x-3 bg-navy-50 p-1.5 rounded-2xl border border-navy-100 flex-shrink-0">
                    {profile?.role === 'customer' ? (
                      quantity > 0 ? (
                        <>
                          <button
                            onClick={() => updateQuantity(item.id, quantity - 1)}
                            className="w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center bg-white rounded-xl text-navy-900 hover:bg-navy-100 transition-colors shadow-sm active:scale-90"
                          >
                            <Minus size={16} strokeWidth={3} className="sm:w-[18px] sm:h-[18px]" />
                          </button>
                          <span className="w-5 sm:w-6 text-center font-black text-navy-900 text-base sm:text-lg">{quantity}</span>
                          <button
                            onClick={() => addItem(item)}
                            className="w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center bg-white rounded-xl text-navy-900 hover:bg-navy-100 transition-colors shadow-sm active:scale-90"
                          >
                            <Plus size={16} strokeWidth={3} className="sm:w-[18px] sm:h-[18px]" />
                          </button>
                        </>
                      ) : (
                        <button
                          onClick={() => addItem(item)}
                          className="px-6 py-2 sm:px-8 sm:py-2.5 bg-navy-900 text-white rounded-xl text-xs sm:text-sm font-black hover:bg-navy-800 transition-all shadow-md shadow-navy-100 active:scale-95"
                        >
                          ADD
                        </button>
                      )
                    ) : (
                      <span className="px-4 py-2 text-[8px] font-black text-navy-400 uppercase tracking-widest text-center">
                        Ordering restricted to customers
                      </span>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>

        {/* Cart Summary Sidebar */}
        <div className="lg:col-span-1">
          {profile?.role === 'customer' ? (
            <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-2xl shadow-navy-100 sticky top-24 space-y-6">
              <div className="flex items-center space-x-3 border-b border-gray-50 pb-4">
                <div className="w-10 h-10 bg-navy-900 rounded-xl flex items-center justify-center text-white">
                  <ShoppingBag size={20} />
                </div>
                <h3 className="text-2xl font-black text-navy-900 tracking-tight uppercase">Your Bag</h3>
              </div>
              
              {items.length === 0 ? (
                <div className="py-10 text-center space-y-4">
                  <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto">
                    <ShoppingBag size={24} className="text-gray-300" />
                  </div>
                  <p className="text-gray-400 font-bold text-sm uppercase tracking-widest">Bag is empty!</p>
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="space-y-4 max-h-80 overflow-y-auto pr-2 custom-scrollbar">
                    {items.map(item => (
                      <div key={item.id} className="flex justify-between items-center group">
                        <div className="flex flex-col">
                          <span className="text-navy-900 font-black text-sm group-hover:text-navy-600 transition-colors">{item.name}</span>
                          <span className="text-gray-400 text-[10px] font-bold uppercase tracking-widest">{item.quantity} x {formatPrice(item.price)}</span>
                        </div>
                        <span className="font-black text-navy-900">{formatPrice(item.price * item.quantity)}</span>
                      </div>
                    ))}
                  </div>
                  
                  <div className="border-t-2 border-dashed border-gray-100 pt-6 space-y-3">
                    <div className="flex justify-between text-sm font-bold">
                      <span className="text-gray-400 uppercase tracking-widest">Subtotal</span>
                      <span className="text-navy-900">{formatPrice(items.reduce((s, i) => s + i.price * i.quantity, 0))}</span>
                    </div>
                    <div className="flex justify-between text-sm font-bold">
                      <span className="text-gray-400 uppercase tracking-widest">Delivery</span>
                      <span className="text-accent-600">FREE</span>
                    </div>
                    <div className="flex justify-between text-2xl font-black text-navy-900 pt-4 border-t border-gray-50">
                      <span className="">TOTAL</span>
                      <span>{formatPrice(items.reduce((s, i) => s + i.price * i.quantity, 0))}</span>
                    </div>
                  </div>
                  
                  <button
                    onClick={() => window.location.href = '/checkout'}
                    className="w-full bg-navy-900 text-white py-4 rounded-2xl font-black text-lg hover:bg-navy-800 transition-all shadow-xl shadow-navy-200 active:scale-95 uppercase tracking-tighter"
                  >
                    Checkout Now
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-navy-50 p-8 rounded-[2.5rem] border border-navy-100 shadow-xl shadow-navy-50 sticky top-24 space-y-6 text-center">
              <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto text-navy-900 shadow-sm">
                <ShoppingBag size={24} />
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-black text-navy-900 uppercase tracking-tight">Customer Only</h3>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest leading-relaxed">
                  Ordering and cart features are restricted to customer accounts.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ShopDetail;
