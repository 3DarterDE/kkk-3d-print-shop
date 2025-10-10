"use client";

import React, { useState, useEffect } from 'react';
import DateRangeFilter, { DateRangePreset } from '@/components/admin/DateRangeFilter';
import StatCard from '@/components/admin/StatCard';

interface ProductsData {
  totalProductsSold: number;
  totalOrders: number;
  avgProductsPerOrder: number;
  topProducts: Array<{
    productId: string;
    name: string;
    totalQuantity: number;
    totalRevenue: number;
    orderCount: number;
  }>;
  categoryStats: Array<{
    categoryName: string;
    totalQuantity: number;
    totalRevenue: number;
    productCount: number;
  }>;
  brandStats: Array<{
    brandName: string;
    totalQuantity: number;
    totalRevenue: number;
    productCount: number;
  }>;
  lowStockProducts: {
    items: Array<{
      title: string;
      sku: string;
      stockQuantity: number;
      inStock: boolean;
      price: number;
      variation: string | null;
    }>;
    pagination: {
      currentPage: number;
      totalPages: number;
      totalItems: number;
      itemsPerPage: number;
      hasNextPage: boolean;
      hasPrevPage: boolean;
    };
  };
  unsoldProducts: {
    items: Array<{
      title: string;
      sku: string;
      price: number;
      createdAt: string;
    }>;
    pagination: {
      currentPage: number;
      totalPages: number;
      totalItems: number;
      itemsPerPage: number;
      hasNextPage: boolean;
      hasPrevPage: boolean;
    };
  };
}

export default function ProductsAnalyticsPage() {
  const [data, setData] = useState<ProductsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState<{ start: Date | null; end: Date | null; preset: DateRangePreset }>({
    start: null,
    end: null,
    preset: 'all'
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [unsoldPage, setUnsoldPage] = useState(1);
  const [stockSortOrder, setStockSortOrder] = useState<'asc' | 'desc'>('asc');

  useEffect(() => {
    fetchData();
  }, [dateRange, currentPage, unsoldPage, stockSortOrder]);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();
      if (dateRange.start) {
        params.append('startDate', dateRange.start.toISOString());
      }
      if (dateRange.end) {
        params.append('endDate', dateRange.end.toISOString());
      }
      params.append('page', currentPage.toString());
      params.append('limit', '25');
      params.append('unsoldPage', unsoldPage.toString());
      params.append('stockSortOrder', stockSortOrder);

      const response = await fetch(`/api/admin/analytics/products?${params.toString()}`);
      const result = await response.json();

      if (result.success) {
        setData(result.data);
      } else {
        setError(result.error || 'Failed to fetch data');
      }
    } catch (err) {
      setError('Failed to fetch products analytics');
      console.error('Products analytics error:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (euros: number) => {
    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: 'EUR'
    }).format(euros);
  };

  const handleDateRangeChange = (start: Date | null, end: Date | null, preset: DateRangePreset) => {
    setDateRange({ start, end, preset });
  };

  if (loading && !data) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Lade Produktstatistiken...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-500 text-xl mb-4">⚠️</div>
          <p className="text-red-600 mb-4">{error}</p>
          <button
            onClick={fetchData}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Erneut versuchen
          </button>
        </div>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Produkt-Statistiken</h1>
          <p className="mt-2 text-gray-600">Analyse von Verkäufen und Produktperformance</p>
        </div>

        {/* Date Range Filter */}
        <div className="mb-6">
          <DateRangeFilter
            onRangeChange={handleDateRangeChange}
            currentPreset={dateRange.preset}
          />
        </div>

        {/* Main Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          <StatCard
            title="Verkaufte Produkte"
            value={data.totalProductsSold.toLocaleString('de-DE')}
            icon={
              <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
            }
          />

          <StatCard
            title="Bestellungen"
            value={data.totalOrders}
            icon={
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
              </svg>
            }
          />

          <StatCard
            title="Ø Produkte pro Bestellung"
            value={data.avgProductsPerOrder.toFixed(1)}
            icon={
              <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
            }
          />
        </div>

        {/* Top Products */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Top 20 meistverkaufte Produkte</h3>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead>
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Produkt
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Verkaufte Menge
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Umsatz
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Bestellungen
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {data.topProducts.map((product, index) => (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">
                      {product.name}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 text-right">
                      {product.totalQuantity}
                    </td>
                    <td className="px-4 py-3 text-sm font-semibold text-gray-900 text-right">
                      {formatCurrency(product.totalRevenue)}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 text-right">
                      {product.orderCount}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Category and Brand Stats */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Verkäufe nach Kategorie</h3>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead>
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Kategorie
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Menge
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Umsatz
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {data.categoryStats.map((category, index) => (
                    <tr key={index} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">
                        {category.categoryName}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600 text-right">
                        {category.totalQuantity}
                      </td>
                      <td className="px-4 py-3 text-sm font-semibold text-gray-900 text-right">
                        {formatCurrency(category.totalRevenue)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Verkäufe nach Marke</h3>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead>
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Marke
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Menge
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Umsatz
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {data.brandStats.map((brand, index) => (
                    <tr key={index} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">
                        {brand.brandName}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600 text-right">
                        {brand.totalQuantity}
                      </td>
                      <td className="px-4 py-3 text-sm font-semibold text-gray-900 text-right">
                        {formatCurrency(brand.totalRevenue)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Low Stock and Unsold Products */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Lagerbestand-Warnungen</h3>
              <button
                onClick={() => setStockSortOrder(stockSortOrder === 'asc' ? 'desc' : 'asc')}
                className="inline-flex items-center px-3 py-1.5 text-sm border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
                title={stockSortOrder === 'asc' ? 'Aufsteigend sortiert (0 → 10)' : 'Absteigend sortiert (10 → 0)'}
              >
                <span className="mr-2">{stockSortOrder === 'asc' ? '0 → 10' : '10 → 0'}</span>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  {stockSortOrder === 'asc' ? (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12" />
                  ) : (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h13M3 8h9m-9 4h9m5.5 0l4 4m0 0l-4 4m4-4H13" />
                  )}
                </svg>
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead>
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Produkt
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      SKU
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Lagerbestand
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {data.lowStockProducts.items.map((product, index) => (
                    <tr key={index} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">
                        {product.title}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600 text-right">
                        {product.sku}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600 text-right">
                        {product.stockQuantity}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          product.inStock 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {product.inStock ? 'Auf Lager' : 'Nicht verfügbar'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            {/* Pagination Controls */}
            {data.lowStockProducts.pagination.totalPages > 1 && (
              <div className="mt-4 flex items-center justify-between">
                <div className="text-sm text-gray-700">
                  Zeige {((data.lowStockProducts.pagination.currentPage - 1) * data.lowStockProducts.pagination.itemsPerPage) + 1} bis {Math.min(data.lowStockProducts.pagination.currentPage * data.lowStockProducts.pagination.itemsPerPage, data.lowStockProducts.pagination.totalItems)} von {data.lowStockProducts.pagination.totalItems} Einträgen
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                    disabled={!data.lowStockProducts.pagination.hasPrevPage}
                    className="px-3 py-1 text-sm border border-gray-300 rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                  >
                    Zurück
                  </button>
                  <span className="px-3 py-1 text-sm">
                    Seite {data.lowStockProducts.pagination.currentPage} von {data.lowStockProducts.pagination.totalPages}
                  </span>
                  <button
                    onClick={() => setCurrentPage(Math.min(data.lowStockProducts.pagination.totalPages, currentPage + 1))}
                    disabled={!data.lowStockProducts.pagination.hasNextPage}
                    className="px-3 py-1 text-sm border border-gray-300 rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                  >
                    Weiter
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Produkte ohne Verkäufe</h3>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead>
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Produkt
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      SKU
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Preis
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Erstellt
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {data.unsoldProducts.items.map((product, index) => (
                    <tr key={index} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">
                        {product.title}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600 text-right">
                        {product.sku}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600 text-right">
                        {formatCurrency(product.price)}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600 text-right">
                        {new Date(product.createdAt).toLocaleDateString('de-DE')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            {/* Pagination Controls for Unsold Products */}
            {data.unsoldProducts.pagination.totalPages > 1 && (
              <div className="mt-4 flex items-center justify-between">
                <div className="text-sm text-gray-700">
                  Zeige {((data.unsoldProducts.pagination.currentPage - 1) * data.unsoldProducts.pagination.itemsPerPage) + 1} bis {Math.min(data.unsoldProducts.pagination.currentPage * data.unsoldProducts.pagination.itemsPerPage, data.unsoldProducts.pagination.totalItems)} von {data.unsoldProducts.pagination.totalItems} Einträgen
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={() => setUnsoldPage(Math.max(1, unsoldPage - 1))}
                    disabled={!data.unsoldProducts.pagination.hasPrevPage}
                    className="px-3 py-1 text-sm border border-gray-300 rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                  >
                    Zurück
                  </button>
                  <span className="px-3 py-1 text-sm">
                    Seite {data.unsoldProducts.pagination.currentPage} von {data.unsoldProducts.pagination.totalPages}
                  </span>
                  <button
                    onClick={() => setUnsoldPage(Math.min(data.unsoldProducts.pagination.totalPages, unsoldPage + 1))}
                    disabled={!data.unsoldProducts.pagination.hasNextPage}
                    className="px-3 py-1 text-sm border border-gray-300 rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                  >
                    Weiter
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Refresh Button */}
        <div className="mt-8 text-center">
          <button
            onClick={fetchData}
            disabled={loading}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            {loading ? 'Lädt...' : 'Daten aktualisieren'}
          </button>
        </div>
      </div>
    </div>
  );
}
