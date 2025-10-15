"use client";
import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useAuth } from '@/lib/hooks/useAuth';
import { usePathname } from 'next/navigation';

type UserProfile = {
  name?: string;
  firstName?: string;
  lastName?: string;
  salutation?: 'Herr' | 'Frau' | 'Divers';
  email?: string;
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
  status: 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled' | 'return_requested' | 'return_completed';
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

  // Request deduplication refs
  const fetchingRef = useRef({ user: false, orders: false });
  const sessionFetchedRef = useRef({ orders: false });

  const fetchUser = useCallback(async () => {
    if (fetchingRef.current.user) return;
    fetchingRef.current.user = true;
    try {
      const response = await fetch("/api/profile");
      const data = await response.json();
      setUser(data.user);
      setError(null);
    } catch (err) {
      setError(err as Error);
    } finally {
      fetchingRef.current.user = false;
    }
  }, []);

  const fetchOrders = useCallback(async () => {
    if (fetchingRef.current.orders) return;
    fetchingRef.current.orders = true;
    try {
      const response = await fetch("/api/orders");
      const data = await response.json();
      setOrders(data.orders || []);
      setOrdersLoaded(true);
      sessionFetchedRef.current.orders = true;
    } catch (err) {
      console.error('Failed to fetch orders:', err);
      setOrdersLoaded(true);
    } finally {
      fetchingRef.current.orders = false;
    }
  }, []);

  useEffect(() => {
    const pathnameRef = pathname; // Capture current pathname
    
    const loadData = async () => {
      if (authLoading) return;
      if (!isAuthenticated) {
        setLoading(false);
        setOrdersLoaded(true);
        return;
      }

      const shouldFetchOrders = Boolean(
        pathnameRef && (
          pathnameRef.startsWith('/profile') ||
          pathnameRef.startsWith('/orders') ||
          pathnameRef.startsWith('/checkout') ||
          pathnameRef.startsWith('/account') ||
          pathnameRef.startsWith('/bonus')
        )
      );

      if (shouldFetchOrders && !sessionFetchedRef.current.orders) {
        setLoading(true);
        await Promise.all([fetchUser(), fetchOrders()]);
        setLoading(false);
      } else if (!user && !shouldFetchOrders) {
        setLoading(true);
        await fetchUser();
        setLoading(false);
      }
    };
    
    loadData();
  }, [isAuthenticated, authLoading, fetchUser, fetchOrders, user]);

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
