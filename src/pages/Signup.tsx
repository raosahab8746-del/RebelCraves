import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db, handleFirestoreError, OperationType } from '../lib/firebase';
import { motion } from 'motion/react';
import { User, Mail, Lock, Phone, ArrowRight, Eye, EyeOff, MapPin } from 'lucide-react';
import Logo from '../components/Logo';
import { SUPER_ADMIN_CONFIG } from '../constants';

const Signup = () => {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [mobileNumber, setMobileNumber] = useState('');
  const [password, setPassword] = useState('');
  const [city, setCity] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const { user } = await createUserWithEmailAndPassword(auth, email, password);
      
      // Create user profile in Firestore
      const isSuperAdminEmail = email.toLowerCase() === SUPER_ADMIN_CONFIG.email.toLowerCase();
      const isAdminEmail = email.toLowerCase() === 'rebelcravesceo@gmail.com' || email.toLowerCase() === 'rebecravesceo@gmail.com';
      const userPath = `users/${user.uid}`;
      try {
        await setDoc(doc(db, 'users', user.uid), {
          uid: user.uid,
          fullName,
          email,
          mobileNumber,
          city,
          role: (isSuperAdminEmail || isAdminEmail) ? 'admin' : 'customer',
          createdAt: serverTimestamp(),
        });
      } catch (err: any) {
        console.error('Firestore setDoc error:', err);
        handleFirestoreError(err, OperationType.CREATE, userPath);
      }

      navigate('/');
    } catch (err: any) {
      let errorMessage = 'An error occurred during signup. Please try again.';
      
      if (err.message && err.message.startsWith('{')) {
        try {
          const firestoreError = JSON.parse(err.message);
          errorMessage = `Firestore Error: ${firestoreError.error} (Op: ${firestoreError.operationType})`;
        } catch (e) {}
      }

      switch (err.code) {
        case 'auth/email-already-in-use':
          setError('This email is already registered. Try logging in.');
          break;
        case 'auth/weak-password':
          setError('Password should be at least 6 characters long.');
          break;
        case 'auth/invalid-email':
          setError('Please enter a valid email address.');
          break;
        case 'auth/operation-not-allowed':
          setError('Email/password signup is not enabled. Please contact support.');
          break;
        default:
          setError(errorMessage);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-navy-900 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Decorative Elements */}
      <div className="absolute top-[-10%] right-[-10%] w-64 h-64 bg-navy-800 rounded-full blur-3xl opacity-50" />
      <div className="absolute bottom-[-10%] left-[-10%] w-96 h-96 bg-navy-700 rounded-full blur-3xl opacity-50" />
      
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white w-full max-w-md rounded-[3rem] p-10 shadow-2xl relative z-10"
      >
        <div className="text-center mb-10">
          <Logo size="lg" className="mx-auto mb-6" />
          <h1 className="text-3xl font-black text-navy-900 tracking-tighter uppercase">Join RebelCraves</h1>
          <p className="text-gray-400 font-bold text-xs uppercase tracking-widest mt-2">Create your local companion account</p>
        </div>

        <form onSubmit={handleSignup} className="space-y-5">
          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Full Name</label>
            <div className="relative">
              <User className="absolute left-4 top-1/2 -translate-y-1/2 text-navy-300" size={18} strokeWidth={3} />
              <input
                type="text"
                required
                className="w-full pl-12 pr-4 py-3.5 bg-navy-50 border-2 border-transparent rounded-2xl focus:outline-none focus:border-navy-500 focus:bg-white transition-all font-bold text-navy-900 placeholder:text-gray-300 text-sm"
                placeholder="John Doe"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Email Address</label>
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-navy-300" size={18} strokeWidth={3} />
              <input
                type="email"
                required
                className="w-full pl-12 pr-4 py-3.5 bg-navy-50 border-2 border-transparent rounded-2xl focus:outline-none focus:border-navy-500 focus:bg-white transition-all font-bold text-navy-900 placeholder:text-gray-300 text-sm"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Mobile Number</label>
            <div className="relative">
              <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-navy-300" size={18} strokeWidth={3} />
              <input
                type="tel"
                required
                className="w-full pl-12 pr-4 py-3.5 bg-navy-50 border-2 border-transparent rounded-2xl focus:outline-none focus:border-navy-500 focus:bg-white transition-all font-bold text-navy-900 placeholder:text-gray-300 text-sm"
                placeholder="+91 98765 43210"
                value={mobileNumber}
                onChange={(e) => setMobileNumber(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">City</label>
            <div className="relative">
              <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-navy-300" size={18} strokeWidth={3} />
              <input
                type="text"
                required
                className="w-full pl-12 pr-4 py-3.5 bg-navy-50 border-2 border-transparent rounded-2xl focus:outline-none focus:border-navy-500 focus:bg-white transition-all font-bold text-navy-900 placeholder:text-gray-300 text-sm"
                placeholder="e.g. Mumbai"
                value={city}
                onChange={(e) => setCity(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Password</label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-navy-300" size={18} strokeWidth={3} />
              <input
                type={showPassword ? "text" : "password"}
                required
                className="w-full pl-12 pr-12 py-3.5 bg-navy-50 border-2 border-transparent rounded-2xl focus:outline-none focus:border-navy-500 focus:bg-white transition-all font-bold text-navy-900 placeholder:text-gray-300 text-sm"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-navy-300 hover:text-navy-500 transition-colors"
              >
                {showPassword ? <EyeOff size={18} strokeWidth={3} /> : <Eye size={18} strokeWidth={3} />}
              </button>
            </div>
          </div>

          {error && (
            <motion.div 
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              className="bg-red-50 text-red-500 text-[10px] font-black uppercase tracking-widest p-3 rounded-xl border border-red-100"
            >
              {error}
            </motion.div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-navy-900 text-white py-4 rounded-2xl font-black text-lg flex items-center justify-center space-x-2 hover:bg-navy-800 transition-all shadow-xl shadow-navy-100 disabled:opacity-50 active:scale-95 uppercase tracking-tighter"
          >
            <span>{loading ? 'Creating...' : 'Sign Up Now'}</span>
            {!loading && <ArrowRight size={22} strokeWidth={3} />}
          </button>
        </form>

        <div className="mt-10 text-center">
          <p className="text-sm text-gray-400 font-bold">
            Already have an account?{' '}
            <Link to="/login" className="text-navy-600 font-black hover:underline uppercase tracking-widest text-xs">
              Login
            </Link>
          </p>
        </div>
      </motion.div>
    </div>
  );
};

export default Signup;
