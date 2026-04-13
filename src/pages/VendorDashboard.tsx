import React, { useEffect, useState } from 'react';
import { collection, doc, onSnapshot, query, where, addDoc, deleteDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { Shop, MenuItem, MenuCategory, Order } from '../types';
import { useAuth } from '../context/AuthContext';
import { motion } from 'motion/react';
import { Plus, Trash2, Store, Package, UtensilsCrossed, X, Navigation } from 'lucide-react';
import { formatPrice, resizeImage } from '../lib/utils';
import { updateOrderStatus, verifyPayment } from '../services/orderService';

const VendorDashboard = () => {
  const { profile } = useAuth();
  const [shops, setShops] = useState<Shop[]>([]);
  const [selectedShopId, setSelectedShopId] = useState<string | null>(null);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [menuCategories, setMenuCategories] = useState<MenuCategory[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [showAddMenuItem, setShowAddMenuItem] = useState(false);
  const [showAddCategory, setShowAddCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newMenuItem, setNewMenuItem] = useState({
    name: '',
    price: '',
    category: '',
    categoryId: '',
    image: ''
  });
  const [orderFilter, setOrderFilter] = useState<'all' | 'active' | 'past'>('active');
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest');
  const [isOnline, setIsOnline] = useState(profile?.isActive || false);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const totalRevenue = React.useMemo(() => {
    return orders
      .filter(o => o.status === 'delivered')
      .reduce((sum, order) => sum + (order.vendorRevenue || 0), 0);
  }, [orders]);

  useEffect(() => {
    if (profile && profile.isActive !== undefined) {
      setIsOnline(profile.isActive);
    }
  }, [profile?.isActive]);

  const toggleOnlineStatus = async () => {
    if (!profile) return;
    const newStatus = !isOnline;
    setIsOnline(newStatus);
    try {
      await updateDoc(doc(db, 'users', profile.uid), { isActive: newStatus });
      
      // Also update all shops owned by this vendor to match their online status
      const shopStatus = newStatus ? 'live' : 'closed';
      const updatePromises = shops.map(shop => 
        updateDoc(doc(db, 'shops', shop.id), { status: shopStatus })
      );
      await Promise.all(updatePromises);
      alert(`You are now ${newStatus ? 'Online' : 'Offline'}. All shops have been ${newStatus ? 'opened' : 'closed'}.`);
    } catch (error) {
      console.error("Error updating online status:", error);
      alert("Failed to update online status. Please check your connection.");
      setIsOnline(!newStatus); // Revert UI
    }
  };

  const [cancelModal, setCancelModal] = useState<{ isOpen: boolean; orderId: string; reason: string }>({
    isOpen: false,
    orderId: '',
    reason: ''
  });

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = error => reject(error);
    });
  };

  const handleImageUpload = async (file: File) => {
    try {
      const base64 = await fileToBase64(file);
      const resized = await resizeImage(base64);
      setNewMenuItem({ ...newMenuItem, image: resized });
    } catch (error) {
      console.error('Error uploading image:', error);
    }
  };

  useEffect(() => {
    if (!profile || profile.role !== 'vendor') return;

    const shopsPath = 'shops';
    const q = query(collection(db, shopsPath), where('ownerId', '==', profile.uid));
    
    const unsubShops = onSnapshot(q, (snap) => {
      const shopsData = snap.docs.map(d => ({ id: d.id, ...d.data() } as Shop));
      setShops(shopsData);
      if (shopsData.length > 0) {
        if (!selectedShopId || !shopsData.find(s => s.id === selectedShopId)) {
          setSelectedShopId(shopsData[0].id);
        }
      } else {
        setSelectedShopId(null);
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, shopsPath);
    });

    return () => unsubShops();
  }, [profile]);

  useEffect(() => {
    if (selectedShopId) {
      const menuPath = `shops/${selectedShopId}/menu`;
      const unsubMenu = onSnapshot(collection(db, 'shops', selectedShopId, 'menu'), (snap) => {
        setMenuItems(snap.docs.map(d => ({ id: d.id, shopId: selectedShopId, ...d.data() } as MenuItem)));
      }, (error) => {
        handleFirestoreError(error, OperationType.LIST, menuPath);
      });

      const categoriesPath = `shops/${selectedShopId}/menuCategories`;
      const unsubCategories = onSnapshot(collection(db, 'shops', selectedShopId, 'menuCategories'), (snap) => {
        setMenuCategories(snap.docs.map(d => ({ id: d.id, shopId: selectedShopId, ...d.data() } as MenuCategory)));
      }, (error) => {
        handleFirestoreError(error, OperationType.LIST, categoriesPath);
      });

      const ordersPath = 'orders';
      const unsubOrders = onSnapshot(query(collection(db, 'orders'), where('shopIds', 'array-contains', selectedShopId)), (snap) => {
        setOrders(snap.docs.map(d => ({ id: d.id, ...d.data() } as Order)));
      }, (error) => {
        handleFirestoreError(error, OperationType.LIST, ordersPath);
      });

      return () => {
        unsubMenu();
        unsubCategories();
        unsubOrders();
      };
    }
  }, [selectedShopId]);

  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedShopId || !newCategoryName) return;
    const path = `shops/${selectedShopId}/menuCategories`;
    try {
      await addDoc(collection(db, 'shops', selectedShopId, 'menuCategories'), {
        name: newCategoryName,
        shopId: selectedShopId
      });
      setNewCategoryName('');
      setShowAddCategory(false);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, path);
    }
  };

  const deleteCategory = async (categoryId: string) => {
    if (!selectedShopId || !window.confirm('Are you sure? This will not delete items in this category but they will lose their category link.')) return;
    const path = `shops/${selectedShopId}/menuCategories/${categoryId}`;
    try {
      await deleteDoc(doc(db, 'shops', selectedShopId, 'menuCategories', categoryId));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, path);
    }
  };

  const handleAddMenuItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedShopId) return;
    const menuPath = `shops/${selectedShopId}/menu`;
    try {
      await addDoc(collection(db, 'shops', selectedShopId, 'menu'), {
        ...newMenuItem,
        shopId: selectedShopId,
        price: Number(newMenuItem.price),
        status: 'active',
        createdAt: serverTimestamp()
      });
      setNewMenuItem({ name: '', price: '', category: '', categoryId: '', image: '' });
      setShowAddMenuItem(false);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, menuPath);
    }
  };

  const toggleShopStatus = async (shopId: string, currentStatus: string | undefined) => {
    const status = currentStatus || 'live';
    const newStatus = status === 'live' ? 'closed' : 'live';
    const path = `shops/${shopId}`;
    try {
      await updateDoc(doc(db, 'shops', shopId), { status: newStatus });
      alert(`Shop is now ${newStatus === 'live' ? 'Live' : 'Closed'}`);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  };
  const toggleMenuItemStatus = async (itemId: string, currentStatus: 'active' | 'inactive' | undefined) => {
    if (!selectedShopId) return;
    const path = `shops/${selectedShopId}/menu/${itemId}`;
    const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
    try {
      await updateDoc(doc(db, 'shops', selectedShopId, 'menu', itemId), {
        status: newStatus
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  };

  const toggleStockStatus = async (itemId: string, currentStockStatus: boolean | undefined) => {
    if (!selectedShopId) return;
    const path = `shops/${selectedShopId}/menu/${itemId}`;
    try {
      await updateDoc(doc(db, 'shops', selectedShopId, 'menu', itemId), {
        isOutOfStock: !currentStockStatus
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  };

  const deleteMenuItem = async (itemId: string) => {
    if (!selectedShopId || !window.confirm('Are you sure you want to delete this item?')) return;
    const path = `shops/${selectedShopId}/menu/${itemId}`;
    try {
      await deleteDoc(doc(db, 'shops', selectedShopId, 'menu', itemId));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, path);
    }
  };

  if (!profile || profile.role !== 'vendor') {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] space-y-4">
        <div className="w-20 h-20 bg-red-50 rounded-3xl flex items-center justify-center text-red-500">
          <Store size={40} strokeWidth={3} />
        </div>
        <h2 className="text-2xl font-black text-navy-900 uppercase tracking-tight">Access Denied</h2>
        <p className="text-gray-400 font-bold uppercase tracking-widest text-xs">Only vendors can access this dashboard.</p>
      </div>
    );
  }

  return (
    <div className="space-y-10 pb-20">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 px-2">
        <div className="space-y-1">
          <h1 className="text-4xl font-black text-navy-900 tracking-tight uppercase">Vendor Hub</h1>
          <p className="text-gray-400 font-bold uppercase tracking-widest text-xs">Manage your shops and orders</p>
        </div>
        
        <div className="flex items-center gap-4">
          <motion.div
            whileHover={{ y: -2 }}
            whileTap={{ scale: 0.98 }}
            onClick={toggleOnlineStatus}
            className={`px-6 py-3 rounded-2xl cursor-pointer flex items-center space-x-3 transition-all shadow-lg ${
              isOnline 
                ? 'bg-accent-500 text-navy-900 shadow-accent-100' 
                : 'bg-navy-50 text-navy-300 border-2 border-navy-100 shadow-none'
            }`}
          >
            <div className={`w-3 h-3 rounded-full ${isOnline ? 'bg-navy-900 animate-pulse' : 'bg-navy-200'}`} />
            <span className="text-[10px] font-black uppercase tracking-widest">{isOnline ? 'Live & Online' : 'Offline'}</span>
          </motion.div>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="bg-navy-900 p-8 rounded-[2.5rem] shadow-2xl shadow-navy-200 text-white flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-[10px] font-black text-navy-300 uppercase tracking-widest">Total Revenue</p>
            <p className="text-3xl font-black tracking-tighter">₹{totalRevenue.toFixed(2)}</p>
          </div>
          <div className="w-14 h-14 bg-white/10 rounded-2xl flex items-center justify-center text-accent-500">
            <Navigation size={28} strokeWidth={3} />
          </div>
        </div>

        <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-xl shadow-navy-50 flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Active Orders</p>
            <p className="text-3xl font-black text-navy-900 tracking-tighter">
              {orders.filter(o => o.status !== 'delivered' && o.status !== 'cancelled').length}
            </p>
          </div>
          <div className="w-14 h-14 bg-blue-50 text-blue-500 rounded-2xl flex items-center justify-center">
            <Package size={28} strokeWidth={3} />
          </div>
        </div>

        <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-xl shadow-navy-50 flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Total Shops</p>
            <p className="text-3xl font-black text-navy-900 tracking-tighter">{shops.length}</p>
          </div>
          <div className="w-14 h-14 bg-purple-50 text-purple-500 rounded-2xl flex items-center justify-center">
            <Store size={28} strokeWidth={3} />
          </div>
        </div>
      </div>

      {shops.length === 0 ? (
        <div className="bg-white p-20 rounded-[3rem] border-4 border-dashed border-navy-50 flex flex-col items-center justify-center space-y-6 text-center">
          <div className="w-24 h-24 bg-navy-50 rounded-[2rem] flex items-center justify-center text-navy-100 rotate-12">
            <Store size={48} strokeWidth={1} />
          </div>
          <div className="space-y-2">
            <h3 className="text-2xl font-black text-navy-900 uppercase tracking-tight">No Shop Assigned</h3>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest max-w-xs">
              Please contact the administrator to assign your shop to this account.
            </p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
          {/* Shop Selection & Info */}
          <div className="space-y-8">
            <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-2xl shadow-navy-100 space-y-6">
              <h3 className="text-xs font-black text-navy-400 uppercase tracking-widest">Your Shops</h3>
              <div className="space-y-4">
                {shops.map(shop => (
                  <button
                    key={shop.id}
                    onClick={() => setSelectedShopId(shop.id)}
                    className={`w-full flex items-center space-x-4 p-4 rounded-2xl border-2 transition-all ${
                      selectedShopId === shop.id 
                        ? 'border-navy-900 bg-navy-50/50' 
                        : 'border-transparent bg-gray-50 hover:bg-gray-100'
                    }`}
                  >
                    <div className="w-12 h-12 rounded-xl overflow-hidden border border-white shadow-sm">
                      <img src={shop.image || undefined} alt={shop.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    </div>
                    <div className="text-left flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className="font-black text-navy-900 text-sm truncate">{shop.name}</p>
                        <span className={`text-[7px] font-black px-1.5 py-0.5 rounded-full uppercase tracking-widest border ${
                          shop.status === 'closed' ? 'bg-red-50 text-red-600 border-red-100' : 'bg-green-50 text-green-600 border-green-100'
                        }`}>
                          {shop.status || 'live'}
                        </span>
                      </div>
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{shop.deliveryTime}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div className="bg-navy-900 p-8 rounded-[2.5rem] shadow-2xl shadow-navy-200 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-[10px] font-black text-navy-300 uppercase tracking-widest">Total Revenue</h3>
                <Store className="text-accent-500" size={20} />
              </div>
              <div className="space-y-1">
                <p className="text-3xl font-black text-white tracking-tighter">{formatPrice(totalRevenue)}</p>
                <p className="text-[8px] font-bold text-navy-400 uppercase tracking-widest">From delivered orders</p>
              </div>
            </div>

            {selectedShopId && (
              <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-2xl shadow-navy-100 space-y-6">
                <div className="flex items-center space-x-3 text-navy-900">
                  <div className="w-10 h-10 bg-navy-50 rounded-xl flex items-center justify-center">
                    <Package size={22} strokeWidth={3} />
                  </div>
                  <h3 className="text-xl font-black uppercase tracking-tight">Quick Stats</h3>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-navy-50 p-4 rounded-2xl border border-navy-100">
                    <p className="text-[10px] font-black text-navy-400 uppercase tracking-widest">Menu Items</p>
                    <p className="text-2xl font-black text-navy-900 tracking-tighter">{menuItems.length}</p>
                  </div>
                  <div className="bg-accent-50 p-4 rounded-2xl border border-accent-100 flex flex-col justify-between">
                    <div>
                      <p className="text-[10px] font-black text-accent-400 uppercase tracking-widest">Status</p>
                      <p className={`text-2xl font-black tracking-tighter ${
                        shops.find(s => s.id === selectedShopId)?.status === 'closed' ? 'text-red-600' : 'text-accent-600'
                      }`}>
                        {shops.find(s => s.id === selectedShopId)?.status?.toUpperCase() || 'LIVE'}
                      </p>
                    </div>
                    <button
                      onClick={() => {
                        const shop = shops.find(s => s.id === selectedShopId);
                        if (shop) toggleShopStatus(shop.id, shop.status);
                      }}
                      className={`mt-2 px-3 py-1.5 rounded-lg text-[8px] font-black uppercase tracking-widest transition-all ${
                        shops.find(s => s.id === selectedShopId)?.status === 'closed'
                          ? 'bg-accent-500 text-white hover:bg-accent-600'
                          : 'bg-red-500 text-white hover:bg-red-600'
                      }`}
                    >
                      {shops.find(s => s.id === selectedShopId)?.status === 'closed' ? 'Go Live' : 'Close Shop'}
                    </button>
                  </div>
                </div>
                
                <div className="bg-navy-50 p-4 rounded-2xl border border-navy-100 space-y-3">
                  <p className="text-[10px] font-black text-navy-400 uppercase tracking-widest">Delivery Time Estimate</p>
                  <div className="flex space-x-2">
                    <input
                      type="text"
                      value={shops.find(s => s.id === selectedShopId)?.deliveryTime || ''}
                      onChange={async (e) => {
                        const path = `shops/${selectedShopId}`;
                        try {
                          await updateDoc(doc(db, 'shops', selectedShopId), { deliveryTime: e.target.value });
                        } catch (error) {
                          handleFirestoreError(error, OperationType.UPDATE, path);
                        }
                      }}
                      placeholder="e.g., 15-20 mins"
                      className="w-full px-4 py-2 bg-white border-2 border-navy-100 rounded-xl focus:outline-none focus:border-navy-900 transition-colors text-sm font-bold text-navy-900 placeholder:text-gray-300"
                    />
                  </div>
                  <p className="text-[8px] font-bold text-gray-400 uppercase tracking-widest">Update based on stock, cooking time, or partner availability.</p>
                </div>
              </div>
            )}
          </div>

          {/* Menu Management */}
          <div className="lg:col-span-2 space-y-8">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 px-2">
              <h2 className="text-2xl font-black text-navy-900 tracking-tight uppercase">Menu Management</h2>
              <div className="flex space-x-2">
                <button
                  onClick={() => setShowAddCategory(!showAddCategory)}
                  className="bg-accent-500 text-white px-4 py-3 rounded-2xl font-black text-[10px] flex items-center space-x-2 hover:bg-accent-600 transition-all shadow-xl shadow-accent-100 uppercase tracking-widest active:scale-95"
                >
                  <Plus size={16} strokeWidth={3} />
                  <span>{showAddCategory ? 'Cancel' : 'Add Category'}</span>
                </button>
                <button
                  onClick={() => setShowAddMenuItem(!showAddMenuItem)}
                  className="bg-navy-900 text-white px-4 py-3 rounded-2xl font-black text-[10px] flex items-center space-x-2 hover:bg-navy-800 transition-all shadow-xl shadow-navy-100 uppercase tracking-widest active:scale-95"
                >
                  <Plus size={16} strokeWidth={3} />
                  <span>{showAddMenuItem ? 'Cancel' : 'Add Item'}</span>
                </button>
              </div>
            </div>

            {/* Category Filter Bar */}
            <div className="px-2 overflow-x-auto custom-scrollbar pb-2">
              <div className="flex items-center space-x-3 min-w-max">
                <button
                  onClick={() => setSelectedCategory('all')}
                  className={`px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all border-2 ${
                    selectedCategory === 'all' 
                      ? 'bg-navy-900 text-white border-navy-900 shadow-xl shadow-navy-100' 
                      : 'bg-white text-navy-400 border-gray-100 hover:border-navy-200'
                  }`}
                >
                  All Items
                </button>
                {menuCategories.map(cat => (
                  <button
                    key={cat.id}
                    onClick={() => setSelectedCategory(cat.id)}
                    className={`px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all border-2 ${
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

            {showAddCategory && (
              <motion.form
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                onSubmit={handleAddCategory}
                className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-2xl shadow-navy-100 space-y-6"
              >
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Category Name</label>
                  <div className="flex space-x-4">
                    <input
                      required
                      type="text"
                      value={newCategoryName}
                      onChange={(e) => setNewCategoryName(e.target.value)}
                      className="flex-1 bg-navy-50 border-2 border-transparent rounded-2xl px-5 py-3.5 focus:outline-none focus:border-navy-500 focus:bg-white transition-all font-bold text-navy-900 placeholder:text-gray-300"
                      placeholder="e.g. Chinese, Pizza, Beverages"
                    />
                    <button
                      type="submit"
                      className="bg-navy-900 text-white px-8 rounded-2xl font-black uppercase tracking-widest hover:bg-navy-800 transition-all"
                    >
                      Create
                    </button>
                  </div>
                </div>
                
                {menuCategories.length > 0 && (
                  <div className="pt-4 border-t border-gray-50">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">Existing Categories</p>
                    <div className="flex flex-wrap gap-2">
                      {menuCategories.map(cat => (
                        <div key={cat.id} className="flex items-center space-x-2 bg-navy-50 px-3 py-1.5 rounded-xl border border-navy-100">
                          <span className="text-[10px] font-black text-navy-900 uppercase tracking-widest">{cat.name}</span>
                          <button onClick={() => deleteCategory(cat.id)} className="text-gray-300 hover:text-red-500 transition-colors">
                            <Trash2 size={12} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </motion.form>
            )}

            {showAddMenuItem && (
              <motion.form
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                onSubmit={handleAddMenuItem}
                className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-2xl shadow-navy-100 space-y-6"
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Item Name</label>
                    <input
                      required
                      type="text"
                      value={newMenuItem.name}
                      onChange={(e) => setNewMenuItem({ ...newMenuItem, name: e.target.value })}
                      className="w-full bg-navy-50 border-2 border-transparent rounded-2xl px-5 py-3.5 focus:outline-none focus:border-navy-500 focus:bg-white transition-all font-bold text-navy-900 placeholder:text-gray-300"
                      placeholder="e.g. Spicy Paneer Burger"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Price (₹)</label>
                    <input
                      required
                      type="number"
                      value={newMenuItem.price}
                      onChange={(e) => setNewMenuItem({ ...newMenuItem, price: e.target.value })}
                      className="w-full bg-navy-50 border-2 border-transparent rounded-2xl px-5 py-3.5 focus:outline-none focus:border-navy-500 focus:bg-white transition-all font-bold text-navy-900 placeholder:text-gray-300"
                      placeholder="149"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Category</label>
                    <select
                      required
                      value={newMenuItem.categoryId}
                      onChange={(e) => {
                        const cat = menuCategories.find(c => c.id === e.target.value);
                        setNewMenuItem({ 
                          ...newMenuItem, 
                          categoryId: e.target.value,
                          category: cat?.name || ''
                        });
                      }}
                      className="w-full bg-navy-50 border-2 border-transparent rounded-2xl px-5 py-3.5 focus:outline-none focus:border-navy-500 focus:bg-white transition-all font-bold text-navy-900"
                    >
                      <option value="">Select Category</option>
                      {menuCategories.map(cat => (
                        <option key={cat.id} value={cat.id}>{cat.name}</option>
                      ))}
                    </select>
                    {menuCategories.length === 0 && (
                      <p className="text-[8px] font-black text-red-500 uppercase tracking-widest ml-1">Create a category first!</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Image</label>
                    <div className="flex items-center space-x-4">
                      <input
                        required
                        type="text"
                        value={newMenuItem.image}
                        onChange={(e) => setNewMenuItem({ ...newMenuItem, image: e.target.value })}
                        className="flex-1 bg-navy-50 border-2 border-transparent rounded-2xl px-5 py-3.5 focus:outline-none focus:border-navy-500 focus:bg-white transition-all font-bold text-navy-900 placeholder:text-gray-300"
                        placeholder="Image URL or upload..."
                      />
                      <label className="cursor-pointer bg-navy-900 text-white p-3.5 rounded-2xl hover:bg-navy-800 transition-all active:scale-95">
                        <Plus size={20} />
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
                    </div>
                  </div>
                </div>
                <button
                  type="submit"
                  className="w-full bg-navy-900 text-white py-4 rounded-2xl font-black text-lg hover:bg-navy-800 transition-all shadow-xl shadow-navy-200 uppercase tracking-tighter"
                >
                  Add to Menu
                </button>
              </motion.form>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {menuItems
                .filter(item => selectedCategory === 'all' || item.categoryId === selectedCategory)
                .map(item => (
                <div key={item.id} className={`bg-white p-5 rounded-[2rem] border border-gray-100 shadow-xl shadow-navy-50 flex items-center space-x-5 group hover:shadow-navy-100 transition-all ${item.status === 'inactive' || item.isOutOfStock ? 'opacity-75' : ''}`}>
                  <div className="w-20 h-20 rounded-2xl overflow-hidden border border-gray-50 flex-shrink-0 relative">
                    <img src={item.image || undefined} alt={item.name} className={`w-full h-full object-cover group-hover:scale-110 transition-transform duration-500 ${item.isOutOfStock ? 'grayscale' : ''}`} referrerPolicy="no-referrer" />
                    {item.isOutOfStock && (
                      <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                        <span className="text-[8px] font-black text-white uppercase tracking-widest bg-red-500 px-2 py-1 rounded-lg">Out of Stock</span>
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="flex items-center space-x-2 mb-0.5">
                          <p className="text-[10px] font-black text-accent-500 uppercase tracking-widest">{item.category}</p>
                          {item.status === 'inactive' && (
                            <span className="text-[8px] font-black text-red-500 bg-red-50 px-2 py-0.5 rounded uppercase tracking-widest">Inactive</span>
                          )}
                        </div>
                        <h4 className="font-black text-navy-900 tracking-tight truncate">{item.name}</h4>
                      </div>
                      <div className="flex items-center space-x-2">
                        <div className="flex flex-col space-y-1">
                          <button
                            onClick={() => toggleMenuItemStatus(item.id, item.status)}
                            className={`flex items-center space-x-2 px-3 py-1.5 rounded-xl font-black text-[8px] uppercase tracking-widest transition-all shadow-lg ${
                              item.status === 'inactive' 
                                ? 'bg-red-500 text-white hover:bg-red-600' 
                                : 'bg-green-500 text-white hover:bg-green-600'
                            }`}
                          >
                            <span>{item.status === 'inactive' ? 'Inactive' : 'Active'}</span>
                          </button>
                          <button
                            onClick={() => toggleStockStatus(item.id, item.isOutOfStock)}
                            className={`flex items-center space-x-2 px-3 py-1.5 rounded-xl font-black text-[8px] uppercase tracking-widest transition-all shadow-lg ${
                              item.isOutOfStock 
                                ? 'bg-orange-500 text-white hover:bg-orange-600' 
                                : 'bg-blue-500 text-white hover:bg-blue-600'
                            }`}
                          >
                            <span>{item.isOutOfStock ? 'No Stock' : 'In Stock'}</span>
                          </button>
                        </div>
                        <button
                          onClick={() => deleteMenuItem(item.id)}
                          className="p-2 text-gray-200 hover:text-red-500 transition-colors"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                    <p className="text-lg font-black text-navy-900 tracking-tighter mt-1">{formatPrice(item.price)}</p>
                  </div>
                </div>
              ))}
              {menuItems.filter(item => selectedCategory === 'all' || item.categoryId === selectedCategory).length === 0 && !showAddMenuItem && (
                <div className="col-span-full py-20 bg-navy-50/50 rounded-[2.5rem] border-2 border-dashed border-navy-100 flex flex-col items-center justify-center space-y-4">
                  <UtensilsCrossed size={40} className="text-navy-200" />
                  <p className="text-xs font-black text-navy-300 uppercase tracking-widest">Your menu is empty</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Vendor Orders Section */}
      {selectedShopId && (
        <div className="space-y-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 px-2">
            <h2 className="text-2xl font-black text-navy-900 tracking-tight uppercase">Orders</h2>
            <div className="flex items-center space-x-4">
              <div className="flex space-x-2">
                {['all', 'active', 'past'].map(filter => (
                  <button
                    key={filter}
                    onClick={() => setOrderFilter(filter as any)}
                    className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                      orderFilter === filter ? 'bg-navy-900 text-white shadow-lg shadow-navy-100' : 'bg-navy-50 text-navy-400 hover:bg-navy-100'
                    }`}
                  >
                    {filter}
                  </button>
                ))}
              </div>
              <select 
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value as any)}
                className="bg-navy-50 border-none rounded-xl text-[10px] font-black uppercase tracking-widest text-navy-900 px-4 py-2 focus:ring-2 focus:ring-navy-500"
              >
                <option value="newest">Newest First</option>
                <option value="oldest">Oldest First</option>
              </select>
            </div>
          </div>
          <div className="bg-white rounded-[3rem] border border-gray-100 shadow-2xl shadow-navy-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead className="bg-navy-50/50 border-b border-gray-50">
                  <tr>
                    <th className="px-8 py-6 text-[10px] font-black text-navy-400 uppercase tracking-widest">Order ID</th>
                    <th className="px-8 py-6 text-[10px] font-black text-navy-400 uppercase tracking-widest">Customer</th>
                    <th className="px-8 py-6 text-[10px] font-black text-navy-400 uppercase tracking-widest">Items</th>
                    <th className="px-8 py-6 text-[10px] font-black text-navy-400 uppercase tracking-widest">Delivery Partner</th>
                    <th className="px-8 py-6 text-[10px] font-black text-navy-400 uppercase tracking-widest">Status</th>
                    <th className="px-8 py-6 text-[10px] font-black text-navy-400 uppercase tracking-widest">Payment</th>
                    <th className="px-8 py-6 text-[10px] font-black text-navy-400 uppercase tracking-widest">ETA (Mins)</th>
                    <th className="px-8 py-6 text-[10px] font-black text-navy-400 uppercase tracking-widest">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {orders
                    .filter(o => {
                      if (orderFilter === 'active') return o.status !== 'delivered' && o.status !== 'cancelled';
                      if (orderFilter === 'past') return o.status === 'delivered' || o.status === 'cancelled';
                      return true;
                    })
                    .sort((a, b) => {
                      const timeA = a.createdAt?.toMillis ? a.createdAt.toMillis() : 0;
                      const timeB = b.createdAt?.toMillis ? b.createdAt.toMillis() : 0;
                      return sortOrder === 'newest' ? timeB - timeA : timeA - timeB;
                    })
                    .map(order => (
                    <tr key={order.id} className="hover:bg-navy-50/30 transition-colors group">
                      <td className="px-8 py-6">
                        <span className="text-sm font-black text-navy-900 tracking-tighter">#{order.id.slice(0, 8)}</span>
                      </td>
                      <td className="px-8 py-6">
                        <div className="flex items-center space-x-4">
                          <div className="w-10 h-10 bg-navy-900 text-white rounded-full flex items-center justify-center text-sm font-black shrink-0">
                            {order.customerName ? order.customerName[0].toUpperCase() : 'G'}
                          </div>
                          <div className="space-y-0.5">
                            <p className="text-sm font-black text-navy-900">{order.customerName || 'Guest'}</p>
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{order.customerMobile || 'No Mobile'}</p>
                            <p className="text-[10px] font-medium text-gray-500 line-clamp-1 max-w-[150px]">{order.address}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-8 py-6">
                        <div className="space-y-1">
                          {order.items.map((item, idx) => (
                            <p key={idx} className="text-xs font-bold text-navy-900">
                              {item.quantity}x {item.name}
                            </p>
                          ))}
                          {order.specialInstructions && (
                            <div className="mt-2 bg-accent-50 p-2 rounded-lg border border-accent-100">
                              <span className="text-[8px] font-black text-accent-600 uppercase tracking-widest block mb-1">Special Request:</span>
                              <span className="text-[10px] text-navy-900 font-bold">{order.specialInstructions}</span>
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-8 py-6">
                        {order.deliveryPartnerId ? (
                          <div className="space-y-0.5">
                            <p className="text-[10px] font-black text-green-600 uppercase tracking-widest">
                              {order.status === 'delivered' ? 'Delivered By' : 'Assigned To'}
                            </p>
                            <p className="text-sm font-black text-navy-900">{order.deliveryPartnerName}</p>
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{order.deliveryPartnerMobile}</p>
                          </div>
                        ) : (
                          <span className="text-[10px] font-black text-gray-300 uppercase tracking-widest">Not Assigned</span>
                        )}
                      </td>
                      <td className="px-8 py-6">
                        <span className={`text-[10px] font-black px-3 py-1 rounded-lg uppercase tracking-widest border ${
                          order.status === 'delivered' ? 'bg-green-50 text-green-600 border-green-100' : 
                          order.status === 'cancelled' ? 'bg-red-50 text-red-600 border-red-100' :
                          'bg-accent-50 text-accent-600 border-accent-100'
                        }`}>
                          {order.status.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="px-8 py-6">
                        <div className="space-y-2">
                          <div className="flex flex-col">
                            <span className="text-[8px] font-black text-gray-400 uppercase tracking-widest mb-1">{order.paymentMethod}</span>
                            <span className={`text-[10px] font-black px-2 py-0.5 rounded-md uppercase tracking-widest border w-fit ${
                              order.paymentStatus === 'paid' 
                                ? 'bg-green-50 text-green-600 border-green-100' 
                                : 'bg-orange-50 text-orange-600 border-orange-100'
                            }`}>
                              {order.paymentStatus}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="px-8 py-6">
                        {order.status !== 'delivered' && order.status !== 'cancelled' ? (
                          <div className="flex items-center space-x-2">
                            <input
                              type="number"
                              min="1"
                              defaultValue={order.etaMins || 15}
                              onBlur={async (e) => {
                                const val = parseInt(e.target.value);
                                if (!isNaN(val)) {
                                  updateDoc(doc(db, 'orders', order.id), { 
                                    etaMins: val,
                                    etaUpdatedAt: serverTimestamp()
                                  }).catch(err => console.error(err));
                                }
                              }}
                              className="w-16 bg-navy-50 border border-navy-100 rounded-lg px-2 py-1 text-xs font-bold text-navy-900 focus:outline-none focus:border-navy-500"
                            />
                            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">mins</span>
                          </div>
                        ) : (
                          <span className="text-xs font-bold text-gray-400">{order.etaMins || 15} mins</span>
                        )}
                      </td>
                      <td className="px-8 py-6">
                        <div className="flex flex-col space-y-2">
                          {order.status !== 'cancelled' && order.status !== 'delivered' && (
                            <button
                              onClick={() => setCancelModal({ isOpen: true, orderId: order.id, reason: '' })}
                              className="text-[10px] text-red-500 hover:text-red-700 font-black uppercase tracking-widest transition-colors text-left"
                            >
                              Cancel Order
                            </button>
                          )}
                          {(order.status === 'cancelled' || order.status === 'delivered') && (
                            <button
                              onClick={async () => {
                                if (window.confirm('Are you sure you want to permanently delete this order?')) {
                                  try {
                                    await deleteDoc(doc(db, 'orders', order.id));
                                  } catch (error) {
                                    console.error('Error deleting order:', error);
                                    alert('Failed to delete order.');
                                  }
                                }
                              }}
                              className="text-[10px] text-red-500 hover:text-red-700 font-black uppercase tracking-widest transition-colors text-left"
                            >
                              Delete Order
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                  {orders.filter(o => {
                    if (orderFilter === 'active') return o.status !== 'delivered' && o.status !== 'cancelled';
                    if (orderFilter === 'past') return o.status === 'delivered' || o.status === 'cancelled';
                    return true;
                  }).length === 0 && (
                    <tr>
                      <td colSpan={4} className="px-8 py-10 text-center text-gray-400 font-bold uppercase tracking-widest text-xs">
                        No orders found
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
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
                onClick={() => setCancelModal({ isOpen: false, orderId: '', reason: '' })}
                className="w-10 h-10 bg-navy-50 rounded-full flex items-center justify-center text-navy-400 hover:bg-navy-100 hover:text-navy-900 transition-colors"
              >
                <X size={20} strokeWidth={3} />
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
                  onClick={() => setCancelModal({ isOpen: false, orderId: '', reason: '' })}
                  className="flex-1 px-6 py-4 border-2 border-navy-100 rounded-2xl text-xs font-black uppercase tracking-widest text-navy-400 hover:bg-navy-50 transition-all"
                >
                  Back
                </button>
                <button
                  onClick={async () => {
                    const order = orders.find(o => o.id === cancelModal.orderId);
                    if (!order) return;
                    if (!cancelModal.reason.trim()) {
                      alert("Please provide a reason for cancellation.");
                      return;
                    }
                    try {
                      await updateOrderStatus(order, 'cancelled', {
                        cancellationReason: cancelModal.reason || 'Vendor cancelled (Out of stock)',
                        cancelledBy: 'vendor'
                      });
                      setCancelModal({ isOpen: false, orderId: '', reason: '' });
                    } catch (error) {
                      console.error("Error cancelling order:", error);
                    }
                  }}
                  className="flex-1 px-6 py-4 bg-red-500 text-white rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-red-600 transition-all shadow-xl shadow-red-100"
                >
                  Confirm Cancel
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default VendorDashboard;
