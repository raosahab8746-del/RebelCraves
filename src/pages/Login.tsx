import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../lib/firebase';
import { motion } from 'motion/react';
import { Mail, Lock, ArrowRight, Eye, EyeOff, MessageCircle } from 'lucide-react';
import Logo from '../components/Logo';
import { useSettings } from '../hooks/useSettings';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { supportConfig } = useSettings();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await signInWithEmailAndPassword(auth, email, password);
      navigate('/');
    } catch (err: any) {
      switch (err.code) {
        case 'auth/invalid-credential':
        case 'auth/user-not-found':
        case 'auth/wrong-password':
          setError('Invalid email or password. Please check your credentials.');
          break;
        case 'auth/too-many-requests':
          setError('Too many failed attempts. Please try again later or reset your password.');
          break;
        case 'auth/user-disabled':
          setError('This account has been disabled. Please contact support.');
          break;
        default:
          setError('An error occurred during login. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-orange-50 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Decorative Elements */}
      <div className="absolute top-[-10%] left-[-10%] w-64 h-64 bg-orange-100 rounded-full blur-3xl opacity-50" />
      <div className="absolute bottom-[-10%] right-[-10%] w-96 h-96 bg-orange-200 rounded-full blur-3xl opacity-50" />
      
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white w-full max-w-md rounded-[3rem] p-10 shadow-2xl relative z-10"
      >
        <div className="text-center mb-10">
          <Logo size="lg" className="mx-auto mb-6" />
          <h1 className="text-3xl font-black text-navy-900 tracking-tighter uppercase">Welcome Back</h1>
          <p className="text-navy-400 font-bold text-xs uppercase tracking-widest mt-2">Login to your RebelCraves account</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-6">
          <div className="space-y-2">
            <label className="text-xs font-black text-navy-400 uppercase tracking-widest ml-1">Email Address</label>
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-orange-300" size={20} strokeWidth={3} />
              <input
                type="email"
                required
                className="w-full pl-12 pr-4 py-4 bg-orange-50 border-2 border-transparent rounded-2xl focus:outline-none focus:border-orange-500 focus:bg-white transition-all font-bold text-navy-900 placeholder:text-orange-300"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between items-center ml-1">
              <label className="text-xs font-black text-navy-400 uppercase tracking-widest">Password</label>
              <Link to="/forgot-password" title="Forgot Password" className="text-[10px] text-orange-600 font-black uppercase tracking-widest hover:underline">
                Forgot?
              </Link>
            </div>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-orange-300" size={20} strokeWidth={3} />
              <input
                type={showPassword ? "text" : "password"}
                required
                className="w-full pl-12 pr-12 py-4 bg-orange-50 border-2 border-transparent rounded-2xl focus:outline-none focus:border-orange-500 focus:bg-white transition-all font-bold text-navy-900 placeholder:text-orange-300"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-orange-300 hover:text-orange-500 transition-colors"
              >
                {showPassword ? <EyeOff size={20} strokeWidth={3} /> : <Eye size={20} strokeWidth={3} />}
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
            <span>{loading ? 'Logging in...' : 'Login Now'}</span>
            {!loading && <ArrowRight size={22} strokeWidth={3} />}
          </button>
        </form>

        <div className="mt-10 text-center space-y-6">
          <p className="text-sm text-navy-400 font-bold">
            Don't have an account?{' '}
            <Link to="/signup" className="text-orange-600 font-black hover:underline uppercase tracking-widest text-xs">
              Sign Up
            </Link>
          </p>

          <div className="pt-6 border-t border-orange-50 space-y-4">
            <p className="text-[10px] font-black text-navy-300 uppercase tracking-[0.2em]">Queries? Contact Us</p>
            <div className="flex items-center justify-center space-x-6">
              <a 
                href={`https://wa.me/${supportConfig.phone.replace(/[^0-9]/g, '')}`} 
                target="_blank" 
                rel="noopener noreferrer"
                className="flex items-center space-x-2 text-orange-400 hover:text-green-500 transition-colors group"
              >
                <div className="w-8 h-8 bg-orange-50 rounded-lg flex items-center justify-center group-hover:bg-green-50 transition-colors">
                  <MessageCircle size={16} strokeWidth={3} />
                </div>
                <span className="text-[10px] font-black uppercase tracking-widest">WhatsApp Support</span>
              </a>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default Login;
