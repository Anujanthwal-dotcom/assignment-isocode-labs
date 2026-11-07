'use client';

import * as React from 'react';
import { apiFetch } from '../api/client';
import { CurrentUser } from '@pharmacy/shared-types';

interface AuthContextType {
  user: CurrentUser | null;
  loading: boolean;
  loginCustomer: (email: string, pass: string) => Promise<CurrentUser>;
  loginStaff: (email: string, pass: string) => Promise<CurrentUser>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<CurrentUser | null>;
}

const AuthContext = React.createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = React.useState<CurrentUser | null>(null);
  const [loading, setLoading] = React.useState<boolean>(true);

  const refreshUser = React.useCallback(async (): Promise<CurrentUser | null> => {
    try {
      const data = await apiFetch<CurrentUser>('/auth/me');
      setUser(data);
      return data;
    } catch {
      setUser(null);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  const loginCustomer = async (email: string, password: string): Promise<CurrentUser> => {
    const data = await apiFetch<CurrentUser>('/auth/customer/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    setUser(data);
    return data;
  };

  const loginStaff = async (email: string, password: string): Promise<CurrentUser> => {
    const data = await apiFetch<CurrentUser>('/auth/staff/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    setUser(data);
    return data;
  };

  const logout = async (): Promise<void> => {
    try {
      await apiFetch('/auth/logout', { method: 'POST' });
    } catch (err) {
      console.error('Logout error:', err);
    } finally {
      setUser(null);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        loginCustomer,
        loginStaff,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = React.useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
