import { useState, useEffect } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { SUPPORT_CONFIG as DEFAULT_SUPPORT } from '../constants';

export const useSettings = () => {
  const [supportConfig, setSupportConfig] = useState(DEFAULT_SUPPORT);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'settings', 'support'), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setSupportConfig({
          email: data.email || DEFAULT_SUPPORT.email,
          phone: data.phone || DEFAULT_SUPPORT.phone,
          address: data.address || DEFAULT_SUPPORT.address,
        });
      }
      setLoading(false);
    }, (error) => {
      console.error('Error fetching support settings:', error);
      setLoading(false);
    });

    return () => unsub();
  }, []);

  return { supportConfig, loading };
};
