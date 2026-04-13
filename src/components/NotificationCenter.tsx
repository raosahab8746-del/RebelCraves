import React, { useEffect, useState, useRef } from 'react';
import { collection, query, where, onSnapshot, orderBy, limit, addDoc, serverTimestamp, doc, updateDoc, deleteDoc, or } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { useAuth } from '../context/AuthContext';
import { AppNotification } from '../types';
import { Bell, X, CheckCircle2, Info, AlertTriangle, Package, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export const sendNotification = async (notification: Omit<AppNotification, 'id' | 'createdAt' | 'read'>) => {
  try {
    await addDoc(collection(db, 'notifications'), {
      ...notification,
      read: false,
      createdAt: serverTimestamp()
    });
  } catch (error) {
    console.error('Error sending notification:', error);
  }
};

const NotificationCenter: React.FC = () => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [showToast, setShowToast] = useState<AppNotification | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const lastShownNotificationId = useRef<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    // Initialize audio with a more intense "crazy" sound
    audioRef.current = new Audio('https://assets.mixkit.co/active_storage/sfx/951/951-preview.mp3');
    
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, 'notifications'),
      or(
        where('userId', '==', user.uid),
        where('type', '==', 'broadcast')
      ),
      orderBy('createdAt', 'desc'),
      limit(5)
    );

    const unsub = onSnapshot(q, (snap) => {
      const newNotifications = snap.docs.map(d => ({ id: d.id, ...d.data() } as AppNotification));
      
      // Check for new unread notification to show toast
      const latest = newNotifications[0];
      const isBroadcast = latest?.type === 'broadcast';
      
      if (latest && (isBroadcast || !latest.read) && latest.id !== lastShownNotificationId.current) {
        lastShownNotificationId.current = latest.id;
        setShowToast(latest);
        
        // Play sound
        if (audioRef.current) {
          audioRef.current.currentTime = 0;
          audioRef.current.play().catch(e => console.log('Audio play failed:', e));
        }

        // Trigger native browser push notification
        if ('Notification' in window && Notification.permission === 'granted') {
          new Notification(latest.title, {
            body: latest.message,
            icon: '/favicon.ico',
            silent: false
          });
        }
      }
      
      setNotifications(newNotifications);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'notifications');
    });

    return () => unsub();
  }, [user]);

  const markAsRead = async (notification: AppNotification) => {
    if (notification.type === 'broadcast') return;
    try {
      await updateDoc(doc(db, 'notifications', notification.id), { read: true });
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  useEffect(() => {
    if (showToast) {
      const timer = setTimeout(() => {
        setShowToast(null);
      }, 10000); // 10 seconds
      return () => clearTimeout(timer);
    }
  }, [showToast]);

  if (!user) return null;

  return (
    <>
      {/* Toast Notification - Centered at top like AI Studio */}
      <AnimatePresence>
        {showToast && (
          <div className="fixed top-0 left-0 right-0 z-[100] flex justify-center p-6 pointer-events-none">
            <motion.div
              initial={{ opacity: 0, y: -100, scale: 0.8, rotate: -5 }}
              animate={{ 
                opacity: 1, 
                y: 0, 
                scale: 1, 
                rotate: [0, -2, 2, -2, 2, 0], // Shake animation
                transition: {
                  rotate: {
                    repeat: Infinity,
                    duration: 0.5,
                    repeatDelay: 2
                  },
                  type: "spring",
                  stiffness: 300,
                  damping: 15
                }
              }}
              exit={{ opacity: 0, y: -100, scale: 0.8, rotate: 5 }}
              className="pointer-events-auto w-full max-w-md bg-navy-900 text-white p-6 rounded-[3rem] shadow-[0_50px_100px_rgba(0,0,0,0.5)] border-4 border-accent-500 flex items-center space-x-6 cursor-pointer group relative overflow-hidden"
              onClick={() => {
                markAsRead(showToast);
                setShowToast(null);
              }}
            >
              {/* Animated background pulse - more intense */}
              <div className="absolute inset-0 bg-accent-500/20 animate-pulse pointer-events-none" />
              <div className="absolute -inset-full bg-gradient-to-r from-transparent via-white/10 to-transparent -rotate-45 translate-x-[-100%] animate-[shimmer_2s_infinite] pointer-events-none" />
              
              <div className="w-16 h-16 bg-accent-500 text-navy-900 rounded-[1.5rem] flex items-center justify-center flex-shrink-0 shadow-lg shadow-accent-500/40 group-hover:rotate-12 transition-transform relative z-10">
                <Bell size={32} strokeWidth={3} className="animate-bounce" />
              </div>
              <div className="flex-1 min-w-0 relative z-10">
                <div className="flex items-center space-x-2 mb-1">
                  <span className="w-2 h-2 bg-accent-500 rounded-full animate-ping" />
                  <h4 className="text-xl font-black uppercase tracking-tighter leading-none text-accent-500">{showToast.title}</h4>
                </div>
                <p className="text-sm font-bold text-gray-200 line-clamp-2 leading-tight">{showToast.message}</p>
              </div>
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  setShowToast(null);
                }} 
                className="w-12 h-12 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center text-white transition-all relative z-10"
              >
                <X size={24} strokeWidth={3} />
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
};

export default NotificationCenter;
