import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, getDoc, onSnapshot } from 'firebase/firestore';
import { auth, db, handleFirestoreError, OperationType } from '../lib/firebase';
import { UserProfile } from '../types';
import { SUPER_ADMIN_CONFIG } from '../constants';

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  isSuperAdmin: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  loading: true,
  isSuperAdmin: false,
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let unsubProfile: (() => void) | undefined;

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      
      // Clean up previous listener if it exists
      if (unsubProfile) {
        unsubProfile();
        unsubProfile = undefined;
      }

      if (firebaseUser) {
        // Listen to profile changes
        const profilePath = `users/${firebaseUser.uid}`;
        const profileRef = doc(db, 'users', firebaseUser.uid);
        unsubProfile = onSnapshot(profileRef, (docSnap) => {
          if (docSnap.exists()) {
            const profileData = { ...docSnap.data(), uid: docSnap.id } as UserProfile;
            // Force admin role for super admin email
            if (profileData.email.toLowerCase() === SUPER_ADMIN_CONFIG.email.toLowerCase()) {
              profileData.role = 'admin';
            }
            setProfile(profileData);
          } else if (firebaseUser.email?.toLowerCase() === SUPER_ADMIN_CONFIG.email.toLowerCase() || firebaseUser.email?.toLowerCase() === 'raosahab8746@gmail.com') {
            // Virtual profile for super admin if document doesn't exist yet
            setProfile({
              uid: firebaseUser.uid,
              email: firebaseUser.email,
              fullName: firebaseUser.displayName || 'Super Admin',
              role: 'admin',
              createdAt: { toDate: () => new Date() } as any,
              city: ''
            });
          }
          setLoading(false);
        }, (error) => {
          // Only throw if we are still authenticated (prevents errors on sign out)
          if (auth.currentUser) {
            handleFirestoreError(error, OperationType.GET, profilePath, firebaseUser);
          }
          setLoading(false);
        });
      } else {
        setProfile(null);
        setLoading(false);
      }
    });

    return () => {
      unsubscribe();
      if (unsubProfile) {
        unsubProfile();
      }
    };
  }, []);

  const isSuperAdmin = (profile?.email?.toLowerCase() === SUPER_ADMIN_CONFIG.email.toLowerCase() || 
                      profile?.email?.toLowerCase() === 'rebelcravesceo@gmail.com' ||
                      profile?.email?.toLowerCase() === 'rebecravesceo@gmail.com' ||
                      profile?.email?.toLowerCase() === 'raosahab8746@gmail.com') ||
                     (user?.email?.toLowerCase() === SUPER_ADMIN_CONFIG.email.toLowerCase() ||
                      user?.email?.toLowerCase() === 'rebelcravesceo@gmail.com' ||
                      user?.email?.toLowerCase() === 'rebecravesceo@gmail.com' ||
                      user?.email?.toLowerCase() === 'raosahab8746@gmail.com') ||
                     user?.uid === 'Sj5xkRVdOPaq5JTpDEDnuRoob0X2' ||
                     user?.uid === 'DzOWDgsIMtdJcv0qzioJvRyUkQp2';

  return (
    <AuthContext.Provider value={{ user, profile, loading, isSuperAdmin }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
