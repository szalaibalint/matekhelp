import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { ViewerUser, ViewerAuthService } from '../services/ViewerAuthService';

interface ViewerAuthContextType {
  user: ViewerUser | null;
  isLoggedIn: boolean;
  login: (emailOrUsername: string, password: string) => Promise<{ success: boolean; error?: string }>;
  register: (email: string, username: string, password: string, fullName?: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  updateProfile: (updates: Partial<ViewerUser>) => Promise<{ success: boolean; error?: string }>;
}

const ViewerAuthContext = createContext<ViewerAuthContextType | undefined>(undefined);

export const ViewerAuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<ViewerUser | null>(null);

  useEffect(() => {
    // Check for existing session on mount
    const currentUser = ViewerAuthService.getCurrentUser();
    setUser(currentUser);
  }, []);

  const login = async (emailOrUsername: string, password: string) => {
    const result = await ViewerAuthService.login(emailOrUsername, password);
    if (result.user) {
      setUser(result.user);
      return { success: true };
    }
    return { success: false, error: result.error };
  };

  const register = async (email: string, username: string, password: string, fullName?: string) => {
    const result = await ViewerAuthService.register(email, username, password, fullName);
    if (result.user) {
      setUser(result.user);
      return { success: true };
    }
    return { success: false, error: result.error };
  };

  const logout = () => {
    ViewerAuthService.logout();
    setUser(null);
  };

  const updateProfile = async (updates: Partial<ViewerUser>) => {
    if (!user) return { success: false, error: 'Nincs bejelentkezve' };
    
    const result = await ViewerAuthService.updateProfile(user.id, updates);
    if (result.success) {
      setUser({ ...user, ...updates });
    }
    return result;
  };

  return (
    <ViewerAuthContext.Provider
      value={{
        user,
        isLoggedIn: !!user,
        login,
        register,
        logout,
        updateProfile
      }}
    >
      {children}
    </ViewerAuthContext.Provider>
  );
};

export const useViewerAuth = () => {
  const context = useContext(ViewerAuthContext);
  if (context === undefined) {
    throw new Error('useViewerAuth must be used within ViewerAuthProvider');
  }
  return context;
};
