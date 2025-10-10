"use client";

import React, { useState, useEffect } from 'react';
import DateRangeFilter, { DateRangePreset } from '@/components/admin/DateRangeFilter';
import StatCard from '@/components/admin/StatCard';

interface RevenueData {
  // Gross revenue (before returns)
  grossRevenue: number;
  grossShipping: number;
  
  // Returns data
  returns: {
    totalAmount: number;
    totalShipping: number;
    count: number;
  };
  
  // Net revenue (after returns)
  netRevenue: number;
  netShipping: number;
  
  // Other stats
  totalOrders: number;
  avgOrderValue: number;
  totalSubtotal: number;
  discounts: {
    total: number;
    count: number;
    avgDiscount: number;
  };
  bonusPoints: {
    earned: number;
    redeemed: number;
    earnedValue: number | null;
    redeemedValue: number;
  };
  paymentMethods: Array<{
    method: string;
    total: number;
    count: number;
    percentage: number;
  }>;
  trend: {
    percentage: number;
    isPositive: boolean;
    previousRevenue: number;
  };
  trendData: Array<{
    date: string;
    revenue: number;
    orders: number;
  }>;
}

export default function RevenueAnalyticsPage() {
  const [data, setData] = useState<RevenueData | null>(null);
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

      const response = await fetch(`/api/admin/analytics/revenue?${params.toString()}`);
      const result = await response.json();

      if (result.success) {
        setData(result.data);
      } else {
        setError(result.error || 'Failed to fetch data');
      }
    } catch (err) {
      setError('Failed to fetch revenue analytics');
      console.error('Revenue analytics error:', err);
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
          <p className="mt-4 text-gray-600">Lade Umsatzstatistiken...</p>
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
          <h1 className="text-3xl font-bold text-gray-900">Umsatz-Statistiken</h1>
          <p className="mt-2 text-gray-600">Detaillierte Analyse Ihrer Umsätze und Einnahmen</p>
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
            title="Brutto-Umsatz"
            value={formatCurrency(data.grossRevenue)}
            icon={
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
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
            title="Anzahl Bestellungen"
            value={data.totalOrders}
            icon={
              <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
              </svg>
            }
          />

          <StatCard
            title="Durchschnittlicher Bestellwert"
            value={formatCurrency(data.avgOrderValue)}
            icon={
              <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
            }
          />

          <StatCard
            title="Versandkosten (Einnahmen)"
            value={formatCurrency(data.grossShipping)}
            icon={
              <svg className="w-6 h-6 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 104 0m-4 0a2 2 0 114 0m6 0a2 2 0 104 0m-4 0a2 2 0 114 0" />
              </svg>
            }
          />
        </div>

        {/* Additional Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatCard
            title="Netto-Umsatz"
            value={formatCurrency(data.netRevenue)}
            icon={
              <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            }
            valueColor="text-green-600"
          />

          <StatCard
            title="Rückgaben"
            value={formatCurrency(data.returns.totalAmount)}
            icon={
              <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 15v-1a4 4 0 00-4-4H8m0 0l3 3m-3-3l3-3m5 6v3a2 2 0 01-2 2H6a2 2 0 01-2-2V7a2 2 0 012-2h2m8 0V5a2 2 0 00-2-2H6a2 2 0 00-2 2v2m8 0H8" />
              </svg>
            }
            valueColor="text-red-600"
          />

          <StatCard
            title="Netto-Versandkosten"
            value={formatCurrency(data.netShipping)}
            icon={
              <svg className="w-6 h-6 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
            }
          />

          <StatCard
            title="Rückgaben-Anzahl"
            value={data.returns.count}
            icon={
              <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
              </svg>
            }
          />
        </div>

        {/* Discounts & Bonus Points */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Rabatte & Gutscheine</h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Gesamtwert Rabatte:</span>
                <span className="font-semibold text-red-600">{formatCurrency(data.discounts.total)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Anzahl Bestellungen mit Rabatt:</span>
                <span className="font-semibold">{data.discounts.count}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Durchschnittlicher Rabatt:</span>
                <span className="font-semibold">{formatCurrency(data.discounts.avgDiscount)}</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Bonuspunkte</h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Verdiente Punkte:</span>
                <span className="font-semibold text-green-600">{data.bonusPoints.earned.toLocaleString('de-DE')}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Wert (verdient):</span>
                <span className="font-semibold text-gray-500">Nicht berechenbar</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Eingelöste Punkte:</span>
                <span className="font-semibold text-blue-600">{data.bonusPoints.redeemed.toLocaleString('de-DE')}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Wert (eingelöst):</span>
                <span className="font-semibold">{formatCurrency(data.bonusPoints.redeemedValue)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Payment Methods */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Umsatz nach Zahlungsmethode</h3>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead>
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Zahlungsmethode
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Anzahl
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Umsatz
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Anteil
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {data.paymentMethods.map((pm, index) => (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">
                      {pm.method}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 text-right">
                      {pm.count}
                    </td>
                    <td className="px-4 py-3 text-sm font-semibold text-gray-900 text-right">
                      {formatCurrency(pm.total)}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 text-right">
                      {pm.percentage.toFixed(1)}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Trend Chart - Simple table view */}
        {data.trendData.length > 0 && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Umsatz-Verlauf</h3>
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
                      Umsatz
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
                        {formatCurrency(item.revenue)}
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

