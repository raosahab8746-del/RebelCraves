import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { AppBanner } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../context/AuthContext';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const BannerSlider = () => {
  const [banners, setBanners] = useState<AppBanner[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const { profile } = useAuth();

  useEffect(() => {
    const q = query(collection(db, 'banners'), where('active', '==', true));
    const unsub = onSnapshot(q, (snap) => {
      const fetchedBanners = snap.docs.map(d => ({ id: d.id, ...d.data() } as AppBanner));
      // Filter by city if banner has city and user has city
      const filtered = fetchedBanners.filter(b => !b.city || b.city === profile?.city);
      setBanners(filtered);
    });
    return () => unsub();
  }, [profile?.city]);

  useEffect(() => {
    if (banners.length <= 1) return;
    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % banners.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [banners.length]);

  if (banners.length === 0) return null;

  const next = () => setCurrentIndex((prev) => (prev + 1) % banners.length);
  const prev = () => setCurrentIndex((prev) => (prev - 1 + banners.length) % banners.length);

  return (
    <div className="relative w-full h-[200px] sm:h-[300px] md:h-[400px] overflow-hidden rounded-[2.5rem] mb-8 group shadow-2xl shadow-navy-900/20">
      <AnimatePresence mode="wait">
        <motion.div
          key={banners[currentIndex].id}
          initial={{ opacity: 0, x: 100 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -100 }}
          transition={{ duration: 0.5, ease: "easeInOut" }}
          className="absolute inset-0 w-full h-full"
        >
          <div className="relative w-full h-full bg-navy-900 flex items-center overflow-hidden">
            {/* Background Image with Gradient Overlay */}
            <div className="absolute right-0 top-0 w-full h-full md:w-2/3">
              <img 
                src={banners[currentIndex].image || undefined} 
                alt={banners[currentIndex].title || 'Banner'} 
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
              <div className="absolute inset-0 bg-gradient-to-r from-navy-900 via-navy-900/80 to-transparent" />
            </div>

            {/* Content */}
            <div className="relative z-10 px-8 sm:px-16 md:px-24 max-w-2xl space-y-4 sm:space-y-6">
              <div className="inline-flex items-center space-x-2 bg-white/10 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/10">
                <div className="w-2 h-2 rounded-full bg-accent-500 animate-pulse" />
                <span className="text-[10px] font-black text-white uppercase tracking-widest">Live in your city</span>
              </div>
              
              <div className="space-y-2">
                <h2 className="text-3xl sm:text-5xl md:text-6xl font-black text-white tracking-tighter leading-none">
                  {banners[currentIndex].title?.split(' ').map((word, i) => (
                    <span key={i} className={i === 1 ? 'text-accent-500 block' : ''}>
                      {word}{' '}
                    </span>
                  )) || 'Hungry? RebelCraves it!'}
                </h2>
                <p className="text-gray-400 text-xs sm:text-sm font-bold uppercase tracking-widest max-w-sm">
                  Hyperlocal fast city delivery. Your favorite food, delivered fast!
                </p>
              </div>

              {banners[currentIndex].link && (
                <a 
                  href={banners[currentIndex].link}
                  className="inline-block px-8 py-3 bg-accent-500 text-navy-900 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-white transition-all shadow-xl shadow-accent-500/20 active:scale-95"
                >
                  Order Now
                </a>
              )}
            </div>
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Navigation Buttons */}
      {banners.length > 1 && (
        <>
          <button 
            onClick={prev}
            className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/10 backdrop-blur-md rounded-full flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-white/20"
          >
            <ChevronLeft size={20} />
          </button>
          <button 
            onClick={next}
            className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/10 backdrop-blur-md rounded-full flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-white/20"
          >
            <ChevronRight size={20} />
          </button>

          {/* Indicators */}
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex space-x-2">
            {banners.map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrentIndex(i)}
                className={`w-2 h-2 rounded-full transition-all ${i === currentIndex ? 'bg-accent-500 w-6' : 'bg-white/30'}`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
};

export default BannerSlider;
