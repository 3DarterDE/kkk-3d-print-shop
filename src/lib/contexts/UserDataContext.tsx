"use client";
import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '@/lib/hooks/useAuth';
import { usePathname } from 'next/navigation';

type UserProfile = {
  name?: string;
  firstName?: string;
  lastName?: string;
  salutation?: 'Herr' | 'Frau' | 'Divers';
  email?: string;
  phone?: string;
  dateOfBirth?: string;
  address?: {
    firstName?: string;
    lastName?: string;
    company?: string;
    street?: string;
    houseNumber?: string;
    addressLine2?: string;
    city?: string;
    postalCode?: string;
    country?: string;
  };
  billingAddress?: {
    firstName?: string;
    lastName?: string;
    company?: string;
    street?: string;
    houseNumber?: string;
    addressLine2?: string;
    city?: string;
    postalCode?: string;
    country?: string;
  };
  paymentMethod?: 'card' | 'paypal' | 'bank';
  isAdmin?: boolean;
  isVerified?: boolean;
  bonusPoints?: number;
  createdAt?: string;
};

type Order = { 
  _id: string;
  orderNumber: string;
  status: 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
  total: number;
  items: {
    productId: string;
    name: string;
    price: number;
    quantity: number;
    image?: string;
    variations?: Record<string, string>;
  }[];
  shippingAddress: {
    street: string;
    houseNumber: string;
    city: string;
    postalCode: string;
    country: string;
  };
  paymentMethod?: string;
  bonusPointsEarned: number;
  createdAt: string;
  updatedAt: string;
};

type UserDataContextType = {
  user: UserProfile | null;
  orders: Order[];
  loading: boolean;
  error: Error | null;
  refetchUser: () => Promise<void>;
  refetchOrders: () => Promise<void>;
};

const UserDataContext = createContext<UserDataContextType | undefined>(undefined);

export function UserDataProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const { isAuthenticated } = useAuth();
  const pathname = usePathname();

  const fetchUser = useCallback(async () => {
    try {
      const response = await fetch("/api/profile");
      const data = await response.json();
      setUser(data.user);
      setError(null);
    } catch (err) {
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchOrders = useCallback(async () => {
    try {
      const response = await fetch("/api/orders");
      const data = await response.json();
      setOrders(data.orders || []);
    } catch (err) {
      console.error('Failed to fetch orders:', err);
    }
  }, []);

  useEffect(() => {
    const loadData = async () => {
      // Skip entirely when not authenticated to avoid unnecessary API load
      if (!isAuthenticated) {
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        // Only fetch orders on pages that actually need them
        const shouldFetchOrders = Boolean(
          pathname && (
            pathname.startsWith('/profile') ||
            pathname.startsWith('/orders') ||
            pathname.startsWith('/checkout') ||
            pathname.startsWith('/account')
          )
        );

        if (shouldFetchOrders) {
          await Promise.all([fetchUser(), fetchOrders()]);
        } else {
          await fetchUser();
        }
      } catch (err) {
        setError(err as Error);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [isAuthenticated, pathname, fetchUser, fetchOrders]);

  const refetchUser = useCallback(async () => {
    setLoading(true);
    try {
      await fetchUser();
    } finally {
      setLoading(false);
    }
  }, [fetchUser]);

  const refetchOrders = useCallback(async () => {
    await fetchOrders();
  }, [fetchOrders]);

  const contextValue = useMemo(() => ({
    user,
    orders,
    loading,
    error,
    refetchUser,
    refetchOrders
  }), [user, orders, loading, error, refetchUser, refetchOrders]);

  return (
    <UserDataContext.Provider value={contextValue}>
      {children}
    </UserDataContext.Provider>
  );
}

export function useUserData() {
  const context = useContext(UserDataContext);
  if (context === undefined) {
    throw new Error('useUserData must be used within a UserDataProvider');
  }
  return context;
}
