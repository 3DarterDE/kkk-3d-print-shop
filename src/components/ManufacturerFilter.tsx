"use client";

import React, { useState, useEffect, useRef } from 'react';

interface Manufacturer {
  _id: string;
  name: string;
  slug: string;
}

interface ManufacturerFilterProps {
  selectedManufacturers: string[];
  onManufacturerChange: (manufacturers: string[]) => void;
}

export default function ManufacturerFilter({ selectedManufacturers, onManufacturerChange }: ManufacturerFilterProps) {
  const [manufacturers, setManufacturers] = useState<Manufacturer[]>([]);
  const [loading, setLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchManufacturers = async () => {
      try {
        const response = await fetch('/api/shop/manufacturers', {
          cache: 'no-store', // Always fetch fresh manufacturers to reflect changes immediately
          next: { revalidate: 0 } // No cache for manufacturers
        });
        if (response.ok) {
          const data = await response.json();
          setManufacturers(data);
        }
      } catch (error) {
        console.error('Failed to fetch manufacturers:', error);
      } finally {
        setLoading(false);
      }
    };

    // Delay manufacturer loading to not block critical data
    const timeoutId = setTimeout(fetchManufacturers, 100);
    return () => clearTimeout(timeoutId);
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  const handleManufacturerToggle = (manufacturerId: string) => {
    const newSelected = selectedManufacturers.includes(manufacturerId)
      ? selectedManufacturers.filter(id => id !== manufacturerId)
      : [...selectedManufacturers, manufacturerId];
    
    onManufacturerChange(newSelected);
  };

  const clearAll = () => {
    onManufacturerChange([]);
  };

  const getDisplayText = () => {
    if (selectedManufacturers.length === 0) {
      return "Hersteller auswählen...";
    }
    if (selectedManufacturers.length === 1) {
      const manufacturer = manufacturers.find(m => m._id === selectedManufacturers[0]);
      return manufacturer?.name || "1 Hersteller ausgewählt";
    }
    return `${selectedManufacturers.length} Hersteller ausgewählt`;
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold mb-4">Hersteller</h2>
        <div className="text-sm text-gray-500">Lade Hersteller...</div>
      </div>
    );
  }

  if (manufacturers.length === 0) {
    return null;
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-lg font-semibold mb-4">Hersteller</h2>
      
      <div className="relative" ref={dropdownRef}>
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="w-full px-3 py-2 text-left border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white flex items-center justify-between"
        >
          <span className="block truncate text-sm">
            {getDisplayText()}
          </span>
          <svg 
            className={`w-5 h-5 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {isOpen && (
          <div className="absolute z-10 mt-1 w-full bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto">
            {selectedManufacturers.length > 0 && (
              <div className="px-3 py-2 border-b border-gray-200">
                <button
                  onClick={clearAll}
                  className="text-sm text-blue-600 hover:text-blue-800"
                >
                  Alle löschen
                </button>
              </div>
            )}
            
            <div className="py-1">
              {manufacturers.map((manufacturer) => (
                <label
                  key={manufacturer._id}
                  className="flex items-center space-x-3 px-3 py-2 hover:bg-gray-100 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={selectedManufacturers.includes(manufacturer._id)}
                    onChange={() => handleManufacturerToggle(manufacturer._id)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">{manufacturer.name}</span>
                </label>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
