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
}

export default function AdminPage() {
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
  const [draggedImageIndex, setDraggedImageIndex] = useState<number | null>(null);
  const [draggedProductIndex, setDraggedProductIndex] = useState<number | null>(null);
  const [draggedRecommendedIndex, setDraggedRecommendedIndex] = useState<number | null>(null);
  const [draggedCategoryIndex, setDraggedCategoryIndex] = useState<number | null>(null);
  const [selectedFontSize, setSelectedFontSize] = useState('16px');
  const [selectedFontFamily, setSelectedFontFamily] = useState('Arial');
  const [selectedColor, setSelectedColor] = useState('#000000');
  const [descriptionContent, setDescriptionContent] = useState('');
  const [categories, setCategories] = useState<Category[]>([]);
  const [showCategoryForm, setShowCategoryForm] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [activeTab, setActiveTab] = useState<'products' | 'categories' | 'manufacturers'>('products');
  const [subcategories, setSubcategories] = useState<Array<{ name: string; description: string; sortOrder: number }>>([]);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [selectedSubcategory, setSelectedSubcategory] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [showTopSellerModal, setShowTopSellerModal] = useState(false);
  const [selectedCategoryForTopSellers, setSelectedCategoryForTopSellers] = useState<Category | null>(null);
  const [categoryProducts, setCategoryProducts] = useState<any[]>([]);
  const [selectedTopSellers, setSelectedTopSellers] = useState<string[]>([]);
  const [variations, setVariations] = useState<Array<{
  name: string;
  options: Array<{
    value: string;
    priceAdjustment: number;
    inStock: boolean;
    stockQuantity: number;
  }>;
  }>>([]);
  const [activeModalTab, setActiveModalTab] = useState<'basic' | 'description' | 'media' | 'properties' | 'recommendations' | 'variations'>('basic');
  const [showSubcategoryDropdown, setShowSubcategoryDropdown] = useState(false);
  
  // Manufacturer state
  const [manufacturers, setManufacturers] = useState<Array<{
    _id: string;
    name: string;
    slug: string;
    description?: string;
    isActive: boolean;
    sortOrder: number;
  }>>([]);
  const [showManufacturerForm, setShowManufacturerForm] = useState(false);
  const [editingManufacturer, setEditingManufacturer] = useState<{
    _id: string;
    name: string;
    slug: string;
    description?: string;
    isActive: boolean;
    sortOrder: number;
  } | null>(null);
  
  // Form state for tab persistence
  const [formData, setFormData] = useState({
    title: '',
    category: '',
    subcategory: '',
    subcategories: [] as string[],
    price: '',
    offerPrice: '',
    tags: '',
    isOnSale: false,
    inStock: true,
    stockQuantity: '0',
    manufacturer: ''
  });

  useEffect(() => {
    fetchProducts();
    fetchCategories();
    fetchManufacturers();
  }, []);

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

  const fetchManufacturers = async () => {
    try {
      const response = await fetch("/api/admin/manufacturers");
      const data = await response.json();
      setManufacturers(data);
    } catch (error) {
      console.error("Failed to fetch manufacturers:", error);
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

  const handleEdit = (product: ProductDocument) => {
    setEditingProduct(product);
    setProperties(product.properties || []);
    setRecommendedProducts(product.recommendedProducts || []);
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
    setDescriptionContent(product.description || '');
    setSelectedSubcategory(product.subcategoryId || '');
    setSelectedCategory(product.categoryId || product.category || '');
    
    // Set form data
    setFormData({
      title: product.title || '',
      category: product.categoryId || product.category || '',
      subcategory: product.subcategoryId || '',
      subcategories: product.subcategoryIds || [],
      price: product.price ? (product.price / 100).toFixed(2) : '',
      offerPrice: product.offerPrice ? (product.offerPrice / 100).toFixed(2) : '',
      tags: product.tags ? product.tags.join(', ') : '',
      isOnSale: product.isOnSale || false,
      inStock: product.inStock !== false,
      stockQuantity: product.stockQuantity ? product.stockQuantity.toString() : '0',
      manufacturer: product.manufacturer || ''
    });
    
    // Reset editor states
    setSelectedFontSize('16px');
    setSelectedFontFamily('Arial');
    setSelectedColor('#000000');
    // Clear uploaded files when editing existing product
    setUploadedFiles([]);
    setUploadedImageSizes([]);
    setActiveModalTab('basic');
    setShowForm(true);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Get description from state
    const description = descriptionContent || "";
    
    // Generate slug from title
    const title = formData.title;
    let slug = title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
    
    console.log("Generated slug from title:", title, "->", slug);
    
    // Ensure unique slug
    if (!editingProduct) {
      let counter = 1;
      let originalSlug = slug;
      while (products.some(p => p.slug === slug)) {
        slug = `${originalSlug}-${counter}`;
        counter++;
      }
      console.log("Final unique slug:", slug);
    }

    const productData = {
      title: title,
      slug: editingProduct ? editingProduct.slug : slug,
      description: description,
      price: Math.round(parseFloat(formData.price || '0') * 100),
      offerPrice: formData.offerPrice ? Math.round(parseFloat(formData.offerPrice) * 100) : undefined,
      isOnSale: formData.isOnSale,
      category: formData.category,
      categoryId: formData.category,
      subcategoryId: formData.subcategory || undefined,
      subcategoryIds: formData.subcategories,
      manufacturer: formData.manufacturer || undefined,
      manufacturerName: formData.manufacturer ? manufacturers.find(m => m._id === formData.manufacturer)?.name : undefined,
      tags: formData.tags.split(",").map(tag => tag.trim()).filter(tag => tag),
      inStock: formData.inStock,
      stockQuantity: parseInt(formData.stockQuantity) || 0,
      images: editingProduct ? editingProduct.images : uploadedFiles.filter(url => url.includes('/uploads/images/')),
      imageSizes: editingProduct ? editingProduct.imageSizes : uploadedImageSizes,
      videos: editingProduct ? editingProduct.videos : uploadedFiles.filter(url => url.includes('/uploads/videos/')),
      videoThumbnails: editingProduct ? editingProduct.videoThumbnails : uploadedThumbnails,
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

    console.log("Product data being sent to API:", productData);

    // Ensure sortOrder is always a number
    if (typeof productData.sortOrder !== 'number') {
      productData.sortOrder = products.length;
    }


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
        console.error("API Error:", errorData);
        alert(`Failed to save product: ${errorData.details || errorData.error}`);
        return;
      }
      
      setShowForm(false);
      setEditingProduct(null);
      setUploadedFiles([]);
      setUploadedImageSizes([]);
      setDescriptionContent('');
      // Reset form data
      setFormData({
        title: '',
        category: '',
        subcategory: '',
        subcategories: [],
        price: '',
        offerPrice: '',
        tags: '',
        isOnSale: false,
        inStock: true,
        stockQuantity: '0',
        manufacturer: ''
      });
      fetchProducts();
      
      // Clear editor content
      setTimeout(() => {
        const editor = document.getElementById('description-editor');
        if (editor) {
          editor.innerHTML = '&nbsp;';
        }
      }, 100);
    } catch (error) {
      console.error("Failed to save product:", error);
      alert("Failed to save product. Please check the console for details.");
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
        
        if (editingProduct) {
          const updatedProduct = { ...editingProduct };
          if (type === "image") {
            updatedProduct.images = [...updatedProduct.images, data.url];
            if (data.imageSizes && data.imageSizes.length > 0) {
              // Find the correct sizes from the generated images
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
            updatedProduct.videos = [...updatedProduct.videos, data.url];
            if (data.thumbnailUrl) {
              updatedProduct.videoThumbnails = [...(updatedProduct.videoThumbnails || []), data.thumbnailUrl];
            }
          }
          setEditingProduct(updatedProduct);
        } else {
          setUploadedFiles(prev => [...prev, data.url]);
          if (type === "image" && data.imageSizes && data.imageSizes.length > 0) {
            // Find the correct sizes from the generated images
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
              if (variantUrl && variantUrl !== fileUrl) { // Don't delete the main file again
                try {
                  await fetch("/api/admin/delete-file", {
                    method: "DELETE",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ fileUrl: variantUrl }),
                  });
                } catch (variantError) {
                  console.error(`Failed to delete variant ${variantUrl}:`, variantError);
                }
              }
            }
            
            // Remove from imageSizes array
            updatedProduct.imageSizes = updatedProduct.imageSizes.filter((_, index) => index !== imageIndex);
          }
        } else {
          updatedProduct.videos = updatedProduct.videos.filter((vid: string) => vid !== fileUrl);
        }
        setEditingProduct(updatedProduct);
      } else {
        const fileIndex = uploadedFiles.findIndex(url => url === fileUrl);
        setUploadedFiles(prev => prev.filter(url => url !== fileUrl));
        
        // Delete all image size variants for new products
        if (type === "image" && fileIndex !== -1 && uploadedImageSizes[fileIndex]) {
          const imageSize = uploadedImageSizes[fileIndex];
          const variantsToDelete = [imageSize.main, imageSize.thumb, imageSize.small].filter(Boolean);
          
          for (const variantUrl of variantsToDelete) {
            if (variantUrl && variantUrl !== fileUrl) { // Don't delete the main file again
              try {
                await fetch("/api/admin/delete-file", {
                  method: "DELETE",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ fileUrl: variantUrl }),
                });
              } catch (variantError) {
                console.error(`Failed to delete variant ${variantUrl}:`, variantError);
              }
            }
          }
          
          setUploadedImageSizes(prev => prev.filter((_, index) => index !== fileIndex));
        }
      }
    } catch (error) {
      console.error("Failed to delete file:", error);
    }
  };

  const moveImage = (fromIndex: number, toIndex: number) => {
    if (editingProduct) {
      const updatedProduct = { ...editingProduct };
      const newImages = [...updatedProduct.images];
      const newImageSizes = [...(updatedProduct.imageSizes || [])];
      
      // Move image
      const [movedImage] = newImages.splice(fromIndex, 1);
      newImages.splice(toIndex, 0, movedImage);
      
      // Move corresponding imageSizes
      if (newImageSizes.length > fromIndex) {
        const [movedImageSize] = newImageSizes.splice(fromIndex, 1);
        newImageSizes.splice(toIndex, 0, movedImageSize);
      }
      
      updatedProduct.images = newImages;
      updatedProduct.imageSizes = newImageSizes;
      setEditingProduct(updatedProduct);
    } else {
      // For new products, move in uploadedFiles and uploadedImageSizes
      const imageFiles = uploadedFiles.filter(url => url.includes('/uploads/images/'));
      const videoFiles = uploadedFiles.filter(url => url.includes('/uploads/videos/'));
      const allFiles = [...imageFiles, ...videoFiles];
      
      const [movedFile] = allFiles.splice(fromIndex, 1);
      allFiles.splice(toIndex, 0, movedFile);
      
      // Also move the corresponding imageSizes
      const newImageSizes = [...uploadedImageSizes];
      if (newImageSizes.length > fromIndex) {
        const [movedImageSize] = newImageSizes.splice(fromIndex, 1);
        newImageSizes.splice(toIndex, 0, movedImageSize);
        setUploadedImageSizes(newImageSizes);
      }
      
      setUploadedFiles(allFiles);
    }
  };

  const moveProduct = async (fromIndex: number, toIndex: number) => {
    const newProducts = [...products];
    const [movedProduct] = newProducts.splice(fromIndex, 1);
    newProducts.splice(toIndex, 0, movedProduct);
    
    // Update sortOrder for all products
    const updates = newProducts.map((product, index) => ({
      id: product._id,
      sortOrder: index
    }));

    try {
      // Update all products with new sortOrder sequentially to avoid conflicts
      for (const update of updates) {
        console.log(`Updating product ${update.id} with sortOrder ${update.sortOrder}`);
        const response = await fetch(`/api/admin/products/${update.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sortOrder: update.sortOrder }),
        });
        
        if (!response.ok) {
          const errorData = await response.json();
          console.error(`Failed to update product ${update.id}:`, errorData);
          throw new Error(`Failed to update product ${update.id}`);
        }
      }
      
      // Update local state with new sortOrder values
      const updatedProducts = newProducts.map((product, index) => ({
        ...product,
        sortOrder: index
      }));
      
      setProducts(updatedProducts);
      console.log("Product order updated successfully");
    } catch (error) {
      console.error("Failed to update product order:", error);
      // Revert on error
      fetchProducts();
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
        body: JSON.stringify({ categories: categoryIds }),
      });
      console.log("Category order updated successfully");
    } catch (error) {
      console.error("Failed to update category order:", error);
      // Revert on error
      fetchCategories();
    }
  };

  const cleanupUploadedFiles = async () => {
    // Delete all uploaded files
    for (const fileUrl of uploadedFiles) {
      try {
        await fetch("/api/admin/delete-file", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ fileUrl }),
        });
      } catch (error) {
        console.error("Failed to cleanup file:", error);
      }
    }
    
    // Delete all image size variants
    for (const imageSize of uploadedImageSizes) {
      const variantsToDelete = [imageSize.main, imageSize.thumb, imageSize.small].filter(Boolean);
      
      for (const variantUrl of variantsToDelete) {
        try {
          await fetch("/api/admin/delete-file", {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ fileUrl: variantUrl }),
          });
        } catch (error) {
          console.error(`Failed to cleanup variant ${variantUrl}:`, error);
        }
      }
    }
    
    setUploadedFiles([]);
    setUploadedImageSizes([]);
  };

  const handleCancel = () => {
    cleanupUploadedFiles();
    setShowForm(false);
    setEditingProduct(null);
    setProperties([]);
    setRecommendedProducts([]);
    setVariations([]);
    setDescriptionContent('');
    setSelectedCategory('');
    setSelectedSubcategory('');
    // Reset form data
    setFormData({
      title: '',
      category: '',
      subcategory: '',
      subcategories: [],
      price: '',
      offerPrice: '',
      tags: '',
      isOnSale: false,
      inStock: true,
      stockQuantity: '0',
      manufacturer: ''
    });
    // Reset editor states
    setSelectedFontSize('16px');
    setSelectedFontFamily('Arial');
    setSelectedColor('#000000');
    setActiveModalTab('basic');
    
    // Clear editor content
    setTimeout(() => {
      const editor = document.getElementById('description-editor');
      if (editor) {
        editor.innerHTML = '&nbsp;';
      }
    }, 100);
  };

  const addProperty = () => {
    setProperties([...properties, { name: '', value: '' }]);
  };

  const removeProperty = (index: number) => {
    setProperties(properties.filter((_, i) => i !== index));
  };

  const updateProperty = (index: number, field: 'name' | 'value', value: string) => {
    const updatedProperties = [...properties];
    updatedProperties[index][field] = value;
    setProperties(updatedProperties);
  };

  // Recommended Products Functions
  const addRecommendedProduct = (productId: string) => {
    if (recommendedProducts.length < 4 && !recommendedProducts.includes(productId)) {
      setRecommendedProducts([...recommendedProducts, productId]);
    }
  };

  const removeRecommendedProduct = (productId: string) => {
    setRecommendedProducts(recommendedProducts.filter(id => id !== productId));
  };

  const moveRecommendedProduct = (fromIndex: number, toIndex: number) => {
    const newRecommended = [...recommendedProducts];
    const [movedProduct] = newRecommended.splice(fromIndex, 1);
    newRecommended.splice(toIndex, 0, movedProduct);
    setRecommendedProducts(newRecommended);
  };

  // Rich Text Editor Functions - Simple and reliable
  const execCommand = (command: string, value?: string) => {
    document.execCommand(command, false, value);
    const editor = document.getElementById('description-editor');
    if (editor) {
      setDescriptionContent(editor.innerHTML);
      editor.focus();
    }
  };

  const toggleBold = () => execCommand('bold');
  const toggleItalic = () => execCommand('italic');
  const insertUnorderedList = () => execCommand('insertUnorderedList');
  const insertOrderedList = () => execCommand('insertOrderedList');

  const insertLink = () => {
    const url = prompt('Enter URL:');
    if (url) execCommand('createLink', url);
  };

  const changeFontSize = (size: string) => {
    setSelectedFontSize(size);

    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      const selectedText = range.toString();

      if (selectedText) {
        // Simple approach: delete selection and insert formatted text
        const startContainer = range.startContainer;
        const startOffset = range.startOffset;
        const endContainer = range.endContainer;
        const endOffset = range.endOffset;

        // Create formatted span
        const span = document.createElement('span');
        span.style.fontSize = size;
        span.textContent = selectedText;

        // Replace selection with formatted span
        range.deleteContents();
        range.insertNode(span);

        // Update state and focus
        const editor = document.getElementById('description-editor');
        if (editor) {
          setDescriptionContent(editor.innerHTML);
          editor.focus();
        }
      }
    }
  };

  const changeFontFamily = (family: string) => {
    setSelectedFontFamily(family);

    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      const selectedText = range.toString();

      if (selectedText) {
        // Simple approach: delete selection and insert formatted text
        const startContainer = range.startContainer;
        const startOffset = range.startOffset;
        const endContainer = range.endContainer;
        const endOffset = range.endOffset;

        // Create formatted span
        const span = document.createElement('span');
        span.style.fontFamily = family;
        span.textContent = selectedText;

        // Replace selection with formatted span
        range.deleteContents();
        range.insertNode(span);

        // Update state and focus
        const editor = document.getElementById('description-editor');
        if (editor) {
          setDescriptionContent(editor.innerHTML);
          editor.focus();
        }
      }
    }
  };

  const changeTextColor = (color: string) => {
    setSelectedColor(color);

    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      const selectedText = range.toString();

      if (selectedText) {
        // Simple approach: delete selection and insert formatted text
        const startContainer = range.startContainer;
        const startOffset = range.startOffset;
        const endContainer = range.endContainer;
        const endOffset = range.endOffset;

        // Create formatted span
        const span = document.createElement('span');
        span.style.color = color;
        span.textContent = selectedText;

        // Replace selection with formatted span
        range.deleteContents();
        range.insertNode(span);

        // Update state and focus
        const editor = document.getElementById('description-editor');
        if (editor) {
          setDescriptionContent(editor.innerHTML);
          editor.focus();
        }
      }
    }
  };

  const handleDescriptionChange = (e: React.FormEvent<HTMLDivElement>) => {
    const target = e.target as HTMLDivElement;
    setDescriptionContent(target.innerHTML);
  };

  // Category Management Functions
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
      let createdCategory;
      
      if (editingCategory) {
        response = await fetch(`/api/admin/categories/${editingCategory._id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(categoryData),
        });
        createdCategory = await response.json();
      } else {
        response = await fetch("/api/admin/categories", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(categoryData),
        });
        createdCategory = await response.json();
      }
      
      if (!response.ok) {
        const errorData = await response.json();
        alert(`Failed to save category: ${errorData.error}`);
        return;
      }
      
      // Create subcategories if any
      if (subcategories.length > 0 && createdCategory) {
        for (const subcategory of subcategories) {
          if (subcategory.name.trim()) {
            await fetch("/api/admin/categories", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                ...subcategory,
                parentId: createdCategory._id,
                isActive: true
              }),
            });
          }
        }
      }
      
      setShowCategoryForm(false);
      setEditingCategory(null);
      setSubcategories([]);
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

  const removeSubcategory = (index: number) => {
    setSubcategories(subcategories.filter((_, i) => i !== index));
  };

  const updateSubcategory = (index: number, field: 'name' | 'description' | 'sortOrder', value: string | number) => {
    const updatedSubcategories = [...subcategories];
    (updatedSubcategories[index] as any)[field] = value;
    setSubcategories(updatedSubcategories);
  };

  // Handle subcategory selection for products
  const handleSubcategoryToggle = (subcategoryId: string) => {
    setFormData(prev => ({
      ...prev,
      subcategories: prev.subcategories.includes(subcategoryId)
        ? prev.subcategories.filter(id => id !== subcategoryId)
        : [...prev.subcategories, subcategoryId]
    }));
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('.subcategory-dropdown')) {
        setShowSubcategoryDropdown(false);
      }
    };

    if (showSubcategoryDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showSubcategoryDropdown]);

  const toggleCategoryExpansion = (categoryId: string) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(categoryId)) {
      newExpanded.delete(categoryId);
    } else {
      newExpanded.add(categoryId);
    }
    setExpandedCategories(newExpanded);
  };

  // Top Seller Management Functions
  const handleTopSellerClick = async (category: Category) => {
    setSelectedCategoryForTopSellers(category);
    setShowTopSellerModal(true);
    
    try {
      const response = await fetch(`/api/admin/categories/top-sellers?categoryId=${category._id}`);
      const data = await response.json();
      
      if (response.ok) {
        setCategoryProducts(data.products);
        setSelectedTopSellers(data.topSellerProducts || []);
      } else {
        console.error('Failed to fetch category products:', data.error);
        setCategoryProducts([]);
        setSelectedTopSellers([]);
      }
    } catch (error) {
      console.error('Failed to fetch category products:', error);
      setCategoryProducts([]);
      setSelectedTopSellers([]);
    }
  };

  const handleTopSellerToggle = (productId: string) => {
    setSelectedTopSellers(prev => {
      if (prev.includes(productId)) {
        return prev.filter(id => id !== productId);
      } else {
        return [...prev, productId];
      }
    });
  };

  const handleTopSellerSave = async () => {
    if (!selectedCategoryForTopSellers) return;
    
    try {
      const response = await fetch('/api/admin/categories/top-sellers', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          categoryId: selectedCategoryForTopSellers._id,
          productIds: selectedTopSellers,
          isSubCategory: !!selectedCategoryForTopSellers.parentId
        })
      });
      
      if (response.ok) {
        setShowTopSellerModal(false);
        setSelectedCategoryForTopSellers(null);
        setSelectedTopSellers([]);
        fetchCategories(); // Refresh categories
      } else {
        const errorData = await response.json();
        alert(`Failed to save top sellers: ${errorData.error}`);
      }
    } catch (error) {
      console.error('Failed to save top sellers:', error);
      alert('Failed to save top sellers');
    }
  };

  const handleCategoryDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this category?")) return;
    
    try {
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

  // Manufacturer functions
  const handleManufacturerSave = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const manufacturerData = {
        name: editingManufacturer?.name || '',
        description: editingManufacturer?.description || '',
        isActive: editingManufacturer?.isActive !== false,
        sortOrder: editingManufacturer?.sortOrder || 0
      };
      
      const url = editingManufacturer?._id 
        ? `/api/admin/manufacturers/${editingManufacturer._id}`
        : '/api/admin/manufacturers';
      
      const method = editingManufacturer?._id ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(manufacturerData)
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        alert(`Failed to save manufacturer: ${errorData.error}`);
        return;
      }
      
      setShowManufacturerForm(false);
      setEditingManufacturer(null);
      fetchManufacturers();
    } catch (error) {
      console.error("Failed to save manufacturer:", error);
      alert("Failed to save manufacturer. Please check the console for details.");
    }
  };

  const handleManufacturerEdit = (manufacturer: typeof manufacturers[0]) => {
    setEditingManufacturer(manufacturer);
    setShowManufacturerForm(true);
  };

  const handleManufacturerDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this manufacturer?")) return;
    
    try {
      const response = await fetch(`/api/admin/manufacturers/${id}`, { method: "DELETE" });
      if (!response.ok) {
        const errorData = await response.json();
        alert(`Failed to delete manufacturer: ${errorData.error}`);
        return;
      }
      fetchManufacturers();
    } catch (error) {
      console.error("Failed to delete manufacturer:", error);
    }
  };

  const toggleTopSeller = async (productId: string, currentStatus: boolean) => {
    try {
      const response = await fetch("/api/admin/products/toggle-top-seller", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId, isTopSeller: !currentStatus }),
      });
      
      if (response.ok) {
        fetchProducts();
      } else {
        const errorData = await response.json();
        alert(`Failed to toggle top seller: ${errorData.error}`);
      }
    } catch (error) {
      console.error("Failed to toggle top seller:", error);
    }
  };

  // Variations management functions
  const addVariation = () => {
    setVariations([...variations, { 
      name: '', 
      options: [{ value: '', priceAdjustment: 0, inStock: true, stockQuantity: 0 }] 
    }]);
  };

  const removeVariation = (index: number) => {
    setVariations(variations.filter((_, i) => i !== index));
  };

  const updateVariationName = (index: number, name: string) => {
    const updated = [...variations];
    updated[index].name = name;
    setVariations(updated);
  };


  const addVariationOption = (variationIndex: number) => {
    const updated = [...variations];
    updated[variationIndex].options.push({ value: '', priceAdjustment: 0, inStock: true, stockQuantity: 0 });
    setVariations(updated);
  };

  const removeVariationOption = (variationIndex: number, optionIndex: number) => {
    const updated = [...variations];
    updated[variationIndex].options = updated[variationIndex].options.filter((_, i) => i !== optionIndex);
    setVariations(updated);
  };

  const updateVariationOption = (variationIndex: number, optionIndex: number, field: string, value: any) => {
    const updated = [...variations];
    updated[variationIndex].options[optionIndex] = {
      ...updated[variationIndex].options[optionIndex],
      [field]: value
    };
    
    // If inStock is set to false, also set stockQuantity to 0
    if (field === 'inStock' && value === false) {
      updated[variationIndex].options[optionIndex].stockQuantity = 0;
    }
    
    setVariations(updated);
  };

  // Auto-arrange videos to position 2
  const arrangeMedia = (images: string[], videos: string[]) => {
    const arrangedImages = [...images];
    const arrangedVideos = [...videos];
    
    // Move first video to position 2 (index 1)
    if (arrangedVideos.length > 0 && arrangedImages.length > 0) {
      const firstVideo = arrangedVideos.shift();
      arrangedImages.splice(1, 0, firstVideo!);
    }
    
    return { images: arrangedImages, videos: arrangedVideos };
  };

  if (loading) {
    return <div className="p-8">Loading...</div>;
  }

  return (
    <div className="max-w-7xl mx-auto p-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Admin Management</h1>
        <div className="flex gap-4">
          {activeTab === 'products' && (
            <button
              onClick={() => {
                setActiveModalTab('basic');
                setDescriptionContent('');
                setFormData({
                  title: '',
                  category: '',
                  subcategory: '',
                  subcategories: [],
                  price: '',
                  offerPrice: '',
                  tags: '',
                  isOnSale: false,
                  inStock: true,
                  stockQuantity: '0',
                  manufacturer: ''
                });
                setShowForm(true);
              }}
              className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
            >
              Add New Product
            </button>
          )}
          {activeTab === 'categories' && (
            <button
              onClick={() => setShowCategoryForm(true)}
              className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
            >
              Add New Category
            </button>
          )}
          {activeTab === 'manufacturers' && (
            <button
              onClick={() => {
                setEditingManufacturer(null);
                setShowManufacturerForm(true);
              }}
              className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
            >
              Add New Manufacturer
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="mb-6">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab('products')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'products'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Products
            </button>
            <button
              onClick={() => setActiveTab('categories')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'categories'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Categories
            </button>
            <button
              onClick={() => setActiveTab('manufacturers')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'manufacturers'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Hersteller
            </button>
          </nav>
        </div>
      </div>

      {/* Products Table with Drag & Drop */}
      {activeTab === 'products' && (
        <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Order
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Product
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Price
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Category
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Stock
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Top Seller
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {products.map((product, index) => (
              <tr 
                key={product._id}
                className={`hover:bg-gray-50 ${draggedProductIndex === index ? 'opacity-50' : ''}`}
                draggable
                onDragStart={(e) => {
                  setDraggedProductIndex(index);
                  e.dataTransfer.effectAllowed = 'move';
                }}
                onDragOver={(e) => {
                  e.preventDefault();
                  e.dataTransfer.dropEffect = 'move';
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  if (draggedProductIndex !== null && draggedProductIndex !== index) {
                    moveProduct(draggedProductIndex, index);
                  }
                  setDraggedProductIndex(null);
                }}
                onDragEnd={() => setDraggedProductIndex(null)}
              >
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  <div className="flex items-center">
                    <div 
                      className="mr-2 cursor-move text-gray-400 hover:text-gray-600"
                      title="Drag to reorder"
                    >
                      ⋮⋮
                    </div>
                    {index + 1}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    {product.images[0] && (
                      <img
                        className="h-10 w-10 rounded-lg object-cover mr-3"
                        src={product.images[0]}
                        alt={product.title}
                      />
                    )}
                    <div>
                      <div className="text-sm font-medium text-gray-900">{product.title}</div>
                      <div className="text-sm text-gray-500">{product.slug}</div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {product.isOnSale && product.offerPrice ? (
                    <div>
                      <span className="text-red-600 font-semibold">
                        {(product.offerPrice / 100).toFixed(2)} €
                      </span>
                      <span className="text-gray-400 line-through ml-2">
                        {(product.price / 100).toFixed(2)} €
                      </span>
                    </div>
                  ) : (
                    <span>{(product.price / 100).toFixed(2)} €</span>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {categories.find(c => c._id === product.categoryId)?.name || product.category || 'Unknown'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex flex-col gap-1">
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      product.inStock 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {product.inStock ? 'In Stock' : 'Out of Stock'}
                    </span>
                    <span className="text-xs text-gray-500">
                      {product.stockQuantity || 0} verfügbar
                    </span>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-1 text-xs rounded-full font-medium ${
                      product.isTopSeller
                        ? 'bg-yellow-100 text-yellow-800 border border-yellow-200'
                        : 'bg-gray-100 text-gray-500 border border-gray-200'
                    }`}>
                      {product.isTopSeller ? '⭐ Top Seller' : '☆ Not Top Seller'}
                    </span>
                    <button
                      onClick={() => toggleTopSeller(product._id, product.isTopSeller || false)}
                      className="text-blue-600 hover:text-blue-800 text-xs"
                    >
                      {product.isTopSeller ? 'Remove' : 'Set'}
                    </button>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                  <button
                    onClick={() => handleEdit(product)}
                    className="text-blue-600 hover:text-blue-900 mr-3"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(product._id)}
                    className="text-red-600 hover:text-red-900"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      )}

      {/* Categories Table */}
      {activeTab === 'categories' && (
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
                  Description
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
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
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        category.isActive 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {category.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <button
                        onClick={() => handleCategoryEdit(category)}
                        className="text-blue-600 hover:text-blue-900 mr-3"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleTopSellerClick(category)}
                        className="text-yellow-600 hover:text-yellow-900 mr-3"
                      >
                        Top Seller
                      </button>
                      <button
                        onClick={() => handleCategoryDelete(category._id)}
                        className="text-red-600 hover:text-red-900"
                      >
                        Delete
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
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          subcategory.isActive 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {subcategory.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <button
                          onClick={() => handleCategoryEdit(subcategory)}
                          className="text-blue-600 hover:text-blue-900 mr-3"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleTopSellerClick(subcategory)}
                          className="text-yellow-600 hover:text-yellow-900 mr-3"
                        >
                          Top Seller
                        </button>
                        <button
                          onClick={() => handleCategoryDelete(subcategory._id)}
                          className="text-red-600 hover:text-red-900"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Manufacturers Table */}
      {activeTab === 'manufacturers' && (
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
                  Description
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {manufacturers.map((manufacturer, index) => (
                <tr key={manufacturer._id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {manufacturer.name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {manufacturer.slug}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {manufacturer.description || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      manufacturer.isActive 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {manufacturer.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <button
                      onClick={() => handleManufacturerEdit(manufacturer)}
                      className="text-blue-600 hover:text-blue-900 mr-3"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleManufacturerDelete(manufacturer._id)}
                      className="text-red-600 hover:text-red-900"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Product Form Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div 
            className="bg-white rounded-lg shadow-2xl border border-gray-200 w-full max-w-6xl max-h-[95vh] overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex justify-between items-center p-6 border-b border-gray-200">
              <h2 className="text-2xl font-bold">
                {editingProduct ? "Edit Product" : "Add New Product"}
              </h2>
              <button
                type="button"
                onClick={handleCancel}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Tab Navigation */}
            <div className="border-b border-gray-200">
              <nav className="flex space-x-8 px-6" aria-label="Tabs">
                {[
                  { id: 'basic', name: 'Grunddaten', icon: '📝' },
                  { id: 'description', name: 'Beschreibung', icon: '📄' },
                  { id: 'media', name: 'Medien', icon: '🖼️' },
                  { id: 'properties', name: 'Eigenschaften', icon: '⚙️' },
                  { id: 'recommendations', name: 'Empfehlungen', icon: '⭐' },
                  { id: 'variations', name: 'Variationen', icon: '🔄' }
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveModalTab(tab.id as any)}
                    className={`py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
                      activeModalTab === tab.id
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    <span className="mr-2">{tab.icon}</span>
                    {tab.name}
                  </button>
                ))}
              </nav>
            </div>

            {/* Modal Content */}
            <form onSubmit={handleFormSubmit} className="flex-1 overflow-y-auto">
              <div className="p-6">
                {/* Basic Information Tab */}
                {activeModalTab === 'basic' && (
                  <div className="space-y-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Grunddaten</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Product Title *
                        </label>
                        <input
                          type="text"
                          name="title"
                          required
                          value={formData.title || ''}
                          onChange={(e) => setFormData({...formData, title: e.target.value})}
                          className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Category *
                        </label>
                        <select
                          name="category"
                          required
                          value={formData.category || ''}
                          onChange={(e) => {
                            setFormData({...formData, category: e.target.value, subcategory: '', subcategories: []});
                            setSelectedCategory(e.target.value);
                            setSelectedSubcategory('');
                            setShowSubcategoryDropdown(false);
                          }}
                          className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="" disabled>Kategorie auswählen...</option>
                          {categories.map((category) => (
                            <option key={category._id} value={category._id}>
                              {category.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Unterkategorien
                        </label>
                        <div className="relative subcategory-dropdown">
                          <button
                            type="button"
                            onClick={() => setShowSubcategoryDropdown(!showSubcategoryDropdown)}
                            className="w-full border border-gray-300 rounded-md px-3 py-2 text-left focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                          >
                            <span className="block truncate">
                              {formData.subcategories.length === 0 
                                ? "Unterkategorien auswählen..." 
                                : `${formData.subcategories.length} Unterkategorie(n) ausgewählt`
                              }
                            </span>
                            <span className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
                              <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                              </svg>
                            </span>
                          </button>
                          
                          {showSubcategoryDropdown && (
                            <div className="absolute z-10 mt-1 w-full bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto">
                              {categories
                                .find(cat => cat._id === formData.category)
                                ?.subcategories?.map((subcategory) => (
                                  <label key={subcategory._id} className="flex items-center space-x-3 px-3 py-2 hover:bg-gray-100 cursor-pointer">
                                    <input
                                      type="checkbox"
                                      checked={formData.subcategories.includes(subcategory._id)}
                                      onChange={() => handleSubcategoryToggle(subcategory._id)}
                                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                    />
                                    <span className="text-sm text-gray-700">{subcategory.name}</span>
                                  </label>
                                )) || []}
                              {categories
                                .find(cat => cat._id === formData.category)
                                ?.subcategories?.length === 0 && (
                                <div className="px-3 py-2 text-sm text-gray-500">
                                  Keine Unterkategorien verfügbar
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Preis (€) *
                        </label>
                        <input
                          type="number"
                          name="price"
                          step="0.01"
                          min="0"
                          required
                          placeholder="z.B. 19.99"
                          value={formData.price || ''}
                          onChange={(e) => setFormData({...formData, price: e.target.value})}
                          className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        <p className="text-xs text-gray-500 mt-1">Geben Sie den Preis in Euro ein (z.B. 19.99 für 19,99€)</p>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Angebotspreis (€)
                        </label>
                        <input
                          type="number"
                          name="offerPrice"
                          step="0.01"
                          min="0"
                          placeholder="z.B. 15.99"
                          value={formData.offerPrice || ''}
                          onChange={(e) => setFormData({...formData, offerPrice: e.target.value})}
                          className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        <p className="text-xs text-gray-500 mt-1">Optional: Reduzierter Preis für Aktionen</p>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Tags (comma-separated)
                        </label>
                        <input
                          type="text"
                          name="tags"
                          value={formData.tags || ''}
                          onChange={(e) => setFormData({...formData, tags: e.target.value})}
                          placeholder="tag1, tag2, tag3"
                          className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>

                      <div className="flex items-center space-x-4">
                        <label className="flex items-center">
                          <input
                            type="checkbox"
                            name="isOnSale"
                            checked={formData.isOnSale}
                            onChange={(e) => setFormData({...formData, isOnSale: e.target.checked})}
                            className="mr-2"
                          />
                          <span className="text-sm text-gray-700">On Sale</span>
                        </label>
                        <label className="flex items-center">
                          <input
                            type="checkbox"
                            name="inStock"
                            checked={formData.inStock}
                            onChange={(e) => setFormData({
                              ...formData, 
                              inStock: e.target.checked,
                              stockQuantity: e.target.checked ? formData.stockQuantity : '0'
                            })}
                            className="mr-2"
                          />
                          <span className="text-sm text-gray-700">In Stock</span>
                        </label>
                      </div>
                    </div>

                    {/* Stock Quantity */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Verfügbare Anzahl
                      </label>
                      <input
                        type="number"
                        name="stockQuantity"
                        value={formData.stockQuantity || ''}
                        onChange={(e) => setFormData({...formData, stockQuantity: e.target.value})}
                        min="0"
                        disabled={!formData.inStock}
                        className={`w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                          !formData.inStock ? 'bg-gray-100 cursor-not-allowed' : ''
                        }`}
                        placeholder="Anzahl im Lager"
                      />
                    </div>

                    {/* Manufacturer Selection */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Hersteller
                      </label>
                      <select
                        name="manufacturer"
                        value={formData.manufacturer || ''}
                        onChange={(e) => setFormData({...formData, manufacturer: e.target.value})}
                        className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">Kein Hersteller</option>
                        {manufacturers.map((manufacturer) => (
                          <option key={manufacturer._id} value={manufacturer._id}>
                            {manufacturer.name}
                          </option>
                        ))}
                      </select>
                      <p className="text-xs text-gray-500 mt-1">Wählen Sie einen Hersteller aus oder lassen Sie das Feld leer</p>
                    </div>
                  </div>
                )}

                {/* Description Tab */}
                {activeModalTab === 'description' && (
                  <div className="space-y-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Produktbeschreibung</h3>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Description *
                      </label>
                      <div className="border border-gray-300 rounded-md">
                        {/* WYSIWYG Toolbar */}
                        <div className="border-b border-gray-300 p-2 flex flex-wrap gap-2">
                          {/* Bold */}
                          <button
                            type="button"
                            onClick={toggleBold}
                            className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-100 font-bold"
                          >
                            B
                          </button>
                          
                          {/* Italic */}
                          <button
                            type="button"
                            onClick={toggleItalic}
                            className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-100 italic"
                          >
                            I
                          </button>
                          
                          {/* Font Size */}
                          <select
                            value={selectedFontSize}
                            onChange={(e) => changeFontSize(e.target.value)}
                            className="px-2 py-1 text-sm border border-gray-300 rounded hover:bg-gray-100"
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
                          
                          {/* Text Color */}
                          <div className="flex items-center gap-1">
                            <input
                              type="color"
                              value={selectedColor}
                              onChange={(e) => changeTextColor(e.target.value)}
                              className="w-8 h-8 border border-gray-300 rounded cursor-pointer"
                              title="Text Color"
                            />
                            <button
                              type="button"
                              onClick={() => changeTextColor(selectedColor)}
                              className="px-2 py-1 text-sm border border-gray-300 rounded hover:bg-gray-100"
                            >
                              A
                            </button>
                          </div>
                          
                          {/* Font Family */}
                          <select
                            value={selectedFontFamily}
                            onChange={(e) => changeFontFamily(e.target.value)}
                            className="px-2 py-1 text-sm border border-gray-300 rounded hover:bg-gray-100"
                          >
                            <option value="Arial">Arial</option>
                            <option value="Helvetica">Helvetica</option>
                            <option value="Times New Roman">Times New Roman</option>
                            <option value="Georgia">Georgia</option>
                            <option value="Verdana">Verdana</option>
                            <option value="Courier New">Courier New</option>
                          </select>
                          
                          {/* Unordered List */}
                          <button
                            type="button"
                            onClick={insertUnorderedList}
                            className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-100"
                          >
                            • List
                          </button>
                          
                          {/* Ordered List */}
                          <button
                            type="button"
                            onClick={insertOrderedList}
                            className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-100"
                          >
                            1. List
                          </button>
                          
                          {/* Link */}
                          <button
                            type="button"
                            onClick={insertLink}
                            className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-100"
                          >
                            🔗 Link
                          </button>
                        </div>
                        <div
                          id="description-editor"
                          contentEditable
                          onInput={handleDescriptionChange}
                          className="p-3 min-h-[300px] focus:outline-none prose prose-sm max-w-none
                            [&_h1]:text-3xl [&_h1]:font-bold [&_h1]:mb-4 [&_h1]:mt-6 [&_h1]:text-gray-900
                            [&_h2]:text-2xl [&_h2]:font-bold [&_h2]:mb-3 [&_h2]:mt-5 [&_h2]:text-gray-800
                            [&_h3]:text-xl [&_h3]:font-bold [&_h3]:mb-2 [&_h3]:mt-4 [&_h3]:text-gray-700
                            [&_ul]:list-disc [&_ul]:ml-6 [&_ul]:mb-4 [&_ul]:space-y-1
                            [&_ol]:list-decimal [&_ol]:ml-6 [&_ol]:mb-4 [&_ol]:space-y-1
                            [&_li]:mb-1 [&_li]:text-gray-700
                            [&_p]:mb-3 [&_p]:text-gray-700
                            [&_strong]:font-bold [&_strong]:text-gray-900
                            [&_em]:italic [&_em]:text-gray-700
                            [&_u]:underline [&_u]:text-gray-700
                            [&_a]:text-blue-600 [&_a]:underline [&_a]:hover:text-blue-800"
                          suppressContentEditableWarning={true}
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Media Tab */}
                {activeModalTab === 'media' && (
                  <div className="space-y-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Medien</h3>
                    
                    {/* Image Management */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Product Images
                      </label>
                      <div className="border border-gray-300 rounded-md p-4">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                          {((editingProduct?.images || []).concat(uploadedFiles.filter(url => url && url.includes('/uploads/images/')))).map((image: string, index: number) => (
                            <div
                              key={index}
                              draggable
                              onDragStart={() => setDraggedImageIndex(index)}
                              onDragOver={(e) => e.preventDefault()}
                              onDrop={(e) => {
                                e.preventDefault();
                                if (draggedImageIndex !== null && draggedImageIndex !== index) {
                                  moveImage(draggedImageIndex, index);
                                }
                                setDraggedImageIndex(null);
                              }}
                              className="relative group cursor-move"
                            >
                              <img
                                src={image}
                                alt={`Product ${index + 1}`}
                                className="w-full h-24 object-cover rounded border-2 border-gray-200"
                              />
                              <button
                                type="button"
                                onClick={() => removeFile(image, "image")}
                                className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center text-xs hover:bg-red-600"
                              >
                                ×
                              </button>
                              <div className="absolute bottom-1 left-1 bg-black bg-opacity-50 text-white text-xs px-1 rounded">
                                {index + 1}
                              </div>
                            </div>
                          ))}
                        </div>
                        <input
                          key={imageInputKey}
                          type="file"
                          multiple
                          accept="image/*"
                          onChange={(e) => handleFileUpload(e, "image")}
                          className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                        />
                      </div>
                    </div>

                    {/* Video Management */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Product Videos
                      </label>
                      <div className="border border-gray-300 rounded-md p-4">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                          {((editingProduct?.videos || []).concat(uploadedFiles.filter(url => url && url.includes('/uploads/videos/')))).map((video: string, index: number) => (
                            <div key={index} className="relative group">
                              <div className="w-full h-24 bg-gray-100 rounded border-2 border-gray-200 flex items-center justify-center">
                                <svg className="w-8 h-8 text-gray-400" fill="currentColor" viewBox="0 0 24 24">
                                  <path d="M8 5v14l11-7z"/>
                                </svg>
                              </div>
                              <button
                                type="button"
                                onClick={() => removeFile(video, "video")}
                                className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center text-xs hover:bg-red-600"
                              >
                                ×
                              </button>
                              <div className="absolute bottom-1 left-1 bg-black bg-opacity-50 text-white text-xs px-1 rounded">
                                Video
                              </div>
                            </div>
                          ))}
                        </div>
                        <input
                          key={videoInputKey}
                          type="file"
                          multiple
                          accept="video/*"
                          onChange={(e) => handleFileUpload(e, "video")}
                          className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-green-50 file:text-green-700 hover:file:bg-green-100"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Properties Tab */}
                {activeModalTab === 'properties' && (
                  <div className="space-y-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Produkteigenschaften</h3>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Product Properties
                      </label>
                      <div className="border border-gray-300 rounded-md p-4">
                        {properties.map((property, index) => (
                          <div key={index} className="flex gap-2 mb-2">
                            <input
                              type="text"
                              placeholder="Property name (e.g., Material, Size)"
                              value={property.name}
                              onChange={(e) => updateProperty(index, 'name', e.target.value)}
                              className="flex-1 border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                            <input
                              type="text"
                              placeholder="Property value (e.g., PLA, 20cm)"
                              value={property.value}
                              onChange={(e) => updateProperty(index, 'value', e.target.value)}
                              className="flex-1 border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                            <button
                              type="button"
                              onClick={() => removeProperty(index)}
                              className="px-3 py-2 bg-red-500 text-white rounded-md hover:bg-red-600"
                            >
                              Remove
                            </button>
                          </div>
                        ))}
                        <button
                          type="button"
                          onClick={addProperty}
                          className="w-full px-4 py-2 border-2 border-dashed border-gray-300 rounded-md text-gray-600 hover:border-gray-400 hover:text-gray-800"
                        >
                          + Add Property
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Recommendations Tab */}
                {activeModalTab === 'recommendations' && (
                  <div className="space-y-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Empfohlene Produkte</h3>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Empfohlene Produkte (max. 4)
                      </label>
                      <div className="border border-gray-300 rounded-md p-4">
                        {/* Current recommended products */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                          {recommendedProducts.map((productId, index) => {
                            const product = products.find(p => p._id === productId);
                            return product ? (
                              <div
                                key={productId}
                                draggable
                                onDragStart={() => setDraggedRecommendedIndex(index)}
                                onDragOver={(e) => e.preventDefault()}
                                onDrop={(e) => {
                                  e.preventDefault();
                                  if (draggedRecommendedIndex !== null && draggedRecommendedIndex !== index) {
                                    moveRecommendedProduct(draggedRecommendedIndex, index);
                                  }
                                  setDraggedRecommendedIndex(null);
                                }}
                                className="relative group cursor-move border border-gray-200 rounded p-2 bg-gray-50"
                              >
                                {product.images[0] && (
                                  <img
                                    src={product.images[0]}
                                    alt={product.title}
                                    className="w-full h-16 object-cover rounded mb-1"
                                  />
                                )}
                                <div className="text-xs font-medium text-gray-900 mb-1 truncate">
                                  {product.title}
                                </div>
                                <div className="text-xs text-gray-600">
                                  {product.isOnSale && product.offerPrice ? (
                                    <span className="text-red-600 font-semibold">
                                      {(product.offerPrice / 100).toFixed(2)} €
                                    </span>
                                  ) : (
                                    <span>{(product.price / 100).toFixed(2)} €</span>
                                  )}
                                </div>
                                <button
                                  type="button"
                                  onClick={() => removeRecommendedProduct(productId)}
                                  className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center text-xs hover:bg-red-600"
                                >
                                  ×
                                </button>
                                <div className="absolute bottom-1 left-1 bg-black bg-opacity-50 text-white text-xs px-1 rounded">
                                  {index + 1}
                                </div>
                              </div>
                            ) : null;
                          })}
                        </div>

                        {/* Add product dropdown */}
                        {recommendedProducts.length < 4 && (
                          <div className="border-2 border-dashed border-gray-300 rounded-md p-4">
                            <select
                              onChange={(e) => {
                                const productId = e.target.value;
                                if (productId) {
                                  addRecommendedProduct(productId);
                                  e.target.value = '';
                                }
                              }}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                              defaultValue=""
                            >
                              <option value="" disabled>Produkt auswählen...</option>
                              {products
                                .filter(p => !recommendedProducts.includes(p._id) && p._id !== editingProduct?._id)
                                .map(product => (
                                  <option key={product._id} value={product._id}>
                                    {product.title} - {(product.price / 100).toFixed(2)} €
                                  </option>
                                ))
                              }
                            </select>
                          </div>
                        )}

                        <p className="text-xs text-gray-500 mt-2">
                          Ziehen Sie die Produkte, um die Reihenfolge zu ändern. Max. 4 Produkte.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Variations Tab */}
                {activeModalTab === 'variations' && (
                  <div className="space-y-6">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-semibold text-gray-900">Produktvariationen</h3>
                      <button
                        type="button"
                        onClick={addVariation}
                        className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 text-sm"
                      >
                        + Variation hinzufügen
                      </button>
                    </div>
                    
                    {variations.map((variation, variationIndex) => (
                      <div key={variationIndex} className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                        <div className="space-y-3 mb-3">
                          <div className="flex items-center space-x-3">
                            <input
                              type="text"
                              placeholder="Variationsname (z.B. Gewicht, Größe, Farbe)"
                              value={variation.name}
                              onChange={(e) => updateVariationName(variationIndex, e.target.value)}
                              className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                          </div>
                        </div>
                        <div className="flex justify-end mb-3">
                          <button
                            type="button"
                            onClick={() => removeVariation(variationIndex)}
                            className="px-3 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 text-sm"
                          >
                            Löschen
                          </button>
                        </div>
                        
                        <div className="space-y-2">
                          {variation.options.map((option, optionIndex) => (
                            <div key={optionIndex} className="flex items-center space-x-2">
                              <input
                                type="text"
                                placeholder="Wert (z.B. 19g, 20g, 21g)"
                                value={option.value || ''}
                                onChange={(e) => updateVariationOption(variationIndex, optionIndex, 'value', e.target.value)}
                                className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                              />
                              <input
                                type="number"
                                placeholder="z.B. 2.50"
                                step="0.01"
                                value={option.priceAdjustment / 100}
                                onChange={(e) => updateVariationOption(variationIndex, optionIndex, 'priceAdjustment', Math.round(parseFloat(e.target.value || '0') * 100))}
                                className="w-32 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                              />
                              <span className="text-xs text-gray-500 ml-1">€</span>
                              <input
                                type="number"
                                placeholder="Stock"
                                min="0"
                                value={option.stockQuantity || 0}
                                onChange={(e) => updateVariationOption(variationIndex, optionIndex, 'stockQuantity', parseInt(e.target.value) || 0)}
                                disabled={!option.inStock}
                                className={`w-20 px-2 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm ${
                                  !option.inStock ? 'bg-gray-100 cursor-not-allowed' : ''
                                }`}
                              />
                              <label className="flex items-center">
                                <input
                                  type="checkbox"
                                  checked={option.inStock}
                                  onChange={(e) => updateVariationOption(variationIndex, optionIndex, 'inStock', e.target.checked)}
                                  className="mr-1"
                                />
                                <span className="text-sm text-gray-700">Auf Lager</span>
                              </label>
                              <button
                                type="button"
                                onClick={() => removeVariationOption(variationIndex, optionIndex)}
                                className="px-2 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 text-sm"
                              >
                                ×
                              </button>
                            </div>
                          ))}
                          
                          <button
                            type="button"
                            onClick={() => addVariationOption(variationIndex)}
                            className="px-3 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 text-sm"
                          >
                            + Option hinzufügen
                          </button>
                        </div>
                      </div>
                    ))}
                    
                    {variations.length === 0 && (
                      <div className="text-center py-8 text-gray-500">
                        <p>Noch keine Variationen hinzugefügt.</p>
                        <p className="text-sm">Klicken Sie auf "Variation hinzufügen" um zu beginnen.</p>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Modal Footer */}
              <div className="border-t border-gray-200 p-6 bg-gray-50">
                <div className="flex justify-end space-x-4">
                  <button
                    type="button"
                    onClick={handleCancel}
                    className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                  >
                    {editingProduct ? "Update Product" : "Create Product"}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Category Form Modal */}
      {showCategoryForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div 
            className="bg-white rounded-lg shadow-2xl border border-gray-200 w-full max-w-2xl max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <form onSubmit={handleCategorySubmit} className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold">
                  {editingCategory ? "Edit Category" : "Add New Category"}
                </h2>
                <button
                  type="button"
                  onClick={() => {
                    setShowCategoryForm(false);
                    setEditingCategory(null);
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Category Name *
                  </label>
                  <input
                    type="text"
                    name="name"
                    required
                    defaultValue={editingCategory?.name || ""}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>


                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Description
                  </label>
                  <textarea
                    name="description"
                    rows={3}
                    defaultValue={editingCategory?.description || ""}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>


                <div className="flex items-center">
                  <input
                    type="checkbox"
                    name="isActive"
                    defaultChecked={editingCategory?.isActive !== false}
                    className="mr-2"
                  />
                  <span className="text-sm text-gray-700">Active</span>
                </div>

                {/* Subcategories Management */}
                {!editingCategory?.parentId && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Unterkategorien
                    </label>
                    <div className="border border-gray-300 rounded-md p-4">
                      {subcategories.map((subcategory, index) => (
                        <div key={index} className="flex gap-2 mb-2">
                          <input
                            type="text"
                            placeholder="Unterkategorie Name"
                            value={subcategory.name}
                            onChange={(e) => updateSubcategory(index, 'name', e.target.value)}
                            className="flex-1 border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                          <input
                            type="text"
                            placeholder="Beschreibung"
                            value={subcategory.description}
                            onChange={(e) => updateSubcategory(index, 'description', e.target.value)}
                            className="flex-1 border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                          <button
                            type="button"
                            onClick={() => removeSubcategory(index)}
                            className="px-3 py-2 bg-red-500 text-white rounded-md hover:bg-red-600"
                          >
                            Remove
                          </button>
                        </div>
                      ))}
                      <button
                        type="button"
                        onClick={addSubcategory}
                        className="w-full px-4 py-2 border-2 border-dashed border-gray-300 rounded-md text-gray-600 hover:border-gray-400 hover:text-gray-800"
                      >
                        + Unterkategorie hinzufügen
                      </button>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex justify-end space-x-4 mt-8">
                <button
                  type="button"
                  onClick={() => {
                    setShowCategoryForm(false);
                    setEditingCategory(null);
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                >
                  {editingCategory ? "Update Category" : "Create Category"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Manufacturer Form Modal */}
      {showManufacturerForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div 
            className="bg-white rounded-lg shadow-2xl border border-gray-200 w-full max-w-2xl max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <form onSubmit={handleManufacturerSave} className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold">
                  {editingManufacturer ? "Edit Manufacturer" : "Add New Manufacturer"}
                </h2>
                <button
                  type="button"
                  onClick={() => {
                    setShowManufacturerForm(false);
                    setEditingManufacturer(null);
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Name *
                  </label>
                  <input
                    type="text"
                    value={editingManufacturer?.name || ''}
                    onChange={(e) => setEditingManufacturer(prev => prev ? { ...prev, name: e.target.value } : { _id: '', name: e.target.value, slug: '', description: '', isActive: true, sortOrder: 0 })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description
                  </label>
                  <textarea
                    value={editingManufacturer?.description || ''}
                    onChange={(e) => setEditingManufacturer(prev => prev ? { ...prev, description: e.target.value } : { _id: '', name: '', slug: '', description: e.target.value, isActive: true, sortOrder: 0 })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    rows={3}
                  />
                </div>

                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="isActive"
                    checked={editingManufacturer?.isActive !== false}
                    onChange={(e) => setEditingManufacturer(prev => prev ? { ...prev, isActive: e.target.checked } : { _id: '', name: '', slug: '', description: '', isActive: e.target.checked, sortOrder: 0 })}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label htmlFor="isActive" className="ml-2 block text-sm text-gray-700">
                    Active
                  </label>
                </div>
              </div>

              <div className="flex justify-end space-x-3 mt-6">
                <button
                  type="button"
                  onClick={() => {
                    setShowManufacturerForm(false);
                    setEditingManufacturer(null);
                  }}
                  className="px-4 py-2 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                >
                  {editingManufacturer ? "Update Manufacturer" : "Create Manufacturer"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Top Seller Modal */}
      {showTopSellerModal && selectedCategoryForTopSellers && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div 
            className="bg-white rounded-lg shadow-2xl border border-gray-200 w-full max-w-4xl max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold">
                  Top Seller für "{selectedCategoryForTopSellers.name}"
                </h2>
                <button
                  type="button"
                  onClick={() => {
                    setShowTopSellerModal(false);
                    setSelectedCategoryForTopSellers(null);
                    setSelectedTopSellers([]);
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="mb-4">
                <p className="text-sm text-gray-600">
                  Wählen Sie Produkte als Top Seller aus. ({selectedTopSellers.length} ausgewählt)
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
                {categoryProducts.map((product) => (
                  <div
                    key={product._id}
                    className={`border rounded-lg p-4 cursor-pointer transition-all ${
                      selectedTopSellers.includes(product._id)
                        ? 'border-yellow-500 bg-yellow-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                    onClick={() => handleTopSellerToggle(product._id)}
                  >
                    <div className="flex items-center space-x-3">
                      <input
                        type="checkbox"
                        checked={selectedTopSellers.includes(product._id)}
                        onChange={() => handleTopSellerToggle(product._id)}
                        className="w-4 h-4 text-yellow-600 border-gray-300 rounded focus:ring-yellow-500"
                      />
                      <div className="flex-1">
                        <h3 className="font-medium text-gray-900 text-sm">{product.title}</h3>
                        <p className="text-sm text-gray-500">
                          {product.isOnSale && product.offerPrice ? (
                            <>
                              <span className="text-red-600 font-semibold">
                                {(product.offerPrice / 100).toFixed(2)} €
                              </span>
                              <span className="line-through text-gray-400 ml-1">
                                {(product.price / 100).toFixed(2)} €
                              </span>
                            </>
                          ) : (
                            <span>{(product.price / 100).toFixed(2)} €</span>
                          )}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {categoryProducts.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  Keine Produkte in dieser Kategorie gefunden.
                </div>
              )}

              <div className="flex justify-end space-x-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowTopSellerModal(false);
                    setSelectedCategoryForTopSellers(null);
                    setSelectedTopSellers([]);
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                >
                  Abbrechen
                </button>
                <button
                  type="button"
                  onClick={handleTopSellerSave}
                  className="px-4 py-2 bg-yellow-600 text-white rounded-md hover:bg-yellow-700"
                >
                  Speichern
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}