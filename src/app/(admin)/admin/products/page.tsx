"use client";

import React, { useState, useEffect, useRef } from "react";
import { ProductDocument } from "@/lib/models/Product";

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

export default function ProductsPage() {
  const [products, setProducts] = useState<ProductDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState<ProductDocument | null>(null);
  const [uploadedFiles, setUploadedFiles] = useState<string[]>([]);
  const [uploadedThumbnails, setUploadedThumbnails] = useState<string[]>([]);
  const [uploadedImageSizes, setUploadedImageSizes] = useState<Array<{ main: string; thumb: string; small: string }>>([]);
  const [imageInputKey, setImageInputKey] = useState(0);
  const [videoInputKey, setVideoInputKey] = useState(0);
  const [properties, setProperties] = useState<Array<{ name: string; value: string }>>([]);
  const [recommendedProducts, setRecommendedProducts] = useState<string[]>([]);
  const [recommendationSearch, setRecommendationSearch] = useState('');
  const [recommendationSearchResults, setRecommendationSearchResults] = useState<ProductDocument[]>([]);
  const [draggedImageIndex, setDraggedImageIndex] = useState<number | null>(null);

  // Generate SKU function
  const generateSKU = (title: string, categoryId?: string) => {
    if (!title) return '';
    
    // Get category prefix
    const category = categories.find(c => c._id === categoryId);
    const categoryPrefix = category ? category.name.substring(0, 3).toUpperCase() : 'PRD';
    
    // Clean title and take first 3 characters
    const titlePrefix = title
      .replace(/[^a-zA-Z0-9]/g, '')
      .substring(0, 3)
      .toUpperCase();
    
    // Generate random number
    const randomNum = Math.floor(Math.random() * 9999).toString().padStart(4, '0');
    
    return `${categoryPrefix}-${titlePrefix}-${randomNum}`;
  };

  const handleRecommendationSearch = async (query: string) => {
    setRecommendationSearch(query);
    if (query.length > 2) {
      try {
        const response = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
        if (response.ok) {
          const data = await response.json();
          setRecommendationSearchResults(data.products || []);
        }
      } catch (error) {
        console.error('Error searching products:', error);
        setRecommendationSearchResults([]);
      }
    } else {
      setRecommendationSearchResults([]);
    }
  };

  const handleAddRecommendedProduct = (productId: string) => {
    if (!recommendedProducts.includes(productId)) {
      setRecommendedProducts([...recommendedProducts, productId]);
    }
  };

  const executeCommand = (command: string, value?: string) => {
    document.execCommand(command, false, value);
    document.getElementById('description-editor')?.focus();
  };

  const insertHtml = () => {
    const html = prompt('HTML-Code eingeben:');
    if (html) {
      executeCommand('insertHTML', html);
    }
  };

  const toggleHtmlEditor = () => {
    if (showHtmlEditor) {
      // Switch from HTML to WYSIWYG
      setDescriptionContent(htmlContent);
    } else {
      // Switch from WYSIWYG to HTML
      setHtmlContent(descriptionContent);
    }
    setShowHtmlEditor(!showHtmlEditor);
  };
  const [draggedProductIndex, setDraggedProductIndex] = useState<number | null>(null);
  const [draggedRecommendedIndex, setDraggedRecommendedIndex] = useState<number | null>(null);
  const [draggedCategoryIndex, setDraggedCategoryIndex] = useState<number | null>(null);
  const [selectedFontSize, setSelectedFontSize] = useState('16px');
  const [selectedFontFamily, setSelectedFontFamily] = useState('Arial');
  const [selectedColor, setSelectedColor] = useState('#000000');
  const [descriptionContent, setDescriptionContent] = useState('');
  const [showHtmlEditor, setShowHtmlEditor] = useState(false);
  const [htmlContent, setHtmlContent] = useState('');
  const [categories, setCategories] = useState<Category[]>([]);
  const [variations, setVariations] = useState<Array<{
    name: string;
    options: Array<{
      value: string;
      priceAdjustment: number;
      inStock: boolean;
      stockQuantity: number;
    }>;
  }>>([]);
  const [activeModalTab, setActiveModalTab] = useState<'basic' | 'description' | 'media' | 'properties' | 'recommendations' | 'variations' | 'filters'>('basic');
  const [showSubcategoryDropdown, setShowSubcategoryDropdown] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [selectedSubcategory, setSelectedSubcategory] = useState<string>('');
  
  // Form state for tab persistence
  const [formData, setFormData] = useState({
    title: '',
    sku: '',
    category: '',
    subcategory: '',
    subcategories: [] as string[],
    price: '',
    offerPrice: '',
    tags: '',
    isOnSale: false,
    inStock: true,
    stockQuantity: '0',
  });

  // Filter state
  const [filters, setFilters] = useState<Array<{ _id: string; name: string; type: string; options: Array<{ name: string; value: string; sortOrder: number; color?: string }>; sortOrder: number }>>([]);
  const [productFilters, setProductFilters] = useState<Array<{ _id: string; productId: string; filterId: string; filterName: string; values: string[] }>>([]);
  const [selectedProductFilters, setSelectedProductFilters] = useState<Array<{ filterId: string; filterName: string; values: string[] }>>([]);

  // Filter states for admin products page
  const [filteredProducts, setFilteredProducts] = useState<ProductDocument[]>([]);
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Pagination states
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [itemsPerPage, setItemsPerPage] = useState<number>(50);
  const [paginatedProducts, setPaginatedProducts] = useState<ProductDocument[]>([]);

  // Pagination calculations
  const totalPages = Math.ceil(filteredProducts.length / itemsPerPage);
  const startItem = (currentPage - 1) * itemsPerPage + 1;
  const endItem = Math.min(currentPage * itemsPerPage, filteredProducts.length);

  useEffect(() => {
    fetchProducts();
    fetchCategories();
    fetchFilters();
  }, []);

  // Filter products based on category and search query
  useEffect(() => {
    let filtered = [...products];

    // Filter by category
    if (selectedCategoryFilter) {
      filtered = filtered.filter(product => product.category === selectedCategoryFilter);
    }

    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(product => 
        product.title.toLowerCase().includes(query) ||
        product._id.toLowerCase().includes(query) ||
        (product.sku && product.sku.toLowerCase().includes(query)) ||
        (product.tags && Array.isArray(product.tags) && product.tags.some(tag => tag.toLowerCase().includes(query)))
      );
    }

    setFilteredProducts(filtered);
    setCurrentPage(1); // Reset to first page when filters change
  }, [products, selectedCategoryFilter, searchQuery]);

  // Pagination effect
  useEffect(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const paginated = filteredProducts.slice(startIndex, endIndex);
    setPaginatedProducts(paginated);
  }, [filteredProducts, currentPage, itemsPerPage]);

  // Reset description content when editing product changes
  useEffect(() => {
    if (editingProduct) {
      setDescriptionContent(editingProduct.description || '');
    } else {
      setDescriptionContent('');
    }
  }, [editingProduct]);

  // Set initial content in editor when descriptionContent changes
  useEffect(() => {
    const editor = document.getElementById('description-editor');
    if (editor) {
      // Always update the editor content when descriptionContent changes
      if (descriptionContent !== editor.innerHTML) {
        editor.innerHTML = descriptionContent || '&nbsp;';
      }
    }
  }, [descriptionContent]);

  // Update editor content when switching to description tab
  useEffect(() => {
    if (activeModalTab === 'description') {
      const editor = document.getElementById('description-editor');
      if (editor && descriptionContent !== editor.innerHTML) {
        editor.innerHTML = descriptionContent || '&nbsp;';
      }
    }
  }, [activeModalTab, descriptionContent]);

  const fetchProducts = async () => {
    try {
      const response = await fetch("/api/admin/products");
      const data = await response.json();
      // Sort by sortOrder, then by createdAt
      const sortedProducts = data.sort((a: ProductDocument, b: ProductDocument) => {
        if (a.sortOrder !== b.sortOrder) {
          return a.sortOrder - b.sortOrder;
        }
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });
      setProducts(sortedProducts);
    } catch (error) {
      console.error("Failed to fetch products:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const response = await fetch("/api/admin/categories");
      const data = await response.json();
      setCategories(data);
    } catch (error) {
      console.error("Failed to fetch categories:", error);
    }
  };

  const fetchFilters = async () => {
    try {
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
    }
  };

  const toggleProductActive = async (productId: string, newStatus: boolean) => {
    try {
      const response = await fetch(`/api/admin/products/${productId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: newStatus }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        alert(`Failed to update product: ${errorData.error}`);
        return;
      }

      fetchProducts();
    } catch (error) {
      console.error("Failed to toggle product status:", error);
      alert("Failed to update product status");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this product?")) return;
    
    try {
      await fetch(`/api/admin/products/${id}`, { method: "DELETE" });
      fetchProducts();
    } catch (error) {
      console.error("Failed to delete product:", error);
    }
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Get description from state - use HTML content if in HTML mode, otherwise use WYSIWYG content
    const description = showHtmlEditor ? htmlContent : descriptionContent || "";
    
    // Generate slug from title
    const title = formData.title;
    let slug = title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
    
    // Ensure unique slug
    if (!editingProduct) {
      let counter = 1;
      let originalSlug = slug;
      while (products.some(p => p.slug === slug)) {
        slug = `${originalSlug}-${counter}`;
        counter++;
      }
    }

    const productData = {
      title: title,
      sku: formData.sku || generateSKU(title, formData.category),
      slug: editingProduct ? editingProduct.slug : slug,
      description: description,
      price: Math.round(parseFloat(formData.price || '0') * 100),
      offerPrice: formData.offerPrice ? Math.round(parseFloat(formData.offerPrice) * 100) : undefined,
      isOnSale: formData.isOnSale,
      category: formData.category,
      categoryId: formData.category,
      subcategoryId: formData.subcategory || undefined,
      subcategoryIds: formData.subcategories,
      tags: formData.tags.split(",").map(tag => tag.trim()).filter(tag => tag),
      inStock: formData.inStock,
      stockQuantity: parseInt(formData.stockQuantity) || 0,
      images: uploadedFiles.filter(url => url.includes('/uploads/images/')),
      imageSizes: uploadedImageSizes,
      videos: uploadedFiles.filter(url => url.includes('/uploads/videos/')),
      videoThumbnails: uploadedThumbnails,
      properties: properties.filter(prop => prop.name && prop.name.trim() !== '' && prop.value && prop.value.trim() !== ''),
      variations: variations.filter(variation => 
        variation.name && variation.name.trim() !== '' && 
        variation.options.length > 0 && 
        variation.options.every(option => option.value && option.value.trim() !== '')
      ).map(variation => ({
        ...variation,
        options: variation.options
      })),
      recommendedProducts: recommendedProducts,
      sortOrder: editingProduct ? editingProduct.sortOrder : products.length,
      createdAt: editingProduct ? editingProduct.createdAt : new Date(),
      updatedAt: new Date()
    };

    try {
      let response;
      if (editingProduct) {
        response = await fetch(`/api/admin/products/${editingProduct._id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(productData),
        });
      } else {
        response = await fetch("/api/admin/products", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(productData),
        });
      }
      
      if (!response.ok) {
        const errorData = await response.json();
        alert(`Failed to save product: ${errorData.details || errorData.error}`);
        return;
      }
      
      // Get the product ID from response
      const responseData = await response.json();
      const productId = editingProduct ? editingProduct._id : responseData._id;
      
      // Always delete existing product filters first
      console.log('Deleting existing product filters for product:', productId);
      const deleteResponse = await fetch(`/api/admin/product-filters?productId=${productId}`, {
        method: 'DELETE'
      });
      console.log('Delete response:', deleteResponse.ok);
      if (deleteResponse.ok) {
        const deleteResult = await deleteResponse.json();
        console.log('Deleted filters:', deleteResult.deletedCount);
      }
      
      // Save new product filters if any are selected
      if (selectedProductFilters.length > 0) {
        console.log('Saving product filters:', selectedProductFilters);
        console.log('Product ID:', productId);
        
        // Save new product filters
        for (const productFilter of selectedProductFilters) {
          if (productFilter.values.length > 0) { // Only save filters with selected values
            console.log('Saving filter:', productFilter);
            const saveResponse = await fetch('/api/admin/product-filters', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                productId,
                filterId: productFilter.filterId,
                values: productFilter.values
              })
            });
            console.log('Save response:', saveResponse.ok);
          }
        }
      }
      
      // Reset form and close modal
      setFormData({
        title: '',
        sku: '',
        category: '',
        subcategory: '',
        subcategories: [],
        price: '',
        offerPrice: '',
        tags: '',
        isOnSale: false,
        inStock: true,
        stockQuantity: '0',
      });
      setDescriptionContent('');
      setProperties([]);
      setRecommendedProducts([]);
      setVariations([]);
      setSelectedProductFilters([]);
      setUploadedFiles([]);
      setUploadedThumbnails([]);
      setUploadedImageSizes([]);
      setEditingProduct(null);
      setShowForm(false);
      setActiveModalTab('basic');
      
      // Refresh products
      fetchProducts();
      
    } catch (error) {
      console.error("Failed to save product:", error);
      alert("Failed to save product");
    }
  };

  const handleEdit = async (product: ProductDocument) => {
    setEditingProduct(product);
    setProperties(product.properties || []);
    setRecommendedProducts(product.recommendedProducts || []);
    
    // Load existing media files
    const existingImages = product.images || [];
    const existingVideos = product.videos || [];
    setUploadedFiles([...existingImages, ...existingVideos]);
    
    // Load existing image sizes
    if (product.imageSizes) {
      setUploadedImageSizes(product.imageSizes);
    }
    
    // Load existing video thumbnails
    if (product.videoThumbnails) {
      setUploadedThumbnails(product.videoThumbnails);
    }
    
    // Load existing product filters
    try {
      const response = await fetch(`/api/admin/product-filters?productId=${product._id}`);
      if (response.ok) {
        const existingFilters = await response.json();
        console.log('Loading existing filters:', existingFilters);
        // Clear existing filters first, then load new ones
        setSelectedProductFilters([]);
        // Use setTimeout to ensure state is cleared before setting new values
        setTimeout(() => {
          setSelectedProductFilters(existingFilters.map((pf: any) => {
            // Find the filter to get the current name
            const filter = filters.find(f => f._id === pf.filterId);
            return {
              filterId: pf.filterId,
              filterName: filter ? filter.name : pf.filterName || 'Unbekannter Filter',
              values: pf.values || []
            };
          }));
        }, 0);
      } else {
        setSelectedProductFilters([]);
      }
    } catch (error) {
      console.error('Failed to load product filters:', error);
      setSelectedProductFilters([]);
    }
    setVariations((product.variations || []).map(variation => {
      return {
        name: variation.name,
        options: variation.options.map(option => ({
          value: option.value,
          priceAdjustment: option.priceAdjustment || 0,
          inStock: option.inStock !== false,
          stockQuantity: option.stockQuantity || 0
        }))
      };
    }));
    
    setFormData({
      title: product.title,
      sku: product.sku || '',
      category: product.categoryId || product.category,
      subcategory: product.subcategoryId || '',
      subcategories: product.subcategoryIds || [],
      price: (product.price / 100).toString(),
      offerPrice: product.offerPrice ? (product.offerPrice / 100).toString() : '',
      tags: product.tags ? product.tags.join(', ') : '',
      isOnSale: product.isOnSale || false,
      inStock: product.inStock !== false,
      stockQuantity: product.stockQuantity?.toString() || '0',
    });
    
    setDescriptionContent(product.description || '');
    setHtmlContent(product.description || '');
    setShowForm(true);
    setActiveModalTab('basic');
  };

  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedProductIndex(index);
  };


  const moveProduct = async (fromIndex: number, toIndex: number) => {
    // Find the actual products in the original array
    const fromProduct = paginatedProducts[fromIndex];
    const toProduct = paginatedProducts[toIndex];
    
    const fromOriginalIndex = products.findIndex(p => p._id === fromProduct._id);
    const toOriginalIndex = products.findIndex(p => p._id === toProduct._id);
    
    const newProducts = [...products];
    const [movedProduct] = newProducts.splice(fromOriginalIndex, 1);
    newProducts.splice(toOriginalIndex, 0, movedProduct);
    
    // Update local state immediately for instant UI feedback
    setProducts(newProducts);
    
    // Update sortOrder for all products
    const updates = newProducts.map((product, index) => ({
      id: product._id,
      sortOrder: index
    }));

    // Update in database in background
    try {
      await fetch("/api/admin/products/reorder", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ products: updates }),
      });
    } catch (error) {
      console.error("Failed to reorder products:", error);
      // Revert on error
      fetchProducts();
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: "image" | "video") => {
    const files = e.target.files;
    if (!files) return;

    for (const file of files) {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("type", type);

      try {
        const response = await fetch("/api/admin/upload", {
          method: "POST",
          body: formData,
        });
        
        if (!response.ok) {
          const errorData = await response.json();
          alert(`Upload failed: ${errorData.error}`);
          return;
        }
        
        const data = await response.json();
        
        // Always update uploadedFiles for immediate display
        setUploadedFiles(prev => [...prev, data.url]);
        
        if (type === "image" && data.imageSizes && data.imageSizes.length > 0) {
          const mainImage = data.imageSizes.find((img: any) => img.size === 800);
          const thumbImage = data.imageSizes.find((img: any) => img.size === 400);
          const smallImage = data.imageSizes.find((img: any) => img.size === 200);
          
          setUploadedImageSizes(prev => [...prev, {
            main: mainImage?.url || data.url,
            thumb: thumbImage?.url || data.url.replace('.webp', '_thumb.webp'),
            small: smallImage?.url || data.url.replace('.webp', '_small.webp')
          }]);
        }
        if (type === "video" && data.thumbnailUrl) {
          setUploadedThumbnails(prev => [...prev, data.thumbnailUrl]);
        }
        
        // Also update editingProduct if we're editing
        if (editingProduct) {
          const updatedProduct = { ...editingProduct };
          if (type === "image") {
            updatedProduct.images = [...(updatedProduct.images || []), data.url];
            if (data.imageSizes && data.imageSizes.length > 0) {
              const mainImage = data.imageSizes.find((img: any) => img.size === 800);
              const thumbImage = data.imageSizes.find((img: any) => img.size === 400);
              const smallImage = data.imageSizes.find((img: any) => img.size === 200);
              
              updatedProduct.imageSizes = [...(updatedProduct.imageSizes || []), {
                main: mainImage?.url || data.url,
                thumb: thumbImage?.url || data.url.replace('.webp', '_thumb.webp'),
                small: smallImage?.url || data.url.replace('.webp', '_small.webp')
              }];
            }
          } else {
            updatedProduct.videos = [...(updatedProduct.videos || []), data.url];
            if (data.thumbnailUrl) {
              updatedProduct.videoThumbnails = [...(updatedProduct.videoThumbnails || []), data.thumbnailUrl];
            }
          }
          setEditingProduct(updatedProduct);
        }
      } catch (error) {
        console.error("Upload failed:", error);
      }
    }

    // Reset input without re-rendering the form
    if (type === "image") {
      setImageInputKey(prev => prev + 1);
    } else {
      setVideoInputKey(prev => prev + 1);
    }
  };

  const removeFile = async (fileUrl: string, type: "image" | "video") => {
    try {
      // Delete the main file
      await fetch("/api/admin/delete-file", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fileUrl }),
      });

      // Always update uploadedFiles for immediate display
      setUploadedFiles(prev => prev.filter(url => url !== fileUrl));
      
      if (type === "image") {
        setUploadedImageSizes(prev => prev.filter((_, index) => {
          const imageUrls = uploadedFiles.filter(url => url.includes('/uploads/images/'));
          const fileIndex = imageUrls.indexOf(fileUrl);
          return index !== fileIndex;
        }));
      } else {
        setUploadedThumbnails(prev => prev.filter((_, index) => {
          const videoUrls = uploadedFiles.filter(url => url.includes('/uploads/videos/'));
          const fileIndex = videoUrls.indexOf(fileUrl);
          return index !== fileIndex;
        }));
      }
      
      // Also update editingProduct if we're editing
      if (editingProduct) {
        const updatedProduct = { ...editingProduct };
        if (type === "image") {
          const imageIndex = updatedProduct.images.findIndex((img: string) => img === fileUrl);
          updatedProduct.images = updatedProduct.images.filter((img: string) => img !== fileUrl);
          
          // Delete all image size variants
          if (imageIndex !== -1 && updatedProduct.imageSizes && updatedProduct.imageSizes.length > imageIndex) {
            const imageSize = updatedProduct.imageSizes[imageIndex];
            
            // Delete all variants
            const variantsToDelete = [imageSize.main, imageSize.thumb, imageSize.small].filter(Boolean);
            for (const variantUrl of variantsToDelete) {
              if (variantUrl && variantUrl !== fileUrl) {
                try {
                  await fetch("/api/admin/delete-file", {
                    method: "DELETE",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ fileUrl: variantUrl }),
                  });
                } catch (error) {
                  console.error("Failed to delete variant:", error);
                }
              }
            }
            
            updatedProduct.imageSizes = updatedProduct.imageSizes.filter((_, index) => index !== imageIndex);
          }
        } else {
          updatedProduct.videos = updatedProduct.videos.filter((vid: string) => vid !== fileUrl);
          const videoIndex = updatedProduct.videos.findIndex((vid: string) => vid === fileUrl);
          if (videoIndex !== -1 && updatedProduct.videoThumbnails && updatedProduct.videoThumbnails.length > videoIndex) {
            const thumbnailUrl = updatedProduct.videoThumbnails[videoIndex];
            if (thumbnailUrl) {
              try {
                await fetch("/api/admin/delete-file", {
                  method: "DELETE",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ fileUrl: thumbnailUrl }),
                });
              } catch (error) {
                console.error("Failed to delete thumbnail:", error);
              }
            }
            updatedProduct.videoThumbnails = updatedProduct.videoThumbnails.filter((_, index) => index !== videoIndex);
          }
        }
        setEditingProduct(updatedProduct);
      }
    } catch (error) {
      console.error("Failed to remove file:", error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Lade Produkte...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Produktverwaltung</h1>
              <p className="mt-2 text-gray-600">Verwalten Sie Ihre Produkte</p>
            </div>
            <button
              onClick={() => setShowForm(true)}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Neues Produkt
            </button>
          </div>
        </div>

        {/* Filter Section */}
        <div className="mb-6 bg-white rounded-lg shadow p-6">
          <div className="flex flex-col sm:flex-row gap-4">
            {/* Search Input */}
            <div className="flex-1">
              <label htmlFor="search" className="block text-sm font-medium text-gray-700 mb-2">
                Suche
              </label>
              <input
                type="text"
                id="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Produktname, SKU, ID oder Tags durchsuchen..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            {/* Category Filter */}
            <div className="sm:w-64">
              <label htmlFor="category-filter" className="block text-sm font-medium text-gray-700 mb-2">
                Kategorie
              </label>
              <select
                id="category-filter"
                value={selectedCategoryFilter}
                onChange={(e) => setSelectedCategoryFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Alle Kategorien</option>
                {categories.map((category) => (
                  <option key={category._id} value={category._id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Clear Filters Button */}
            <div className="flex items-end">
              <button
                onClick={() => {
                  setSearchQuery('');
                  setSelectedCategoryFilter('');
                  setCurrentPage(1);
                }}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
              >
                Filter zurücksetzen
              </button>
            </div>
          </div>

          {/* Results Count */}
          <div className="mt-4 text-sm text-gray-600">
            {filteredProducts.length} von {products.length} Produkten angezeigt
          </div>
        </div>

        {/* Products Table */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Order
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Bild
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  SKU
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Kategorie
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Preis
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
              {paginatedProducts.map((product, index) => (
                <tr 
                  key={product._id} 
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
                    if (draggedProductIndex !== null && draggedProductIndex !== dropIndex) {
                      moveProduct(draggedProductIndex, dropIndex);
                    }
                    setDraggedProductIndex(null);
                  }}
                  onDragEnd={() => setDraggedProductIndex(null)}
                >
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    <div className="flex items-center">
                      <svg className="w-4 h-4 text-gray-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" />
                      </svg>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {product.images && product.images.length > 0 ? (
                      <img
                        className="h-10 w-10 rounded-lg object-cover"
                        src={product.images[0]}
                        alt={product.title}
                      />
                    ) : (
                      <div className="h-10 w-10 bg-gray-200 rounded-lg flex items-center justify-center">
                        <svg className="h-6 w-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{product.title}</div>
                    <div className="text-sm text-gray-500">{product.tags}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-mono">
                    {product.sku || 'N/A'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {categories.find(c => c._id === product.categoryId)?.name || product.category || 'Unknown'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    <div className="flex flex-col">
                      <span className="font-medium">
                        {product.offerPrice ? `€${(product.offerPrice / 100).toFixed(2)}` : `€${(product.price / 100).toFixed(2)}`}
                      </span>
                      {product.offerPrice && (
                        <span className="text-sm text-gray-500 line-through">€{(product.price / 100).toFixed(2)}</span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <button
                      onClick={() => toggleProductActive(product._id, !product.isActive)}
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium transition-colors ${
                        product.isActive 
                          ? 'bg-green-100 text-green-800 hover:bg-green-200' 
                          : 'bg-red-100 text-red-800 hover:bg-red-200'
                      }`}
                    >
                      {product.isActive ? 'Aktiv' : 'Inaktiv'}
                    </button>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleEdit(product)}
                        className="text-blue-600 hover:text-blue-900"
                      >
                        Bearbeiten
                      </button>
                      <button
                        onClick={() => handleDelete(product._id)}
                        className="text-red-600 hover:text-red-900"
                      >
                        Löschen
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {filteredProducts.length > 0 && (
          <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
            <div className="flex-1 flex justify-between sm:hidden">
              <button
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
                className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Zurück
              </button>
              <button
                onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages}
                className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Weiter
              </button>
            </div>
            <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
              <div>
                <p className="text-sm text-gray-700">
                  Zeige <span className="font-medium">{startItem}</span> bis <span className="font-medium">{endItem}</span> von{' '}
                  <span className="font-medium">{filteredProducts.length}</span> Ergebnissen
                </p>
              </div>
              <div className="flex items-center space-x-2">
                <div className="flex items-center">
                  <label htmlFor="items-per-page" className="text-sm text-gray-700 mr-2">
                    Pro Seite:
                  </label>
                  <select
                    id="items-per-page"
                    value={itemsPerPage}
                    onChange={(e) => {
                      setItemsPerPage(Number(e.target.value));
                      setCurrentPage(1);
                    }}
                    className="border border-gray-300 rounded-md px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value={25}>25</option>
                    <option value={50}>50</option>
                    <option value={100}>100</option>
                    <option value={200}>200</option>
                  </select>
                </div>
                <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                  <button
                    onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                    className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <span className="sr-only">Previous</span>
                    <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                      <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </button>
                  
                  {/* Page Numbers */}
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum;
                    if (totalPages <= 5) {
                      pageNum = i + 1;
                    } else if (currentPage <= 3) {
                      pageNum = i + 1;
                    } else if (currentPage >= totalPages - 2) {
                      pageNum = totalPages - 4 + i;
                    } else {
                      pageNum = currentPage - 2 + i;
                    }
                    
                    return (
                      <button
                        key={pageNum}
                        onClick={() => setCurrentPage(pageNum)}
                        className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                          currentPage === pageNum
                            ? 'z-10 bg-blue-50 border-blue-500 text-blue-600'
                            : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                        }`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                  
                  <button
                    onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                    disabled={currentPage === totalPages}
                    className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <span className="sr-only">Next</span>
                    <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                      <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                    </svg>
                  </button>
                </nav>
              </div>
            </div>
          </div>
        )}

        {/* Empty State */}
        {products.length === 0 && (
          <div className="text-center py-12">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900">Keine Produkte</h3>
            <p className="mt-1 text-sm text-gray-500">Beginnen Sie mit dem Hinzufügen eines neuen Produkts.</p>
            <div className="mt-6">
              <button
                onClick={() => setShowForm(true)}
                className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Neues Produkt
              </button>
            </div>
          </div>
        )}

        {/* Product Form Modal */}
        {showForm && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-20 mx-auto p-5 border w-11/12 max-w-4xl shadow-lg rounded-md bg-white">
              <div className="mt-3">
                {/* Modal Header */}
                <div className="flex items-center justify-between pb-4 border-b">
                  <h3 className="text-lg font-medium text-gray-900">
                    {editingProduct ? 'Produkt bearbeiten' : 'Neues Produkt'}
                  </h3>
                  <button
                    onClick={() => {
                      setShowForm(false);
                      setEditingProduct(null);
                      setFormData({
                        title: '',
                        sku: '',
                        category: '',
                        subcategory: '',
                        subcategories: [],
                        price: '',
                        offerPrice: '',
                        tags: '',
                        isOnSale: false,
                        inStock: true,
                        stockQuantity: '0',
                      });
                      setDescriptionContent('');
                      setHtmlContent('');
                      setProperties([]);
                      setRecommendedProducts([]);
                      setVariations([]);
                      setUploadedFiles([]);
                      setUploadedThumbnails([]);
                      setUploadedImageSizes([]);
                      setSelectedProductFilters([]);
                      setRecommendationSearch('');
                      setRecommendationSearchResults([]);
                      setShowHtmlEditor(false);
                      setActiveModalTab('basic');
                    }}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                {/* Modal Tabs */}
                <div className="border-b border-gray-200">
                  <nav className="-mb-px flex space-x-8">
                    {[
                      { id: 'basic', name: 'Grunddaten' },
                      { id: 'description', name: 'Beschreibung' },
                      { id: 'media', name: 'Medien' },
                      { id: 'properties', name: 'Eigenschaften' },
                      { id: 'recommendations', name: 'Empfehlungen' },
                      { id: 'variations', name: 'Varianten' },
                      { id: 'filters', name: 'Filter' }
                    ].map((tab) => (
                      <button
                        key={tab.id}
                        onClick={() => setActiveModalTab(tab.id as any)}
                        className={`py-2 px-1 border-b-2 font-medium text-sm ${
                          activeModalTab === tab.id
                            ? 'border-blue-500 text-blue-600'
                            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                        }`}
                      >
                        {tab.name}
                      </button>
                    ))}
                  </nav>
                </div>

                {/* Modal Content */}
                <form onSubmit={handleFormSubmit} className="mt-6">
                  {/* Basic Tab */}
                  {activeModalTab === 'basic' && (
                    <div className="space-y-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Titel *</label>
                        <input
                          type="text"
                          value={formData.title}
                          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                          className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                          required
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700">Artikelnummer (SKU) *</label>
                        <div className="flex space-x-2">
                          <input
                            type="text"
                            value={formData.sku}
                            onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                            placeholder="z.B. DAR-PRO-0001"
                            className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                            required
                          />
                          <button
                            type="button"
                            onClick={() => setFormData({ ...formData, sku: generateSKU(formData.title, formData.category) })}
                            className="mt-1 px-3 py-2 text-sm bg-gray-100 hover:bg-gray-200 border border-gray-300 rounded-md"
                            title="Automatisch generieren"
                          >
                            Auto
                          </button>
                        </div>
                        <p className="mt-1 text-xs text-gray-500">
                          Format: KATEGORIE-TITEL-NUMMER (z.B. DAR-PRO-0001)
                        </p>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700">Kategorie *</label>
                        <select
                          value={formData.category}
                          onChange={(e) => {
                            const selectedCategory = e.target.value;
                            setFormData({ ...formData, category: selectedCategory, subcategory: '' });
                            setSelectedCategory(selectedCategory);
                          }}
                          className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                          required
                        >
                          <option value="">Kategorie wählen</option>
                          {categories.map((category) => (
                            <option key={category._id} value={category._id}>
                              {category.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700">Unterkategorie</label>
                        <div className="relative">
                          <select
                            value={formData.subcategory}
                            onChange={(e) => setFormData({ ...formData, subcategory: e.target.value })}
                            className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                          >
                            <option value="">Unterkategorie wählen</option>
                            {categories
                              .find(cat => cat._id === formData.category)
                              ?.subcategories?.map((subcategory) => (
                                <option key={subcategory._id} value={subcategory._id}>
                                  {subcategory.name}
                                </option>
                              ))}
                          </select>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700">Preis (€) *</label>
                          <input
                            type="number"
                            step="0.01"
                            value={formData.price}
                            onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                            className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                            required
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700">Angebotspreis (€)</label>
                          <input
                            type="number"
                            step="0.01"
                            value={formData.offerPrice}
                            onChange={(e) => setFormData({ ...formData, offerPrice: e.target.value })}
                            className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700">Tags</label>
                        <input
                          type="text"
                          value={formData.tags}
                          onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                          placeholder="Tag1, Tag2, Tag3"
                          className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>

                      <div className="flex items-center space-x-6">
                        <label className="flex items-center">
                          <input
                            type="checkbox"
                            checked={formData.isOnSale}
                            onChange={(e) => setFormData({ ...formData, isOnSale: e.target.checked })}
                            className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
                          />
                          <span className="ml-2 text-sm text-gray-700">Im Angebot</span>
                        </label>
                        <label className="flex items-center">
                          <input
                            type="checkbox"
                            checked={formData.inStock}
                            onChange={(e) => setFormData({ 
                              ...formData, 
                              inStock: e.target.checked,
                              stockQuantity: e.target.checked ? formData.stockQuantity : '0'
                            })}
                            className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
                          />
                          <span className="ml-2 text-sm text-gray-700">Auf Lager</span>
                        </label>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700">Lagerbestand</label>
                        <input
                          type="number"
                          value={formData.inStock ? formData.stockQuantity : '0'}
                          onChange={(e) => setFormData({ ...formData, stockQuantity: e.target.value })}
                          disabled={!formData.inStock}
                          className={`mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 ${
                            !formData.inStock ? 'bg-gray-100 text-gray-500 cursor-not-allowed' : ''
                          }`}
                        />
                      </div>
                    </div>
                  )}

                  {/* Description Tab */}
                  {activeModalTab === 'description' && (
                    <div>
                      <div className="flex justify-between items-center mb-4">
                        <label className="block text-sm font-medium text-gray-700">Beschreibung</label>
                        <div className="flex space-x-2">
                          <button
                            type="button"
                            onClick={toggleHtmlEditor}
                            className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded border"
                          >
                            {showHtmlEditor ? 'WYSIWYG Editor' : 'HTML Editor'}
                          </button>
                        </div>
                      </div>

                      {showHtmlEditor ? (
                        <div>
                          <textarea
                            value={htmlContent}
                            onChange={(e) => setHtmlContent(e.target.value)}
                            className="w-full h-64 p-3 border border-gray-300 rounded-md font-mono text-sm"
                            placeholder="HTML-Code hier eingeben..."
                          />
                        </div>
                      ) : (
                        <div>
                          {/* Rich Text Editor Toolbar */}
                          <div className="border border-gray-300 rounded-t-md bg-gray-50 p-2 flex flex-wrap items-center gap-2">
                            {/* Font Controls */}
                            <select
                              value={selectedFontFamily}
                              onChange={(e) => {
                                setSelectedFontFamily(e.target.value);
                                executeCommand('fontName', e.target.value);
                              }}
                              className="text-sm border border-gray-300 rounded px-2 py-1"
                            >
                              <option value="Arial">Arial</option>
                              <option value="Helvetica">Helvetica</option>
                              <option value="Times New Roman">Times New Roman</option>
                              <option value="Georgia">Georgia</option>
                              <option value="Verdana">Verdana</option>
                              <option value="Courier New">Courier New</option>
                            </select>

                            <select
                              value={selectedFontSize}
                              onChange={(e) => {
                                setSelectedFontSize(e.target.value);
                                executeCommand('fontSize', '7');
                                executeCommand('styleWithCSS', 'true');
                                executeCommand('fontSize', e.target.value.replace('px', ''));
                              }}
                              className="text-sm border border-gray-300 rounded px-2 py-1"
                            >
                              <option value="12px">12px</option>
                              <option value="14px">14px</option>
                              <option value="16px">16px</option>
                              <option value="18px">18px</option>
                              <option value="20px">20px</option>
                              <option value="24px">24px</option>
                              <option value="28px">28px</option>
                              <option value="32px">32px</option>
                            </select>

                            <div className="w-px h-6 bg-gray-300"></div>

                            {/* Text Formatting */}
                            <button
                              type="button"
                              onClick={() => executeCommand('bold')}
                              className="px-2 py-1 text-sm font-bold border border-gray-300 rounded hover:bg-gray-200"
                              title="Fett"
                            >
                              B
                            </button>
                            <button
                              type="button"
                              onClick={() => executeCommand('italic')}
                              className="px-2 py-1 text-sm italic border border-gray-300 rounded hover:bg-gray-200"
                              title="Kursiv"
                            >
                              I
                            </button>
                            <button
                              type="button"
                              onClick={() => executeCommand('underline')}
                              className="px-2 py-1 text-sm underline border border-gray-300 rounded hover:bg-gray-200"
                              title="Unterstrichen"
                            >
                              U
                            </button>
                            <button
                              type="button"
                              onClick={() => executeCommand('strikeThrough')}
                              className="px-2 py-1 text-sm line-through border border-gray-300 rounded hover:bg-gray-200"
                              title="Durchgestrichen"
                            >
                              S
                            </button>

                            <div className="w-px h-6 bg-gray-300"></div>

                            {/* Text Alignment */}
                            <button
                              type="button"
                              onClick={() => executeCommand('justifyLeft')}
                              className="px-2 py-1 text-sm border border-gray-300 rounded hover:bg-gray-200"
                              title="Links ausrichten"
                            >
                              ⬅
                            </button>
                            <button
                              type="button"
                              onClick={() => executeCommand('justifyCenter')}
                              className="px-2 py-1 text-sm border border-gray-300 rounded hover:bg-gray-200"
                              title="Zentriert"
                            >
                              ⬆
                            </button>
                            <button
                              type="button"
                              onClick={() => executeCommand('justifyRight')}
                              className="px-2 py-1 text-sm border border-gray-300 rounded hover:bg-gray-200"
                              title="Rechts ausrichten"
                            >
                              ➡
                            </button>
                            <button
                              type="button"
                              onClick={() => executeCommand('justifyFull')}
                              className="px-2 py-1 text-sm border border-gray-300 rounded hover:bg-gray-200"
                              title="Blocksatz"
                            >
                              ⬌
                            </button>

                            <div className="w-px h-6 bg-gray-300"></div>

                            {/* Lists */}
                            <button
                              type="button"
                              onClick={() => executeCommand('insertUnorderedList')}
                              className="px-2 py-1 text-sm border border-gray-300 rounded hover:bg-gray-200"
                              title="Aufzählungsliste"
                            >
                              • Liste
                            </button>
                            <button
                              type="button"
                              onClick={() => executeCommand('insertOrderedList')}
                              className="px-2 py-1 text-sm border border-gray-300 rounded hover:bg-gray-200"
                              title="Nummerierte Liste"
                            >
                              1. Liste
                            </button>

                            <div className="w-px h-6 bg-gray-300"></div>

                            {/* Color */}
                            <input
                              type="color"
                              value={selectedColor}
                              onChange={(e) => {
                                setSelectedColor(e.target.value);
                                executeCommand('foreColor', e.target.value);
                              }}
                              className="w-8 h-8 border border-gray-300 rounded cursor-pointer"
                              title="Textfarbe"
                            />

                            <div className="w-px h-6 bg-gray-300"></div>

                            {/* HTML Insert */}
                            <button
                              type="button"
                              onClick={insertHtml}
                              className="px-2 py-1 text-sm border border-gray-300 rounded hover:bg-gray-200"
                              title="HTML einfügen"
                            >
                              &lt;HTML&gt;
                            </button>
                          </div>

                          {/* Editor Area */}
                          <div
                            id="description-editor"
                            contentEditable
                            className="min-h-[300px] p-4 border border-gray-300 border-t-0 rounded-b-md focus:ring-blue-500 focus:border-blue-500"
                            style={{
                              fontSize: selectedFontSize,
                              fontFamily: selectedFontFamily,
                              color: selectedColor
                            }}
                            onInput={(e) => setDescriptionContent(e.currentTarget.innerHTML)}
                            dangerouslySetInnerHTML={{ __html: descriptionContent }}
                          />
                        </div>
                      )}
                    </div>
                  )}

                  {/* Media Tab */}
                  {activeModalTab === 'media' && (
                    <div className="space-y-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Bilder hochladen</label>
                        <input
                          key={imageInputKey}
                          type="file"
                          multiple
                          accept="image/*"
                          onChange={(e) => handleFileUpload(e, 'image')}
                          className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                        />
                        <div className="mt-4 grid grid-cols-4 gap-4">
                          {uploadedFiles.filter(url => url.includes('/uploads/images/')).map((url, index) => (
                            <div 
                              key={index} 
                              className="relative cursor-move"
                              draggable
                              onDragStart={(e) => setDraggedImageIndex(index)}
                              onDragOver={(e) => e.preventDefault()}
                              onDrop={(e) => {
                                e.preventDefault();
                                if (draggedImageIndex === null) return;
                                
                                const newFiles = [...uploadedFiles];
                                const draggedFile = newFiles[draggedImageIndex];
                                newFiles.splice(draggedImageIndex, 1);
                                newFiles.splice(index, 0, draggedFile);
                                setUploadedFiles(newFiles);
                                
                                // Also reorder imageSizes if it exists
                                if (uploadedImageSizes.length > 0) {
                                  const newImageSizes = [...uploadedImageSizes];
                                  const draggedImageSize = newImageSizes[draggedImageIndex];
                                  newImageSizes.splice(draggedImageIndex, 1);
                                  newImageSizes.splice(index, 0, draggedImageSize);
                                  setUploadedImageSizes(newImageSizes);
                                }
                                
                                setDraggedImageIndex(null);
                              }}
                            >
                              <img src={url} alt={`Upload ${index + 1}`} className="w-full h-24 object-cover rounded-lg" />
                              <button
                                type="button"
                                onClick={() => removeFile(url, 'image')}
                                className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm"
                              >
                                ×
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Videos hochladen</label>
                        <input
                          key={videoInputKey}
                          type="file"
                          multiple
                          accept="video/*"
                          onChange={(e) => handleFileUpload(e, 'video')}
                          className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                        />
                        <div className="mt-4 grid grid-cols-4 gap-4">
                          {uploadedFiles.filter(url => url.includes('/uploads/videos/')).map((url, index) => (
                            <div 
                              key={index} 
                              className="relative cursor-move"
                              draggable
                              onDragStart={(e) => setDraggedImageIndex(index)}
                              onDragOver={(e) => e.preventDefault()}
                              onDrop={(e) => {
                                e.preventDefault();
                                if (draggedImageIndex === null) return;
                                
                                const newFiles = [...uploadedFiles];
                                const draggedFile = newFiles[draggedImageIndex];
                                newFiles.splice(draggedImageIndex, 1);
                                newFiles.splice(index, 0, draggedFile);
                                setUploadedFiles(newFiles);
                                
                                // Also reorder videoThumbnails if it exists
                                if (uploadedThumbnails.length > 0) {
                                  const newThumbnails = [...uploadedThumbnails];
                                  const draggedThumbnail = newThumbnails[draggedImageIndex];
                                  newThumbnails.splice(draggedImageIndex, 1);
                                  newThumbnails.splice(index, 0, draggedThumbnail);
                                  setUploadedThumbnails(newThumbnails);
                                }
                                
                                setDraggedImageIndex(null);
                              }}
                            >
                              <video src={url} className="w-full h-24 object-cover rounded-lg" controls />
                              <button
                                type="button"
                                onClick={() => removeFile(url, 'video')}
                                className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm"
                              >
                                ×
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Properties Tab */}
                  {activeModalTab === 'properties' && (
                    <div className="space-y-4">
                      
                      <div className="flex justify-between items-center">
                        <h4 className="text-lg font-medium text-gray-900">Eigenschaften</h4>
                        <button
                          type="button"
                          onClick={() => setProperties([...properties, { name: '', value: '' }])}
                          className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                        >
                          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                          </svg>
                          Eigenschaft hinzufügen
                        </button>
                      </div>
                      {properties.map((prop, index) => (
                        <div key={index} className="flex space-x-4">
                          <input
                            type="text"
                            placeholder="Eigenschaftsname"
                            value={prop.name}
                            onChange={(e) => {
                              const newProperties = [...properties];
                              newProperties[index].name = e.target.value;
                              setProperties(newProperties);
                            }}
                            className="flex-1 border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                          />
                          <input
                            type="text"
                            placeholder="Wert"
                            value={prop.value}
                            onChange={(e) => {
                              const newProperties = [...properties];
                              newProperties[index].value = e.target.value;
                              setProperties(newProperties);
                            }}
                            className="flex-1 border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                          />
                          <button
                            type="button"
                            onClick={() => setProperties(properties.filter((_, i) => i !== index))}
                            className="px-3 py-2 border border-red-300 text-red-700 rounded-md hover:bg-red-50"
                          >
                            Entfernen
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Recommendations Tab */}
                  {activeModalTab === 'recommendations' && (
                    <div className="space-y-4">
                      
                      <div className="flex justify-between items-center">
                        <h4 className="text-lg font-medium text-gray-900">Empfohlene Produkte</h4>
                      </div>
                      
                      {/* Search Input */}
                      <div className="relative">
                        <input
                          type="text"
                          placeholder="Produkt suchen..."
                          value={recommendationSearch}
                          onChange={(e) => handleRecommendationSearch(e.target.value)}
                          className="w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                        />
                        {recommendationSearch.length > 2 && recommendationSearchResults.length > 0 && (
                          <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-y-auto">
                            {recommendationSearchResults
                              .filter(p => p._id !== editingProduct?._id && !recommendedProducts.includes(p._id))
                              .map((product) => (
                                <div
                                  key={product._id}
                                  onClick={() => {
                                    handleAddRecommendedProduct(product._id);
                                    setRecommendationSearch('');
                                    setRecommendationSearchResults([]);
                                  }}
                                  className="flex items-center p-3 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-b-0"
                                >
                                  {product.images?.[0] && (
                                    <img
                                      src={product.images[0]}
                                      alt={product.title}
                                      className="w-8 h-8 rounded object-cover mr-3"
                                    />
                                  )}
                                  <div className="flex-1">
                                    <div className="text-sm font-medium text-gray-900">{product.title}</div>
                                    <div className="text-xs text-gray-500">€{(product.price / 100).toFixed(2)}</div>
                                  </div>
                                </div>
                              ))}
                          </div>
                        )}
                      </div>
                      <div className="space-y-2">
                        {recommendedProducts.map((productId, index) => {
                          const product = products.find(p => p._id === productId);
                          return (
                            <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                              <div className="flex items-center">
                                {product?.images?.[0] && (
                                  <img
                                    src={product.images[0]}
                                    alt={product.title}
                                    className="w-8 h-8 rounded object-cover mr-3"
                                  />
                                )}
                                <div>
                                  <span className="text-sm font-medium text-gray-900">
                                    {product?.title || `Produkt-ID: ${productId}`}
                                  </span>
                                  <div className="text-xs text-gray-500">
                                    {product ? `€${(product.price / 100).toFixed(2)}` : 'Produkt nicht gefunden'}
                                  </div>
                                </div>
                              </div>
                              <button
                                type="button"
                                onClick={() => setRecommendedProducts(recommendedProducts.filter((_, i) => i !== index))}
                                className="text-red-600 hover:text-red-800 text-sm"
                              >
                                Entfernen
                              </button>
                            </div>
                          );
                        })}
                        {recommendedProducts.length === 0 && (
                          <p className="text-gray-500 text-center py-4">Keine empfohlenen Produkte hinzugefügt</p>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Variations Tab */}
                  {activeModalTab === 'variations' && (
                    <div className="space-y-6">
                      
                      <div className="flex justify-between items-center">
                        <h4 className="text-lg font-medium text-gray-900">Produktvarianten</h4>
                        <button
                          type="button"
                          onClick={() => setVariations([...variations, { name: '', options: [] }])}
                          className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                        >
                          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                          </svg>
                          Variante hinzufügen
                        </button>
                      </div>
                      
                      {variations.map((variation, variationIndex) => (
                        <div key={variationIndex} className="border border-gray-200 rounded-lg p-4">
                          <div className="flex items-center justify-between mb-4">
                            <input
                              type="text"
                              placeholder="Variantenname (z.B. Größe, Farbe)"
                              value={variation.name}
                              onChange={(e) => {
                                const newVariations = [...variations];
                                newVariations[variationIndex].name = e.target.value;
                                setVariations(newVariations);
                              }}
                              className="flex-1 border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 mr-4"
                            />
                            <button
                              type="button"
                              onClick={() => setVariations(variations.filter((_, i) => i !== variationIndex))}
                              className="px-3 py-2 border border-red-300 text-red-700 rounded-md hover:bg-red-50"
                            >
                              Entfernen
                            </button>
                          </div>
                          
                          <div className="space-y-3">
                            <div className="flex justify-between items-center">
                              <h5 className="text-sm font-medium text-gray-700">Optionen</h5>
                              <button
                                type="button"
                                onClick={() => {
                                  const newVariations = [...variations];
                                  newVariations[variationIndex].options.push({
                                    value: '',
                                    priceAdjustment: 0,
                                    inStock: true,
                                    stockQuantity: 0
                                  });
                                  setVariations(newVariations);
                                }}
                                className="text-sm text-blue-600 hover:text-blue-800"
                              >
                                Option hinzufügen
                              </button>
                            </div>
                            
                            {variation.options.map((option, optionIndex) => (
                              <div key={optionIndex} className="grid grid-cols-4 gap-3 items-center">
                                <input
                                  type="text"
                                  placeholder="Wert (z.B. L, XL, Rot)"
                                  value={option.value}
                                  onChange={(e) => {
                                    const newVariations = [...variations];
                                    newVariations[variationIndex].options[optionIndex].value = e.target.value;
                                    setVariations(newVariations);
                                  }}
                                  className="border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                                />
                                <input
                                  type="number"
                                  placeholder="Preisanpassung (€)"
                                  step="0.01"
                                  value={option.priceAdjustment}
                                  onChange={(e) => {
                                    const newVariations = [...variations];
                                    newVariations[variationIndex].options[optionIndex].priceAdjustment = parseFloat(e.target.value) || 0;
                                    setVariations(newVariations);
                                  }}
                                  className="border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                                />
                                <input
                                  type="number"
                                  placeholder="Lagerbestand"
                                  value={option.stockQuantity}
                                  onChange={(e) => {
                                    const newVariations = [...variations];
                                    newVariations[variationIndex].options[optionIndex].stockQuantity = parseInt(e.target.value) || 0;
                                    setVariations(newVariations);
                                  }}
                                  className="border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                                />
                                <div className="flex items-center space-x-2">
                                  <label className="flex items-center">
                                    <input
                                      type="checkbox"
                                      checked={option.inStock}
                                      onChange={(e) => {
                                        const newVariations = [...variations];
                                        newVariations[variationIndex].options[optionIndex].inStock = e.target.checked;
                                        setVariations(newVariations);
                                      }}
                                      className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
                                    />
                                    <span className="ml-1 text-sm text-gray-700">Auf Lager</span>
                                  </label>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const newVariations = [...variations];
                                      newVariations[variationIndex].options = newVariations[variationIndex].options.filter((_, i) => i !== optionIndex);
                                      setVariations(newVariations);
                                    }}
                                    className="text-red-600 hover:text-red-800 text-sm"
                                  >
                                    ×
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Filters Tab */}
                  {activeModalTab === 'filters' && (
                    <div className="space-y-4">
                      
                      <div className="flex justify-between items-center">
                        <h4 className="text-lg font-medium text-gray-900">Produktfilter</h4>
                        <div className="flex items-center space-x-3">
                          <select
                            value=""
                            onChange={(e) => {
                              const filterId = e.target.value;
                              if (filterId && !selectedProductFilters.some(f => f.filterId === filterId)) {
                                const filter = filters.find(f => f._id === filterId);
                                if (filter) {
                                  console.log('Adding filter:', filter.name);
                                  setSelectedProductFilters(prev => [...prev, {
                                    filterId: filterId,
                                    filterName: filter.name,
                                    values: []
                                  }]);
                                  e.target.value = ''; // Reset selection
                                }
                              }
                            }}
                            className="border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                          >
                            <option value="">Filter auswählen...</option>
                            {filters.map((filter) => (
                              <option key={filter._id} value={filter._id}>
                                {filter.name} ({filter.type})
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                      
                      <div className="space-y-4">
                        {selectedProductFilters.map((productFilter, index) => {
                          const filter = filters.find(f => f._id === productFilter.filterId);
                          return (
                            <div key={index} className="border border-gray-200 rounded-lg p-4">
                              <div className="flex items-center justify-between mb-3">
                                <h5 className="text-sm font-medium text-gray-700">{productFilter.filterName}</h5>
                                <button
                                  type="button"
                                  onClick={() => setSelectedProductFilters(selectedProductFilters.filter((_, i) => i !== index))}
                                  className="text-red-600 hover:text-red-800 text-sm"
                                >
                                  Entfernen
                                </button>
                              </div>
                              
                              {filter && (
                                <div className="space-y-2">
                                  {filter.type === 'range' ? (
                                    <input
                                      type="number"
                                      placeholder="Wert eingeben"
                                      value={productFilter.values[0] || ''}
                                      onChange={(e) => {
                                        const newValues = [e.target.value];
                                        const newFilters = [...selectedProductFilters];
                                        newFilters[index].values = newValues;
                                        setSelectedProductFilters(newFilters);
                                      }}
                                      className="w-32 px-2 py-1 border border-gray-300 rounded text-sm"
                                    />
                                  ) : (
                                    filter.options.map((option, optionIndex) => (
                                      <label key={optionIndex} className="flex items-center">
                                        <input
                                          type="checkbox"
                                          checked={productFilter.values.includes(option.value)}
                                          onChange={(e) => {
                                            const newFilters = [...selectedProductFilters];
                                            if (e.target.checked) {
                                              newFilters[index].values.push(option.value);
                                            } else {
                                              newFilters[index].values = newFilters[index].values.filter(v => v !== option.value);
                                            }
                                            setSelectedProductFilters(newFilters);
                                          }}
                                          className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
                                        />
                                        <span className="ml-2 text-sm text-gray-700">{option.name}</span>
                                      </label>
                                    ))
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        })}
                        
                        {selectedProductFilters.length === 0 && (
                          <p className="text-gray-500 text-center py-4">Keine Filter hinzugefügt</p>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Modal Footer */}
                  <div className="flex justify-end space-x-3 pt-6 border-t mt-6">
                    <button
                      type="button"
                      onClick={() => {
                        setShowForm(false);
                        setEditingProduct(null);
                        setFormData({
                          title: '',
                          sku: '',
                          category: '',
                          subcategory: '',
                          subcategories: [],
                          price: '',
                          offerPrice: '',
                          tags: '',
                          isOnSale: false,
                          inStock: true,
                          stockQuantity: '0',
                        });
                        setDescriptionContent('');
                        setHtmlContent('');
                        setProperties([]);
                        setRecommendedProducts([]);
                        setVariations([]);
                        setUploadedFiles([]);
                        setUploadedThumbnails([]);
                        setUploadedImageSizes([]);
                        setSelectedProductFilters([]);
                        setRecommendationSearch('');
                        setRecommendationSearchResults([]);
                        setShowHtmlEditor(false);
                        setActiveModalTab('basic');
                      }}
                      className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                    >
                      Abbrechen
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 border border-transparent rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700"
                    >
                      {editingProduct ? 'Aktualisieren' : 'Erstellen'}
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
