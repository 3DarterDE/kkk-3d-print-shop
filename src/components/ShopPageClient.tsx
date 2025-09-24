"use client";

import Link from "next/link";
import ProductCard from "@/components/ProductCard";
import DynamicFilters from "@/components/DynamicFilters";
import Breadcrumb from "@/components/Breadcrumb";
import SearchBar from "@/components/SearchBar";
import CategoryDescriptionSection from "@/components/CategoryDescriptionSection";
import { getOptimizedImageUrl, getContextualImageSize } from "@/lib/image-utils";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

interface Category {
  _id: string;
  name: string;
  slug: string;
  description?: string;
  image?: string;
  imageSizes?: {
    main: string;
    thumb: string;
    small: string;
  };
  subcategories?: Category[];
}

interface Brand {
  _id: string;
  name: string;
  slug: string;
  description?: string;
  image?: string;
  imageSizes?: {
    main?: string;
    thumb?: string;
    small?: string;
  };
}

interface Product {
  _id: string;
  slug: string;
  title: string;
  price: number;
  offerPrice?: number;
  isOnSale: boolean;
  isTopSeller: boolean;
  inStock: boolean;
  stockQuantity: number;
  images: string[];
  imageSizes: Array<{
    main: string;
    thumb: string;
    small: string;
  }>;
  tags: string[];
  variations: any[];
}

interface ShopPageClientProps {
  initialCategory?: string;
  initialBrand?: string;
  initialView?: string;
  initialFilter?: string;
  categories: Category[];
  brands: Brand[];
  products: Product[];
}

export default function ShopPageClient({
  initialCategory,
  initialBrand,
  initialView,
  initialFilter,
  categories,
  brands,
  products
}: ShopPageClientProps) {
  const router = useRouter();
  
  // State management
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState(initialCategory || "");
  const [selectedSubcategory, setSelectedSubcategory] = useState("");
  const [selectedBrand, setSelectedBrand] = useState(initialBrand || "");
  const [showAllBrands, setShowAllBrands] = useState(initialView === 'brands');
  const [showTopSellers, setShowTopSellers] = useState(initialFilter === 'topseller');
  const [showSaleItems, setShowSaleItems] = useState(initialFilter === 'sale');
  const [showNewItems, setShowNewItems] = useState(initialFilter === 'neu');
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  const [currentCategoryData, setCurrentCategoryData] = useState<Category | null>(null);
  const [currentBrandData, setCurrentBrandData] = useState<Brand | null>(null);

  // Filter products based on current selections
  const filteredProducts = products.filter(product => {
    // Search filter
    if (searchQuery && !product.title.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }

    // Category filter
    if (selectedCategory && !product.tags.includes(selectedCategory)) {
      return false;
    }

    // Brand filter
    if (selectedBrand && !product.tags.includes(selectedBrand)) {
      return false;
    }

    // Special filters
    if (showTopSellers && !product.isTopSeller) return false;
    if (showSaleItems && !product.isOnSale) return false;
    if (showNewItems && !product.tags.includes('neu')) return false;

    return true;
  });

  // Load current category/brand data for description
  useEffect(() => {
    const loadCurrentItemData = async () => {
      setCurrentCategoryData(null);
      setCurrentBrandData(null);

      if (selectedBrand) {
        const brand = brands.find(b => b.slug === selectedBrand);
        if (brand) {
          setCurrentBrandData({
            _id: brand._id,
            name: brand.name,
            description: brand.description,
            image: brand.image,
            imageSizes: brand.imageSizes
          });
        }
        return;
      }

      if (selectedCategory) {
        const category = categories.find(c => c.slug === selectedCategory);
        if (category) {
          if (selectedSubcategory) {
            const subcategory = category.subcategories?.find(sub => sub.slug === selectedSubcategory);
            if (subcategory) {
              setCurrentCategoryData({
                _id: subcategory._id,
                name: subcategory.name,
                description: subcategory.description,
                image: subcategory.image,
                imageSizes: subcategory.imageSizes
              });
            }
          } else {
            setCurrentCategoryData({
              _id: category._id,
              name: category.name,
              description: category.description,
              image: category.image,
              imageSizes: category.imageSizes
            });
          }
        }
      }
    };

    if (categories.length > 0 && brands.length > 0) {
      loadCurrentItemData();
    }
  }, [selectedCategory, selectedSubcategory, selectedBrand, categories, brands]);

  // Handle category selection
  const handleCategorySelect = (categorySlug: string) => {
    setSelectedCategory(categorySlug);
    setSelectedSubcategory("");
    setSelectedBrand("");
    setShowAllBrands(false);
    setShowTopSellers(false);
    setShowSaleItems(false);
    setShowNewItems(false);
    
    // Update URL
    router.push(`/shop/kategorie/${categorySlug}`);
  };

  // Handle brand selection
  const handleBrandSelect = (brandSlug: string) => {
    setSelectedBrand(brandSlug);
    setSelectedCategory("");
    setSelectedSubcategory("");
    setShowAllBrands(false);
    setShowTopSellers(false);
    setShowSaleItems(false);
    setShowNewItems(false);
    
    // Update URL
    router.push(`/shop/marke/${brandSlug}`);
  };

  // Handle show all brands
  const handleShowAllBrands = () => {
    setShowAllBrands(true);
    setSelectedCategory("");
    setSelectedSubcategory("");
    setSelectedBrand("");
    setShowTopSellers(false);
    setShowSaleItems(false);
    setShowNewItems(false);
    
    // Update URL
    router.push('/shop/marken');
  };

  // Handle show all products
  const handleShowAllProducts = () => {
    setSelectedCategory("");
    setSelectedSubcategory("");
    setSelectedBrand("");
    setShowAllBrands(false);
    setShowTopSellers(false);
    setShowSaleItems(false);
    setShowNewItems(false);
    
    // Update URL
    router.push('/shop');
  };

  return (
    <>
      {/* Breadcrumb */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
          <Breadcrumb 
            category={selectedCategory}
            subcategory={selectedSubcategory}
            brand={selectedBrand}
            productName=""
          />
        </div>
      </div>

      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-white shadow-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  {selectedBrand ? `Marke: ${brands.find(b => b.slug === selectedBrand)?.name}` :
                   selectedCategory ? `Kategorie: ${categories.find(c => c.slug === selectedCategory)?.name}` :
                   showAllBrands ? 'Alle Marken' : 'Alle Produkte'}
                </h1>
                <p className="text-gray-600 mt-1">
                  {filteredProducts.length} Produkte gefunden
                </p>
              </div>
              
              <div className="flex-1 max-w-md">
                <SearchBar 
                  searchQuery={searchQuery}
                  onSearchChange={setSearchQuery}
                />
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col lg:flex-row gap-8">
            {/* Sidebar */}
            <div className="lg:w-64 flex-shrink-0">
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Filter</h3>
                
                {/* Categories */}
                <div className="mb-6">
                  <h4 className="text-sm font-medium text-gray-700 mb-3">Kategorien</h4>
                  <div className="space-y-2">
                    <button
                      onClick={handleShowAllProducts}
                      className={`w-full text-left px-3 py-2 rounded-md text-sm ${
                        !selectedCategory && !selectedBrand && !showAllBrands
                          ? 'bg-blue-100 text-blue-700'
                          : 'text-gray-600 hover:bg-gray-100'
                      }`}
                    >
                      Alle Produkte
                    </button>
                    {categories.map((category) => (
                      <button
                        key={category._id}
                        onClick={() => handleCategorySelect(category.slug)}
                        className={`w-full text-left px-3 py-2 rounded-md text-sm ${
                          selectedCategory === category.slug
                            ? 'bg-blue-100 text-blue-700'
                            : 'text-gray-600 hover:bg-gray-100'
                        }`}
                      >
                        {category.name}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Brands */}
                <div className="mb-6">
                  <h4 className="text-sm font-medium text-gray-700 mb-3">Marken</h4>
                  <div className="space-y-2">
                    <button
                      onClick={handleShowAllBrands}
                      className={`w-full text-left px-3 py-2 rounded-md text-sm ${
                        showAllBrands
                          ? 'bg-blue-100 text-blue-700'
                          : 'text-gray-600 hover:bg-gray-100'
                      }`}
                    >
                      Alle Marken
                    </button>
                    {brands.slice(0, 5).map((brand) => (
                      <button
                        key={brand._id}
                        onClick={() => handleBrandSelect(brand.slug)}
                        className={`w-full text-left px-3 py-2 rounded-md text-sm ${
                          selectedBrand === brand.slug
                            ? 'bg-blue-100 text-blue-700'
                            : 'text-gray-600 hover:bg-gray-100'
                        }`}
                      >
                        {brand.name}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Main Content */}
            <div className="flex-1">
              {showAllBrands ? (
                /* Brands Overview */
                <div className="bg-white rounded-lg shadow-sm p-6">
                  <h2 className="text-xl font-semibold text-gray-900 mb-6">Alle Marken</h2>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                    {brands.map((brand) => (
                      <button
                        key={brand._id}
                        onClick={() => handleBrandSelect(brand.slug)}
                        className="group text-center"
                      >
                        <div className="aspect-square bg-gray-100 rounded-lg mb-3 overflow-hidden group-hover:shadow-md transition-shadow">
                          {brand.image ? (
                            <img
                              src={getOptimizedImageUrl(brand.image, 'thumb')}
                              alt={brand.name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-gray-400">
                              {brand.name}
                            </div>
                          )}
                        </div>
                        <h3 className="text-sm font-medium text-gray-900 group-hover:text-blue-600">
                          {brand.name}
                        </h3>
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                /* Products Grid */
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {filteredProducts.map((product) => (
                    <ProductCard 
                      key={product._id} 
                      product={product}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Category/Brand Description Section */}
        <CategoryDescriptionSection 
          currentCategory={currentCategoryData}
          currentBrand={currentBrandData}
        />
      </div>
    </>
  );
}