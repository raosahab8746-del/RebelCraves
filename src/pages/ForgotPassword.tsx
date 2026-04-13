import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { Mail, ArrowRight, ArrowLeft, CheckCircle2 } from 'lucide-react';
import { sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '../lib/firebase';

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const navigate = useNavigate();

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await sendPasswordResetEmail(auth, email);
      setSuccess(true);
    } catch (err: any) {
      console.error('Password reset error:', err.code, err.message);
      switch (err.code) {
        case 'auth/user-not-found':
          setError('No account found with this email address.');
          break;
        case 'auth/invalid-email':
          setError('Please enter a valid email address.');
          break;
        case 'auth/too-many-requests':
          setError('Too many requests. Please try again later.');
          break;
        default:
          setError('An error occurred. Please try again.');
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
          <div className="w-16 h-16 bg-navy-900 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-xl shadow-navy-100">
            <span className="text-white font-black text-3xl italic">R</span>
          </div>
          <h1 className="text-3xl font-black text-navy-900 tracking-tighter uppercase">
            {success ? 'Email Sent!' : 'Forgot Password?'}
          </h1>
          <p className="text-gray-400 font-bold text-xs uppercase tracking-widest mt-2">
            {success 
              ? `Check your inbox at ${email} for a reset link.` 
              : 'Enter your email to receive a password reset link.'}
          </p>
        </div>

        {error && (
          <motion.div 
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            className="bg-red-50 text-red-500 text-[10px] font-black uppercase tracking-widest p-3 rounded-xl border border-red-100 mb-6"
          >
            {error}
          </motion.div>
        )}

        {success ? (
          <div className="space-y-6">
            <div className="flex justify-center">
              <div className="w-20 h-20 bg-green-50 rounded-full flex items-center justify-center text-green-500">
                <CheckCircle2 size={40} strokeWidth={3} />
              </div>
            </div>
            <div className="text-center px-4">
              <p className="text-xs font-bold text-navy-600 leading-relaxed">
                Not in inbox? Check spam!!
              </p>
            </div>
            <button
              onClick={() => navigate('/login')}
              className="w-full bg-navy-900 text-white py-4 rounded-2xl font-black text-lg flex items-center justify-center space-x-2 hover:bg-navy-800 transition-all shadow-xl shadow-navy-100 active:scale-95 uppercase tracking-tighter"
            >
              <span>Back to Login</span>
              <ArrowRight size={22} strokeWidth={3} />
            </button>
          </div>
        ) : (
          <form onSubmit={handleResetPassword} className="space-y-6">
            <div className="space-y-2">
              <label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-navy-300" size={20} strokeWidth={3} />
                <input
                  type="email"
                  required
                  className="w-full pl-12 pr-4 py-4 bg-navy-50 border-2 border-transparent rounded-2xl focus:outline-none focus:border-navy-500 focus:bg-white transition-all font-bold text-navy-900 placeholder:text-gray-300"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-navy-900 text-white py-4 rounded-2xl font-black text-lg flex items-center justify-center space-x-2 hover:bg-navy-800 transition-all shadow-xl shadow-navy-100 disabled:opacity-50 active:scale-95 uppercase tracking-tighter"
            >
              <span>{loading ? 'Sending...' : 'Send Reset Link'}</span>
              {!loading && <ArrowRight size={22} strokeWidth={3} />}
            </button>
          </form>
        )}

        {!success && (
          <div className="mt-10 text-center">
            <Link to="/login" className="text-sm text-gray-400 font-bold hover:text-navy-900 flex items-center justify-center space-x-2 transition-colors uppercase tracking-widest text-[10px]">
              <ArrowLeft size={16} strokeWidth={3} />
              <span>Back to Login</span>
            </Link>
          </div>
        )}
      </motion.div>
    </div>
  );
};

export default ForgotPassword;
