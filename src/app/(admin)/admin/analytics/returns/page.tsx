"use client";

import React, { useState, useEffect } from 'react';
import DateRangeFilter, { DateRangePreset } from '@/components/admin/DateRangeFilter';
import StatCard from '@/components/admin/StatCard';

interface ReturnsData {
  totalReturns: number;
  completedReturns: number;
  processingReturns: number;
  rejectedReturns: number;
  totalRefundAmount: number;
  returnRate: number;
  avgProcessingTime: number;
  totalOrders: number;
  topReturnedProducts: Array<{
    productId: string;
    name: string;
    totalQuantity: number;
    totalValue: number;
    returnCount: number;
  }>;
  trend: {
    percentage: number;
    isPositive: boolean;
    previousReturns: number;
  };
  trendData: Array<{
    date: string;
    returns: number;
    completed: number;
  }>;
}

export default function ReturnsAnalyticsPage() {
  const [data, setData] = useState<ReturnsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState<{ start: Date | null; end: Date | null; preset: DateRangePreset }>({
    start: null,
    end: null,
    preset: 'all'
  });

  useEffect(() => {
    fetchData();
  }, [dateRange]);

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

      const response = await fetch(`/api/admin/analytics/returns?${params.toString()}`);
      const result = await response.json();

      if (result.success) {
        setData(result.data);
      } else {
        setError(result.error || 'Failed to fetch data');
      }
    } catch (err) {
      setError('Failed to fetch returns analytics');
      console.error('Returns analytics error:', err);
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
          <p className="mt-4 text-gray-600">Lade Rückgabenstatistiken...</p>
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
          <h1 className="text-3xl font-bold text-gray-900">Rückgaben-Statistiken</h1>
          <p className="mt-2 text-gray-600">Analyse von Rücksendungen und Rückerstattungen</p>
        </div>

        {/* Date Range Filter */}
        <div className="mb-6">
          <DateRangeFilter
            onRangeChange={handleDateRangeChange}
            currentPreset={dateRange.preset}
          />
        </div>

        {/* Main Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatCard
            title="Gesamte Rücksendungen"
            value={data.totalReturns}
            icon={
              <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 15v4a2 2 0 01-2 2H6a2 2 0 01-2-2v-4m8-4V5a2 2 0 00-2-2H6a2 2 0 00-2 2v6m8 0V9a2 2 0 00-2-2H6a2 2 0 00-2 2v2m8 0V5a2 2 0 00-2-2H6a2 2 0 00-2 2v6" />
              </svg>
            }
            trend={{
              value: data.trend.percentage,
              isPositive: data.trend.isPositive
            }}
            comparison="vs. Vorperiode"
          />

          <StatCard
            title="Rückgabequote"
            value={`${data.returnRate.toFixed(1)}%`}
            icon={
              <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            }
            subtitle={`von ${data.totalOrders} Bestellungen`}
          />

          <StatCard
            title="Rückerstattungen"
            value={formatCurrency(data.totalRefundAmount)}
            icon={
              <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            }
            valueColor="text-red-600"
          />

          <StatCard
            title="Ø Bearbeitungszeit"
            value={`${data.avgProcessingTime.toFixed(1)} Tage`}
            icon={
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            }
          />
        </div>

        {/* Status Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Status-Übersicht</h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Abgeschlossen:</span>
                <span className="font-semibold text-green-600">{data.completedReturns}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">In Bearbeitung:</span>
                <span className="font-semibold text-yellow-600">{data.processingReturns}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Abgelehnt:</span>
                <span className="font-semibold text-red-600">{data.rejectedReturns}</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Rückgabequote Details</h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Gesamte Bestellungen:</span>
                <span className="font-semibold">{data.totalOrders}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Rücksendungen:</span>
                <span className="font-semibold">{data.totalReturns}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Rückgabequote:</span>
                <span className="font-semibold text-orange-600">{data.returnRate.toFixed(1)}%</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Bearbeitungszeit</h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Durchschnittlich:</span>
                <span className="font-semibold">{data.avgProcessingTime.toFixed(1)} Tage</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Abgeschlossene:</span>
                <span className="font-semibold text-green-600">{data.completedReturns}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Top Returned Products */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Häufigste Rücksendungen</h3>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead>
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Produkt
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Rückgaben
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Menge
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Wert
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {data.topReturnedProducts.map((product, index) => (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">
                      {product.name}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 text-right">
                      {product.returnCount}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 text-right">
                      {product.totalQuantity}
                    </td>
                    <td className="px-4 py-3 text-sm font-semibold text-gray-900 text-right">
                      {formatCurrency(product.totalValue)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Trend Chart */}
        {data.trendData.length > 0 && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Rückgaben-Verlauf</h3>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead>
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Datum
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Rücksendungen
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Abgeschlossen
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {data.trendData.slice(-30).reverse().map((item, index) => (
                    <tr key={index} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm text-gray-900">
                        {new Date(item.date).toLocaleDateString('de-DE')}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600 text-right">
                        {item.returns}
                      </td>
                      <td className="px-4 py-3 text-sm text-green-600 text-right">
                        {item.completed}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

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
