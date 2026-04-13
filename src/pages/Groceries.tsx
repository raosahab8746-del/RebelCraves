import React, { useEffect, useState } from 'react';
import { collection, onSnapshot, query } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { GroceryItem, GroceryCategory } from '../types';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { Search, ShoppingBasket, Plus, Minus, Tag, ChevronLeft } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Link } from 'react-router-dom';

const Groceries = () => {
  const { profile } = useAuth();
  const [items, setItems] = useState<GroceryItem[]>([]);
  const [categories, setCategories] = useState<GroceryCategory[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const { addItem, items: cartItems, updateQuantity } = useCart();

  useEffect(() => {
    const groceriesPath = 'groceries';
    const unsubGroceries = onSnapshot(collection(db, groceriesPath), (snap) => {
      setItems(snap.docs.map(d => ({ id: d.id, ...d.data() } as GroceryItem)));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, groceriesPath);
    });

    const groceryCategoriesPath = 'groceryCategories';
    const unsubGroceryCategories = onSnapshot(collection(db, groceryCategoriesPath), (snap) => {
      setCategories(snap.docs.map(d => ({ id: d.id, ...d.data() } as GroceryCategory)));
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, groceryCategoriesPath);
    });

    return () => {
      unsubGroceries();
      unsubGroceryCategories();
    };
  }, []);

  const filteredItems = items.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                         item.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = !selectedCategory || item.category === selectedCategory;
    const isInStock = !item.isOutOfStock;
    return matchesSearch && matchesCategory && isInStock;
  });

  const getItemQuantity = (itemId: string) => {
    return cartItems.find(i => i.id === itemId)?.quantity || 0;
  };

  return (
    <div className="space-y-10 pb-20">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 px-2">
        <div className="flex items-center space-x-4">
          <Link to="/" className="p-3 bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all text-navy-900">
            <ChevronLeft size={24} strokeWidth={3} />
          </Link>
          <div className="space-y-1">
            <h1 className="text-4xl font-black text-navy-900 tracking-tight uppercase">Local Grocery</h1>
            <p className="text-gray-400 font-bold uppercase tracking-widest text-xs">Blinkit-style 10-min delivery</p>
          </div>
        </div>
        <div className="relative w-full md:w-96">
          <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-navy-400" size={20} strokeWidth={3} />
          <input
            type="text"
            placeholder="Search groceries..."
            className="w-full pl-14 pr-6 py-4 bg-white border-none rounded-2xl shadow-2xl shadow-navy-100 focus:outline-none focus:ring-4 focus:ring-navy-500/20 transition-all font-bold text-navy-900"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* Categories Bar */}
      <div className="flex space-x-4 overflow-x-auto pb-4 px-2 scrollbar-hide">
        <button
          onClick={() => setSelectedCategory(null)}
          className={`flex-shrink-0 px-6 py-3 rounded-2xl text-xs font-black uppercase tracking-widest transition-all border-2 ${!selectedCategory ? 'bg-navy-900 text-white border-navy-900 shadow-xl shadow-navy-100' : 'bg-white text-navy-400 border-gray-50 hover:border-navy-200'}`}
        >
          All Items
        </button>
        {categories.map(category => (
          <button
            key={category.id}
            onClick={() => setSelectedCategory(category.name)}
            className={`flex-shrink-0 px-6 py-3 rounded-2xl text-xs font-black uppercase tracking-widest transition-all border-2 flex items-center space-x-2 ${selectedCategory === category.name ? 'bg-accent-500 text-white border-accent-500 shadow-xl shadow-accent-100' : 'bg-white text-navy-400 border-gray-50 hover:border-navy-200'}`}
          >
            <img src={category.image || undefined} alt="" className="w-5 h-5 rounded-md object-cover" referrerPolicy="no-referrer" />
            <span>{category.name}</span>
          </button>
        ))}
      </div>

      {/* Items Grid */}
      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-8">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(i => (
            <div key={i} className="aspect-[3/4] bg-gray-100 animate-pulse rounded-[2.5rem]" />
          ))}
        </div>
      ) : filteredItems.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-8">
          <AnimatePresence mode="popLayout">
            {filteredItems.map(item => {
              const quantity = getItemQuantity(item.id);
              return (
                <motion.div
                  key={item.id}
                  layout
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className="bg-white p-5 rounded-[2.5rem] border border-gray-100 shadow-sm hover:shadow-2xl hover:shadow-navy-100 transition-all group flex flex-col"
                >
                  <div className="relative aspect-square rounded-[2rem] overflow-hidden mb-5">
                    <img
                      src={item.image || undefined}
                      alt={item.name}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                      referrerPolicy="no-referrer"
                    />
                    <div className="absolute top-3 left-3 bg-white/90 backdrop-blur px-3 py-1 rounded-xl text-[8px] font-black text-navy-900 uppercase tracking-widest shadow-sm">
                      {item.category}
                    </div>
                  </div>
                  <div className="flex-1 space-y-2">
                    <h3 className="font-black text-navy-900 text-sm uppercase tracking-tight line-clamp-2 leading-tight">{item.name}</h3>
                    <p className="text-[10px] text-gray-400 font-bold line-clamp-1 uppercase tracking-widest">{item.description || 'Fresh & Quality'}</p>
                  </div>
                  <div className="mt-auto pt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex flex-col">
                      <span className="text-xs font-bold text-gray-400 line-through">₹{Math.round(item.price * 1.2)}</span>
                      <span className="text-lg font-black text-navy-900 tracking-tighter">₹{item.price}</span>
                    </div>
                    <div className="flex items-center self-start sm:self-auto space-x-1 sm:space-x-2 bg-navy-50 p-1 rounded-xl border border-navy-100 flex-shrink-0">
                      {profile?.role === 'customer' ? (
                        quantity > 0 ? (
                          <>
                            <button
                              onClick={() => updateQuantity(item.id, quantity - 1)}
                              className="w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center bg-white rounded-lg text-navy-900 hover:bg-navy-100 transition-colors shadow-sm"
                            >
                              <Minus size={14} strokeWidth={3} />
                            </button>
                            <span className="w-4 text-center font-black text-navy-900 text-xs">{quantity}</span>
                            <button
                              onClick={() => addItem({ ...item, shopId: 'groceries', isGrocery: true } as any)}
                              className="w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center bg-white rounded-lg text-navy-900 hover:bg-navy-100 transition-colors shadow-sm"
                            >
                              <Plus size={14} strokeWidth={3} />
                            </button>
                          </>
                        ) : (
                          <button
                            onClick={() => addItem({ ...item, shopId: 'groceries', isGrocery: true } as any)}
                            className="px-3 py-1.5 sm:px-4 sm:py-2 bg-navy-900 text-white rounded-lg text-[10px] font-black hover:bg-accent-500 transition-all shadow-md shadow-navy-100"
                          >
                            ADD
                          </button>
                        )
                      ) : (
                        <span className="px-2 py-1 text-[7px] font-black text-navy-400 uppercase tracking-widest">
                          Restricted
                        </span>
                      )}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      ) : (
        <div className="text-center py-20 bg-white rounded-[3rem] border-2 border-dashed border-gray-100">
          <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <ShoppingBasket size={32} className="text-gray-300" />
          </div>
          <h3 className="text-xl font-black text-gray-900 mb-2">No groceries found!</h3>
          <p className="text-gray-400 font-medium">Try searching for something else or browse all categories.</p>
        </div>
      )}
    </div>
  );
};

export default Groceries;
