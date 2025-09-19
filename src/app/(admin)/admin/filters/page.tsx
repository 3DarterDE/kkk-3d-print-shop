"use client";

import { useState, useEffect } from "react";

interface Filter {
  _id: string;
  name: string;
  type: string;
  options: Array<{ name: string; value: string; sortOrder: number; color?: string }>;
  sortOrder: number;
}

export default function FiltersPage() {
  const [filters, setFilters] = useState<Filter[]>([]);
  const [loading, setLoading] = useState(true);
  const [showFilterForm, setShowFilterForm] = useState(false);
  const [editingFilter, setEditingFilter] = useState<Filter | null>(null);
  const [draggedFilterIndex, setDraggedFilterIndex] = useState<number | null>(null);
  const [filterFormData, setFilterFormData] = useState({
    name: '',
    type: 'select' as 'text' | 'number' | 'select' | 'multiselect' | 'range' | 'color',
    options: [] as Array<{ name: string; value: string; sortOrder: number; color?: string }>
  });

  useEffect(() => {
    fetchFilters();
  }, []);

  const fetchFilters = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/admin/filters");
      if (response.ok) {
        const data = await response.json();
        setFilters(Array.isArray(data) ? data : []);
      } else {
        console.error("Failed to fetch filters:", response.status);
        setFilters([]);
      }
    } catch (error) {
      console.error("Error fetching filters:", error);
      setFilters([]);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const filterData = {
        _id: editingFilter?._id,
        name: filterFormData.name,
        type: filterFormData.type,
        options: filterFormData.options,
        sortOrder: editingFilter ? editingFilter.sortOrder : filters.length
      };
      
      const url = "/api/admin/filters";
      const method = editingFilter ? "PUT" : "POST";
      
      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(filterData),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        alert(`Failed to save filter: ${errorData.error}`);
        return;
      }
      
      setShowFilterForm(false);
      setEditingFilter(null);
      setFilterFormData({
        name: '',
        type: 'select',
        options: []
      });
      fetchFilters();
    } catch (error) {
      console.error("Failed to save filter:", error);
      alert("Failed to save filter");
    }
  };

  const handleEditFilter = (filter: Filter) => {
    setEditingFilter(filter);
    setFilterFormData({
      name: filter.name,
      type: filter.type as any,
      options: filter.options || []
    });
    setShowFilterForm(true);
  };

  const handleDeleteFilter = async (id: string) => {
    if (!confirm("Are you sure you want to delete this filter?")) return;
    
    try {
      await fetch(`/api/admin/filters?id=${id}`, { method: "DELETE" });
      fetchFilters();
    } catch (error) {
      console.error("Failed to delete filter:", error);
    }
  };

  const addOption = () => {
    setFilterFormData(prev => ({
      ...prev,
      options: [...prev.options, { name: '', value: '', sortOrder: prev.options.length, color: '#000000' }]
    }));
  };

  const removeOption = (index: number) => {
    setFilterFormData(prev => ({
      ...prev,
      options: prev.options.filter((_, i) => i !== index)
    }));
  };

  const updateOption = (index: number, field: string, value: string) => {
    setFilterFormData(prev => ({
      ...prev,
      options: prev.options.map((option, i) => 
        i === index ? { ...option, [field]: value } : option
      )
    }));
  };

  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedFilterIndex(index);
  };

  const moveFilter = async (fromIndex: number, toIndex: number) => {
    const newFilters = [...filters];
    const [movedFilter] = newFilters.splice(fromIndex, 1);
    newFilters.splice(toIndex, 0, movedFilter);
    
    // Update local state immediately for instant UI feedback
    setFilters(newFilters);
    
    // Update sortOrder for all filters
    const updates = newFilters.map((filter, index) => ({
      id: filter._id,
      sortOrder: index
    }));

    // Update in database in background
    try {
      await fetch("/api/admin/filters/reorder", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filters: updates }),
      });
    } catch (error) {
      console.error("Failed to reorder filters:", error);
      // Revert on error
      fetchFilters();
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Lade Filter...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        {/* Header */}
        <div className="mb-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Filterverwaltung</h1>
              <p className="mt-2 text-gray-600">Verwalten Sie Ihre Produktfilter</p>
            </div>
            <button
              onClick={() => {
                setEditingFilter(null);
                setFilterFormData({
                  name: '',
                  type: 'select',
                  options: []
                });
                setShowFilterForm(true);
              }}
              className="bg-orange-600 text-white px-4 py-2 rounded hover:bg-orange-700"
            >
              Neuen Filter hinzufügen
            </button>
          </div>
        </div>

        {/* Filters Table */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          {filters.length > 0 ? (
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Drag
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Options
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filters.map((filter, index) => (
                  <tr 
                    key={filter._id} 
                    className="hover:bg-gray-50 cursor-move"
                    draggable
                    onDragStart={(e) => handleDragStart(e, index)}
                    onDragOver={(e) => {
                      e.preventDefault();
                      e.dataTransfer.dropEffect = 'move';
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      const dropIndex = index;
                      if (draggedFilterIndex !== null && draggedFilterIndex !== dropIndex) {
                        moveFilter(draggedFilterIndex, dropIndex);
                      }
                      setDraggedFilterIndex(null);
                    }}
                    onDragEnd={() => setDraggedFilterIndex(null)}
                  >
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <div className="flex items-center">
                        <svg className="w-4 h-4 text-gray-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" />
                        </svg>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {filter.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                        {filter.type}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {filter.options.length} options
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <button
                        onClick={() => handleEditFilter(filter)}
                        className="text-blue-600 hover:text-blue-900 mr-3"
                      >
                        Bearbeiten
                      </button>
                      <button
                        onClick={() => handleDeleteFilter(filter._id)}
                        className="text-red-600 hover:text-red-900"
                      >
                        Löschen
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="p-8 text-center text-gray-500">
              <p className="text-lg font-medium mb-2">Keine Filter vorhanden</p>
              <p className="text-sm">Erstellen Sie Ihren ersten Filter mit dem "Neuen Filter hinzufügen" Button.</p>
            </div>
          )}
        </div>

        {/* Filter Form Modal */}
        {showFilterForm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div 
              className="bg-white rounded-lg shadow-2xl border border-gray-200 w-full max-w-2xl max-h-[95vh] overflow-hidden flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="flex justify-between items-center p-6 border-b border-gray-200">
                <h2 className="text-2xl font-bold">
                  {editingFilter ? "Filter bearbeiten" : "Neuer Filter"}
                </h2>
                <button
                  type="button"
                  onClick={() => {
                    setShowFilterForm(false);
                    setEditingFilter(null);
                    setFilterFormData({
                      name: '',
                      type: 'select',
                      options: []
                    });
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Modal Content */}
              <form onSubmit={handleFilterSubmit} className="flex-1 overflow-y-auto p-6">
                <div className="space-y-6">
                  {/* Filter Name */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Filter Name
                    </label>
                    <input
                      type="text"
                      value={filterFormData.name}
                      onChange={(e) => setFilterFormData(prev => ({ ...prev, name: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>

                  {/* Filter Type */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Filter Type
                    </label>
                    <select
                      value={filterFormData.type}
                      onChange={(e) => setFilterFormData(prev => ({ ...prev, type: e.target.value as any }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="text">Text</option>
                      <option value="number">Number</option>
                      <option value="select">Select</option>
                      <option value="multiselect">Multiselect</option>
                      <option value="range">Range</option>
                      <option value="color">Color</option>
                    </select>
                  </div>

                  {/* Options (only for select, multiselect, color types) */}
                  {(filterFormData.type === 'select' || filterFormData.type === 'multiselect' || filterFormData.type === 'color') && (
                    <div>
                      <div className="flex justify-between items-center mb-2">
                        <label className="block text-sm font-medium text-gray-700">
                          Options
                        </label>
                        <button
                          type="button"
                          onClick={addOption}
                          className="text-blue-600 hover:text-blue-800 text-sm"
                        >
                          + Option hinzufügen
                        </button>
                      </div>
                      <div className="space-y-2">
                        {filterFormData.options.map((option, index) => (
                          <div key={index} className="flex items-center space-x-2">
                            <input
                              type="text"
                              placeholder="Option Name"
                              value={option.name}
                              onChange={(e) => updateOption(index, 'name', e.target.value)}
                              className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                            <input
                              type="text"
                              placeholder="Option Value"
                              value={option.value}
                              onChange={(e) => updateOption(index, 'value', e.target.value)}
                              className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                            {filterFormData.type === 'color' && (
                              <input
                                type="color"
                                value={option.color || '#000000'}
                                onChange={(e) => updateOption(index, 'color', e.target.value)}
                                className="w-12 h-10 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                              />
                            )}
                            <button
                              type="button"
                              onClick={() => removeOption(index)}
                              className="text-red-600 hover:text-red-800"
                            >
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Modal Footer */}
                <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200 mt-6">
                  <button
                    type="button"
                    onClick={() => {
                      setShowFilterForm(false);
                      setEditingFilter(null);
                      setFilterFormData({
                        name: '',
                        type: 'select',
                        options: []
                      });
                    }}
                    className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                  >
                    Abbrechen
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700"
                  >
                    {editingFilter ? "Aktualisieren" : "Erstellen"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
