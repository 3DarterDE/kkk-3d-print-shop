"use client";

import React, { useState } from 'react';

export type DateRangePreset = 'today' | 'week' | 'month' | 'year' | 'all' | 'custom';

interface DateRangeFilterProps {
  onRangeChange: (startDate: Date | null, endDate: Date | null, preset: DateRangePreset) => void;
  currentPreset?: DateRangePreset;
}

export default function DateRangeFilter({ onRangeChange, currentPreset = 'all' }: DateRangeFilterProps) {
  const [preset, setPreset] = useState<DateRangePreset>(currentPreset);
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [showCustom, setShowCustom] = useState(false);

  const getDateRange = (presetType: DateRangePreset): { start: Date | null; end: Date | null } => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    switch (presetType) {
      case 'today':
        return { start: today, end: now };
      
      case 'week':
        const weekStart = new Date(today);
        weekStart.setDate(today.getDate() - today.getDay() + 1); // Monday
        return { start: weekStart, end: now };
      
      case 'month':
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        return { start: monthStart, end: now };
      
      case 'year':
        const yearStart = new Date(now.getFullYear(), 0, 1);
        return { start: yearStart, end: now };
      
      case 'all':
        return { start: null, end: null };
      
      case 'custom':
        if (customStartDate && customEndDate) {
          const start = new Date(customStartDate);
          const end = new Date(customEndDate);
          end.setHours(23, 59, 59, 999); // End of day
          return { start, end };
        }
        return { start: null, end: null };
      
      default:
        return { start: null, end: null };
    }
  };

  const handlePresetChange = (newPreset: DateRangePreset) => {
    setPreset(newPreset);
    
    if (newPreset === 'custom') {
      setShowCustom(true);
      return;
    }
    
    setShowCustom(false);
    const { start, end } = getDateRange(newPreset);
    onRangeChange(start, end, newPreset);
  };

  const handleCustomApply = () => {
    if (customStartDate && customEndDate) {
      const { start, end } = getDateRange('custom');
      onRangeChange(start, end, 'custom');
    }
  };

  const formatDateForInput = (date: Date) => {
    return date.toISOString().split('T')[0];
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
        <div className="flex-1">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Zeitraum
          </label>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => handlePresetChange('today')}
              className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                preset === 'today'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Heute
            </button>
            <button
              onClick={() => handlePresetChange('week')}
              className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                preset === 'week'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Diese Woche
            </button>
            <button
              onClick={() => handlePresetChange('month')}
              className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                preset === 'month'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Dieser Monat
            </button>
            <button
              onClick={() => handlePresetChange('year')}
              className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                preset === 'year'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Dieses Jahr
            </button>
            <button
              onClick={() => handlePresetChange('all')}
              className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                preset === 'all'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Alle Zeit
            </button>
            <button
              onClick={() => handlePresetChange('custom')}
              className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                preset === 'custom'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Benutzerdefiniert
            </button>
          </div>
        </div>
      </div>

      {showCustom && (
        <div className="mt-4 pt-4 border-t border-gray-200">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Von
              </label>
              <input
                type="date"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                max={formatDateForInput(new Date())}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Bis
              </label>
              <input
                type="date"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                max={formatDateForInput(new Date())}
                min={customStartDate}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
          <button
            onClick={handleCustomApply}
            disabled={!customStartDate || !customEndDate}
            className="mt-3 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
          >
            Anwenden
          </button>
        </div>
      )}
    </div>
  );
}

