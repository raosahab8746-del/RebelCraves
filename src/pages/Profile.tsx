import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { User, Mail, Phone, Calendar, Shield, Package, ChevronRight, MapPin, Plus, Trash2, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Link } from 'react-router-dom';
import { SUPER_ADMIN_CONFIG } from '../constants';
import { doc, updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { SavedAddress } from '../types';

const Profile = () => {
  const { profile, loading } = useAuth();
  const [showAddAddress, setShowAddAddress] = useState(false);
  const [newAddress, setNewAddress] = useState<{ label: string; fullAddress: string; lat?: number; lng?: number }>({ label: '', fullAddress: '' });
  const [isSaving, setIsSaving] = useState(false);

  const handleAddAddress = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile || !newAddress.label || !newAddress.fullAddress) return;

    setIsSaving(true);
    try {
      const address: SavedAddress = {
        id: Math.random().toString(36).substr(2, 9),
        label: newAddress.label,
        fullAddress: newAddress.fullAddress,
        lat: newAddress.lat,
        lng: newAddress.lng
      };

      await updateDoc(doc(db, 'users', profile.uid), {
        addresses: arrayUnion(address)
      });

      setNewAddress({ label: '', fullAddress: '' });
      setShowAddAddress(false);
    } catch (error) {
      console.error('Error adding address:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteAddress = async (address: SavedAddress) => {
    if (!profile) return;
    try {
      await updateDoc(doc(db, 'users', profile.uid), {
        addresses: arrayRemove(address)
      });
    } catch (error) {
      console.error('Error deleting address:', error);
    }
  };

  if (!profile && !loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <div className="w-20 h-20 bg-navy-50 rounded-full flex items-center justify-center text-navy-200">
          <User size={40} />
        </div>
        <h2 className="text-xl font-black text-navy-900 uppercase">Profile Not Found</h2>
        <p className="text-gray-400 font-bold text-sm">Please complete your signup or contact support.</p>
      </div>
    );
  }

  if (!profile) return null;

  return (
    <div className="max-w-3xl mx-auto space-y-10">
      <div className="space-y-2 px-2">
        <h1 className="text-4xl font-black text-navy-900 tracking-tight uppercase">Your Profile</h1>
        <p className="text-gray-400 font-bold uppercase tracking-widest text-xs">Manage your RebelCraves account</p>
      </div>

      <div className="bg-white p-10 rounded-[3rem] border border-gray-100 shadow-2xl shadow-navy-100 space-y-10">
        <div className="flex flex-col md:flex-row items-center md:items-start space-y-6 md:space-y-0 md:space-x-8">
          <div className="w-32 h-32 bg-navy-900 rounded-[2.5rem] flex items-center justify-center text-white text-5xl font-black shadow-xl shadow-navy-200 -rotate-6">
            {profile.fullName?.charAt(0) || '?'}
          </div>
          <div className="text-center md:text-left space-y-3">
            <h2 className="text-3xl font-black text-navy-900 tracking-tight uppercase">{profile.fullName}</h2>
            <div className="flex items-center space-x-2 text-navy-600 bg-navy-50 px-4 py-2 rounded-2xl text-[10px] font-black uppercase tracking-widest w-fit mx-auto md:mx-0 border border-navy-100">
              <Shield size={14} strokeWidth={3} />
              <span>{profile.email.toLowerCase() === SUPER_ADMIN_CONFIG.email.toLowerCase() ? 'admin' : profile.role}</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-10 border-t-2 border-dashed border-gray-50">
          <div className="space-y-2 group">
            <div className="flex items-center space-x-2 text-gray-400 text-[10px] font-black uppercase tracking-widest ml-1">
              <Mail size={14} strokeWidth={3} />
              <span>Email Address</span>
            </div>
            <p className="text-navy-900 font-black text-lg bg-navy-50 p-4 rounded-2xl border border-transparent group-hover:border-navy-200 transition-all">{profile.email}</p>
          </div>
          <div className="space-y-2 group">
            <div className="flex items-center space-x-2 text-gray-400 text-[10px] font-black uppercase tracking-widest ml-1">
              <Phone size={14} strokeWidth={3} />
              <span>Mobile Number</span>
            </div>
            <p className="text-navy-900 font-black text-lg bg-navy-50 p-4 rounded-2xl border border-transparent group-hover:border-navy-200 transition-all">{profile.mobileNumber || 'Not provided'}</p>
          </div>
          <div className="space-y-2 group">
            <div className="flex items-center space-x-2 text-gray-400 text-[10px] font-black uppercase tracking-widest ml-1">
              <Calendar size={14} strokeWidth={3} />
              <span>Member Since</span>
            </div>
            <p className="text-navy-900 font-black text-lg bg-navy-50 p-4 rounded-2xl border border-transparent group-hover:border-navy-200 transition-all">
              {profile.createdAt?.toDate ? profile.createdAt.toDate().toLocaleDateString() : 'Recently'}
            </p>
          </div>
        </div>
      </div>

      {/* Address Management */}
      <div className="bg-white p-10 rounded-[3rem] border border-gray-100 shadow-2xl shadow-navy-100 space-y-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3 text-navy-900">
            <div className="w-10 h-10 bg-navy-50 rounded-xl flex items-center justify-center text-navy-900">
              <MapPin size={22} strokeWidth={3} />
            </div>
            <h2 className="text-xl font-black uppercase tracking-tight">Saved Addresses</h2>
          </div>
          <button
            onClick={() => setShowAddAddress(true)}
            className="bg-navy-900 text-white px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center space-x-2 hover:bg-navy-800 transition-all active:scale-95"
          >
            <Plus size={14} strokeWidth={3} />
            <span>Add New</span>
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {profile.addresses && profile.addresses.length > 0 ? (
            profile.addresses.map((addr) => (
              <div key={addr.id} className="group relative bg-navy-50 p-6 rounded-3xl border-2 border-transparent hover:border-navy-200 transition-all">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <p className="text-[10px] font-black text-navy-400 uppercase tracking-widest">{addr.label}</p>
                    <p className="text-sm font-bold text-navy-900 leading-relaxed">{addr.fullAddress}</p>
                  </div>
                  <button
                    onClick={() => handleDeleteAddress(addr)}
                    className="text-gray-300 hover:text-red-500 transition-colors p-2"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))
          ) : (
            <div className="col-span-full py-12 text-center space-y-3 bg-gray-50 rounded-[2rem] border-2 border-dashed border-gray-100">
              <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto text-gray-200">
                <MapPin size={32} />
              </div>
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">No saved addresses yet</p>
            </div>
          )}
        </div>
      </div>

      <AnimatePresence>
        {showAddAddress && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-navy-900/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-white w-full max-w-md rounded-[3rem] shadow-2xl overflow-hidden"
            >
              <div className="p-8 bg-navy-900 text-white flex items-center justify-between">
                <h3 className="text-xl font-black uppercase tracking-tight">Add Address</h3>
                <button onClick={() => setShowAddAddress(false)} className="text-navy-300 hover:text-white transition-colors">
                  <X size={24} />
                </button>
              </div>
              <form onSubmit={handleAddAddress} className="p-8 space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Label (e.g. Home, Work)</label>
                  <input
                    required
                    type="text"
                    value={newAddress.label}
                    onChange={(e) => setNewAddress({ ...newAddress, label: e.target.value })}
                    className="w-full bg-navy-50 border-2 border-transparent rounded-2xl px-5 py-3.5 focus:outline-none focus:border-navy-500 focus:bg-white transition-all font-bold text-navy-900 placeholder:text-gray-300"
                    placeholder="Home"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Full Address</label>
                  <textarea
                    required
                    value={newAddress.fullAddress}
                    onChange={(e) => setNewAddress({ ...newAddress, fullAddress: e.target.value })}
                    className="w-full bg-navy-50 border-2 border-transparent rounded-2xl px-5 py-3.5 focus:outline-none focus:border-navy-500 focus:bg-white transition-all h-32 font-bold text-navy-900 placeholder:text-gray-300"
                    placeholder="Building, Street, Landmark..."
                  />
                  
                  <button
                    type="button"
                    onClick={() => {
                      if (navigator.geolocation) {
                        navigator.geolocation.getCurrentPosition((pos) => {
                          setNewAddress(prev => ({ ...prev, lat: pos.coords.latitude, lng: pos.coords.longitude }));
                          alert('Location detected successfully!');
                        }, (err) => {
                          alert('Failed to detect location.');
                        });
                      }
                    }}
                    className="w-full mt-2 bg-accent-50 text-accent-600 py-3 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-accent-100 transition-all flex items-center justify-center space-x-2"
                  >
                    <MapPin size={16} />
                    <span>{newAddress.lat ? 'Location Detected ✓' : 'Detect Location'}</span>
                  </button>
                </div>
                <button
                  disabled={isSaving}
                  type="submit"
                  className="w-full bg-accent-500 text-navy-900 py-4 rounded-2xl font-black uppercase tracking-widest hover:bg-accent-600 transition-all shadow-xl shadow-accent-100 disabled:opacity-50"
                >
                  {isSaving ? 'Saving...' : 'Save Address'}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <div className="bg-navy-900 p-10 rounded-[3rem] text-white space-y-8 relative overflow-hidden shadow-2xl shadow-navy-200">
        <div className="absolute top-[-20%] right-[-10%] w-64 h-64 bg-navy-800 rounded-full blur-3xl opacity-50" />
        <div className="relative z-10 space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <h3 className="text-2xl font-black uppercase tracking-tight">Local Perks</h3>
              <p className="text-navy-200 font-bold text-sm leading-relaxed max-w-md">As a RebelCraves member, you get exclusive access to lightning fast delivery from all local favorites.</p>
            </div>
            <Link 
              to="/orders" 
              className="hidden md:flex items-center space-x-2 bg-white/10 hover:bg-white/20 px-6 py-3 rounded-2xl border border-white/10 transition-all font-black uppercase tracking-widest text-[10px]"
            >
              <Package size={14} strokeWidth={3} />
              <span>Order History</span>
              <ChevronRight size={14} strokeWidth={3} />
            </Link>
          </div>
          
          <div className="flex space-x-6">
            <Link to="/orders" className="bg-white/10 backdrop-blur-md p-6 rounded-[2rem] flex-1 text-center border border-white/5 group hover:bg-white/20 transition-all">
              <p className="text-3xl font-black tracking-tighter">View</p>
              <p className="text-[10px] text-navy-300 font-black uppercase tracking-widest mt-1">Orders</p>
            </Link>
            <div className="bg-white/10 backdrop-blur-md p-6 rounded-[2rem] flex-1 text-center border border-white/5 group hover:bg-white/20 transition-all">
              <p className="text-3xl font-black tracking-tighter text-accent-400">₹0</p>
              <p className="text-[10px] text-navy-300 font-black uppercase tracking-widest mt-1">Saved</p>
            </div>
          </div>

          <Link 
            to="/orders" 
            className="md:hidden flex items-center justify-center space-x-2 bg-white/10 hover:bg-white/20 px-6 py-4 rounded-2xl border border-white/10 transition-all font-black uppercase tracking-widest text-[10px] w-full"
          >
            <Package size={14} strokeWidth={3} />
            <span>View Order History</span>
            <ChevronRight size={14} strokeWidth={3} />
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Profile;
