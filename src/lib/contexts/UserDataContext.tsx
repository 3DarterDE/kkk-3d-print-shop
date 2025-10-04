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
  useSameAddress?: boolean;
  paymentMethod?: 'card' | 'paypal' | 'bank';
  isAdmin?: boolean;
  isVerified?: boolean;
  bonusPoints?: number;
  newsletterSubscribed?: boolean;
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
  bonusPointsCredited?: boolean;
  bonusPointsCreditedAt?: string;
  bonusPointsScheduledAt?: string;
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
  ordersLoaded: boolean;
};

const UserDataContext = createContext<UserDataContextType | undefined>(undefined);

export function UserDataProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const { isAuthenticated, loading: authLoading } = useAuth();
  const pathname = usePathname();
  const [ordersLoaded, setOrdersLoaded] = useState(false);

  const fetchUser = useCallback(async () => {
    try {
      const response = await fetch("/api/profile");
      const data = await response.json();
      setUser(data.user);
      setError(null);
    } catch (err) {
      setError(err as Error);
    }
  }, []);

  const fetchOrders = useCallback(async () => {
    try {
      const response = await fetch("/api/orders");
      const data = await response.json();
      setOrders(data.orders || []);
      setOrdersLoaded(true);
    } catch (err) {
      console.error('Failed to fetch orders:', err);
      setOrdersLoaded(true);
    }
  }, []);

  useEffect(() => {
    const loadData = async () => {
      // Wait for auth state to resolve to avoid flicker
      if (authLoading) {
        return;
      }

      // Skip entirely when not authenticated to avoid unnecessary API load
      if (!isAuthenticated) {
        setLoading(false);
        setOrdersLoaded(true);
        return;
      }

      let blockedLoading = false;
      try {
        // Only fetch orders on pages that actually need them
        const shouldFetchOrders = Boolean(
          pathname && (
            pathname.startsWith('/profile') ||
            pathname.startsWith('/orders') ||
            pathname.startsWith('/checkout') ||
            pathname.startsWith('/account') ||
            pathname.startsWith('/bonus')
          )
        );

        if (shouldFetchOrders) {
          // If orders are not yet loaded, block UI until both user and orders are fetched
          if (!ordersLoaded) {
            setLoading(true);
            blockedLoading = true;
            setOrdersLoaded(false);
            await Promise.all([fetchUser(), fetchOrders()]);
          } else {
            // Orders are already available: show instantly and refresh in background
            if (!user) {
              // Ensure user is loaded, but don't block UI
              fetchUser();
            }
            // Background refresh of orders without toggling loading
            fetchOrders();
          }
        } else {
          // Routes that don't need orders: ensure user is present
          if (!user) {
            setLoading(true);
            blockedLoading = true;
            await fetchUser();
          } else {
            // Optional background user refresh
            // fetchUser();
          }
        }
      } catch (err) {
        setError(err as Error);
      } finally {
        if (blockedLoading) {
          setLoading(false);
        }
      }
    };
    loadData();
  }, [isAuthenticated, authLoading, pathname, fetchUser, fetchOrders, ordersLoaded, user]);

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
    refetchOrders,
    ordersLoaded
  }), [user, orders, loading, error, refetchUser, refetchOrders, ordersLoaded]);

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
