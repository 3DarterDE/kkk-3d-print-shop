"use client";
import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef } from 'react';

type Category = {
  _id: string;
  name: string;
  slug: string;
  image?: string;
  imageSizes?: {
    thumb?: string;
    main?: string;
    small?: string;
  };
  subcategories?: Array<{
    _id: string;
    name: string;
    slug: string;
    image?: string;
    imageSizes?: {
      thumb?: string;
      main?: string;
      small?: string;
    };
  }>;
};

type Brand = {
  _id: string;
  name: string;
  slug: string;
  image?: string;
  imageSizes?: {
    thumb?: string;
    main?: string;
    small?: string;
  };
};

type Filter = {
  _id: string;
  name: string;
  type: string;
  options: Array<{
    name: string;
    value: string;
    sortOrder?: number;
    color?: string;
  }>;
  sortOrder?: number;
};

type ShopDataContextType = {
  categories: Category[];
  brands: Brand[];
  filters: Filter[];
  loading: boolean;
  error: Error | null;
  refetchCategories: () => Promise<void>;
  refetchBrands: () => Promise<void>;
  refetchFilters: () => Promise<void>;
  categoriesLoaded: boolean;
  brandsLoaded: boolean;
  filtersLoaded: boolean;
};

const ShopDataContext = createContext<ShopDataContextType | undefined>(undefined);

export function ShopDataProvider({ children }: { children: React.ReactNode }) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [filters, setFilters] = useState<Filter[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [categoriesLoaded, setCategoriesLoaded] = useState(false);
  const [brandsLoaded, setBrandsLoaded] = useState(false);
  const [filtersLoaded, setFiltersLoaded] = useState(false);

  // Request deduplication refs
  const fetchingRef = useRef({ categories: false, brands: false, filters: false });
  const sessionFetchedRef = useRef({ categories: false, brands: false, filters: false });

  const fetchCategories = useCallback(async () => {
    if (fetchingRef.current.categories) return;
    fetchingRef.current.categories = true;
    try {
      const response = await fetch("/api/shop/categories");
      const data = await response.json();
      setCategories(Array.isArray(data.categories) ? data.categories : []);
      setCategoriesLoaded(true);
      sessionFetchedRef.current.categories = true;
      setError(null);
    } catch (err) {
      setError(err as Error);
    } finally {
      fetchingRef.current.categories = false;
    }
  }, []);

  const fetchBrands = useCallback(async () => {
    if (fetchingRef.current.brands) return;
    fetchingRef.current.brands = true;
    try {
      const response = await fetch("/api/shop/brands");
      const data = await response.json();
      setBrands(Array.isArray(data) ? data : []);
      setBrandsLoaded(true);
      sessionFetchedRef.current.brands = true;
      setError(null);
    } catch (err) {
      setError(err as Error);
    } finally {
      fetchingRef.current.brands = false;
    }
  }, []);

  const fetchFilters = useCallback(async () => {
    if (fetchingRef.current.filters) return;
    fetchingRef.current.filters = true;
    try {
      const response = await fetch("/api/shop/filters");
      const data = await response.json();
      setFilters(Array.isArray(data) ? data : []);
      setFiltersLoaded(true);
      sessionFetchedRef.current.filters = true;
      setError(null);
    } catch (err) {
      setError(err as Error);
    } finally {
      fetchingRef.current.filters = false;
    }
  }, []);

  useEffect(() => {
    const loadData = async () => {
      // Load categories, brands and filters once per session
      if (!sessionFetchedRef.current.categories || !sessionFetchedRef.current.brands || !sessionFetchedRef.current.filters) {
        setLoading(true);
        await Promise.all([fetchCategories(), fetchBrands(), fetchFilters()]);
        setLoading(false);
      }
    };
    
    loadData();
  }, [fetchCategories, fetchBrands, fetchFilters]);

  const refetchCategories = useCallback(async () => {
    await fetchCategories();
  }, [fetchCategories]);

  const refetchBrands = useCallback(async () => {
    await fetchBrands();
  }, [fetchBrands]);

  const refetchFilters = useCallback(async () => {
    await fetchFilters();
  }, [fetchFilters]);

  const contextValue = useMemo(() => ({
    categories,
    brands,
    filters,
    loading,
    error,
    refetchCategories,
    refetchBrands,
    refetchFilters,
    categoriesLoaded,
    brandsLoaded,
    filtersLoaded
  }), [categories, brands, filters, loading, error, refetchCategories, refetchBrands, refetchFilters, categoriesLoaded, brandsLoaded, filtersLoaded]);

  return (
    <ShopDataContext.Provider value={contextValue}>
      {children}
    </ShopDataContext.Provider>
  );
}

export function useShopData() {
  const context = useContext(ShopDataContext);
  if (context === undefined) {
    throw new Error('useShopData must be used within a ShopDataProvider');
  }
  return context;
}
