"use client";

import React, { useState, useEffect } from "react";

interface Category {
  _id: string;
  name: string;
  slug: string;
  description?: string;
  isActive: boolean;
  sortOrder: number;
  parentId?: string;
  subcategories?: Category[];
  image?: string;
  imageSizes?: {
    main: string;
    thumb: string;
    small: string;
  };
}

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCategoryForm, setShowCategoryForm] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [draggedCategoryIndex, setDraggedCategoryIndex] = useState<number | null>(null);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [subcategories, setSubcategories] = useState<Array<{ name: string; description: string; sortOrder: number }>>([]);
  const [categoryImage, setCategoryImage] = useState<File | null>(null);
  const [categoryImagePreview, setCategoryImagePreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      console.log("Fetching categories...");
      setError(null);
      const response = await fetch("/api/admin/categories");
      console.log("Response status:", response.status);
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
      }
      
      const data = await response.json();
      console.log("Categories data:", data);
      setCategories(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Failed to fetch categories:", error);
      setError(error instanceof Error ? error.message : "Failed to fetch categories");
      setCategories([]);
    } finally {
      setLoading(false);
    }
  };

  const moveCategory = async (fromIndex: number, toIndex: number) => {
    const newCategories = [...categories];
    const [movedCategory] = newCategories.splice(fromIndex, 1);
    newCategories.splice(toIndex, 0, movedCategory);
    
    setCategories(newCategories);
    
    // Update in database
    try {
      const categoryIds = newCategories.map(cat => cat._id);
      await fetch("/api/admin/categories/reorder", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ categoryIds }),
      });
      
      // Refresh categories from server to ensure consistency
      fetchCategories();
    } catch (error) {
      console.error("Failed to update category order:", error);
      // Revert on error
      fetchCategories();
    }
  };

  const toggleCategoryExpansion = (categoryId: string) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(categoryId)) {
      newExpanded.delete(categoryId);
    } else {
      newExpanded.add(categoryId);
    }
    setExpandedCategories(newExpanded);
  };

  const handleCategorySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData(e.target as HTMLFormElement);
    
    const categoryData = {
      name: formData.get("name") as string,
      description: formData.get("description") as string,
      isActive: formData.get("isActive") === "on",
      sortOrder: editingCategory ? editingCategory.sortOrder : categories.length,
      parentId: null // Always create as parent category
    };

    try {
      let response;
      if (editingCategory) {
        response = await fetch(`/api/admin/categories/${editingCategory._id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(categoryData),
        });
      } else {
        response = await fetch("/api/admin/categories", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(categoryData),
        });
      }

      if (!response.ok) {
        const errorData = await response.json();
        alert(`Failed to save category: ${errorData.error}`);
        return;
      }

      const savedCategory = await response.json();

      // Handle image upload if there's an image
      if (categoryImage) {
        const imageFormData = new FormData();
        imageFormData.append("image", categoryImage);
        imageFormData.append("categoryId", savedCategory._id);

        const imageResponse = await fetch("/api/admin/categories/upload-image", {
          method: "POST",
          body: imageFormData,
        });

        if (!imageResponse.ok) {
          console.error("Failed to upload category image");
        }
      }

      // Handle subcategories
      if (subcategories.length > 0) {
        for (const subcategory of subcategories) {
          if (subcategory.name.trim()) {
            const subcategoryData = {
              name: subcategory.name,
              description: subcategory.description,
              isActive: true,
              parentId: savedCategory._id,
              sortOrder: subcategory.sortOrder
            };

            await fetch("/api/admin/categories", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(subcategoryData),
            });
          }
        }
      }

      // Reset form
      setShowCategoryForm(false);
      setEditingCategory(null);
      setSubcategories([]);
      setCategoryImage(null);
      setCategoryImagePreview(null);
      fetchCategories();
    } catch (error) {
      console.error("Failed to save category:", error);
      alert("Failed to save category. Please check the console for details.");
    }
  };

  const handleCategoryEdit = (category: Category) => {
    setEditingCategory(category);
    setSubcategories(category.subcategories?.map(sub => ({
      name: sub.name,
      description: sub.description || '',
      sortOrder: sub.sortOrder
    })) || []);
    setShowCategoryForm(true);
  };

  const addSubcategory = () => {
    setSubcategories([...subcategories, { name: '', description: '', sortOrder: subcategories.length }]);
  };

  const handleCategoryImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setCategoryImage(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        setCategoryImagePreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const toggleCategoryActive = async (categoryId: string, newStatus: boolean) => {
    try {
      const response = await fetch(`/api/admin/categories/${categoryId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: newStatus }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        alert(`Failed to update category: ${errorData.error}`);
        return;
      }

      fetchCategories();
    } catch (error) {
      console.error("Failed to toggle category status:", error);
      alert("Failed to update category status");
    }
  };

  const handleCategoryDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this category?")) return;
    
    try {
      // First delete the category images
      await deleteCategoryImage(id);
      
      // Then delete the category
      const response = await fetch(`/api/admin/categories/${id}`, { method: "DELETE" });
      if (!response.ok) {
        const errorData = await response.json();
        alert(`Failed to delete category: ${errorData.error}`);
        return;
      }
      fetchCategories();
    } catch (error) {
      console.error("Failed to delete category:", error);
    }
  };

  const deleteCategoryImage = async (categoryId: string) => {
    try {
      const response = await fetch(`/api/admin/categories/${categoryId}`);
      if (response.ok) {
        const category = await response.json();
        if (category.image) {
          await fetch("/api/admin/delete-file", {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ fileUrl: category.image }),
          });
        }
        if (category.imageSizes) {
          const imageUrls = [category.imageSizes.main, category.imageSizes.thumb, category.imageSizes.small].filter(Boolean);
          for (const url of imageUrls) {
            await fetch("/api/admin/delete-file", {
              method: "DELETE",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ fileUrl: url }),
            });
          }
        }
      }
    } catch (error) {
      console.error("Failed to delete category image:", error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Lade Kategorien...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            <strong className="font-bold">Fehler beim Laden der Kategorien:</strong>
            <span className="block sm:inline"> {error}</span>
          </div>
          <button
            onClick={() => {
              setError(null);
              setLoading(true);
              fetchCategories();
            }}
            className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
          >
            Erneut versuchen
          </button>
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
              <h1 className="text-3xl font-bold text-gray-900">Kategorieverwaltung</h1>
              <p className="mt-2 text-gray-600">Verwalten Sie Ihre Produktkategorien</p>
            </div>
            <button
              onClick={() => setShowCategoryForm(true)}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Neue Kategorie
            </button>
          </div>
        </div>

        {/* Categories Table */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Slug
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Beschreibung
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Aktionen
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {categories.map((category, index) => (
                <React.Fragment key={category._id}>
                  {/* Parent Category Row */}
                  <tr 
                    className={`hover:bg-gray-50 ${draggedCategoryIndex === index ? 'opacity-50' : ''}`}
                    draggable
                    onDragStart={(e) => {
                      setDraggedCategoryIndex(index);
                      e.dataTransfer.effectAllowed = 'move';
                    }}
                    onDragOver={(e) => {
                      e.preventDefault();
                      e.dataTransfer.dropEffect = 'move';
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      const dropIndex = index;
                      if (draggedCategoryIndex !== null && draggedCategoryIndex !== dropIndex) {
                        moveCategory(draggedCategoryIndex, dropIndex);
                      }
                      setDraggedCategoryIndex(null);
                    }}
                    onDragEnd={() => setDraggedCategoryIndex(null)}
                  >
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      <div className="flex items-center">
                        <div 
                          className="mr-2 cursor-move text-gray-400 hover:text-gray-600"
                          title="Drag to reorder"
                        >
                          ⋮⋮
                        </div>
                        {category.subcategories && category.subcategories.length > 0 && (
                          <button
                            onClick={() => toggleCategoryExpansion(category._id)}
                            className="mr-2 text-gray-400 hover:text-gray-600"
                          >
                            {expandedCategories.has(category._id) ? '▼' : '▶'}
                          </button>
                        )}
                        <span className="font-semibold">{category.name}</span>
                        {category.subcategories && category.subcategories.length > 0 && (
                          <span className="ml-2 text-xs text-gray-500">
                            ({category.subcategories.length} Unterkategorien)
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {category.slug}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate">
                      {category.description || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <button
                        onClick={() => toggleCategoryActive(category._id, !category.isActive)}
                        className={`px-2 py-1 text-xs rounded-full transition-colors ${
                          category.isActive 
                            ? 'bg-green-100 text-green-800 hover:bg-green-200' 
                            : 'bg-red-100 text-red-800 hover:bg-red-200'
                        }`}
                      >
                        {category.isActive ? 'Aktiv' : 'Inaktiv'}
                      </button>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <button
                        onClick={() => handleCategoryEdit(category)}
                        className="text-blue-600 hover:text-blue-900 mr-3"
                      >
                        Bearbeiten
                      </button>
                      <button
                        onClick={() => handleCategoryDelete(category._id)}
                        className="text-red-600 hover:text-red-900"
                      >
                        Löschen
                      </button>
                    </td>
                  </tr>
                  
                  {/* Subcategories Rows */}
                  {expandedCategories.has(category._id) && category.subcategories && category.subcategories.map((subcategory, subIndex) => (
                    <tr 
                      key={subcategory._id} 
                      className="bg-gray-50 hover:bg-gray-100"
                      draggable
                      onDragStart={(e) => {
                        e.stopPropagation();
                        setDraggedCategoryIndex(index);
                        e.dataTransfer.effectAllowed = 'move';
                        e.dataTransfer.setData('text/plain', JSON.stringify({ 
                          type: 'subcategory', 
                          parentIndex: index, 
                          subIndex 
                        }));
                      }}
                      onDragOver={(e) => {
                        e.preventDefault();
                        e.dataTransfer.dropEffect = 'move';
                      }}
                      onDrop={async (e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        const data = JSON.parse(e.dataTransfer.getData('text/plain'));
                        if (data.type === 'subcategory' && data.parentIndex === index) {
                          // Handle subcategory reordering within the same parent
                          const newSubcategories = [...(category.subcategories || [])];
                          const [movedSubcategory] = newSubcategories.splice(data.subIndex, 1);
                          newSubcategories.splice(subIndex, 0, movedSubcategory);
                          
                          // Update the category with new subcategory order
                          const updatedCategory = {
                            ...category,
                            subcategories: newSubcategories
                          };
                          
                          const newCategories = [...categories];
                          newCategories[index] = updatedCategory;
                          setCategories(newCategories);
                          
                          // Update in database
                          try {
                            const subcategoryIds = newSubcategories.map(sub => sub._id);
                            await fetch("/api/admin/categories/subcategories/reorder", {
                              method: "PUT",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify({ 
                                parentId: category._id, 
                                subcategories: subcategoryIds 
                              }),
                            });
                            console.log("Subcategory order updated successfully");
                          } catch (error) {
                            console.error("Failed to update subcategory order:", error);
                            // Revert on error
                            fetchCategories();
                          }
                        }
                        setDraggedCategoryIndex(null);
                      }}
                      onDragEnd={() => setDraggedCategoryIndex(null)}
                    >
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 pl-12">
                        <div className="flex items-center">
                          <div 
                            className="mr-2 cursor-move text-gray-400 hover:text-gray-600"
                            title="Drag to reorder subcategory"
                          >
                            ⋮⋮
                          </div>
                          <span className="text-gray-400 mr-2">└─</span>
                          {subcategory.name}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {subcategory.slug}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate">
                        {subcategory.description || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <button
                          onClick={() => toggleCategoryActive(subcategory._id, !subcategory.isActive)}
                          className={`px-2 py-1 text-xs rounded-full transition-colors ${
                            subcategory.isActive 
                              ? 'bg-green-100 text-green-800 hover:bg-green-200' 
                              : 'bg-red-100 text-red-800 hover:bg-red-200'
                          }`}
                        >
                          {subcategory.isActive ? 'Aktiv' : 'Inaktiv'}
                        </button>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <button
                          onClick={() => handleCategoryEdit(subcategory)}
                          className="text-blue-600 hover:text-blue-900 mr-3"
                        >
                          Bearbeiten
                        </button>
                        <button
                          onClick={() => handleCategoryDelete(subcategory._id)}
                          className="text-red-600 hover:text-red-900"
                        >
                          Löschen
                        </button>
                      </td>
                    </tr>
                  ))}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>

        {/* Empty State */}
        {categories.length === 0 && (
          <div className="text-center py-12">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900">Keine Kategorien</h3>
            <p className="mt-1 text-sm text-gray-500">Beginnen Sie mit dem Hinzufügen einer neuen Kategorie.</p>
            <div className="mt-6">
              <button
                onClick={() => setShowCategoryForm(true)}
                className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Neue Kategorie
              </button>
            </div>
          </div>
        )}

        {/* Category Form Modal */}
        {showCategoryForm && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-20 mx-auto p-5 border w-11/12 max-w-2xl shadow-lg rounded-md bg-white">
              <div className="mt-3">
                <form onSubmit={handleCategorySubmit} className="p-6">
                  <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-bold">
                      {editingCategory ? "Kategorie bearbeiten" : "Neue Kategorie"}
                    </h2>
                    <button
                      type="button"
                      onClick={() => {
                        setShowCategoryForm(false);
                        setEditingCategory(null);
                        setSubcategories([]);
                        setCategoryImage(null);
                        setCategoryImagePreview(null);
                      }}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>

                  <div className="space-y-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Kategoriename *
                      </label>
                      <input
                        type="text"
                        name="name"
                        required
                        defaultValue={editingCategory?.name || ''}
                        className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Beschreibung
                      </label>
                      <textarea
                        name="description"
                        rows={3}
                        defaultValue={editingCategory?.description || ''}
                        className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Kategoriebild
                      </label>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleCategoryImageChange}
                        className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      {categoryImagePreview && (
                        <div className="mt-2">
                          <img
                            src={categoryImagePreview}
                            alt="Preview"
                            className="h-20 w-20 object-cover rounded"
                          />
                        </div>
                      )}
                      {editingCategory?.image && !categoryImagePreview && (
                        <div className="mt-2">
                          <img
                            src={editingCategory.image}
                            alt="Current"
                            className="h-20 w-20 object-cover rounded"
                          />
                        </div>
                      )}
                    </div>

                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        name="isActive"
                        defaultChecked={editingCategory?.isActive !== false}
                        className="mr-2"
                      />
                      <label className="text-sm text-gray-700">Aktiv</label>
                    </div>

                    {/* Subcategories Section */}
                    <div>
                      <div className="flex justify-between items-center mb-4">
                        <h3 className="text-lg font-medium text-gray-900">Unterkategorien</h3>
                        <button
                          type="button"
                          onClick={addSubcategory}
                          className="text-blue-600 hover:text-blue-800 text-sm"
                        >
                          + Unterkategorie hinzufügen
                        </button>
                      </div>
                      
                      {subcategories.map((subcategory, index) => (
                        <div key={index} className="grid grid-cols-2 gap-4 mb-4 p-4 border border-gray-200 rounded-lg">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Name
                            </label>
                            <input
                              type="text"
                              value={subcategory.name}
                              onChange={(e) => {
                                const newSubcategories = [...subcategories];
                                newSubcategories[index].name = e.target.value;
                                setSubcategories(newSubcategories);
                              }}
                              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Beschreibung
                            </label>
                            <input
                              type="text"
                              value={subcategory.description}
                              onChange={(e) => {
                                const newSubcategories = [...subcategories];
                                newSubcategories[index].description = e.target.value;
                                setSubcategories(newSubcategories);
                              }}
                              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                          </div>
                          <div className="col-span-2 flex justify-end">
                            <button
                              type="button"
                              onClick={() => {
                                const newSubcategories = subcategories.filter((_, i) => i !== index);
                                setSubcategories(newSubcategories);
                              }}
                              className="text-red-600 hover:text-red-800 text-sm"
                            >
                              Entfernen
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="flex justify-end space-x-3 pt-6 border-t mt-6">
                    <button
                      type="button"
                      onClick={() => {
                        setShowCategoryForm(false);
                        setEditingCategory(null);
                        setSubcategories([]);
                        setCategoryImage(null);
                        setCategoryImagePreview(null);
                      }}
                      className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                    >
                      Abbrechen
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 border border-transparent rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700"
                    >
                      {editingCategory ? 'Aktualisieren' : 'Erstellen'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
