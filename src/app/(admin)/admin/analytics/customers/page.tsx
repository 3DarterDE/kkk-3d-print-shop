"use client";

import React, { useState, useEffect } from 'react';
import DateRangeFilter, { DateRangePreset } from '@/components/admin/DateRangeFilter';
import StatCard from '@/components/admin/StatCard';

interface CustomersData {
  totalCustomers: number;
  totalOrders: number;
  guestOrders: number;
  registeredOrders: number;
  avgOrderValue: number;
  avgCustomerLifetimeValue: number;
  topCustomers: Array<{
    customerName: string;
    customerEmail: string;
    totalRevenue: number;
    totalOrders: number;
    avgOrderValue: number;
    lastOrderDate: string;
  }>;
  guestVsCustomerOrders: {
    guest: {
      count: number;
      totalRevenue: number;
      avgRevenue: number;
      percentage: number;
    };
    customer: {
      count: number;
      totalRevenue: number;
      avgRevenue: number;
      percentage: number;
    };
  };
  trend: {
    percentage: number;
    isPositive: boolean;
    previousCustomers: number;
  };
  trendData: Array<{
    date: string;
    newCustomers: number;
  }>;
}

export default function CustomersAnalyticsPage() {
  const [data, setData] = useState<CustomersData | null>(null);
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

      const response = await fetch(`/api/admin/analytics/customers?${params.toString()}`);
      const result = await response.json();

      if (result.success) {
        setData(result.data);
      } else {
        setError(result.error || 'Failed to fetch data');
      }
    } catch (err) {
      setError('Failed to fetch customers analytics');
      console.error('Customers analytics error:', err);
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
          <p className="mt-4 text-gray-600">Lade Kundenstatistiken...</p>
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
          <h1 className="text-3xl font-bold text-gray-900">Kunden-Statistiken</h1>
          <p className="mt-2 text-gray-600">Analyse von Kundenverhalten und -wert</p>
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
            title="Registrierte Kunden"
            value={data.totalCustomers}
            icon={
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
              </svg>
            }
            trend={{
              value: data.trend.percentage,
              isPositive: data.trend.isPositive
            }}
            comparison="vs. Vorperiode"
          />

          <StatCard
            title="Gast-Bestellungen"
            value={data.guestOrders}
            icon={
              <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            }
            subtitle={`${((data.guestOrders / data.totalOrders) * 100).toFixed(1)}% der Bestellungen`}
          />

          <StatCard
            title="Customer Lifetime Value"
            value={formatCurrency(data.avgCustomerLifetimeValue)}
            icon={
              <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            }
            valueColor="text-green-600"
          />

          <StatCard
            title="Ø Bestellwert"
            value={formatCurrency(data.avgOrderValue)}
            icon={
              <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
            }
          />
        </div>

        {/* New vs Returning Customers */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Gast-Bestellungen</h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Anzahl:</span>
                <span className="font-semibold text-orange-600">{data.guestVsCustomerOrders.guest.count}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Anteil:</span>
                <span className="font-semibold">{data.guestVsCustomerOrders.guest.percentage.toFixed(1)}%</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Gesamtumsatz:</span>
                <span className="font-semibold">{formatCurrency(data.guestVsCustomerOrders.guest.totalRevenue)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Ø Umsatz:</span>
                <span className="font-semibold">{formatCurrency(data.guestVsCustomerOrders.guest.avgRevenue)}</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Kunden-Bestellungen</h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Anzahl:</span>
                <span className="font-semibold text-blue-600">{data.guestVsCustomerOrders.customer.count}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Anteil:</span>
                <span className="font-semibold">{data.guestVsCustomerOrders.customer.percentage.toFixed(1)}%</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Gesamtumsatz:</span>
                <span className="font-semibold">{formatCurrency(data.guestVsCustomerOrders.customer.totalRevenue)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Ø Umsatz:</span>
                <span className="font-semibold">{formatCurrency(data.guestVsCustomerOrders.customer.avgRevenue)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Top Customers */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Top 10 Kunden nach Umsatz</h3>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead>
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Kunde
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    E-Mail
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Umsatz
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Bestellungen
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Ø Bestellwert
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Letzte Bestellung
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {data.topCustomers.map((customer, index) => (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">
                      {customer.customerName}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {customer.customerEmail}
                    </td>
                    <td className="px-4 py-3 text-sm font-semibold text-gray-900 text-right">
                      {formatCurrency(customer.totalRevenue)}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 text-right">
                      {customer.totalOrders}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 text-right">
                      {formatCurrency(customer.avgOrderValue)}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 text-right">
                      {new Date(customer.lastOrderDate).toLocaleDateString('de-DE')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Customer Registration Trend */}
        {data.trendData.length > 0 && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Kundenregistrierungen</h3>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead>
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Datum
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Neue Kunden
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
                        {item.newCustomers}
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
