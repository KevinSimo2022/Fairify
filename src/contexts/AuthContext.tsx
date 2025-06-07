import React, { createContext, useContext, useState, useEffect } from 'react';
import { 
  User as FirebaseUser,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  updateProfile
} from 'firebase/auth';
import { auth, googleProvider, functions } from '../lib/firebase';
import { httpsCallable } from 'firebase/functions';
import { useNavigate } from 'react-router-dom';

interface User {
  id: string;
  email: string;
  name: string;
  role: 'user' | 'admin';
  avatar?: string;
  twoFactorEnabled: boolean;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  logout: () => void;
  register: (email: string, password: string, name: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);  
  const navigate = useNavigate();

  useEffect(() => {
    let mounted = true;
    
    // Set a timeout to prevent hanging
    const timeoutId = setTimeout(() => {
      if (mounted && isLoading) {
        console.warn('Auth initialization timeout');
        setIsLoading(false);
      }
    }, 3000);

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser: FirebaseUser | null) => {
      console.log('Auth state changed:', firebaseUser);
      if (!mounted) return;
      
      clearTimeout(timeoutId);
      
      if (firebaseUser) {
        // Use basic Firebase user data for now to avoid function call issues
        const userProfile: User = {
          id: firebaseUser.uid,
          email: firebaseUser.email || '',
          name: firebaseUser.displayName || 'User',
          role: 'user',
          avatar: firebaseUser.photoURL,
          twoFactorEnabled: false
        };
        setUser(userProfile);
      } else {
        setUser(null);
      }
      
      if (mounted) {
        setIsLoading(false);
      }
    });

    return () => {
      mounted = false;
      clearTimeout(timeoutId);
      unsubscribe();
    };
  }, []);
  const login = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
      // User state will be updated by onAuthStateChanged
    } catch (error: any) {
      setIsLoading(false);
      console.error('Login error:', error);
      throw new Error(error.message || 'Failed to sign in');
    }
  };  const loginWithGoogle = async () => {
    setIsLoading(true);
    try {
      const result = await signInWithPopup(auth, googleProvider);
        // Try to create user profile in Firestore if it's a new user (optional)
      if (result.user) {
        try {
          const createUserProfile = httpsCallable(functions, 'createUserProfileCallable');
          await createUserProfile({
            name: result.user.displayName || 'Google User',
            avatar: result.user.photoURL
          });
          console.log('User profile created successfully');
        } catch (profileError) {
          console.warn('Failed to create user profile, but login succeeded:', profileError);
          // Don't fail the login if profile creation fails
        }
      }
      // User state will be updated by onAuthStateChanged
    } catch (error: any) {
      setIsLoading(false);
      console.error('Google login error:', error);
      throw new Error(error.message || 'Failed to sign in with Google');
    }
  };  const register = async (email: string, password: string, name: string) => {
    setIsLoading(true);
    try {
      if (auth.currentUser) {
        await signOut(auth);
        await new Promise(resolve => setTimeout(resolve, 500));
      }

      const result = await createUserWithEmailAndPassword(auth, email, password);
      await updateProfile(result.user, { displayName: name });      // Try to create user profile in Firestore (optional)
      try {
        const createUserProfile = httpsCallable(functions, 'createUserProfileCallable');
        await createUserProfile({ name });
        console.log('User profile created successfully');
      } catch (profileError) {
        console.warn('Failed to create user profile, but registration succeeded:', profileError);
        // Don't fail the registration if profile creation fails
      }

      // Automatically log in the user
      setUser({
        id: result.user.uid,
        email: result.user.email || '',
        name: name,
        role: 'user',
        avatar: result.user.photoURL,
        twoFactorEnabled: false
      });

      navigate('/');
    } catch (error: any) {
      setIsLoading(false);
      console.error('Registration error:', error);
      throw new Error(error.message || 'Failed to create account');
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
      // User state will be updated by onAuthStateChanged
    } catch (error: any) {
      throw new Error(error.message || 'Failed to sign out');
    }
  };

  return (
    <AuthContext.Provider value={{
      user,
      isLoading,
      login,
      loginWithGoogle,
      logout,
      register
    }}>
      {children}
    </AuthContext.Provider>
  );
};
