import React, { useEffect, useState } from 'react';
import { collection, onSnapshot, query } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { Shop, GroceryItem, GroceryCategory } from '../types';
import { Link, useNavigate } from 'react-router-dom';
import { Clock, Star, Search, ShoppingBasket, ChevronRight, Plus, Minus } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { motion } from 'motion/react';

import { useAuth } from '../context/AuthContext';

const ShopCard: React.FC<{ shop: Shop }> = ({ shop }) => (
  <Link to={shop.status === 'closed' ? '#' : `/shop/${shop.id}`} className={shop.status === 'closed' ? 'cursor-not-allowed' : ''}>
    <motion.div
      whileHover={shop.status === 'closed' ? {} : { y: -8 }}
      className={`bg-white rounded-3xl overflow-hidden border border-gray-100 shadow-sm transition-all group relative ${
        shop.status === 'closed' ? 'opacity-75 grayscale-[0.5]' : 'hover:shadow-xl hover:shadow-navy-100'
      }`}
    >
      <div className="relative h-52">
        <img
          src={shop.image || undefined}
          alt={shop.name}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          referrerPolicy="no-referrer"
        />
        {shop.status === 'closed' ? (
          <div className="absolute inset-0 bg-navy-900/60 backdrop-blur-[2px] flex items-center justify-center z-10">
            <span className="bg-white text-red-600 px-6 py-2 rounded-2xl font-black uppercase tracking-widest text-sm shadow-2xl border-2 border-red-100">Closed</span>
          </div>
        ) : (
          <div className="absolute top-4 left-4 z-10">
            <span className="bg-green-500 text-white px-3 py-1 rounded-lg font-black uppercase tracking-[0.2em] text-[10px] shadow-lg shadow-green-200 flex items-center space-x-1">
              <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
              <span>Open</span>
            </span>
          </div>
        )}
        {!shop.status || shop.status !== 'closed' ? (
          <div className="absolute top-4 right-4 bg-white/95 backdrop-blur px-3 py-1.5 rounded-xl flex items-center space-x-1.5 text-xs font-black text-navy-900 shadow-sm z-10">
            <Clock size={14} className="text-navy-600" />
            <span>{shop.deliveryTime}</span>
          </div>
        ) : null}
      </div>
      <div className="p-5">
        <h3 className="text-xl font-black text-navy-900 mb-1 tracking-tight">{shop.name}</h3>
        <p className="text-gray-400 text-sm line-clamp-1 mb-4 font-medium">{shop.description}</p>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-1.5 bg-accent-50 px-2.5 py-1 rounded-lg">
            <Star size={14} fill="currentColor" className="text-accent-500" />
            <span className="text-sm font-black text-accent-700">4.5</span>
          </div>
          <span className="text-[10px] font-black text-navy-600 bg-navy-50 px-3 py-1.5 rounded-full uppercase tracking-wider">City's Choice</span>
        </div>
      </div>
    </motion.div>
  </Link>
);

const Home = () => {
  const [shops, setShops] = useState<Shop[]>([]);
  const [groceryItems, setGroceryItems] = useState<GroceryItem[]>([]);
  const [groceryCategories, setGroceryCategories] = useState<GroceryCategory[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const { addItem, items: cartItems, updateQuantity } = useCart();
  const navigate = useNavigate();

  const getItemQuantity = (itemId: string) => {
    return cartItems.find(i => i.id === itemId)?.quantity || 0;
  };
  const { profile } = useAuth();

  useEffect(() => {
    if (profile && profile.role !== 'customer') {
      if (profile.role === 'admin') navigate('/admin');
      else if (profile.role === 'delivery') navigate('/delivery');
      else if (profile.role === 'vendor') navigate('/vendor');
    }
  }, [profile, navigate]);

  useEffect(() => {
    const shopsPath = 'shops';
    const unsubShops = onSnapshot(query(collection(db, shopsPath)), (snapshot) => {
      const shopsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Shop));
      setShops(shopsData);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, shopsPath);
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
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, groceryCategoriesPath);
    });

    return () => {
      unsubShops();
      unsubGroceries();
      unsubGroceryCategories();
    };
  }, []);

  const filteredShops = shops
    .filter(shop => {
      const matchesSearch = shop.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           shop.description.toLowerCase().includes(searchTerm.toLowerCase());
      const userCity = profile?.city?.toLowerCase();
      const shopCity = shop.city?.toLowerCase();
      const matchesCity = !userCity || shopCity === userCity;
      return matchesSearch && matchesCity;
    })
    .sort((a, b) => {
      if (a.status === 'closed' && b.status !== 'closed') return 1;
      if (a.status !== 'closed' && b.status === 'closed') return -1;
      return 0;
    });

  const filteredGroceries = groceryItems.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = !selectedCategory || item.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="space-y-10">
      {/* Search Bar */}
      <div className="relative max-w-3xl mx-auto z-20">
        <div className="absolute left-6 top-1/2 -translate-y-1/2 text-navy-400">
          <Search size={22} strokeWidth={3} />
        </div>
        <input
          type="text"
          placeholder="Search for food or groceries..."
          className="w-full pl-16 pr-6 py-5 bg-white border-none rounded-[2rem] shadow-2xl shadow-navy-100 focus:outline-none focus:ring-4 focus:ring-navy-500/20 transition-all text-lg font-medium placeholder:text-gray-300"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {/* Groceries Section */}
      {groceryCategories.length > 0 && (
        <section className="space-y-8">
          <div className="flex items-end justify-between px-2">
            <div className="space-y-1">
              <h2 className="text-3xl font-black text-navy-900 tracking-tight">Daily Essentials</h2>
              <p className="text-gray-400 text-sm font-bold uppercase tracking-widest">Delivered Fast</p>
            </div>
            <Link 
              to="/groceries"
              className="text-xs font-black text-navy-600 bg-navy-50 px-4 py-2 rounded-xl hover:bg-navy-100 transition-colors"
            >
              View All
            </Link>
          </div>

          {/* Categories Scroll */}
          <div className="flex space-x-6 overflow-x-auto pb-4 px-2 scrollbar-hide">
            {groceryCategories.map(category => (
              <button
                key={category.id}
                onClick={() => setSelectedCategory(category.name === selectedCategory ? null : category.name)}
                className="flex-shrink-0 group text-center space-y-3"
              >
                <div className={`w-20 h-20 rounded-[2rem] overflow-hidden border-2 transition-all ${selectedCategory === category.name ? 'border-accent-500 ring-4 ring-accent-500/10 scale-110' : 'border-gray-50 group-hover:border-navy-200'}`}>
                  <img src={category.image || undefined} alt={category.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                </div>
                <p className={`text-[10px] font-black uppercase tracking-widest transition-colors ${selectedCategory === category.name ? 'text-accent-600' : 'text-navy-400 group-hover:text-navy-900'}`}>{category.name}</p>
              </button>
            ))}
          </div>

          {/* Grocery Items Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
            {filteredGroceries.slice(0, 10).map(item => (
              <motion.div
                key={item.id}
                layout
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="bg-white p-4 rounded-[2rem] border border-gray-100 shadow-sm hover:shadow-xl hover:shadow-navy-100 transition-all group"
              >
                <div className="relative aspect-square rounded-2xl overflow-hidden mb-4">
                  <img src={item.image || undefined} alt={item.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" referrerPolicy="no-referrer" />
                  <div className="absolute bottom-2 left-2 bg-white/90 backdrop-blur px-2 py-1 rounded-lg text-[8px] font-black text-navy-900 uppercase tracking-widest">
                    {item.category}
                  </div>
                </div>
                <div className="space-y-3">
                  <div>
                    <h4 className="font-black text-navy-900 text-sm uppercase tracking-tight line-clamp-1">{item.name}</h4>
                    <p className="text-[10px] text-gray-400 font-bold line-clamp-1">{item.description}</p>
                  </div>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mt-2">
                    <span className="text-sm font-black text-navy-900">₹{item.price}</span>
                    {profile?.role === 'customer' && (
                      <div className="flex items-center self-start sm:self-auto space-x-1 sm:space-x-2 bg-navy-50 p-1 rounded-xl border border-navy-100 flex-shrink-0">
                        {getItemQuantity(item.id) > 0 ? (
                          <>
                            <button
                              onClick={() => updateQuantity(item.id, getItemQuantity(item.id) - 1)}
                              className="w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center bg-white rounded-lg text-navy-900 hover:bg-navy-100 transition-colors shadow-sm"
                            >
                              <Minus size={14} strokeWidth={3} />
                            </button>
                            <span className="w-4 text-center font-black text-navy-900 text-xs">{getItemQuantity(item.id)}</span>
                            <button
                              onClick={() => addItem({
                                id: item.id,
                                name: item.name,
                                price: item.price,
                                image: item.image,
                                category: item.category,
                                shopId: 'groceries',
                                isGrocery: true
                              } as any)}
                              className="w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center bg-white rounded-lg text-navy-900 hover:bg-navy-100 transition-colors shadow-sm"
                            >
                              <Plus size={14} strokeWidth={3} />
                            </button>
                          </>
                        ) : (
                          <button
                            onClick={() => addItem({
                              id: item.id,
                              name: item.name,
                              price: item.price,
                              image: item.image,
                              category: item.category,
                              shopId: 'groceries',
                              isGrocery: true
                            } as any)}
                            className="p-2 bg-navy-900 text-white rounded-xl hover:bg-accent-500 transition-colors shadow-lg shadow-navy-100"
                          >
                            <Plus size={16} strokeWidth={3} />
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </section>
      )}

      {/* Shop Listing */}
      <section>
        <div className="flex items-end justify-between mb-8 px-2">
          <div className="space-y-1">
            <h2 className="text-3xl font-black text-navy-900 tracking-tight">Popular Spots</h2>
            <p className="text-gray-400 text-sm font-bold uppercase tracking-widest">Verified Local Vendors</p>
          </div>
          <span className="text-xs font-black text-navy-600 bg-navy-50 px-4 py-2 rounded-xl">{filteredShops.length} Found</span>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <div key={i} className="h-80 bg-gray-100 animate-pulse rounded-[2rem]" />
            ))}
          </div>
        ) : filteredShops.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {filteredShops.map(shop => (
              <ShopCard key={shop.id} shop={shop} />
            ))}
          </div>
        ) : (
          <div className="text-center py-20 bg-white rounded-[3rem] border-2 border-dashed border-gray-100">
            <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <Search size={32} className="text-gray-300" />
            </div>
            <h3 className="text-xl font-black text-gray-900 mb-2">No treats found!</h3>
            <p className="text-gray-400 font-medium">Try searching for something else or browse all vendors.</p>
          </div>
        )}
      </section>
    </div>
  );
};

export default Home;
