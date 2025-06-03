import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { User } from '../types';
import { getCurrentUser, signIn, signOut, signUp } from '../lib/supabase';

interface AuthState {
  user: User | null;
  isLoading: boolean;
  error: string | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string) => Promise<{ success: boolean; message?: string } | void>;
  logout: () => Promise<void>;
  checkAuthState: () => Promise<void>;
}

export const useAuthStore = create<AuthState>()(
  persist<AuthState>(
    (set) => ({
      user: null,
      isLoading: true,
      error: null,
      isAuthenticated: false,
      
      login: async (email: string, password: string) => {
        set({ isLoading: true, error: null });
        try {
          const { data, error } = await signIn(email, password);
          
          if (error) {
            set({ error: error.message, isLoading: false, isAuthenticated: false });
            return;
          }
          
          if (data?.user) {
            const { user } = await getCurrentUser();
            set({ 
              user: user ? { ...user, email: user.email || '' } : null, 
              isAuthenticated: true, 
              isLoading: false, 
              error: null 
            });
          }
        } catch {
          set({ 
            error: 'An error occurred during login', 
            isLoading: false,
            isAuthenticated: false 
          });
        }
      },
      
      register: async (email: string, password: string) => {
        set({ isLoading: true, error: null });
        try {
          const { data, error } = await signUp(email, password);
          
          if (error) {
            set({ error: error.message, isLoading: false });
            return;
          }
          
          if (data?.user) {
            // Don't auto-login - require email confirmation first
            set({ 
              user: null,
              isAuthenticated: false, 
              isLoading: false, 
              error: null 
            });
            // Success - user needs to check email
            return { success: true, message: 'Please check your email to confirm your account before signing in.' };
          }
        } catch {
          set({ 
            error: 'An error occurred during registration', 
            isLoading: false 
          });
        }
      },
      
      logout: async () => {
        set({ isLoading: true });
        try {
          const { error } = await signOut();
          
          if (error) {
            set({ error: error.message, isLoading: false });
            return;
          }
          
          set({ 
            user: null, 
            isAuthenticated: false, 
            isLoading: false, 
            error: null 
          });
        } catch {
          set({ 
            error: 'An error occurred during logout', 
            isLoading: false 
          });
        }
      },
      
      checkAuthState: async () => {
        console.log('[authStore] checkAuthState called');
        set({ isLoading: true });
        try {
          const { user, error } = await getCurrentUser();
          console.log('[authStore] getCurrentUser result:', { user, error });
          if (error || !user) {
            set({ 
              user: null, 
              isAuthenticated: false, 
              isLoading: false, 
              error: error?.message || null 
            });
            console.log('[authStore] set: not authenticated', { error });
            return;
          }
          set({ 
            user: user ? { ...user, email: user.email || '' } : null, 
            isAuthenticated: true, 
            isLoading: false, 
            error: null 
          });
          console.log('[authStore] set: authenticated', { user });
        } catch (e) {
          set({ 
            user: null, 
            isAuthenticated: false, 
            isLoading: false, 
            error: 'Failed to get authentication state' 
          });
          console.log('[authStore] set: error in checkAuthState', e);
        }
      },
    }),
    {
      name: 'auth-storage',
    }
  )
);