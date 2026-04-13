import React, { useEffect, useState } from 'react';
import { collection, doc, onSnapshot, query, updateDoc, addDoc, deleteDoc, setDoc, getDoc, getDocs, where, serverTimestamp } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { Shop, MenuItem, Order, UserProfile, GroceryItem, GroceryCategory, MenuCategory, Coupon, AppBanner, SystemSettings } from '../types';
import { motion } from 'motion/react';
import { Plus, Trash2, Edit, Store, Package, Users, Settings, CheckCircle2, Search, ShoppingBasket, Tag, Upload, X, Clock, CloudRain, Truck, MapPin } from 'lucide-react';
import { formatPrice, resizeImage } from '../lib/utils';
import { useAuth } from '../context/AuthContext';
import { sendNotification } from '../components/NotificationCenter';
import { updateOrderStatus, verifyPayment } from '../services/orderService';

import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, AreaChart, Area, PieChart, Pie, Cell
} from 'recharts';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
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

const AdminDashboard = () => {
  const { isSuperAdmin, profile, loading } = useAuth();
  console.log('AdminDashboard - isSuperAdmin:', isSuperAdmin, 'Profile:', profile);
  const [shops, setShops] = useState<Shop[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [deliveryPartners, setDeliveryPartners] = useState<UserProfile[]>([]);
  const [vendors, setVendors] = useState<UserProfile[]>([]);
  const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
  const [userSearch, setUserSearch] = useState('');
  const [activeTab, setActiveTab] = useState<'shops' | 'orders' | 'partners' | 'users' | 'groceries' | 'settings' | 'analytics' | 'coupons' | 'banners' | 'tracking'>('orders');
  const [locations, setLocations] = useState<Record<string, { lat: number, lng: number, updatedAt: any }>>({});
  const [orderFilter, setOrderFilter] = useState<'all' | 'active' | 'cancelled'>('all');
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [banners, setBanners] = useState<AppBanner[]>([]);
  const [newCoupon, setNewCoupon] = useState<Partial<Coupon>>({
    code: '',
    discountType: 'percentage',
    discountValue: 0,
    minOrderAmount: 0,
    expiryDate: '',
    active: true,
    usageLimit: 0
  });
  const [newBanner, setNewBanner] = useState<Partial<AppBanner>>({
    image: '',
    title: '',
    link: '',
    active: true,
    city: ''
  });
  const [newNotification, setNewNotification] = useState({
    title: '',
    message: '',
    city: ''
  });
  const [settings, setSettings] = useState<SystemSettings>({ 
    upiId: '', 
    upiQR: '', 
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
    supportPhone: ''
  });
  const [supportSettings, setSupportSettings] = useState({
    email: 'rebelcravesceo@gmail.com',
    phone: '+91 7814281658',
    address: 'RebelCraves HQ'
  });
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [proofImage, setProofImage] = useState<string | null>(null);
  
  const analytics = React.useMemo(() => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const thisWeek = today - (7 * 24 * 60 * 60 * 1000);
    const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime();

    const stats = {
      daily: { total: 0, vendor: 0, delivery: 0, admin: 0, count: 0 },
      weekly: { total: 0, vendor: 0, delivery: 0, admin: 0, count: 0 },
      monthly: { total: 0, vendor: 0, delivery: 0, admin: 0, count: 0 },
      allTime: { total: 0, vendor: 0, delivery: 0, admin: 0, count: 0 },
      chartData: [] as any[],
      revenueSplit: [
        { name: 'Vendor', value: 0, color: '#1e293b' },
        { name: 'Delivery', value: 0, color: '#3b82f6' },
        { name: 'Admin', value: 0, color: '#f59e0b' }
      ],
      vendorBreakdown: {} as Record<string, number>,
      deliveryBreakdown: {} as Record<string, number>
    };

    const dailyMap = new Map();
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - i);
      return d.toISOString().split('T')[0];
    }).reverse();

    last7Days.forEach(date => dailyMap.set(date, { date, total: 0, count: 0 }));

    orders.filter(o => o.status === 'delivered').forEach(order => {
      const orderDate = order.createdAt?.toDate?.();
      const orderTime = orderDate?.getTime() || 0;
      const dateStr = orderDate?.toISOString().split('T')[0];
      
      const total = order.totalPrice || 0;
      const vendor = order.vendorRevenue || 0;
      const delivery = order.deliveryRevenue || 0;
      const admin = order.adminRevenue || 0;

      if (dailyMap.has(dateStr)) {
        const current = dailyMap.get(dateStr);
        current.total += total;
        current.count++;
      }

      if (orderTime >= today) {
        stats.daily.total += total;
        stats.daily.vendor += vendor;
        stats.daily.delivery += delivery;
        stats.daily.admin += admin;
        stats.daily.count++;
      }
      if (orderTime >= thisWeek) {
        stats.weekly.total += total;
        stats.weekly.vendor += vendor;
        stats.weekly.delivery += delivery;
        stats.weekly.admin += admin;
        stats.weekly.count++;
      }
      if (orderTime >= thisMonth) {
        stats.monthly.total += total;
        stats.monthly.vendor += vendor;
        stats.monthly.delivery += delivery;
        stats.monthly.admin += admin;
        stats.monthly.count++;
      }
      stats.allTime.total += total;
      stats.allTime.vendor += vendor;
      stats.allTime.delivery += delivery;
      stats.allTime.admin += admin;
      stats.allTime.count++;

      stats.revenueSplit[0].value += vendor;
      stats.revenueSplit[1].value += delivery;
      stats.revenueSplit[2].value += admin;

      const shopName = order.shopName || 'Unknown Vendor';
      const deliveryPartnerName = order.deliveryPartnerName || 'Unknown Partner';

      stats.vendorBreakdown[shopName] = (stats.vendorBreakdown[shopName] || 0) + vendor;
      if (delivery > 0) {
        stats.deliveryBreakdown[deliveryPartnerName] = (stats.deliveryBreakdown[deliveryPartnerName] || 0) + delivery;
      }
    });

    stats.chartData = Array.from(dailyMap.values());
    return stats;
  }, [orders]);

  const [showAddShop, setShowAddShop] = useState(false);
  const [showEditShop, setShowEditShop] = useState(false);
  const [editingShop, setEditingShop] = useState<Shop | null>(null);
  const [selectedShopId, setSelectedShopId] = useState<string | null>(null);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [menuCategories, setMenuCategories] = useState<MenuCategory[]>([]);
  const [showAddMenuItem, setShowAddMenuItem] = useState(false);
  const [groceryItems, setGroceryItems] = useState<GroceryItem[]>([]);
  const [groceryCategories, setGroceryCategories] = useState<GroceryCategory[]>([]);
  const [showAddGroceryItem, setShowAddGroceryItem] = useState(false);
  const [showAddGroceryCategory, setShowAddGroceryCategory] = useState(false);
  const [editingUser, setEditingUser] = useState<UserProfile | null>(null);
  const [newGroceryItem, setNewGroceryItem] = useState({
    name: '',
    price: '',
    category: '',
    image: '',
    stock: '',
    description: ''
  });
  const [newGroceryCategory, setNewGroceryCategory] = useState({
    name: '',
    image: ''
  });
  const [newShop, setNewShop] = useState({
    name: '',
    description: '',
    address: '',
    deliveryTime: '',
    image: '',
    ownerId: '',
    city: '',
    minOrderAmount: ''
  });

  useEffect(() => {
    if (profile?.city && !newShop.city) {
      setNewShop(prev => ({ ...prev, city: profile.city }));
    } else if (!newShop.city) {
      setNewShop(prev => ({ ...prev, city: '' }));
    }
  }, [profile, newShop.city]);
  const [newMenuItem, setNewMenuItem] = useState({
    name: '',
    price: '',
    category: '',
    categoryId: '',
    image: ''
  });
  const [cancelModal, setCancelModal] = useState<{ isOpen: boolean; orderId: string; reason: string }>({
    isOpen: false,
    orderId: '',
    reason: ''
  });

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

      return () => {
        unsubMenu();
        unsubCategories();
      };
    }
  }, [selectedShopId]);

  useEffect(() => {
    const shopsPath = 'shops';
    const shopsQuery = !isSuperAdmin && profile?.city 
      ? query(collection(db, shopsPath), where('city', '==', profile.city))
      : collection(db, shopsPath);
      
    const unsubShops = onSnapshot(shopsQuery, (snap) => {
      let shopsData = snap.docs.map(d => ({ id: d.id, ...d.data() } as Shop));
      setShops(shopsData);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, shopsPath);
    });

    const ordersPath = 'orders';
    const ordersQuery = !isSuperAdmin && profile?.city
      ? query(collection(db, ordersPath), where('city', '==', profile.city))
      : collection(db, ordersPath);

    const unsubOrders = onSnapshot(ordersQuery, (snap) => {
      let ordersData = snap.docs.map(d => ({ id: d.id, ...d.data() } as Order));
      setOrders(ordersData);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, ordersPath);
    });

    const usersPath = 'users';
    const usersQuery = !isSuperAdmin && profile?.city
      ? query(collection(db, usersPath), where('city', '==', profile.city))
      : collection(db, usersPath);

    const unsubUsers = onSnapshot(usersQuery, (snap) => {
      let users = snap.docs.map(d => ({ uid: d.id, ...d.data() } as UserProfile));
      setAllUsers(users);
      setDeliveryPartners(users.filter(u => u.role === 'delivery'));
      setVendors(users.filter(u => u.role === 'vendor'));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, usersPath);
    });

    const groceriesPath = 'groceries';
    const unsubGroceries = onSnapshot(collection(db, groceriesPath), (snap) => {
      setGroceryItems(snap.docs.map(d => ({ id: d.id, ...d.data() } as GroceryItem)));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, groceriesPath);
    });

    const groceryCategoriesPath = 'groceryCategories';
    const unsubGroceryCategories = onSnapshot(collection(db, groceryCategoriesPath), (snap) => {
      setGroceryCategories(snap.docs.map(d => ({ id: d.id, ...d.data() } as GroceryCategory)));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, groceryCategoriesPath);
    });

    const unsubSettings = onSnapshot(doc(db, 'settings', 'payment'), (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        setSettings({ 
          upiId: data.upiId ?? '', 
          upiQR: data.upiQR ?? '', 
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
          banners: data.banners ?? [],
          supportEmail: data.supportEmail ?? '',
          supportPhone: data.supportPhone ?? ''
        });
      }
    });

    const unsubCoupons = onSnapshot(collection(db, 'coupons'), (snap) => {
      setCoupons(snap.docs.map(d => ({ id: d.id, ...d.data() } as Coupon)));
    });

    const unsubBanners = onSnapshot(collection(db, 'banners'), (snap) => {
      setBanners(snap.docs.map(d => ({ id: d.id, ...d.data() } as AppBanner)));
    });

    const unsubSupportSettings = onSnapshot(doc(db, 'settings', 'support'), (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        setSupportSettings({
          email: data.email || 'rebelcravesceo@gmail.com',
          phone: data.phone || '+91 7814281658',
          address: data.address || 'RebelCraves HQ'
        });
      }
    });

    const unsubLocations = onSnapshot(collection(db, 'locations'), (snap) => {
      const locData: Record<string, any> = {};
      snap.docs.forEach(d => {
        locData[d.id] = d.data();
      });
      setLocations(locData);
    });

    return () => {
      unsubShops();
      unsubOrders();
      unsubUsers();
      unsubGroceries();
      unsubGroceryCategories();
      unsubSettings();
      unsubCoupons();
      unsubBanners();
      unsubSupportSettings();
      unsubLocations();
    };
  }, []);

  const handleAddGroceryCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    const path = 'groceryCategories';
    await addDoc(collection(db, path), newGroceryCategory).catch(error => {
      handleFirestoreError(error, OperationType.CREATE, path);
      throw error;
    });
    setNewGroceryCategory({ name: '', image: '' });
    setShowAddGroceryCategory(false);
  };

  const handleDeleteGroceryCategory = async (id: string) => {
    const path = `groceryCategories/${id}`;
    try {
      await deleteDoc(doc(db, 'groceryCategories', id));
      setIsDeletingGroceryCategory(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, path);
    }
  };

  const toggleGroceryStock = async (itemId: string, currentStock: boolean | undefined) => {
    const path = `groceries/${itemId}`;
    try {
      await updateDoc(doc(db, 'groceries', itemId), {
        isOutOfStock: currentStock === undefined ? true : !currentStock
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  };

  const handleAddGroceryItem = async (e: React.FormEvent) => {
    e.preventDefault();
    const path = 'groceries';
    await addDoc(collection(db, path), {
      ...newGroceryItem,
      price: parseFloat(newGroceryItem.price) || 0
    }).catch(error => {
      handleFirestoreError(error, OperationType.CREATE, path);
      throw error;
    });
    setNewGroceryItem({ name: '', price: '', category: '', image: '', stock: '', description: '' });
    setShowAddGroceryItem(false);
  };

  const handleDeleteGroceryItem = async (id: string) => {
    const path = `groceries/${id}`;
    try {
      await deleteDoc(doc(db, 'groceries', id));
      setIsDeletingGroceryItem(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, path);
    }
  };

  const promoteToDelivery = async (userId: string) => {
    const path = `users/${userId}`;
    await updateDoc(doc(db, 'users', userId), {
      role: 'delivery'
    }).catch(error => {
      handleFirestoreError(error, OperationType.UPDATE, path);
      throw error;
    });
  };

  const assignPartner = async (orderId: string, partnerId: string) => {
    const order = orders.find(o => o.id === orderId);
    if (!order) return;
    const partner = deliveryPartners.find(p => p.uid === partnerId);
    
    try {
      await updateOrderStatus(order, 'assigned', {
        deliveryPartnerId: partnerId,
        deliveryPartnerMobile: partner?.mobileNumber || '',
        deliveryPartnerName: partner?.fullName || ''
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `orders/${orderId}`);
    }
  };

  const updatePaymentStatus = async (orderId: string, status: 'pending' | 'paid') => {
    const path = `orders/${orderId}`;
    await updateDoc(doc(db, 'orders', orderId), {
      paymentStatus: status,
      paymentCollectedBy: 'admin'
    }).catch(error => {
      handleFirestoreError(error, OperationType.UPDATE, path);
      throw error;
    });
  };

  const handleAddShop = async (e: React.FormEvent) => {
    e.preventDefault();
    const shopsPath = 'shops';
    try {
      const shopData: any = { 
        ...newShop,
        minOrderAmount: parseFloat(newShop.minOrderAmount) || 0
      };
      if (!shopData.ownerId) delete shopData.ownerId;
      if (!shopData.city) shopData.city = profile?.city || '';
      await addDoc(collection(db, shopsPath), shopData);
      setNewShop({ name: '', description: '', address: '', deliveryTime: '', image: '', ownerId: '', city: profile?.city || '', minOrderAmount: '' });
      setShowAddShop(false);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, shopsPath);
    }
  };

  const handleUpdateShop = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingShop) return;
    const shopsPath = `shops/${editingShop.id}`;
    try {
      const shopData = { ...editingShop };
      delete (shopData as any).id;
      if (!shopData.ownerId) delete shopData.ownerId;
      await updateDoc(doc(db, 'shops', editingShop.id), shopData);
      setShowEditShop(false);
      setEditingShop(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, shopsPath);
    }
  };

  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [isDeletingMenuItem, setIsDeletingMenuItem] = useState<string | null>(null);
  const [isDeletingGroceryCategory, setIsDeletingGroceryCategory] = useState<string | null>(null);
  const [isDeletingGroceryItem, setIsDeletingGroceryItem] = useState<string | null>(null);
  const [isDeletingCoupon, setIsDeletingCoupon] = useState<string | null>(null);
  const [isDeletingBanner, setIsDeletingBanner] = useState<string | null>(null);
  const [isDeletingOrder, setIsDeletingOrder] = useState<string | null>(null);
  const [isUpdatingRole, setIsUpdatingRole] = useState<string | null>(null);
  const [isBlockingUser, setIsBlockingUser] = useState<string | null>(null);
  const [isUpdatingActive, setIsUpdatingActive] = useState<string | null>(null);
  const [isDeletingUser, setIsDeletingUser] = useState<string | null>(null);

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = error => reject(error);
    });
  };

  const handleImageUpload = async (file: File, type: 'shop' | 'editShop' | 'menu' | 'groceryItem' | 'groceryCategory') => {
    try {
      const base64 = await fileToBase64(file);
      const resized = await resizeImage(base64);
      if (type === 'shop') {
        setNewShop({ ...newShop, image: resized });
      } else if (type === 'editShop') {
        if (editingShop) setEditingShop({ ...editingShop, image: resized });
      } else if (type === 'menu') {
        setNewMenuItem({ ...newMenuItem, image: resized });
      } else if (type === 'groceryItem') {
        setNewGroceryItem({ ...newGroceryItem, image: resized });
      } else if (type === 'groceryCategory') {
        setNewGroceryCategory({ ...newGroceryCategory, image: resized });
      }
    } catch (error) {
      console.error('Error uploading image:', error);
    }
  };

  const deleteShop = async (shopId: string) => {
    const path = `shops/${shopId}`;
    try {
      await deleteDoc(doc(db, 'shops', shopId));
      setIsDeleting(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, path);
    }
  };

  const addSampleShop = async () => {
    const shopsPath = 'shops';
    const sampleShops = [
      {
        name: "City Canteen",
        image: "https://images.unsplash.com/photo-1567620905732-2d1ec7bb7445?auto=format&fit=crop&q=80&w=1000",
        description: "Fast food, snacks and beverages",
        deliveryTime: "10 mins",
        address: "Main City Center",
        city: profile?.city || "General",
        status: "live",
        minOrderAmount: 100
      },
      {
        name: "Healthy Bites",
        image: "https://images.unsplash.com/photo-1490645935967-10de6ba17061?auto=format&fit=crop&q=80&w=1000",
        description: "Salads, wraps and healthy smoothies",
        deliveryTime: "15 mins",
        address: "North City Plaza",
        city: profile?.city || "General",
        status: "live",
        minOrderAmount: 150
      }
    ];

    for (const shopData of sampleShops) {
      const shopRef = await addDoc(collection(db, shopsPath), shopData).catch(error => {
        handleFirestoreError(error, OperationType.CREATE, shopsPath);
        throw error;
      });
      
      // Add sample menu categories
      const categories = [
        { name: "Popular", shopId: shopRef.id },
        { name: "Beverages", shopId: shopRef.id }
      ];
      
      const catIds: Record<string, string> = {};
      for (const cat of categories) {
        const catRef = await addDoc(collection(db, 'shops', shopRef.id, 'menuCategories'), cat);
        catIds[cat.name] = catRef.id;
      }

      // Add sample menu
      const menu = [
        { name: "Classic Burger", price: 89, category: "Popular", categoryId: catIds["Popular"], image: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&q=80&w=500", shopId: shopRef.id, status: "active", createdAt: serverTimestamp() },
        { name: "Cheese Pizza", price: 199, category: "Popular", categoryId: catIds["Popular"], image: "https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&q=80&w=500", shopId: shopRef.id, status: "active", createdAt: serverTimestamp() },
        { name: "Cold Coffee", price: 60, category: "Beverages", categoryId: catIds["Beverages"], image: "https://images.unsplash.com/photo-1517701604599-bb29b565090c?auto=format&fit=crop&q=80&w=500", shopId: shopRef.id, status: "active", createdAt: serverTimestamp() }
      ];

      const menuPath = `shops/${shopRef.id}/menu`;
      for (const item of menu) {
        await addDoc(collection(db, 'shops', shopRef.id, 'menu'), item).catch(error => {
          handleFirestoreError(error, OperationType.CREATE, menuPath);
          throw error;
        });
      }
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
        price: Number(newMenuItem.price) || 0,
        status: 'active',
        createdAt: serverTimestamp()
      });
      setNewMenuItem({ name: '', price: '', category: '', categoryId: '', image: '' });
      setShowAddMenuItem(false);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, menuPath);
    }
  };

  const deleteMenuItem = async (itemId: string) => {
    if (!selectedShopId) return;
    const path = `shops/${selectedShopId}/menu/${itemId}`;
    try {
      await deleteDoc(doc(db, 'shops', selectedShopId, 'menu', itemId));
      setIsDeletingMenuItem(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, path);
    }
  };

  const toggleUserActive = async (userId: string, currentActive: boolean | undefined, role: string) => {
    const path = `users/${userId}`;
    const newStatus = !(currentActive ?? false);
    setIsUpdatingActive(userId);
    try {
      await updateDoc(doc(db, 'users', userId), { isActive: newStatus });
      
      // If vendor, sync shops
      if (role === 'vendor') {
        const shopStatus = newStatus ? 'live' : 'closed';
        const shopsQuery = query(collection(db, 'shops'), where('ownerId', '==', userId));
        const shopsSnap = await getDocs(shopsQuery);
        const updatePromises = shopsSnap.docs.map(shopDoc => 
          updateDoc(doc(db, 'shops', shopDoc.id), { status: shopStatus })
        );
        await Promise.all(updatePromises);
      }
      setIsUpdatingActive(null);
    } catch (error) {
      console.error('Error toggling active status:', error);
      setIsUpdatingActive(null);
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  };

  const toggleBlockUser = async (userId: string, currentBlocked: boolean) => {
    const path = `users/${userId}`;
    try {
      await updateDoc(doc(db, 'users', userId), { isBlocked: !currentBlocked });
      setIsBlockingUser(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  };

  const deleteUser = async (userId: string) => {
    const path = `users/${userId}`;
    try {
      await deleteDoc(doc(db, 'users', userId));
      setIsDeletingUser(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, path);
    }
  };

  const updateUserRole = async (userId: string, newRole: 'customer' | 'delivery' | 'admin' | 'vendor', city?: string) => {
    const path = `users/${userId}`;
    console.log(`Updating user ${userId} role to ${newRole}`);
    setIsUpdatingRole(userId);
    try {
      const updateData: any = { role: newRole };
      if (city) updateData.city = city;
      await updateDoc(doc(db, 'users', userId), updateData);
      console.log('Role updated successfully');
      setIsUpdatingRole(null);
    } catch (error) {
      console.error('Error updating role:', error);
      setIsUpdatingRole(null);
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  };

  const handleAddCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    const path = 'coupons';
    try {
      await addDoc(collection(db, path), {
        ...newCoupon,
        usageCount: 0,
        createdAt: serverTimestamp()
      });
      setNewCoupon({
        code: '',
        discountType: 'percentage',
        discountValue: 0,
        minOrderAmount: 0,
        expiryDate: '',
        active: true,
        usageLimit: 0
      });
      alert('Coupon added successfully!');
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, path);
    }
  };

  const handleAddBanner = async (e: React.FormEvent) => {
    e.preventDefault();
    const path = 'banners';
    try {
      await addDoc(collection(db, path), {
        ...newBanner,
        createdAt: serverTimestamp()
      });
      setNewBanner({
        image: '',
        title: '',
        link: '',
        active: true,
        city: ''
      });
      alert('Banner added successfully!');
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, path);
    }
  };

  const deleteCoupon = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'coupons', id));
      setIsDeletingCoupon(null);
    } catch (error) {
      console.error('Error deleting coupon:', error);
    }
  };

  const deleteBanner = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'banners', id));
      setIsDeletingBanner(null);
    } catch (error) {
      console.error('Error deleting banner:', error);
    }
  };

  const handleBroadcastNotification = async (e: React.FormEvent) => {
    e.preventDefault();
    const path = 'notifications';
    try {
      await addDoc(collection(db, path), {
        ...newNotification,
        type: 'broadcast',
        read: false,
        createdAt: serverTimestamp()
      });
      setNewNotification({ title: '', message: '', city: '' });
      alert('Notification broadcasted successfully!');
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, path);
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingSettings(true);
    try {
      await setDoc(doc(db, 'settings', 'payment'), settings);
      await setDoc(doc(db, 'settings', 'support'), supportSettings);
      alert('Settings saved successfully!');
    } catch (error) {
      console.error('Error saving settings:', error);
      alert('Failed to save settings.');
    } finally {
      setIsSavingSettings(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-12 h-12 border-4 border-navy-900 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-10 pb-20">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 px-2">
        <div className="space-y-1">
          <h1 className="text-4xl font-black text-navy-900 tracking-tight uppercase">Admin Hub</h1>
          <p className="text-gray-400 font-bold uppercase tracking-widest text-xs">System Control & Analytics</p>
        </div>
        
        <div className="flex items-center gap-3 overflow-x-auto no-scrollbar pb-2 sm:pb-0">
          <div className="flex bg-navy-50 p-1.5 rounded-2xl border border-navy-100 shadow-inner">
            {(['analytics', 'orders', 'shops', 'partners', 'tracking', 'users', 'groceries', 'coupons', 'banners', 'settings'] as const).map(tab => {
              if (tab === 'settings' && !isSuperAdmin && profile?.role !== 'admin') return null;
              return (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${
                    activeTab === tab 
                      ? 'bg-navy-900 text-white shadow-lg shadow-navy-200' 
                      : 'text-navy-300 hover:text-navy-900'
                  }`}
                >
                  {tab}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {activeTab === 'orders' && (
        <div className="space-y-6">
          <div className="flex space-x-4 px-2">
            <button
              onClick={() => setOrderFilter('all')}
              className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${orderFilter === 'all' ? 'bg-navy-900 text-white' : 'bg-navy-50 text-navy-400 hover:bg-navy-100'}`}
            >
              All Orders
            </button>
            <button
              onClick={() => setOrderFilter('active')}
              className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${orderFilter === 'active' ? 'bg-navy-900 text-white' : 'bg-navy-50 text-navy-400 hover:bg-navy-100'}`}
            >
              Active Orders
            </button>
            <button
              onClick={() => setOrderFilter('cancelled')}
              className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${orderFilter === 'cancelled' ? 'bg-navy-900 text-white' : 'bg-navy-50 text-navy-400 hover:bg-navy-100'}`}
            >
              Cancelled Orders
            </button>
          </div>
          <div className="bg-white rounded-[3rem] border border-gray-100 shadow-2xl shadow-navy-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead className="bg-navy-50/50 border-b border-gray-50">
                  <tr>
                    <th className="px-8 py-6 text-[10px] font-black text-navy-400 uppercase tracking-widest">Order ID</th>
                    <th className="px-8 py-6 text-[10px] font-black text-navy-400 uppercase tracking-widest">Total</th>
                    <th className="px-8 py-6 text-[10px] font-black text-navy-400 uppercase tracking-widest">Status</th>
                    <th className="px-8 py-6 text-[10px] font-black text-navy-400 uppercase tracking-widest">ETA (Mins)</th>
                    <th className="px-8 py-6 text-[10px] font-black text-navy-400 uppercase tracking-widest">Payment</th>
                    <th className="px-8 py-6 text-[10px] font-black text-navy-400 uppercase tracking-widest">Assignment</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {orders.filter(order => {
                    if (orderFilter === 'active') return order.status !== 'cancelled' && order.status !== 'delivered';
                    if (orderFilter === 'cancelled') return order.status === 'cancelled';
                    return true;
                  }).map(order => (
                  <tr key={order.id} className="hover:bg-navy-50/30 transition-colors group">
                    <td className="px-8 py-6">
                      <div className="flex items-center space-x-4">
                        <div className="w-10 h-10 bg-navy-900 text-white rounded-full flex items-center justify-center text-sm font-black shrink-0">
                          {order.customerName ? order.customerName[0].toUpperCase() : 'U'}
                        </div>
                        <div className="flex flex-col space-y-1">
                          <div className="flex items-center space-x-2">
                            <span className="text-sm font-black text-navy-900 tracking-tighter">#{order.id.slice(0, 8)}</span>
                            {(order as any).hasGroceries && (
                              <span className="text-[8px] font-black bg-accent-500 text-white px-1.5 py-0.5 rounded uppercase tracking-widest">Grocery</span>
                            )}
                          </div>
                          <div className="flex flex-col">
                            <span className="text-[10px] text-navy-900 font-black uppercase tracking-widest">{order.customerName || 'Unknown User'}</span>
                            <span className="text-[9px] text-gray-400 font-bold tracking-widest">{order.customerMobile || 'No Mobile'}</span>
                          </div>
                          <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">{order.paymentMethod}</span>
                          {order.specialInstructions && (
                            <div className="mt-2 bg-accent-50 p-2 rounded-lg border border-accent-100">
                              <span className="text-[8px] font-black text-accent-600 uppercase tracking-widest block mb-1">Special Request:</span>
                              <span className="text-[10px] text-navy-900 font-bold">{order.specialInstructions}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-6 text-sm font-black text-navy-900">{formatPrice(order.totalPrice)}</td>
                    <td className="px-8 py-6">
                      <div className="flex flex-col space-y-2">
                        <span className={`text-[10px] font-black px-3 py-1 rounded-lg uppercase tracking-widest border w-fit ${
                          order.status === 'delivered' ? 'bg-green-50 text-green-600 border-green-100' : 
                          order.status === 'cancelled' ? 'bg-red-50 text-red-600 border-red-100' :
                          'bg-accent-50 text-accent-600 border-accent-100'
                        }`}>
                          {order.status.replace('_', ' ')}
                        </span>
                        {order.status === 'cancelled' && (
                          <div className="text-[8px] font-bold text-red-400 uppercase tracking-widest">
                            <p>By: {order.cancelledBy || 'Unknown'}</p>
                            <p>Reason: {order.cancellationReason || 'No reason'}</p>
                          </div>
                        )}
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
                        <span className={`text-[10px] font-black px-3 py-1 rounded-lg uppercase tracking-widest w-fit border ${
                          order.paymentStatus === 'paid' ? 'bg-green-50 text-green-600 border-green-100' : 'bg-red-50 text-red-600 border-red-100'
                        }`}>
                          {order.paymentStatus}
                        </span>
                        {order.paymentMethod === 'upi' && order.paymentProof && (
                          <button 
                            onClick={() => setProofImage(order.paymentProof!)}
                            className="text-[10px] text-navy-900 font-black hover:underline text-left uppercase tracking-widest"
                          >
                            View Proof
                          </button>
                        )}
                        {order.paymentStatus === 'pending' && (
                          <button 
                            onClick={async () => {
                              if (window.confirm('Verify payment for this order?')) {
                                try {
                                  await verifyPayment(order);
                                  alert('Payment verified!');
                                } catch (error) {
                                  console.error('Error verifying payment:', error);
                                  alert('Failed to verify payment.');
                                }
                              }
                            }}
                            className="text-[10px] text-navy-900 font-black hover:underline text-left uppercase tracking-widest transition-colors"
                          >
                            Verify Payment
                          </button>
                        )}
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <div className="flex flex-col space-y-2">
                        {order.deliveryPartnerId ? (
                          <div className="flex flex-col space-y-1">
                            <div className="flex items-center space-x-2 text-green-600">
                              <CheckCircle2 size={14} strokeWidth={3} />
                              <span className="text-[10px] font-black uppercase tracking-widest">
                                {order.status === 'delivered' ? 'Delivered By' : 'Assigned'}
                              </span>
                            </div>
                            <div className="flex flex-col">
                              <span className="text-[10px] text-navy-900 font-black uppercase tracking-widest">{order.deliveryPartnerName}</span>
                              <span className="text-[9px] text-gray-400 font-bold tracking-widest">{order.deliveryPartnerMobile}</span>
                            </div>
                          </div>
                        ) : order.status !== 'cancelled' && order.status !== 'delivered' ? (
                          <select
                            onChange={(e) => assignPartner(order.id, e.target.value)}
                            className="text-[10px] font-black uppercase tracking-widest bg-navy-50 border-2 border-navy-100 rounded-xl px-3 py-2 focus:outline-none focus:border-navy-900 transition-all text-navy-900"
                            defaultValue=""
                          >
                            <option value="" disabled>Assign Partner</option>
                            {deliveryPartners.map(p => (
                              <option key={p.uid} value={p.uid}>{p.fullName}</option>
                            ))}
                          </select>
                        ) : null}
                        {order.status !== 'cancelled' && order.status !== 'delivered' && (
                          <button
                            onClick={() => setCancelModal({ isOpen: true, orderId: order.id, reason: '' })}
                            className="text-[10px] text-red-500 hover:text-red-700 font-black text-left uppercase tracking-widest transition-colors mt-2"
                          >
                            Cancel Order
                          </button>
                        )}
                        {(order.status === 'cancelled' || order.status === 'delivered') && (
                          <div className="mt-2">
                            {isDeletingOrder === order.id ? (
                              <div className="flex items-center space-x-2 bg-red-50 px-3 py-1 rounded-xl border border-red-100">
                                <span className="text-[8px] font-black text-red-600 uppercase tracking-widest">Delete?</span>
                                <button 
                                  onClick={async () => {
                                    try {
                                      await deleteDoc(doc(db, 'orders', order.id));
                                      setIsDeletingOrder(null);
                                    } catch (error) {
                                      console.error('Error deleting order:', error);
                                    }
                                  }} 
                                  className="text-[8px] font-black text-red-600 uppercase tracking-widest hover:underline"
                                >
                                  Yes
                                </button>
                                <button onClick={() => setIsDeletingOrder(null)} className="text-[8px] font-black text-gray-400 uppercase tracking-widest hover:underline">No</button>
                              </div>
                            ) : (
                              <button
                                onClick={() => setIsDeletingOrder(order.id)}
                                className="text-[10px] text-red-500 hover:text-red-700 font-black text-left uppercase tracking-widest transition-colors"
                              >
                                Delete Order
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        </div>
      )}

      {activeTab === 'shops' && (
        <div className="space-y-8">
          <div className="flex justify-between items-center px-2">
            <button
              onClick={() => setShowAddShop(!showAddShop)}
              className="bg-navy-900 text-white px-8 py-4 rounded-2xl font-black text-sm flex items-center space-x-3 hover:bg-navy-800 transition-all shadow-xl shadow-navy-200 uppercase tracking-tighter active:scale-95"
            >
              <Plus size={20} strokeWidth={3} />
              <span>{showAddShop ? 'Cancel' : 'Add New Shop'}</span>
            </button>
            <button
              onClick={addSampleShop}
              className="text-navy-400 font-black text-[10px] hover:text-navy-900 uppercase tracking-widest transition-colors"
            >
              Add Sample Shop
            </button>
          </div>

          {showAddShop && (
            <motion.form
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              onSubmit={handleAddShop}
              className="bg-white p-10 rounded-[3rem] border border-gray-100 shadow-2xl shadow-navy-100 space-y-8"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Shop Name</label>
                  <input
                    required
                    type="text"
                    value={newShop.name}
                    onChange={(e) => setNewShop({ ...newShop, name: e.target.value })}
                    className="w-full bg-navy-50 border-2 border-transparent rounded-2xl px-5 py-3.5 focus:outline-none focus:border-navy-500 focus:bg-white transition-all font-bold text-navy-900 placeholder:text-gray-300"
                    placeholder="e.g. Rebel Bites"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Delivery Time</label>
                  <input
                    required
                    type="text"
                    value={newShop.deliveryTime}
                    onChange={(e) => setNewShop({ ...newShop, deliveryTime: e.target.value })}
                    className="w-full bg-navy-50 border-2 border-transparent rounded-2xl px-5 py-3.5 focus:outline-none focus:border-navy-500 focus:bg-white transition-all font-bold text-navy-900 placeholder:text-gray-300"
                    placeholder="e.g. 10-15 mins"
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Shop Image</label>
                  <div className="flex items-center space-x-4">
                    <div className="flex-1">
                      <input
                        type="text"
                        value={newShop.image}
                        onChange={(e) => setNewShop({ ...newShop, image: e.target.value })}
                        className="w-full bg-navy-50 border-2 border-transparent rounded-2xl px-5 py-3.5 focus:outline-none focus:border-navy-500 focus:bg-white transition-all font-bold text-navy-900 placeholder:text-gray-300"
                        placeholder="Paste image URL or upload below..."
                      />
                    </div>
                    <label className="cursor-pointer bg-navy-900 text-white p-4 rounded-2xl hover:bg-navy-800 transition-all active:scale-95">
                      <Upload size={20} />
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleImageUpload(file, 'shop');
                        }}
                      />
                    </label>
                  </div>
                  {newShop.image && (
                    <div className="mt-2 w-32 h-20 rounded-xl overflow-hidden border-2 border-navy-100">
                      <img src={newShop.image || undefined} alt="Preview" className="w-full h-full object-cover" />
                    </div>
                  )}
                </div>
                <div className="space-y-2 md:col-span-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Assign Vendor (Optional)</label>
                  <select
                    value={newShop.ownerId}
                    onChange={(e) => setNewShop({ ...newShop, ownerId: e.target.value })}
                    className="w-full bg-navy-50 border-2 border-transparent rounded-2xl px-5 py-3.5 focus:outline-none focus:border-navy-500 focus:bg-white transition-all font-bold text-navy-900"
                  >
                    <option value="">No Vendor Assigned</option>
                    {vendors.map(v => (
                      <option key={v.uid} value={v.uid}>{v.fullName} ({v.email})</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2 md:col-span-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">City</label>
                  <input
                    required
                    disabled={!isSuperAdmin}
                    value={newShop.city}
                    onChange={(e) => setNewShop({ ...newShop, city: e.target.value })}
                    className="w-full bg-navy-50 border-2 border-transparent rounded-2xl px-5 py-3.5 focus:outline-none focus:border-navy-500 focus:bg-white transition-all font-bold text-navy-900 disabled:opacity-70"
                    placeholder="Enter city name..."
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Minimum Order Amount (₹)</label>
                  <input
                    type="number"
                    value={newShop.minOrderAmount}
                    onChange={(e) => setNewShop({ ...newShop, minOrderAmount: e.target.value })}
                    className="w-full bg-navy-50 border-2 border-transparent rounded-2xl px-5 py-3.5 focus:outline-none focus:border-navy-500 focus:bg-white transition-all font-bold text-navy-900"
                    placeholder="e.g. 200"
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Shop Address</label>
                  <textarea
                    required
                    value={newShop.address}
                    onChange={(e) => setNewShop({ ...newShop, address: e.target.value })}
                    className="w-full bg-navy-50 border-2 border-transparent rounded-2xl px-5 py-3.5 focus:outline-none focus:border-navy-500 focus:bg-white transition-all font-bold text-navy-900 placeholder:text-gray-300 h-24 resize-none"
                    placeholder="Physical address for delivery partners..."
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Description</label>
                  <textarea
                    required
                    value={newShop.description}
                    onChange={(e) => setNewShop({ ...newShop, description: e.target.value })}
                    className="w-full bg-navy-50 border-2 border-transparent rounded-2xl px-5 py-3.5 focus:outline-none focus:border-navy-500 focus:bg-white transition-all font-bold text-navy-900 placeholder:text-gray-300 min-h-[120px]"
                    placeholder="Describe the shop's offerings..."
                  />
                </div>
              </div>
              <button
                type="submit"
                className="w-full bg-navy-900 text-white py-5 rounded-2xl font-black text-xl hover:bg-navy-800 transition-all shadow-xl shadow-navy-200 uppercase tracking-tighter"
              >
                Create Shop
              </button>
            </motion.form>
          )}

          {showEditShop && editingShop && (
            <motion.form
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              onSubmit={handleUpdateShop}
              className="bg-white p-10 rounded-[3rem] border border-gray-100 shadow-2xl shadow-navy-100 space-y-8 mb-10"
            >
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-black text-navy-900 tracking-tight uppercase">Edit Shop</h2>
                <button 
                  type="button"
                  onClick={() => {
                    setShowEditShop(false);
                    setEditingShop(null);
                  }}
                  className="text-gray-400 hover:text-navy-900 transition-colors"
                >
                  Cancel
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Shop Name</label>
                  <input
                    required
                    type="text"
                    value={editingShop.name}
                    onChange={(e) => setEditingShop({ ...editingShop, name: e.target.value })}
                    className="w-full bg-navy-50 border-2 border-transparent rounded-2xl px-5 py-3.5 focus:outline-none focus:border-navy-500 focus:bg-white transition-all font-bold text-navy-900 placeholder:text-gray-300"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Delivery Time</label>
                  <input
                    required
                    type="text"
                    value={editingShop.deliveryTime}
                    onChange={(e) => setEditingShop({ ...editingShop, deliveryTime: e.target.value })}
                    className="w-full bg-navy-50 border-2 border-transparent rounded-2xl px-5 py-3.5 focus:outline-none focus:border-navy-500 focus:bg-white transition-all font-bold text-navy-900 placeholder:text-gray-300"
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Shop Image</label>
                  <div className="flex items-center space-x-4">
                    <div className="flex-1">
                      <input
                        type="text"
                        value={editingShop.image}
                        onChange={(e) => setEditingShop({ ...editingShop, image: e.target.value })}
                        className="w-full bg-navy-50 border-2 border-transparent rounded-2xl px-5 py-3.5 focus:outline-none focus:border-navy-500 focus:bg-white transition-all font-bold text-navy-900 placeholder:text-gray-300"
                        placeholder="Paste image URL or upload below..."
                      />
                    </div>
                    <label className="cursor-pointer bg-navy-900 text-white p-4 rounded-2xl hover:bg-navy-800 transition-all active:scale-95">
                      <Upload size={20} />
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleImageUpload(file, 'editShop');
                        }}
                      />
                    </label>
                  </div>
                  {editingShop.image && (
                    <div className="mt-2 w-32 h-20 rounded-xl overflow-hidden border-2 border-navy-100">
                      <img src={editingShop.image || undefined} alt="Preview" className="w-full h-full object-cover" />
                    </div>
                  )}
                </div>
                <div className="space-y-2 md:col-span-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Assign Vendor (Optional)</label>
                  <select
                    value={editingShop.ownerId || ''}
                    onChange={(e) => setEditingShop({ ...editingShop, ownerId: e.target.value })}
                    className="w-full bg-navy-50 border-2 border-transparent rounded-2xl px-5 py-3.5 focus:outline-none focus:border-navy-500 focus:bg-white transition-all font-bold text-navy-900"
                  >
                    <option value="">No Vendor Assigned</option>
                    {vendors.map(v => (
                      <option key={v.uid} value={v.uid}>{v.fullName} ({v.email})</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2 md:col-span-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">City</label>
                  <input
                    required
                    disabled={!isSuperAdmin}
                    value={editingShop.city}
                    onChange={(e) => setEditingShop({ ...editingShop, city: e.target.value })}
                    className="w-full bg-navy-50 border-2 border-transparent rounded-2xl px-5 py-3.5 focus:outline-none focus:border-navy-500 focus:bg-white transition-all font-bold text-navy-900 disabled:opacity-70"
                    placeholder="Enter city name..."
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Description</label>
                  <textarea
                    required
                    value={editingShop.description}
                    onChange={(e) => setEditingShop({ ...editingShop, description: e.target.value })}
                    className="w-full bg-navy-50 border-2 border-transparent rounded-2xl px-5 py-3.5 focus:outline-none focus:border-navy-500 focus:bg-white transition-all font-bold text-navy-900 placeholder:text-gray-300 min-h-[120px]"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Min Order Amount (₹)</label>
                  <input
                    type="number"
                    value={editingShop.minOrderAmount || 0}
                    onChange={(e) => setEditingShop({ ...editingShop, minOrderAmount: parseFloat(e.target.value) || 0 })}
                    className="w-full bg-navy-50 border-2 border-transparent rounded-2xl px-5 py-3.5 focus:outline-none focus:border-navy-500 focus:bg-white transition-all font-bold text-navy-900"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Shop Status</label>
                  <select
                    value={editingShop.status || 'live'}
                    onChange={(e) => setEditingShop({ ...editingShop, status: e.target.value as 'live' | 'closed' })}
                    className="w-full bg-navy-50 border-2 border-transparent rounded-2xl px-5 py-3.5 focus:outline-none focus:border-navy-500 focus:bg-white transition-all font-bold text-navy-900"
                  >
                    <option value="live">Live (Open)</option>
                    <option value="closed">Closed</option>
                  </select>
                </div>
              </div>
              <button
                type="submit"
                className="w-full bg-navy-900 text-white py-5 rounded-2xl font-black text-xl hover:bg-navy-800 transition-all shadow-xl shadow-navy-200 uppercase tracking-tighter"
              >
                Update Shop
              </button>
            </motion.form>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {shops.map(shop => (
              <div key={shop.id} className="bg-white p-6 rounded-[2.5rem] border border-gray-100 shadow-xl shadow-navy-50 flex flex-col space-y-5 group hover:shadow-navy-100 transition-all">
                <div className="flex items-center space-x-5">
                  <div className="w-20 h-20 rounded-2xl overflow-hidden flex-shrink-0 border border-gray-50">
                    <img src={shop.image || undefined} alt={shop.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" referrerPolicy="no-referrer" />
                  </div>
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-center justify-between">
                      <h3 className="font-black text-navy-900 tracking-tight truncate">{shop.name}</h3>
                      <div className="flex items-center space-x-2">
                        <span className={`text-[8px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest border ${
                          shop.status === 'closed' ? 'bg-red-50 text-red-600 border-red-100' : 'bg-green-50 text-green-600 border-green-100'
                        }`}>
                          {shop.status || 'live'}
                        </span>
                        <span className="text-[8px] font-black text-accent-600 bg-accent-50 px-2 py-0.5 rounded-full uppercase tracking-widest">{shop.city}</span>
                      </div>
                    </div>
                    <p className="text-gray-400 text-[10px] font-bold uppercase tracking-widest line-clamp-1">{shop.description}</p>
                    <p className="text-navy-900 font-black text-xs tracking-tighter">{shop.deliveryTime}</p>
                  </div>
                </div>
                <div className="flex items-center justify-between pt-4 border-t border-gray-50">
                  <button
                    onClick={() => setSelectedShopId(selectedShopId === shop.id ? null : shop.id)}
                    className="text-xs font-black text-navy-600 bg-navy-50 px-4 py-2 rounded-xl hover:bg-navy-100 transition-all uppercase tracking-widest"
                  >
                    {selectedShopId === shop.id ? 'Close Menu' : 'Manage Menu'}
                  </button>
                  <div className="flex items-center space-x-2">
                    <button 
                      onClick={() => {
                        setEditingShop(shop);
                        setShowEditShop(true);
                      }}
                      className="p-3 text-gray-300 hover:text-navy-600 transition-colors"
                    >
                      <Edit size={20} />
                    </button>
                    <button 
                      onClick={async () => {
                        const newStatus = shop.status === 'closed' ? 'live' : 'closed';
                        try {
                          await updateDoc(doc(db, 'shops', shop.id), { status: newStatus });
                        } catch (error) {
                          console.error("Error toggling shop status:", error);
                        }
                      }}
                      className={`p-3 transition-colors ${shop.status === 'closed' ? 'text-green-500 hover:text-green-600' : 'text-red-400 hover:text-red-500'}`}
                      title={shop.status === 'closed' ? 'Go Live' : 'Close Shop'}
                    >
                      <Store size={20} />
                    </button>
                      {isDeleting === shop.id ? (
                        <div className="flex items-center space-x-2 bg-red-50 p-1 rounded-xl border border-red-100">
                          <button 
                            onClick={() => deleteShop(shop.id)}
                            className="px-3 py-1.5 bg-red-500 text-white text-[10px] font-black rounded-lg hover:bg-red-600 transition-all uppercase tracking-widest"
                          >
                            Confirm
                          </button>
                          <button 
                            onClick={() => setIsDeleting(null)}
                            className="p-1.5 text-gray-400 hover:text-navy-900 transition-colors"
                          >
                            <X size={16} />
                          </button>
                        </div>
                      ) : (
                        <button 
                          onClick={() => setIsDeleting(shop.id)}
                          className="p-3 text-gray-300 hover:text-red-500 transition-colors"
                        >
                          <Trash2 size={20} />
                        </button>
                      )}
                  </div>
                </div>

                {selectedShopId === shop.id && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="pt-6 space-y-6"
                  >
                    <div className="flex justify-between items-center">
                      <h4 className="text-xs font-black text-navy-400 uppercase tracking-widest">Menu Items</h4>
                      <button
                        onClick={() => setShowAddMenuItem(!showAddMenuItem)}
                        className="text-[10px] font-black text-white bg-navy-900 px-3 py-1.5 rounded-lg hover:bg-navy-800 transition-all uppercase tracking-widest"
                      >
                        {showAddMenuItem ? 'Cancel' : 'Add Item'}
                      </button>
                    </div>

                    {showAddMenuItem && (
                      <form onSubmit={handleAddMenuItem} className="bg-navy-50 p-6 rounded-2xl space-y-4 border border-navy-100">
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-1">
                            <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Item Name</label>
                            <input
                              required
                              type="text"
                              value={newMenuItem.name}
                              onChange={(e) => setNewMenuItem({ ...newMenuItem, name: e.target.value })}
                              className="w-full bg-white border border-gray-100 rounded-xl px-3 py-2 text-xs font-bold text-navy-900"
                              placeholder="e.g. Burger"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Price (₹)</label>
                            <input
                              required
                              type="number"
                              value={newMenuItem.price}
                              onChange={(e) => setNewMenuItem({ ...newMenuItem, price: e.target.value })}
                              className="w-full bg-white border border-gray-100 rounded-xl px-3 py-2 text-xs font-bold text-navy-900"
                              placeholder="89"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Category</label>
                            <select
                              required
                              value={newMenuItem.categoryId}
                              onChange={(e) => {
                                const cat = menuCategories.find(c => c.id === e.target.value);
                                setNewMenuItem({ ...newMenuItem, categoryId: e.target.value, category: cat?.name || '' });
                              }}
                              className="w-full bg-white border border-gray-100 rounded-xl px-3 py-2 text-xs font-bold text-navy-900"
                            >
                              <option value="">Select Category</option>
                              {menuCategories.map(cat => (
                                <option key={cat.id} value={cat.id}>{cat.name}</option>
                              ))}
                            </select>
                          </div>
                          <div className="space-y-1">
                            <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Item Image</label>
                            <div className="flex items-center space-x-2">
                              <input
                                type="text"
                                value={newMenuItem.image}
                                onChange={(e) => setNewMenuItem({ ...newMenuItem, image: e.target.value })}
                                className="flex-1 bg-white border border-gray-100 rounded-xl px-3 py-2 text-xs font-bold text-navy-900"
                                placeholder="URL or upload..."
                              />
                              <label className="cursor-pointer bg-navy-900 text-white p-2 rounded-xl hover:bg-navy-800 transition-all active:scale-95">
                                <Upload size={14} />
                                <input
                                  type="file"
                                  accept="image/*"
                                  className="hidden"
                                  onChange={(e) => {
                                    const file = e.target.files?.[0];
                                    if (file) handleImageUpload(file, 'menu');
                                  }}
                                />
                              </label>
                            </div>
                          </div>
                        </div>
                        <button
                          type="submit"
                          className="w-full bg-navy-900 text-white py-2.5 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-navy-800 transition-all"
                        >
                          Add to Menu
                        </button>
                      </form>
                    )}

                    <div className="space-y-3 max-h-64 overflow-y-auto pr-2 custom-scrollbar">
                      {menuItems.map(item => (
                        <div key={item.id} className="flex items-center justify-between bg-white p-3 rounded-xl border border-gray-50 group/item">
                          <div className="flex items-center space-x-3">
                            <div className="w-10 h-10 rounded-lg overflow-hidden border border-gray-50">
                              <img src={item.image || undefined} alt={item.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                            </div>
                            <div>
                              <p className="text-xs font-black text-navy-900">{item.name}</p>
                              <p className="text-[10px] font-bold text-navy-600 tracking-tighter">₹{item.price}</p>
                            </div>
                          </div>
                          {isDeletingMenuItem === item.id ? (
                            <div className="flex items-center space-x-1">
                              <button 
                                onClick={() => deleteMenuItem(item.id)}
                                className="px-2 py-1 bg-red-500 text-white text-[8px] font-black rounded uppercase tracking-widest"
                              >
                                Confirm
                              </button>
                              <button onClick={() => setIsDeletingMenuItem(null)} className="p-1 text-gray-400"><X size={12} /></button>
                            </div>
                          ) : (
                            <button
                              onClick={() => setIsDeletingMenuItem(item.id)}
                              className="p-2 text-gray-200 hover:text-red-500 transition-colors opacity-0 group-hover/item:opacity-100"
                            >
                              <Trash2 size={14} />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'partners' && (
        <div className="space-y-8">
          {/* User Search & Promotion */}
          <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-2xl shadow-navy-100 space-y-6">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-navy-900 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-navy-200">
                <Users size={24} strokeWidth={3} />
              </div>
              <div>
                <h3 className="text-xl font-black text-navy-900 tracking-tight uppercase">Promote Delivery Partner</h3>
                <p className="text-gray-400 text-[10px] font-bold uppercase tracking-widest">Search by email to assign delivery role</p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input
                  type="text"
                  placeholder="Enter user email..."
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  className="w-full pl-12 pr-4 py-4 bg-navy-50 border-2 border-navy-100 rounded-2xl focus:outline-none focus:border-navy-900 transition-all font-bold text-navy-900"
                />
              </div>
            </div>

            {userSearch && (
              <div className="space-y-3 pt-4">
                {allUsers
                  .filter(u => u.email.toLowerCase().includes(userSearch.toLowerCase()) && u.role !== 'delivery')
                  .slice(0, 3)
                  .map(user => (
                    <div key={user.uid} className="flex items-center justify-between p-4 bg-navy-50 rounded-2xl border border-navy-100">
                      <div className="flex items-center space-x-4">
                        <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-navy-900 font-black border border-navy-100">
                          {user.fullName?.charAt(0) || '?'}
                        </div>
                        <div>
                          <p className="font-black text-navy-900 text-sm uppercase">{user.fullName}</p>
                          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{user.email}</p>
                        </div>
                      </div>
                      <button
                        onClick={() => {
                          promoteToDelivery(user.uid);
                          setUserSearch('');
                        }}
                        className="bg-navy-900 text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-navy-800 transition-all shadow-md shadow-navy-100"
                      >
                        Promote
                      </button>
                    </div>
                  ))}
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {deliveryPartners.map(partner => (
              <div key={partner.uid} className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-2xl shadow-navy-100 space-y-6 group hover:shadow-navy-200 transition-all">
                <div className="flex items-center space-x-5">
                  <div className="w-16 h-16 bg-navy-900 rounded-2xl flex items-center justify-center text-white text-2xl font-black shadow-lg shadow-navy-200 -rotate-6">
                    {partner.fullName?.charAt(0) || '?'}
                  </div>
                  <div className="space-y-1">
                    <h3 className="font-black text-navy-900 tracking-tight uppercase">{partner.fullName}</h3>
                    <p className="text-gray-400 text-[10px] font-bold uppercase tracking-widest">{partner.email}</p>
                  </div>
                </div>
                <div className="pt-6 border-t-2 border-dashed border-gray-50 flex justify-between items-end">
                  <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Status</span>
                  <span className={`text-xs font-black tracking-widest uppercase px-3 py-1 rounded-lg border ${
                    partner.isActive 
                      ? 'text-green-600 bg-green-50 border-green-100' 
                      : 'text-red-600 bg-red-50 border-red-100'
                  }`}>
                    {partner.isActive ? 'Active' : 'Offline'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'tracking' && (
        <div className="space-y-8">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 px-2">
            <div className="space-y-1">
              <h2 className="text-2xl font-black text-navy-900 uppercase tracking-tight">Live Partner Tracking</h2>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Real-time location of all active delivery partners</p>
            </div>
            <div className="flex items-center space-x-4 bg-white px-6 py-3 rounded-2xl border border-gray-100 shadow-sm">
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse" />
                <span className="text-[10px] font-black text-navy-900 uppercase tracking-widest">
                  {Object.keys(locations).length} Partners Online
                </span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-[3rem] border border-gray-100 shadow-2xl shadow-navy-100 overflow-hidden h-[600px] relative">
            <MapContainer center={[20.5937, 78.9629]} zoom={5} className="w-full h-full z-0">
              <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
              {Object.entries(locations).map(([partnerId, loc]) => {
                const partner = deliveryPartners.find(p => p.uid === partnerId);
                if (!partner) return null;
                return (
                  <Marker key={partnerId} position={[loc.lat, loc.lng]}>
                    <Popup>
                      <div className="p-2 space-y-2">
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 bg-navy-900 text-white rounded-lg flex items-center justify-center font-black text-xs">
                            {partner.fullName ? partner.fullName[0] : '?'}
                          </div>
                          <div>
                            <p className="font-black text-navy-900 text-xs uppercase tracking-tight">{partner.fullName}</p>
                            <p className="text-[10px] text-gray-400 font-bold">{partner.mobileNumber}</p>
                          </div>
                        </div>
                        <div className="pt-2 border-t border-gray-100">
                          <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest">Active Orders</p>
                          <p className="text-[10px] font-bold text-navy-900">
                            {orders.filter(o => o.deliveryPartnerId === partnerId && o.status !== 'delivered' && o.status !== 'cancelled').length} Active
                          </p>
                        </div>
                      </div>
                    </Popup>
                  </Marker>
                );
              })}
            </MapContainer>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Object.entries(locations).map(([partnerId, loc]) => {
              const partner = deliveryPartners.find(p => p.uid === partnerId);
              if (!partner) return null;
              const activeOrders = orders.filter(o => o.deliveryPartnerId === partnerId && o.status !== 'delivered' && o.status !== 'cancelled');
              
              return (
                <div key={partnerId} className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-xl shadow-navy-50 flex items-center space-x-4">
                  <div className="w-12 h-12 bg-navy-50 rounded-2xl flex items-center justify-center text-navy-900">
                    <Truck size={24} strokeWidth={3} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-black text-navy-900 uppercase tracking-tight truncate">{partner.fullName}</h4>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                      {activeOrders.length} Active Orders
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-black text-green-600 uppercase tracking-widest">Live</p>
                    <p className="text-[8px] font-bold text-gray-300 uppercase">
                      {new Date(loc.updatedAt?.toMillis?.() || Date.now()).toLocaleTimeString()}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
      {activeTab === 'users' && (
        <div className="bg-white rounded-[3rem] border border-gray-100 shadow-2xl shadow-navy-100 overflow-hidden">
          {/* ... existing users table ... */}
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead className="bg-navy-50/50 border-b border-gray-50">
                <tr>
                  <th className="px-8 py-6 text-[10px] font-black text-navy-400 uppercase tracking-widest">User</th>
                  <th className="px-8 py-6 text-[10px] font-black text-navy-400 uppercase tracking-widest">Contact</th>
                  <th className="px-8 py-6 text-[10px] font-black text-navy-400 uppercase tracking-widest">Current Role</th>
                  <th className="px-8 py-6 text-[10px] font-black text-navy-400 uppercase tracking-widest">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {allUsers.map(user => (
                  <tr key={user.uid} className="hover:bg-navy-50/30 transition-colors">
                    <td className="px-8 py-6 font-black text-navy-900 text-sm uppercase tracking-tight">
                      {user.fullName}
                      {user.isBlocked && (
                        <span className="ml-2 bg-red-100 text-red-600 text-[8px] px-1.5 py-0.5 rounded-full uppercase tracking-widest">Blocked</span>
                      )}
                    </td>
                    <td className="px-8 py-6">
                      <p className="text-xs text-gray-400 font-bold">{user.email}</p>
                      <p className="text-[10px] text-navy-600 font-black tracking-widest">{user.mobileNumber || 'No Mobile'}</p>
                    </td>
                    <td className="px-8 py-6">
                      <span className={`text-[10px] font-black px-3 py-1 rounded-lg uppercase tracking-widest border ${
                        user.role === 'admin' ? 'bg-purple-50 text-purple-600 border-purple-100' : 
                        user.role === 'delivery' ? 'bg-blue-50 text-blue-600 border-blue-100' : 
                        'bg-gray-50 text-gray-400 border-gray-100'
                      }`}>
                        {user.role}
                      </span>
                      {(user.role === 'delivery' || user.role === 'vendor') && (
                        <div className="mt-2">
                          <button
                            onClick={() => toggleUserActive(user.uid, user.isActive, user.role)}
                            disabled={isUpdatingActive === user.uid}
                            className={`text-[8px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest border transition-all active:scale-95 ${
                              isUpdatingActive === user.uid ? 'opacity-50 cursor-wait' : 'cursor-pointer hover:shadow-sm'
                            } ${
                              user.isActive ? 'bg-green-50 text-green-600 border-green-100 hover:bg-green-100' : 'bg-red-50 text-red-600 border-red-100 hover:bg-red-100'
                            }`}
                          >
                            {isUpdatingActive === user.uid ? 'Updating...' : (user.isActive ? 'Active' : 'Offline')}
                          </button>
                        </div>
                      )}
                    </td>
                    <td className="px-8 py-6">
                      <div className="flex flex-col space-y-3">
                        <div className="flex items-center space-x-2">
                          {isUpdatingRole === user.uid ? (
                            <div className="flex items-center space-x-2 bg-navy-50 px-3 py-1.5 rounded-xl border border-navy-100">
                              <span className="text-[8px] font-black text-navy-900 uppercase tracking-widest">Updating...</span>
                              <button onClick={() => setIsUpdatingRole(null)} className="text-[8px] font-black text-gray-400 uppercase tracking-widest hover:text-navy-900">Cancel</button>
                            </div>
                          ) : (
                            <>
                              {user.role !== 'delivery' && (
                                <button 
                                  onClick={() => updateUserRole(user.uid, 'delivery')}
                                  className="text-[9px] font-black text-navy-600 hover:underline uppercase tracking-widest"
                                >
                                  Make Delivery
                                </button>
                              )}
                              {user.role !== 'vendor' && (
                                <button 
                                  onClick={() => updateUserRole(user.uid, 'vendor')}
                                  className="text-[9px] font-black text-accent-600 hover:underline uppercase tracking-widest"
                                >
                                  Make Vendor
                                </button>
                              )}
                              {user.role !== 'customer' && (
                                <button 
                                  onClick={() => updateUserRole(user.uid, 'customer')}
                                  className="text-[9px] font-black text-gray-400 hover:underline uppercase tracking-widest"
                                >
                                  Make Customer
                                </button>
                              )}
                              {isSuperAdmin && user.role !== 'admin' && (
                                <div className="flex items-center space-x-2">
                                  <input
                                    id={`city-input-${user.uid}`}
                                    className="text-[9px] font-black uppercase tracking-widest bg-navy-50 border border-navy-100 rounded-lg px-2 py-1 focus:outline-none focus:border-navy-900 transition-all text-navy-900 w-24"
                                    placeholder="Enter City"
                                  />
                                  <button 
                                    onClick={() => {
                                      const input = document.getElementById(`city-input-${user.uid}`) as HTMLInputElement;
                                      if (input.value.trim()) {
                                        updateUserRole(user.uid, 'admin', input.value.trim());
                                      } else {
                                        input.classList.add('border-red-500');
                                        setTimeout(() => input.classList.remove('border-red-500'), 2000);
                                      }
                                    }}
                                    className="text-[9px] font-black text-purple-600 hover:underline uppercase tracking-widest"
                                  >
                                    Make Admin
                                  </button>
                                </div>
                              )}
                            </>
                          )}
                        </div>
                        
                        <div className="flex items-center space-x-4 pt-2 border-t border-gray-50">
                          {isSuperAdmin && (
                            <button
                              onClick={() => setEditingUser(user)}
                              className="text-[9px] font-black text-blue-600 uppercase tracking-widest hover:underline"
                            >
                              Edit User
                            </button>
                          )}
                          {isBlockingUser === user.uid ? (
                            <div className="flex items-center space-x-2">
                              <button 
                                onClick={() => toggleBlockUser(user.uid, !!user.isBlocked)}
                                className="text-[9px] font-black text-red-600 uppercase tracking-widest hover:underline"
                              >
                                Confirm {user.isBlocked ? 'Unblock' : 'Block'}
                              </button>
                              <button onClick={() => setIsBlockingUser(null)} className="text-[9px] font-black text-gray-400 uppercase tracking-widest hover:underline">Cancel</button>
                            </div>
                          ) : (
                            <button 
                              onClick={() => setIsBlockingUser(user.uid)}
                              className={`text-[9px] font-black uppercase tracking-widest hover:underline ${user.isBlocked ? 'text-green-600' : 'text-red-600'}`}
                            >
                              {user.isBlocked ? 'Unblock User' : 'Block User'}
                            </button>
                          )}

                          {isSuperAdmin && (
                            isDeletingUser === user.uid ? (
                              <div className="flex items-center space-x-2">
                                <button 
                                  onClick={() => deleteUser(user.uid)}
                                  className="text-[9px] font-black text-red-600 uppercase tracking-widest hover:underline"
                                >
                                  Confirm Delete
                                </button>
                                <button onClick={() => setIsDeletingUser(null)} className="text-[9px] font-black text-gray-400 uppercase tracking-widest hover:underline">Cancel</button>
                              </div>
                            ) : (
                              <button 
                                onClick={() => setIsDeletingUser(user.uid)}
                                className="text-[9px] font-black text-red-600 uppercase tracking-widest hover:underline"
                              >
                                Delete User
                              </button>
                            )
                          )}
                        </div>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'settings' && (isSuperAdmin || profile?.role === 'admin') && (
        <div className="space-y-8">
          <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-2xl shadow-navy-100 space-y-8">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-navy-900 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-navy-200">
                <Settings size={24} strokeWidth={3} />
              </div>
              <div>
                <h3 className="text-xl font-black text-navy-900 tracking-tight uppercase">Payment Settings</h3>
                <p className="text-gray-400 text-[10px] font-bold uppercase tracking-widest">Configure UPI details for customers</p>
              </div>
            </div>

            <form onSubmit={handleSaveSettings} className="space-y-8 max-w-4xl">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-6">
                  <h4 className="text-sm font-black text-navy-900 uppercase tracking-widest border-b border-gray-100 pb-2">Base Delivery Charges</h4>
                  
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Base Fee (₹)</label>
                    <input
                      type="number"
                      required
                      className="w-full px-6 py-4 bg-navy-50 border-2 border-navy-100 rounded-2xl focus:outline-none focus:border-navy-900 transition-all font-bold"
                      value={settings.baseDeliveryCharge}
                      onChange={e => {
                        const val = e.target.value === '' ? 0 : Number(e.target.value);
                        setSettings({ ...settings, baseDeliveryCharge: val });
                      }}
                      placeholder="e.g. 20"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Order Percentage Charge (%)</label>
                    <input
                      type="number"
                      required
                      className="w-full px-6 py-4 bg-navy-50 border-2 border-navy-100 rounded-2xl focus:outline-none focus:border-navy-900 transition-all font-bold"
                      value={settings.orderPercentageCharge}
                      onChange={e => {
                        const val = e.target.value === '' ? 0 : Number(e.target.value);
                        setSettings({ ...settings, orderPercentageCharge: val });
                      }}
                      placeholder="e.g. 5"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Global Min Order Amount (₹)</label>
                    <input
                      type="number"
                      required
                      className="w-full px-6 py-4 bg-navy-50 border-2 border-navy-100 rounded-2xl focus:outline-none focus:border-navy-900 transition-all font-bold"
                      value={settings.globalMinOrderAmount}
                      onChange={e => {
                        const val = e.target.value === '' ? 0 : Number(e.target.value);
                        setSettings({ ...settings, globalMinOrderAmount: val });
                      }}
                      placeholder="e.g. 100"
                    />
                  </div>
                </div>

                <div className="space-y-6">
                  <h4 className="text-sm font-black text-navy-900 uppercase tracking-widest border-b border-gray-100 pb-2">Revenue & Payouts</h4>
                  
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Vendor Commission (%)</label>
                    <input
                      type="number"
                      required
                      className="w-full px-6 py-4 bg-navy-50 border-2 border-navy-100 rounded-2xl focus:outline-none focus:border-navy-900 transition-all font-bold"
                      value={settings.vendorCommissionPercentage}
                      onChange={e => {
                        const val = e.target.value === '' ? 0 : Number(e.target.value);
                        setSettings({ ...settings, vendorCommissionPercentage: val });
                      }}
                      placeholder="e.g. 15"
                    />
                    <p className="text-[8px] font-bold text-gray-400 uppercase tracking-widest ml-1">Percentage taken from vendor on each order</p>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Delivery Partner Payout (Base ₹)</label>
                    <input
                      type="number"
                      required
                      className="w-full px-6 py-4 bg-navy-50 border-2 border-navy-100 rounded-2xl focus:outline-none focus:border-navy-900 transition-all font-bold"
                      value={settings.deliveryPayoutBase}
                      onChange={e => {
                        const val = e.target.value === '' ? 0 : Number(e.target.value);
                        setSettings({ ...settings, deliveryPayoutBase: val });
                      }}
                      placeholder="e.g. 20"
                    />
                    <p className="text-[8px] font-bold text-gray-400 uppercase tracking-widest ml-1">Fixed base amount paid to delivery partner</p>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Delivery Partner Payout (% of Delivery Charge)</label>
                    <input
                      type="number"
                      required
                      className="w-full px-6 py-4 bg-navy-50 border-2 border-navy-100 rounded-2xl focus:outline-none focus:border-navy-900 transition-all font-bold"
                      value={settings.deliveryPayoutPercentage}
                      onChange={e => {
                        const val = e.target.value === '' ? 0 : Number(e.target.value);
                        setSettings({ ...settings, deliveryPayoutPercentage: val });
                      }}
                      placeholder="e.g. 50"
                    />
                    <p className="text-[8px] font-bold text-gray-400 uppercase tracking-widest ml-1">Percentage of customer's delivery fee paid to partner</p>
                  </div>
                </div>

                <div className="space-y-6">
                  <h4 className="text-sm font-black text-navy-900 uppercase tracking-widest border-b border-gray-100 pb-2">Dynamic Surcharges</h4>
                  
                  <div className="p-6 bg-navy-50 rounded-3xl border-2 border-navy-100 space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <Clock size={16} className="text-navy-400" />
                        <span className="text-[10px] font-black text-navy-900 uppercase tracking-widest">Peak Hour Surcharge</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setSettings({ ...settings, isPeakHourActive: !settings.isPeakHourActive })}
                        className={`w-12 h-6 rounded-full transition-all relative ${settings.isPeakHourActive ? 'bg-navy-900' : 'bg-gray-200'}`}
                      >
                        <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${settings.isPeakHourActive ? 'left-7' : 'left-1'}`} />
                      </button>
                    </div>
                    <input
                      type="number"
                      className="w-full px-4 py-3 bg-white border-2 border-navy-100 rounded-xl focus:outline-none focus:border-navy-900 transition-all font-bold text-sm"
                      value={settings.peakHourSurcharge}
                      onChange={e => {
                        const val = e.target.value === '' ? 0 : Number(e.target.value);
                        setSettings({ ...settings, peakHourSurcharge: val });
                      }}
                      placeholder="e.g. 15"
                    />
                  </div>

                  <div className="p-6 bg-navy-50 rounded-3xl border-2 border-navy-100 space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <CloudRain size={16} className="text-navy-400" />
                        <span className="text-[10px] font-black text-navy-900 uppercase tracking-widest">Bad Weather Surcharge</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setSettings({ ...settings, isWeatherSurchargeActive: !settings.isWeatherSurchargeActive })}
                        className={`w-12 h-6 rounded-full transition-all relative ${settings.isWeatherSurchargeActive ? 'bg-navy-900' : 'bg-gray-200'}`}
                      >
                        <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${settings.isWeatherSurchargeActive ? 'left-7' : 'left-1'}`} />
                      </button>
                    </div>
                    <input
                      type="number"
                      className="w-full px-4 py-3 bg-white border-2 border-navy-100 rounded-xl focus:outline-none focus:border-navy-900 transition-all font-bold text-sm"
                      value={settings.weatherSurcharge}
                      onChange={e => {
                        const val = e.target.value === '' ? 0 : Number(e.target.value);
                        setSettings({ ...settings, weatherSurcharge: val });
                      }}
                      placeholder="e.g. 25"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-6 pt-6 border-t border-gray-100">
                <h4 className="text-sm font-black text-navy-900 uppercase tracking-widest">Payment Details</h4>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                  <div className="flex items-center justify-between p-6 bg-navy-50 rounded-2xl border-2 border-navy-100">
                    <div>
                      <p className="font-black text-navy-900 uppercase tracking-tight">Enable UPI</p>
                      <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Allow users to pay via UPI</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSettings({ ...settings, isUpiEnabled: !settings.isUpiEnabled })}
                      className={`w-16 h-8 rounded-full transition-all relative ${settings.isUpiEnabled ? 'bg-accent-500' : 'bg-gray-300'}`}
                    >
                      <div className={`absolute top-1 w-6 h-6 rounded-full bg-white transition-all ${settings.isUpiEnabled ? 'left-9' : 'left-1'}`} />
                    </button>
                  </div>
                  <div className="flex items-center justify-between p-6 bg-navy-50 rounded-2xl border-2 border-navy-100">
                    <div>
                      <p className="font-black text-navy-900 uppercase tracking-tight">Enable COD</p>
                      <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Allow cash on delivery</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSettings({ ...settings, isCodEnabled: !settings.isCodEnabled })}
                      className={`w-16 h-8 rounded-full transition-all relative ${settings.isCodEnabled ? 'bg-accent-500' : 'bg-gray-300'}`}
                    >
                      <div className={`absolute top-1 w-6 h-6 rounded-full bg-white transition-all ${settings.isCodEnabled ? 'left-9' : 'left-1'}`} />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Admin UPI ID</label>
                    <input
                      type="text"
                      required
                      className="w-full px-6 py-4 bg-navy-50 border-2 border-navy-100 rounded-2xl focus:outline-none focus:border-navy-900 transition-all font-bold"
                      value={settings.upiId}
                      onChange={e => setSettings({ ...settings, upiId: e.target.value })}
                      placeholder="e.g. name@okaxis"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">UPI QR Code URL</label>
                    <div className="flex items-center space-x-4">
                      <input
                        type="text"
                        required
                        className="flex-1 px-6 py-4 bg-navy-50 border-2 border-navy-100 rounded-2xl focus:outline-none focus:border-navy-900 transition-all font-bold"
                        value={settings.upiQR}
                        onChange={e => setSettings({ ...settings, upiQR: e.target.value })}
                        placeholder="URL to QR code image"
                      />
                      <label className="cursor-pointer bg-navy-900 text-white p-4 rounded-2xl hover:bg-navy-800 transition-all active:scale-95">
                        <Upload size={20} />
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={async (e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              const base64 = await fileToBase64(file);
                              const resized = await resizeImage(base64, 400, 400); // QR doesn't need to be huge
                              setSettings({ ...settings, upiQR: resized });
                            }
                          }}
                        />
                      </label>
                    </div>
                  </div>
                </div>
              </div>

              {settings.upiQR && (
                <div className="mt-4 p-4 bg-navy-50 rounded-3xl border-2 border-navy-100 inline-block">
                  <p className="text-[10px] font-black text-navy-400 uppercase tracking-widest mb-2 text-center">Preview</p>
                  <img src={settings.upiQR || undefined} alt="QR Preview" className="w-40 h-40 object-contain" />
                </div>
              )}

              <div className="space-y-6 pt-6 border-t border-gray-100">
                <h4 className="text-sm font-black text-navy-900 uppercase tracking-widest">Support Details</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Support Email</label>
                    <input
                      type="email"
                      required
                      className="w-full px-6 py-4 bg-navy-50 border-2 border-navy-100 rounded-2xl focus:outline-none focus:border-navy-900 transition-all font-bold"
                      value={supportSettings.email}
                      onChange={e => setSupportSettings({ ...supportSettings, email: e.target.value })}
                      placeholder="e.g. support@rebelcraves.com"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Support Phone (WhatsApp)</label>
                    <input
                      type="text"
                      required
                      className="w-full px-6 py-4 bg-navy-50 border-2 border-navy-100 rounded-2xl focus:outline-none focus:border-navy-900 transition-all font-bold"
                      value={supportSettings.phone}
                      onChange={e => setSupportSettings({ ...supportSettings, phone: e.target.value })}
                      placeholder="e.g. +91 9876543210"
                    />
                  </div>
                </div>
              </div>

              <button
                type="submit"
                disabled={isSavingSettings}
                className="w-full bg-navy-900 text-white py-4 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-navy-800 transition-all shadow-xl shadow-navy-100 disabled:opacity-50"
              >
                {isSavingSettings ? 'Saving...' : 'Save Settings'}
              </button>
            </form>
          </div>
        </div>
      )}

      {activeTab === 'groceries' && (
        <div className="space-y-10">
          {/* Grocery Categories Section */}
          <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-2xl shadow-navy-100 space-y-8">
            <div className="flex justify-between items-center">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-accent-400 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-accent-100">
                  <Tag size={24} strokeWidth={3} />
                </div>
                <div>
                  <h3 className="text-xl font-black text-navy-900 tracking-tight uppercase">Grocery Categories</h3>
                  <p className="text-gray-400 text-[10px] font-bold uppercase tracking-widest">Manage Blinkit-style categories</p>
                </div>
              </div>
              <div className="flex items-center space-x-4">
                <button
                  onClick={() => setShowAddGroceryCategory(true)}
                  className="bg-navy-900 text-white px-6 py-3 rounded-2xl text-xs font-black uppercase tracking-widest flex items-center space-x-2 hover:bg-navy-800 transition-all shadow-xl shadow-navy-100"
                >
                  <Plus size={18} strokeWidth={3} />
                  <span>Add Category</span>
                </button>
                <button
                  onClick={async () => {
                    const samples = [
                      { name: 'Fresh Fruits', image: 'https://images.unsplash.com/photo-1610832958506-aa56368176cf?auto=format&fit=crop&q=80&w=500' },
                      { name: 'Vegetables', image: 'https://images.unsplash.com/photo-1566385101042-1a000c1267c4?auto=format&fit=crop&q=80&w=500' },
                      { name: 'Dairy & Bread', image: 'https://images.unsplash.com/photo-1550583724-1255818c0533?auto=format&fit=crop&q=80&w=500' },
                      { name: 'Snacks', image: 'https://images.unsplash.com/photo-15994906592b3-e3b9c075938a?auto=format&fit=crop&q=80&w=500' },
                      { name: 'Beverages', image: 'https://images.unsplash.com/photo-1527960669566-f882ba85a4c6?auto=format&fit=crop&q=80&w=500' }
                    ];
                    for (const s of samples) {
                      await addDoc(collection(db, 'groceryCategories'), s);
                    }
                  }}
                  className="text-[9px] font-black text-navy-400 uppercase tracking-widest hover:text-navy-900 transition-colors"
                >
                  Add Samples
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-6">
              {groceryCategories.map(category => (
                <div key={category.id} className="relative group">
                  <div className="aspect-square rounded-3xl overflow-hidden border-2 border-gray-50 group-hover:border-accent-400 transition-all">
                    <img src={category.image || undefined} alt={category.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    <div className="absolute inset-0 bg-navy-900/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      {isDeletingGroceryCategory === category.id ? (
                        <div className="bg-white p-2 rounded-2xl shadow-2xl flex flex-col items-center space-y-2">
                          <p className="text-[8px] font-black text-navy-900 uppercase tracking-widest">Delete?</p>
                          <div className="flex space-x-2">
                            <button onClick={() => handleDeleteGroceryCategory(category.id)} className="px-3 py-1 bg-red-500 text-white text-[8px] font-black rounded-lg uppercase tracking-widest">Yes</button>
                            <button onClick={() => setIsDeletingGroceryCategory(null)} className="px-3 py-1 bg-gray-100 text-navy-900 text-[8px] font-black rounded-lg uppercase tracking-widest">No</button>
                          </div>
                        </div>
                      ) : (
                        <button
                          onClick={() => setIsDeletingGroceryCategory(category.id)}
                          className="p-3 bg-red-500 text-white rounded-2xl shadow-xl hover:scale-110 transition-transform"
                        >
                          <Trash2 size={20} />
                        </button>
                      )}
                    </div>
                  </div>
                  <p className="mt-3 text-center text-xs font-black text-navy-900 uppercase tracking-tight">{category.name}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Grocery Items Section */}
          <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-2xl shadow-navy-100 space-y-8">
            <div className="flex justify-between items-center">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-navy-900 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-navy-200">
                  <ShoppingBasket size={24} strokeWidth={3} />
                </div>
                <div>
                  <h3 className="text-xl font-black text-navy-900 tracking-tight uppercase">Grocery Inventory</h3>
                  <p className="text-gray-400 text-[10px] font-bold uppercase tracking-widest">Manage items and stock levels</p>
                </div>
              </div>
              <div className="flex items-center space-x-4">
                <button
                  onClick={() => setShowAddGroceryItem(true)}
                  className="bg-accent-500 text-white px-6 py-3 rounded-2xl text-xs font-black uppercase tracking-widest flex items-center space-x-2 hover:bg-accent-600 transition-all shadow-xl shadow-accent-100"
                >
                  <Plus size={18} strokeWidth={3} />
                  <span>Add Item</span>
                </button>
                <button
                  onClick={async () => {
                    const samples = [
                      { name: 'Fresh Bananas', price: 60, category: 'Fresh Fruits', image: 'https://images.unsplash.com/photo-1571771894821-ad990241274d?auto=format&fit=crop&q=80&w=500', description: '1kg pack of fresh bananas' },
                      { name: 'Full Cream Milk', price: 66, category: 'Dairy & Bread', image: 'https://images.unsplash.com/photo-1550583724-1255818c0533?auto=format&fit=crop&q=80&w=500', description: '1L fresh milk' },
                      { name: 'Brown Bread', price: 45, category: 'Dairy & Bread', image: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&q=80&w=500', description: 'Whole wheat brown bread' },
                      { name: 'Potato Chips', price: 20, category: 'Snacks', image: 'https://images.unsplash.com/photo-1566478431370-72257e5945ee?auto=format&fit=crop&q=80&w=500', description: 'Classic salted chips' }
                    ];
                    for (const s of samples) {
                      await addDoc(collection(db, 'groceries'), s);
                    }
                  }}
                  className="text-[9px] font-black text-navy-400 uppercase tracking-widest hover:text-navy-900 transition-colors"
                >
                  Add Samples
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
              {groceryItems.map(item => (
                <div key={item.id} className="bg-navy-50/50 rounded-[2rem] p-5 border border-navy-100 group hover:bg-white hover:shadow-2xl hover:shadow-navy-100 transition-all">
                  <div className="relative h-40 rounded-2xl overflow-hidden mb-4">
                    <img src={item.image || undefined} alt={item.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    <div className="absolute top-3 right-3 flex space-x-2">
                      <button
                        onClick={() => toggleGroceryStock(item.id, item.isOutOfStock)}
                        className={`p-2 rounded-xl shadow-lg transition-all ${item.isOutOfStock ? 'bg-red-500 text-white' : 'bg-white text-green-600'}`}
                        title={item.isOutOfStock ? 'Mark as In Stock' : 'Mark as Out of Stock'}
                      >
                        <Package size={16} />
                      </button>
                      {isDeletingGroceryItem === item.id ? (
                        <div className="bg-white p-2 rounded-xl shadow-2xl flex items-center space-x-2">
                          <button onClick={() => handleDeleteGroceryItem(item.id)} className="px-2 py-1 bg-red-500 text-white text-[8px] font-black rounded uppercase tracking-widest">Confirm</button>
                          <button onClick={() => setIsDeletingGroceryItem(null)} className="p-1 text-gray-400"><X size={12} /></button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setIsDeletingGroceryItem(item.id)}
                          className="p-2 bg-white text-red-500 rounded-xl shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>
                    <div className="absolute bottom-3 left-3 bg-white/90 backdrop-blur px-3 py-1 rounded-lg text-[10px] font-black text-navy-900 uppercase tracking-widest">
                      {item.category}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between items-start">
                      <h4 className="font-black text-navy-900 uppercase tracking-tight line-clamp-1">{item.name}</h4>
                      {item.isOutOfStock && (
                        <span className="text-[8px] font-black text-red-500 bg-red-50 px-2 py-0.5 rounded uppercase tracking-widest">Out of Stock</span>
                      )}
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-accent-600 font-black">₹{item.price}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Add Category Modal */}
          {showAddGroceryCategory && (
            <div className="fixed inset-0 bg-navy-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
              <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-white rounded-[3rem] p-10 max-w-md w-full shadow-2xl">
                <h3 className="text-2xl font-black text-navy-900 mb-8 uppercase tracking-tight">New Category</h3>
                <form onSubmit={handleAddGroceryCategory} className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Category Name</label>
                    <input
                      type="text"
                      required
                      className="w-full px-6 py-4 bg-navy-50 border-2 border-navy-100 rounded-2xl focus:outline-none focus:border-navy-900 transition-all font-bold"
                      value={newGroceryCategory.name}
                      onChange={e => setNewGroceryCategory({ ...newGroceryCategory, name: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Category Image</label>
                    <div className="flex items-center space-x-4">
                      <input
                        type="text"
                        className="flex-1 px-6 py-4 bg-navy-50 border-2 border-navy-100 rounded-2xl focus:outline-none focus:border-navy-900 transition-all font-bold"
                        value={newGroceryCategory.image}
                        onChange={e => setNewGroceryCategory({ ...newGroceryCategory, image: e.target.value })}
                        placeholder="URL or upload..."
                      />
                      <label className="cursor-pointer bg-navy-900 text-white p-4 rounded-2xl hover:bg-navy-800 transition-all active:scale-95">
                        <Upload size={20} />
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) handleImageUpload(file, 'groceryCategory');
                          }}
                        />
                      </label>
                    </div>
                  </div>
                  <div className="flex gap-4 pt-4">
                    <button
                      type="button"
                      onClick={() => setShowAddGroceryCategory(false)}
                      className="flex-1 px-6 py-4 border-2 border-navy-100 rounded-2xl text-xs font-black uppercase tracking-widest text-navy-400 hover:bg-navy-50 transition-all"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="flex-1 px-6 py-4 bg-navy-900 text-white rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-navy-800 transition-all shadow-xl shadow-navy-100"
                    >
                      Create
                    </button>
                  </div>
                </form>
              </motion.div>
            </div>
          )}

          {/* Add Item Modal */}
          {showAddGroceryItem && (
            <div className="fixed inset-0 bg-navy-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
              <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-white rounded-[3rem] p-10 max-w-2xl w-full shadow-2xl">
                <h3 className="text-2xl font-black text-navy-900 mb-8 uppercase tracking-tight">New Grocery Item</h3>
                <form onSubmit={handleAddGroceryItem} className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Item Name</label>
                    <input
                      type="text"
                      required
                      className="w-full px-6 py-4 bg-navy-50 border-2 border-navy-100 rounded-2xl focus:outline-none focus:border-navy-900 transition-all font-bold"
                      value={newGroceryItem.name}
                      onChange={e => setNewGroceryItem({ ...newGroceryItem, name: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center ml-1">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Category</label>
                      <button 
                        type="button"
                        onClick={() => {
                          setShowAddGroceryItem(false);
                          setShowAddGroceryCategory(true);
                        }}
                        className="text-[8px] font-black text-accent-600 uppercase tracking-widest hover:underline"
                      >
                        + Add New
                      </button>
                    </div>
                    <select
                      required
                      className="w-full px-6 py-4 bg-navy-50 border-2 border-navy-100 rounded-2xl focus:outline-none focus:border-navy-900 transition-all font-bold"
                      value={newGroceryItem.category}
                      onChange={e => setNewGroceryItem({ ...newGroceryItem, category: e.target.value })}
                    >
                      <option value="">Select Category</option>
                      {groceryCategories.map(c => (
                        <option key={c.id} value={c.name}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Price (₹)</label>
                    <input
                      type="number"
                      required
                      className="w-full px-6 py-4 bg-navy-50 border-2 border-navy-100 rounded-2xl focus:outline-none focus:border-navy-900 transition-all font-bold"
                      value={newGroceryItem.price}
                      onChange={e => setNewGroceryItem({ ...newGroceryItem, price: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Item Image</label>
                    <div className="flex items-center space-x-4">
                      <input
                        type="text"
                        className="flex-1 px-6 py-4 bg-navy-50 border-2 border-navy-100 rounded-2xl focus:outline-none focus:border-navy-900 transition-all font-bold"
                        value={newGroceryItem.image}
                        onChange={e => setNewGroceryItem({ ...newGroceryItem, image: e.target.value })}
                        placeholder="URL or upload..."
                      />
                      <label className="cursor-pointer bg-navy-900 text-white p-4 rounded-2xl hover:bg-navy-800 transition-all active:scale-95">
                        <Upload size={20} />
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) handleImageUpload(file, 'groceryItem');
                          }}
                        />
                      </label>
                    </div>
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Description</label>
                    <textarea
                      className="w-full px-6 py-4 bg-navy-50 border-2 border-navy-100 rounded-2xl focus:outline-none focus:border-navy-900 transition-all font-bold min-h-[100px]"
                      value={newGroceryItem.description}
                      onChange={e => setNewGroceryItem({ ...newGroceryItem, description: e.target.value })}
                    />
                  </div>
                  <div className="flex gap-4 pt-4 md:col-span-2">
                    <button
                      type="button"
                      onClick={() => setShowAddGroceryItem(false)}
                      className="flex-1 px-6 py-4 border-2 border-navy-100 rounded-2xl text-xs font-black uppercase tracking-widest text-navy-400 hover:bg-navy-50 transition-all"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="flex-1 px-6 py-4 bg-accent-500 text-white rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-accent-600 transition-all shadow-xl shadow-accent-100"
                    >
                      Add Item
                    </button>
                  </div>
                </form>
              </motion.div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'analytics' && (
        <div className="space-y-10">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { label: 'Today', data: analytics.daily },
              { label: 'This Week', data: analytics.weekly },
              { label: 'This Month', data: analytics.monthly },
              { label: 'All Time', data: analytics.allTime }
            ].map((period, idx) => (
              <div key={idx} className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-2xl shadow-navy-100 space-y-6">
                <div className="flex justify-between items-start">
                  <h3 className="text-lg font-black text-navy-900 uppercase tracking-tighter">{period.label}</h3>
                  <span className="text-[10px] font-black bg-navy-50 text-navy-400 px-2 py-1 rounded-lg uppercase tracking-widest">{period.data.count} Orders</span>
                </div>
                <div className="space-y-4">
                  <div className="flex justify-between items-end">
                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Total Revenue</span>
                    <span className="text-2xl font-black text-navy-900">{formatPrice(period.data.total)}</span>
                  </div>
                  <div className="pt-4 border-t border-dashed border-gray-100 space-y-2">
                    <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest">
                      <span className="text-gray-400">Admin Profit</span>
                      <span className="text-accent-600">{formatPrice(period.data.admin)}</span>
                    </div>
                    <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest">
                      <span className="text-gray-400">Vendor Payout</span>
                      <span className="text-navy-900">{formatPrice(period.data.vendor)}</span>
                    </div>
                    <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest">
                      <span className="text-gray-400">Delivery Payout</span>
                      <span className="text-navy-900">{formatPrice(period.data.delivery)}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="bg-white p-10 rounded-[3rem] border border-gray-100 shadow-2xl shadow-navy-100">
              <h3 className="text-xl font-black text-navy-900 mb-8 uppercase tracking-tighter">Revenue Trend (Last 7 Days)</h3>
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={analytics.chartData}>
                    <defs>
                      <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#1e293b" stopOpacity={0.1}/>
                        <stop offset="95%" stopColor="#1e293b" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis 
                      dataKey="date" 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 700 }}
                      tickFormatter={(str) => {
                        const d = new Date(str);
                        return d.toLocaleDateString('en-US', { weekday: 'short' });
                      }}
                    />
                    <YAxis 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 700 }}
                      tickFormatter={(val) => `₹${val}`}
                    />
                    <Tooltip 
                      contentStyle={{ borderRadius: '1rem', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)' }}
                      labelStyle={{ fontWeight: 900, color: '#1e293b', marginBottom: '0.5rem' }}
                    />
                    <Area type="monotone" dataKey="total" stroke="#1e293b" strokeWidth={4} fillOpacity={1} fill="url(#colorTotal)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="bg-white p-10 rounded-[3rem] border border-gray-100 shadow-2xl shadow-navy-100">
              <h3 className="text-xl font-black text-navy-900 mb-8 uppercase tracking-tighter">Revenue Distribution</h3>
              <div className="h-[300px] w-full flex items-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={analytics.revenueSplit}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {analytics.revenueSplit.map((entry: any, index: number) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ borderRadius: '1rem', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="space-y-4 pr-10">
                  {analytics.revenueSplit.map((item: any, idx: number) => (
                    <div key={idx} className="flex items-center space-x-3">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                      <div className="space-y-0.5">
                        <p className="text-[10px] font-black text-navy-900 uppercase tracking-widest">{item.name}</p>
                        <p className="text-xs font-black text-gray-400">{formatPrice(item.value)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="bg-white p-10 rounded-[3rem] border border-gray-100 shadow-2xl shadow-navy-100">
              <h3 className="text-xl font-black text-navy-900 mb-8 uppercase tracking-tighter">Vendor Revenue</h3>
              <div className="space-y-4 max-h-[300px] overflow-y-auto pr-4">
                {Object.entries(analytics.vendorBreakdown).sort(([,a], [,b]) => (b as number) - (a as number)).map(([name, amount], idx) => (
                  <div key={idx} className="flex justify-between items-center p-4 bg-navy-50 rounded-2xl">
                    <span className="font-bold text-navy-900">{name}</span>
                    <span className="font-black text-navy-900">{formatPrice(amount as number)}</span>
                  </div>
                ))}
                {Object.keys(analytics.vendorBreakdown).length === 0 && (
                  <p className="text-gray-400 font-bold text-sm text-center py-4">No vendor revenue yet.</p>
                )}
              </div>
            </div>

            <div className="bg-white p-10 rounded-[3rem] border border-gray-100 shadow-2xl shadow-navy-100">
              <h3 className="text-xl font-black text-navy-900 mb-8 uppercase tracking-tighter">Delivery Partner Revenue</h3>
              <div className="space-y-4 max-h-[300px] overflow-y-auto pr-4">
                {Object.entries(analytics.deliveryBreakdown).sort(([,a], [,b]) => (b as number) - (a as number)).map(([name, amount], idx) => (
                  <div key={idx} className="flex justify-between items-center p-4 bg-navy-50 rounded-2xl">
                    <span className="font-bold text-navy-900">{name}</span>
                    <span className="font-black text-navy-900">{formatPrice(amount as number)}</span>
                  </div>
                ))}
                {Object.keys(analytics.deliveryBreakdown).length === 0 && (
                  <p className="text-gray-400 font-bold text-sm text-center py-4">No delivery revenue yet.</p>
                )}
              </div>
            </div>
          </div>

          <div className="bg-white p-10 rounded-[3rem] border border-gray-100 shadow-2xl shadow-navy-100">
            <h3 className="text-2xl font-black text-navy-900 mb-8 uppercase tracking-tight">Broadcast Special Offer</h3>
            <form onSubmit={handleBroadcastNotification} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Title</label>
                  <input
                    required
                    type="text"
                    className="w-full px-6 py-4 bg-navy-50 border-2 border-navy-100 rounded-2xl focus:outline-none focus:border-navy-900 transition-all font-bold"
                    value={newNotification.title}
                    onChange={e => setNewNotification({ ...newNotification, title: e.target.value })}
                    placeholder="E.G. 50% OFF TODAY!"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">City (Optional)</label>
                  <input
                    type="text"
                    className="w-full px-6 py-4 bg-navy-50 border-2 border-navy-100 rounded-2xl focus:outline-none focus:border-navy-900 transition-all font-bold"
                    value={newNotification.city}
                    onChange={e => setNewNotification({ ...newNotification, city: e.target.value })}
                    placeholder="Leave blank for all cities"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Message</label>
                <textarea
                  required
                  className="w-full px-6 py-4 bg-navy-50 border-2 border-navy-100 rounded-2xl focus:outline-none focus:border-navy-900 transition-all font-bold min-h-[100px]"
                  value={newNotification.message}
                  onChange={e => setNewNotification({ ...newNotification, message: e.target.value })}
                  placeholder="Enter the offer details..."
                />
              </div>
              <button
                type="submit"
                className="w-full bg-accent-500 text-navy-900 py-4 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-accent-600 transition-all shadow-xl shadow-accent-100"
              >
                Broadcast Now
              </button>
            </form>
          </div>
        </div>
      )}

      {activeTab === 'coupons' && (
        <div className="space-y-8">
          <div className="bg-white p-10 rounded-[3rem] border border-gray-100 shadow-2xl shadow-navy-100">
            <h3 className="text-2xl font-black text-navy-900 mb-8 uppercase tracking-tight">Create New Coupon</h3>
            <form onSubmit={handleAddCoupon} className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Coupon Code</label>
                <input
                  required
                  type="text"
                  className="w-full px-6 py-4 bg-navy-50 border-2 border-navy-100 rounded-2xl focus:outline-none focus:border-navy-900 transition-all font-bold uppercase"
                  value={newCoupon.code}
                  onChange={e => setNewCoupon({ ...newCoupon, code: e.target.value.toUpperCase() })}
                  placeholder="E.G. REBEL50"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Discount Type</label>
                <select
                  className="w-full px-6 py-4 bg-navy-50 border-2 border-navy-100 rounded-2xl focus:outline-none focus:border-navy-900 transition-all font-bold"
                  value={newCoupon.discountType}
                  onChange={e => setNewCoupon({ ...newCoupon, discountType: e.target.value as any })}
                >
                  <option value="percentage">Percentage (%)</option>
                  <option value="fixed">Fixed Amount (₹)</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Discount Value</label>
                <input
                  required
                  type="number"
                  className="w-full px-6 py-4 bg-navy-50 border-2 border-navy-100 rounded-2xl focus:outline-none focus:border-navy-900 transition-all font-bold"
                  value={newCoupon.discountValue}
                  onChange={e => setNewCoupon({ ...newCoupon, discountValue: parseFloat(e.target.value) })}
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Min Order Amount (₹)</label>
                <input
                  required
                  type="number"
                  className="w-full px-6 py-4 bg-navy-50 border-2 border-navy-100 rounded-2xl focus:outline-none focus:border-navy-900 transition-all font-bold"
                  value={newCoupon.minOrderAmount}
                  onChange={e => setNewCoupon({ ...newCoupon, minOrderAmount: parseFloat(e.target.value) })}
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Expiry Date</label>
                <input
                  required
                  type="date"
                  className="w-full px-6 py-4 bg-navy-50 border-2 border-navy-100 rounded-2xl focus:outline-none focus:border-navy-900 transition-all font-bold"
                  value={newCoupon.expiryDate}
                  onChange={e => setNewCoupon({ ...newCoupon, expiryDate: e.target.value })}
                />
              </div>
              <div className="flex items-end">
                <button
                  type="submit"
                  className="w-full bg-navy-900 text-white py-4 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-navy-800 transition-all shadow-xl shadow-navy-100"
                >
                  Create Coupon
                </button>
              </div>
            </form>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {coupons.map(coupon => (
              <div key={coupon.id} className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-2xl shadow-navy-100 space-y-6 relative overflow-hidden group">
                <div className="flex justify-between items-start">
                  <div className="space-y-1">
                    <h3 className="text-2xl font-black text-navy-900 tracking-tighter">{coupon.code}</h3>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                      {coupon.discountType === 'percentage' ? `${coupon.discountValue}% OFF` : `₹${coupon.discountValue} OFF`}
                    </p>
                  </div>
                  <div className="flex items-center space-x-2">
                    {isDeletingCoupon === coupon.id ? (
                      <div className="flex items-center space-x-2 bg-red-50 px-3 py-1 rounded-xl border border-red-100">
                        <span className="text-[8px] font-black text-red-600 uppercase tracking-widest">Delete?</span>
                        <button onClick={() => deleteCoupon(coupon.id)} className="text-[8px] font-black text-red-600 uppercase tracking-widest hover:underline">Yes</button>
                        <button onClick={() => setIsDeletingCoupon(null)} className="text-[8px] font-black text-gray-400 uppercase tracking-widest hover:underline">No</button>
                      </div>
                    ) : (
                      <button onClick={() => setIsDeletingCoupon(coupon.id)} className="p-2 text-gray-300 hover:text-red-500 transition-colors">
                        <Trash2 size={20} />
                      </button>
                    )}
                  </div>
                </div>
                <div className="pt-6 border-t border-dashed border-gray-100 space-y-3">
                  <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest">
                    <span className="text-gray-400">Min Order</span>
                    <span className="text-navy-900">₹{coupon.minOrderAmount}</span>
                  </div>
                  <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest">
                    <span className="text-gray-400">Used</span>
                    <span className="text-navy-900">{coupon.usageCount} times</span>
                  </div>
                  <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest">
                    <span className="text-gray-400">Expires</span>
                    <span className="text-red-400">{coupon.expiryDate}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'banners' && (
        <div className="space-y-8">
          <div className="bg-white p-10 rounded-[3rem] border border-gray-100 shadow-2xl shadow-navy-100">
            <h3 className="text-2xl font-black text-navy-900 mb-8 uppercase tracking-tight">Add New Banner</h3>
            <form onSubmit={handleAddBanner} className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Banner Image URL</label>
                <div className="flex space-x-4">
                  <input
                    required
                    type="text"
                    className="flex-1 px-6 py-4 bg-navy-50 border-2 border-navy-100 rounded-2xl focus:outline-none focus:border-navy-900 transition-all font-bold"
                    value={newBanner.image}
                    onChange={e => setNewBanner({ ...newBanner, image: e.target.value })}
                    placeholder="Paste image URL or upload..."
                  />
                  <label className="cursor-pointer bg-navy-900 text-white p-4 rounded-2xl hover:bg-navy-800 transition-all active:scale-95">
                    <Upload size={20} />
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const base64 = await resizeImage(await new Promise((resolve) => {
                            const reader = new FileReader();
                            reader.readAsDataURL(file);
                            reader.onload = () => resolve(reader.result as string);
                          }));
                          setNewBanner({ ...newBanner, image: base64 });
                        }
                      }}
                    />
                  </label>
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Title (Optional)</label>
                <input
                  type="text"
                  className="w-full px-6 py-4 bg-navy-50 border-2 border-navy-100 rounded-2xl focus:outline-none focus:border-navy-900 transition-all font-bold"
                  value={newBanner.title}
                  onChange={e => setNewBanner({ ...newBanner, title: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Link (Optional)</label>
                <input
                  type="text"
                  className="w-full px-6 py-4 bg-navy-50 border-2 border-navy-100 rounded-2xl focus:outline-none focus:border-navy-900 transition-all font-bold"
                  value={newBanner.link}
                  onChange={e => setNewBanner({ ...newBanner, link: e.target.value })}
                  placeholder="E.G. /shop/123"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">City (Optional)</label>
                <input
                  type="text"
                  className="w-full px-6 py-4 bg-navy-50 border-2 border-navy-100 rounded-2xl focus:outline-none focus:border-navy-900 transition-all font-bold"
                  value={newBanner.city}
                  onChange={e => setNewBanner({ ...newBanner, city: e.target.value })}
                />
              </div>
              <div className="md:col-span-2">
                <button
                  type="submit"
                  className="w-full bg-navy-900 text-white py-4 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-navy-800 transition-all shadow-xl shadow-navy-100"
                >
                  Add Banner
                </button>
              </div>
            </form>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {banners.map(banner => (
              <div key={banner.id} className="bg-white p-6 rounded-[2.5rem] border border-gray-100 shadow-2xl shadow-navy-100 space-y-4 relative overflow-hidden group">
                <div className="aspect-video rounded-2xl overflow-hidden bg-navy-50 border border-navy-100">
                  <img src={banner.image || undefined} alt={banner.title} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                </div>
                <div className="flex justify-between items-center">
                  <div>
                    <h4 className="font-black text-navy-900 uppercase tracking-tighter">{banner.title || 'Untitled Banner'}</h4>
                    <p className="text-[8px] font-bold text-gray-400 uppercase tracking-widest">{banner.city || 'All Cities'}</p>
                  </div>
                  <div className="flex items-center space-x-2">
                    {isDeletingBanner === banner.id ? (
                      <div className="flex items-center space-x-2 bg-red-50 px-3 py-1 rounded-xl border border-red-100">
                        <span className="text-[8px] font-black text-red-600 uppercase tracking-widest">Delete?</span>
                        <button onClick={() => deleteBanner(banner.id)} className="text-[8px] font-black text-red-600 uppercase tracking-widest hover:underline">Yes</button>
                        <button onClick={() => setIsDeletingBanner(null)} className="text-[8px] font-black text-gray-400 uppercase tracking-widest hover:underline">No</button>
                      </div>
                    ) : (
                      <button onClick={() => setIsDeletingBanner(banner.id)} className="p-2 text-gray-300 hover:text-red-500 transition-colors">
                        <Trash2 size={20} />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
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
                        cancellationReason: cancelModal.reason || 'Admin cancelled',
                        cancelledBy: 'admin'
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
              <X size={20} strokeWidth={3} />
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

      {/* Edit User Modal */}
      {editingUser && (
        <div className="fixed inset-0 bg-navy-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-[3rem] p-8 max-w-md w-full shadow-2xl"
          >
            <div className="flex justify-between items-center mb-8">
              <h3 className="text-2xl font-black text-navy-900 uppercase tracking-tighter">Edit User</h3>
              <button 
                onClick={() => setEditingUser(null)}
                className="w-10 h-10 bg-navy-50 rounded-full flex items-center justify-center text-navy-400 hover:bg-navy-100 transition-colors"
              >
                <X size={20} strokeWidth={3} />
              </button>
            </div>

            <form onSubmit={async (e) => {
              e.preventDefault();
              try {
                const userRef = doc(db, 'users', editingUser.uid);
                const oldUserSnap = await getDoc(userRef);
                const oldIsActive = oldUserSnap.data()?.isActive;

                await updateDoc(userRef, {
                  fullName: editingUser.fullName,
                  mobileNumber: editingUser.mobileNumber,
                  email: editingUser.email, // Note: This only updates Firestore, not Firebase Auth
                  city: editingUser.city || '',
                  isActive: editingUser.isActive ?? true
                });

                // If vendor status changed, sync shops
                if (editingUser.role === 'vendor' && oldIsActive !== editingUser.isActive) {
                  const shopStatus = editingUser.isActive ? 'live' : 'closed';
                  const shopsQuery = query(collection(db, 'shops'), where('ownerId', '==', editingUser.uid));
                  const shopsSnap = await getDocs(shopsQuery);
                  const updatePromises = shopsSnap.docs.map(shopDoc => 
                    updateDoc(doc(db, 'shops', shopDoc.id), { status: shopStatus })
                  );
                  await Promise.all(updatePromises);
                }

                setEditingUser(null);
                alert('User details updated successfully!');
              } catch (error) {
                console.error('Error updating user:', error);
                alert('Failed to update user details.');
              }
            }} className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Full Name</label>
                <input
                  type="text"
                  required
                  className="w-full px-6 py-4 bg-navy-50 border-2 border-transparent rounded-2xl focus:outline-none focus:border-navy-500 focus:bg-white transition-all font-bold text-navy-900"
                  value={editingUser.fullName}
                  onChange={e => setEditingUser({ ...editingUser, fullName: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Email (Firestore Only)</label>
                <input
                  type="email"
                  required
                  className="w-full px-6 py-4 bg-navy-50 border-2 border-transparent rounded-2xl focus:outline-none focus:border-navy-500 focus:bg-white transition-all font-bold text-navy-900"
                  value={editingUser.email}
                  onChange={e => setEditingUser({ ...editingUser, email: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Mobile Number</label>
                <input
                  type="text"
                  className="w-full px-6 py-4 bg-navy-50 border-2 border-transparent rounded-2xl focus:outline-none focus:border-navy-500 focus:bg-white transition-all font-bold text-navy-900"
                  value={editingUser.mobileNumber || ''}
                  onChange={e => setEditingUser({ ...editingUser, mobileNumber: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">City</label>
                <input
                  type="text"
                  className="w-full px-6 py-4 bg-navy-50 border-2 border-transparent rounded-2xl focus:outline-none focus:border-navy-500 focus:bg-white transition-all font-bold text-navy-900"
                  value={editingUser.city || ''}
                  onChange={e => setEditingUser({ ...editingUser, city: e.target.value })}
                />
              </div>

              <div className="flex items-center justify-between p-4 bg-navy-50 rounded-2xl border border-navy-100">
                <div className="space-y-0.5">
                  <p className="text-[10px] font-black text-navy-900 uppercase tracking-widest">Active Status</p>
                  <p className="text-[8px] font-bold text-gray-400 uppercase tracking-widest">Toggle online/offline status</p>
                </div>
                <button
                  type="button"
                  onClick={() => setEditingUser({ ...editingUser, isActive: !editingUser.isActive })}
                  className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                    editingUser.isActive ? 'bg-green-500 text-white' : 'bg-gray-300 text-white'
                  }`}
                >
                  {editingUser.isActive ? 'Active' : 'Offline'}
                </button>
              </div>

              <button
                type="submit"
                className="w-full bg-navy-900 text-white py-4 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-navy-800 transition-all shadow-xl shadow-navy-100"
              >
                Save Changes
              </button>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
