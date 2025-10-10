"use client";

import React, { useState, useEffect } from 'react';
import DateRangeFilter, { DateRangePreset } from '@/components/admin/DateRangeFilter';
import StatCard from '@/components/admin/StatCard';

interface ShippingData {
  // Gross shipping costs (before returns)
  grossShippingCosts: number;
  grossAvgShippingCosts: number;
  
  // Returns data
  returns: {
    totalShipping: number;
    count: number;
  };
  
  // Net shipping costs (after returns)
  netShippingCosts: number;
  netAvgShippingCosts: number;
  
  // Other stats
  totalOrders: number;
  freeShippingOrders: number;
  paidShippingOrders: number;
  shippingProviders: Array<{
    provider: string;
    totalCosts: number;
    totalOrders: number;
    avgCosts: number;
    percentage: number;
  }>;
  freeVsPaid: {
    free: {
      orders: number;
      revenue: number;
      avgOrderValue: number;
      percentage: number;
    };
    paid: {
      orders: number;
      revenue: number;
      avgOrderValue: number;
      percentage: number;
    };
  };
  trend: {
    percentage: number;
    isPositive: boolean;
    previousShippingCosts: number;
  };
  trendData: Array<{
    date: string;
    shippingCosts: number;
    orders: number;
    avgShipping: number;
  }>;
}

export default function ShippingAnalyticsPage() {
  const [data, setData] = useState<ShippingData | null>(null);
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

      const response = await fetch(`/api/admin/analytics/shipping?${params.toString()}`);
      const result = await response.json();

      if (result.success) {
        setData(result.data);
      } else {
        setError(result.error || 'Failed to fetch data');
      }
    } catch (err) {
      setError('Failed to fetch shipping analytics');
      console.error('Shipping analytics error:', err);
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
          <p className="mt-4 text-gray-600">Lade Versandkostenstatistiken...</p>
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
          <h1 className="text-3xl font-bold text-gray-900">Versandkosten-Statistiken</h1>
          <p className="mt-2 text-gray-600">Analyse von Versandkosten und Versandanbietern</p>
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
            title="Brutto-Versandkosten"
            value={formatCurrency(data.grossShippingCosts)}
            icon={
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 104 0m-4 0a2 2 0 114 0m6 0a2 2 0 104 0m-4 0a2 2 0 114 0" />
              </svg>
            }
            trend={{
              value: data.trend.percentage,
              isPositive: data.trend.isPositive
            }}
            comparison="vs. Vorperiode"
            valueColor="text-green-600"
          />

          <StatCard
            title="Durchschnittliche Versandkosten"
            value={formatCurrency(data.grossAvgShippingCosts)}
            icon={
              <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
            }
          />

          <StatCard
            title="Kostenloser Versand"
            value={data.freeShippingOrders}
            icon={
              <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            }
            subtitle={`${((data.freeShippingOrders / data.totalOrders) * 100).toFixed(1)}% der Bestellungen`}
          />

          <StatCard
            title="Bezahlter Versand"
            value={data.paidShippingOrders}
            icon={
              <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            }
            subtitle={`${((data.paidShippingOrders / data.totalOrders) * 100).toFixed(1)}% der Bestellungen`}
          />
        </div>

        {/* Additional Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatCard
            title="Netto-Versandkosten"
            value={formatCurrency(data.netShippingCosts)}
            icon={
              <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            }
            valueColor="text-green-600"
          />

          <StatCard
            title="Rückerstattete Versandkosten"
            value={formatCurrency(data.returns.totalShipping)}
            icon={
              <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 15v-1a4 4 0 00-4-4H8m0 0l3 3m-3-3l3-3m5 6v3a2 2 0 01-2 2H6a2 2 0 01-2-2V7a2 2 0 012-2h2m8 0V5a2 2 0 00-2-2H6a2 2 0 00-2 2v2m8 0H8" />
              </svg>
            }
            valueColor="text-red-600"
          />

          <StatCard
            title="Netto-Durchschnitt"
            value={formatCurrency(data.netAvgShippingCosts)}
            icon={
              <svg className="w-6 h-6 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
            }
          />

          <StatCard
            title="Rückgaben mit Versand"
            value={data.returns.count}
            icon={
              <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
              </svg>
            }
          />
        </div>

        {/* Free vs Paid Shipping Analysis */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Kostenloser Versand</h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Anzahl Bestellungen:</span>
                <span className="font-semibold text-green-600">{data.freeVsPaid.free.orders}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Anteil:</span>
                <span className="font-semibold">{data.freeVsPaid.free.percentage.toFixed(1)}%</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Ø Bestellwert:</span>
                <span className="font-semibold">{formatCurrency(data.freeVsPaid.free.avgOrderValue)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Gesamtumsatz:</span>
                <span className="font-semibold">{formatCurrency(data.freeVsPaid.free.revenue)}</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Bezahlter Versand</h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Anzahl Bestellungen:</span>
                <span className="font-semibold text-orange-600">{data.freeVsPaid.paid.orders}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Anteil:</span>
                <span className="font-semibold">{data.freeVsPaid.paid.percentage.toFixed(1)}%</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Ø Bestellwert:</span>
                <span className="font-semibold">{formatCurrency(data.freeVsPaid.paid.avgOrderValue)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Gesamtumsatz:</span>
                <span className="font-semibold">{formatCurrency(data.freeVsPaid.paid.revenue)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Shipping Providers */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Versandkosten nach Anbieter</h3>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead>
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Anbieter
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Bestellungen
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Versandkosten
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Ø Kosten
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Anteil
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {data.shippingProviders.map((provider, index) => (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">
                      {provider.provider}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 text-right">
                      {provider.totalOrders}
                    </td>
                    <td className="px-4 py-3 text-sm font-semibold text-gray-900 text-right">
                      {formatCurrency(provider.totalCosts)}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 text-right">
                      {formatCurrency(provider.avgCosts)}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 text-right">
                      {provider.percentage.toFixed(1)}%
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
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Versandkosten-Verlauf</h3>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead>
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Datum
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Bestellungen
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Versandkosten
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Ø Kosten
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
                        {item.orders}
                      </td>
                      <td className="px-4 py-3 text-sm font-semibold text-gray-900 text-right">
                        {formatCurrency(item.shippingCosts)}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600 text-right">
                        {formatCurrency(item.avgShipping)}
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
