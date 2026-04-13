import React from 'react';
import { Link, Outlet, useNavigate } from 'react-router-dom';
import { ShoppingCart, User, LogOut, MapPin, Package } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { auth } from '../lib/firebase';
import { motion } from 'motion/react';
import Logo from './Logo';
import BannerSlider from './BannerSlider';
import NotificationCenter from './NotificationCenter';

const Navbar = () => {
  const { user, profile } = useAuth();
  const { items } = useCart();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await auth.signOut();
    navigate('/login');
  };

  return (
    <nav className="bg-rich-black border-b border-white/5 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          <Link to="/" className="flex items-center space-x-2">
            <Logo showText />
          </Link>

          <div className="flex items-center space-x-4 sm:space-x-6">
            {profile?.role === 'customer' && (
              <Link to="/cart" className="relative p-2 text-gray-300 hover:text-accent-500 transition-colors">
                <ShoppingCart size={24} />
                {items.length > 0 && (
                  <span className="absolute -top-1 -right-1 bg-accent-500 text-navy-900 text-[10px] font-black w-5 h-5 rounded-full flex items-center justify-center border-2 border-rich-black shadow-sm">
                    {items.length}
                  </span>
                )}
              </Link>
            )}

            {user && profile?.role === 'customer' && (
              <Link to="/orders" className="p-2 text-gray-300 hover:text-accent-500 transition-colors hidden sm:block">
                <Package size={24} />
              </Link>
            )}

            {user ? (
              <div className="flex items-center space-x-3 sm:space-x-4">
                <Link 
                  to={
                    profile?.role === 'admin' ? '/admin' : 
                    profile?.role === 'delivery' ? '/delivery' : 
                    profile?.role === 'vendor' ? '/vendor' : 
                    '/profile'
                  } 
                  className="flex items-center space-x-2 text-gray-300 hover:text-accent-500 group"
                >
                  <div className="w-8 h-8 bg-white/10 rounded-full flex items-center justify-center text-white group-hover:bg-white/20 transition-colors">
                    <User size={18} />
                  </div>
                  <span className="hidden sm:inline text-sm font-bold">{profile?.fullName?.split(' ')[0] || 'User'}</span>
                </Link>
                <button onClick={handleLogout} className="p-2 text-gray-400 hover:text-red-500 transition-colors">
                  <LogOut size={20} />
                </button>
              </div>
            ) : (
              <Link to="/login" className="bg-navy-900 text-white px-6 py-2 rounded-xl text-sm font-bold hover:bg-navy-800 transition-all shadow-md shadow-navy-100 active:scale-95">
                Login
              </Link>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};

const Layout = () => {
  return (
    <div className="min-h-screen font-sans flex flex-col">
      <NotificationCenter />
      <Navbar />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-grow w-full">
        <BannerSlider />
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <Outlet />
        </motion.div>
      </main>
      <footer className="bg-rich-black border-t border-white/5 py-12 mt-auto">
        <div className="max-w-7xl mx-auto px-4 text-center space-y-4">
          <div className="flex items-center justify-center space-x-2">
            <Logo size="sm" />
            <span className="text-lg font-black text-white tracking-tighter">RebelCraves</span>
          </div>
          <p className="text-gray-400 text-sm font-medium">
            &copy; 2026 RebelCraves. Hyperlocal food delivery for your city.
          </p>
          <div className="pt-2">
            <Link to="/contact" className="text-[10px] font-black text-accent-500 uppercase tracking-widest hover:text-white transition-colors">
              Contact Support
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Layout;
