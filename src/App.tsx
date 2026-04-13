/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { CartProvider } from './context/CartContext';
import { auth } from './lib/firebase';
import { useSettings } from './hooks/useSettings';
import Layout from './components/Layout';
import ErrorBoundary from './components/ErrorBoundary';

// Pages
import Home from './pages/Home';
import ShopDetail from './pages/ShopDetail';
import Cart from './pages/Cart';
import Checkout from './pages/Checkout';
import OrderTracking from './pages/OrderTracking';
import Login from './pages/Login';
import Signup from './pages/Signup';
import AdminDashboard from './pages/AdminDashboard';
import DeliveryDashboard from './pages/DeliveryDashboard';
import VendorDashboard from './pages/VendorDashboard';
import Groceries from './pages/Groceries';
import OrderHistory from './pages/OrderHistory';
import Contact from './pages/Contact';

import Profile from './pages/Profile';
import ForgotPassword from './pages/ForgotPassword';
import NotificationCenter from './components/NotificationCenter';

const ProtectedRoute = ({ children, role }: { children: React.ReactNode, role?: string }) => {
  const { user, profile, loading } = useAuth();
  const { supportConfig } = useSettings();

  if (loading) return <div className="flex items-center justify-center h-screen">Loading...</div>;
  if (!user) return <Navigate to="/login" />;

  if (profile?.isBlocked) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-red-50 p-6 text-center space-y-6">
        <div className="w-24 h-24 bg-red-100 rounded-[2.5rem] flex items-center justify-center text-red-600 rotate-12">
          <div className="text-4xl font-black">!</div>
        </div>
        <div className="space-y-2">
          <h1 className="text-4xl font-black text-navy-900 uppercase tracking-tighter">Account Blocked</h1>
          <p className="text-gray-500 font-bold uppercase tracking-widest text-[10px] max-w-xs mx-auto">
            Your account has been suspended by the administrator. Please contact support at <span className="text-navy-900">{supportConfig.email}</span> or <span className="text-navy-900">{supportConfig.phone}</span> if you believe this is a mistake.
          </p>
        </div>
        <button 
          onClick={() => auth.signOut()}
          className="px-8 py-3 bg-navy-900 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-navy-800 transition-all shadow-xl shadow-navy-100"
        >
          Sign Out
        </button>
      </div>
    );
  }

  if (role && profile?.role !== role) return <Navigate to="/" />;

  return <>{children}</>;
};

export default function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <NotificationCenter />
        <CartProvider>
          <BrowserRouter>
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/signup" element={<Signup />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              
              <Route path="/" element={<Layout />}>
                <Route index element={<ProtectedRoute><Home /></ProtectedRoute>} />
                <Route path="shop/:id" element={<ProtectedRoute><ShopDetail /></ProtectedRoute>} />
                <Route path="groceries" element={<ProtectedRoute><Groceries /></ProtectedRoute>} />
                <Route path="cart" element={<ProtectedRoute role="customer"><Cart /></ProtectedRoute>} />
                <Route path="profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
                <Route path="orders" element={<ProtectedRoute><OrderHistory /></ProtectedRoute>} />
                <Route path="contact" element={<Contact />} />
                <Route path="checkout" element={<ProtectedRoute role="customer"><Checkout /></ProtectedRoute>} />
                <Route path="track/:orderId" element={<ProtectedRoute><OrderTracking /></ProtectedRoute>} />
                
                {/* Admin Routes */}
                <Route path="admin" element={<ProtectedRoute role="admin"><AdminDashboard /></ProtectedRoute>} />
                
                {/* Delivery Routes */}
                <Route path="delivery" element={<ProtectedRoute role="delivery"><DeliveryDashboard /></ProtectedRoute>} />
                
                {/* Vendor Routes */}
                <Route path="vendor" element={<ProtectedRoute role="vendor"><VendorDashboard /></ProtectedRoute>} />
              </Route>
            </Routes>
          </BrowserRouter>
        </CartProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}
