"use client";

import { useState, useEffect } from "react";
import AddToCartButton from "./AddToCartButton";
import SearchBar from "@/components/SearchBar";
import Breadcrumb from "@/components/Breadcrumb";
import { getOptimizedImageUrl, getContextualImageSize, generateSrcSet } from "@/lib/image-utils";
import ProductCard from "@/components/ProductCard";
import { getStockQuantityForVariations, isVariationInStock } from "@/lib/variation-stock";

interface ProductDisplayProps {
  product: any;
  descriptionHtml: string;
  recommendedProducts?: any[];
  category?: {
    _id: string;
    name: string;
    slug: string;
  } | null;
  subcategory?: {
    _id: string;
    name: string;
    slug: string;
  } | null;
}

interface Review {
  _id: string;
  rating: number;
  title: string;
  comment: string;
  isVerified: boolean;
  createdAt: string;
  user: {
    name: string;
    email?: string;
  };
}

interface ReviewStats {
  averageRating: number;
  totalReviews: number;
  ratingDistribution: {
    1: number;
    2: number;
    3: number;
    4: number;
    5: number;
  };
}

export default function ProductDisplay({ product, descriptionHtml, recommendedProducts = [], category, subcategory }: ProductDisplayProps) {
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [isLightboxClosing, setIsLightboxClosing] = useState(false);
  const [activeTab, setActiveTab] = useState('description');
  const [selectedVariations, setSelectedVariations] = useState<Record<string, string>>({});
  const [isScrolled, setIsScrolled] = useState(false);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [reviewStats, setReviewStats] = useState<ReviewStats | null>(null);
  const [reviewsLoading, setReviewsLoading] = useState(true);
  const [reviewsPage, setReviewsPage] = useState(1);
  const [reviewsPagination, setReviewsPagination] = useState<{
    page: number;
    limit: number;
    total: number;
    pages: number;
  } | null>(null);

  // Handle lightbox close with animation
  const handleLightboxClose = () => {
    setIsLightboxClosing(true);
    setTimeout(() => {
      setIsLightboxOpen(false);
      setIsLightboxClosing(false);
    }, 300);
  };

  // Calculate final price with variations
  const calculateFinalPrice = () => {
    // Use offer price if available, otherwise use regular price
    let basePrice = product.isOnSale && product.offerPrice ? product.offerPrice : product.price;
    
    if (product.variations) {
      product.variations.forEach((variation: any) => {
        const selectedOption = variation.options.find((option: any) => 
          option.value === selectedVariations[variation.name]
        );
        if (selectedOption && selectedOption.priceAdjustment) {
          basePrice += selectedOption.priceAdjustment;
        }
      });
    }
    
    return basePrice;
  };

  // Check if all variations are selected
  const areAllVariationsSelected = () => {
    if (!product.variations || product.variations.length === 0) return true;
    
    return product.variations.every((variation: any) => 
      selectedVariations[variation.name]
    );
  };

  // Get current stock quantity based on selected variations
  const getCurrentStockQuantity = () => {
    return getStockQuantityForVariations(product, selectedVariations);
  };

  // Check if current variation combination is in stock
  const isCurrentVariationInStock = () => {
    return isVariationInStock(product, selectedVariations);
  };

  // Check if any variation is available (for overall availability display)
  const isAnyVariationAvailable = () => {
    if (!product.variations || product.variations.length === 0) {
      return product.inStock;
    }
    
    // Check if any variation option is in stock
    return product.variations.some((variation: any) => 
      variation.options.some((option: any) => option.inStock && option.stockQuantity > 0)
    );
  };

  // Initialize variations with first available option
  useEffect(() => {
    if (product.variations && product.variations.length > 0) {
      const initialVariations: Record<string, string> = {};
      product.variations.forEach((variation: any) => {
        if (variation.options && variation.options.length > 0) {
          // Find first available option (inStock and stockQuantity > 0)
          const availableOption = variation.options.find((option: any) => 
            option.inStock && option.stockQuantity > 0
          );
          
          if (availableOption) {
            initialVariations[variation.name] = availableOption.value;
          } else {
            // If no available option, fall back to first option
            initialVariations[variation.name] = variation.options[0].value;
          }
        }
      });
      setSelectedVariations(initialVariations);
    }
  }, [product.variations]);

  // Initialize reviews from product data (already loaded)
  useEffect(() => {
    if (product.reviews) {
      setReviews(product.reviews.reviews || []);
      setReviewStats(product.reviews.reviewStats || {
        averageRating: 0,
        totalReviews: 0,
        ratingDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
      });
      setReviewsLoading(false);
    }
  }, [product.reviews]);

  // Load additional reviews when page changes
  useEffect(() => {
    if (reviewsPage > 1) {
      const loadMoreReviews = async () => {
        try {
          setReviewsLoading(true);
          const response = await fetch(`/api/reviews/product/${product.slug}?page=${reviewsPage}&limit=5`);
          if (response.ok) {
            const data = await response.json();
            setReviews(data.reviews);
            setReviewStats(data.statistics);
            setReviewsPagination(data.pagination);
          }
        } catch (error) {
          console.error('Error loading reviews:', error);
        } finally {
          setReviewsLoading(false);
        }
      };

      loadMoreReviews();
    }
  }, [product.slug, reviewsPage]);

  // Handle scroll to hide breadcrumb behind search bar
  useEffect(() => {
    const handleScroll = () => {
      const scrollTop = window.scrollY;
      // Hide breadcrumb when scrolled more than 20px
      setIsScrolled(scrollTop > 20);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Combine images and videos for display with video at position 2
  const arrangeMedia = (images: string[], videos: string[]) => {
    const result = [...images];
    
    // Insert first video at position 2 (index 1) if there are images
    if (videos.length > 0 && images.length > 0) {
      result.splice(1, 0, videos[0]);
    } else if (videos.length > 0) {
      // If no images, just add videos
      result.push(...videos);
    }
    
    return result;
  };

  const allMedia = arrangeMedia(product.images || [], product.videos || []);

  // Auto-rotation removed as requested

  const currentMedia = allMedia[selectedImageIndex];
  const isVideo = currentMedia && product.videos?.includes(currentMedia);
  const videoIndex = product.videos?.indexOf(currentMedia) || 0;
  const videoThumbnail = product.videoThumbnails?.[videoIndex];

  return (
    <>
      {/* Fixed Search Bar - immer sichtbar auf Mobile */}
      <div className="fixed top-16 left-0 right-0 z-40 bg-white border-b border-gray-200 px-4 py-3 md:hidden">
        <SearchBar 
          placeholder="Luke Littler, Dartpfeile..."
          maxResults={10}
        />
      </div>

      {/* Fixed Mobile Breadcrumb - direkt unter der Suchleiste, verschwindet beim Scrollen */}
      <div className={`fixed top-32 left-0 right-0 z-30 bg-white border-a border-gray-200 md:hidden transition-transform duration-250 ${
        isScrolled ? '-translate-y-full' : 'translate-y-0'
      }`}>
        <Breadcrumb category={category?.slug} subcategory={subcategory?.slug} productName={product.title} />
      </div>

      {/* Desktop Breadcrumb - normal position */}
      <div className="hidden md:block">
        <Breadcrumb category={category?.slug} subcategory={subcategory?.slug} productName={product.title} />
      </div>

      <div className="max-w-7xl mx-auto px-4 py-10 pt-30 md:pt-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left: Main Product Image/Video */}
        <div className="lg:col-span-7">
          <div className="bg-white rounded-xl shadow-lg p-4">
            <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center">
              <svg className="w-4 h-4 mr-2 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              Hauptansicht
            </h3>
            <div 
              className={`w-full h-[500px] bg-gray-50 rounded-lg overflow-hidden relative flex items-center justify-center transition-all ${
                isVideo ? 'cursor-default' : 'cursor-pointer hover:opacity-90 hover:scale-[1.02]'
              }`}
              onClick={() => !isVideo && setIsLightboxOpen(true)}
             >
            {currentMedia ? (
              isVideo ? (
                <video
                  key={selectedImageIndex}
                  controls
                  className="max-w-full max-h-full object-cover"
                  poster={videoThumbnail || product.images?.[0]}
                  preload="metadata"
                >
                  <source src={currentMedia} type="video/mp4" />
                  Your browser does not support the video tag.
                </video>
              ) : (
                <img
                  key={selectedImageIndex}
                  src={getOptimizedImageUrl(currentMedia, getContextualImageSize('product-detail'), product.imageSizes, product.images?.indexOf(currentMedia) || 0)}
                  alt={product.title}
                  className="max-w-full max-h-full object-contain transition-opacity duration-500"
                  srcSet={generateSrcSet(currentMedia)}
                  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                />
              )
            ) : (
              <div className="flex items-center justify-center text-gray-400 text-lg">
                No Media
              </div>
            )}
            
            {/* Media counter */}
            {allMedia.length > 1 && (
              <div className="absolute bottom-4 right-4 bg-black bg-opacity-50 text-white px-2 py-1 rounded text-sm">
                {selectedImageIndex + 1} / {allMedia.length}
              </div>
            )}
            </div>
            
            {/* Thumbnails below main image */}
            <div className="mt-4">
              <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center">
                <svg className="w-4 h-4 mr-2 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                Galerie
              </h3>
              <div className="flex gap-2 overflow-x-auto pb-2">
                {allMedia.map((media: string, index: number) => {
                  const isVideoThumbnail = product.videos?.includes(media);
                  const videoIndex = product.videos?.indexOf(media) || 0;
                  const thumbnailUrl = product.videoThumbnails?.[videoIndex];
                  
                  return (
                    <button
                      key={index}
                      onClick={() => setSelectedImageIndex(index)}
                      className={`flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden border-2 transition-all relative ${
                        selectedImageIndex === index 
                          ? 'border-blue-500 ring-2 ring-blue-200' 
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      {isVideoThumbnail ? (
                        <div className="w-full h-full bg-gray-100 flex items-center justify-center relative">
                           {thumbnailUrl ? (
                             <img
                               src={thumbnailUrl}
                               alt={`${product.title} video thumbnail`}
                               className="w-full h-full object-cover absolute inset-0"
                             />
                           ) : (
                            <svg className="w-6 h-6 text-gray-400" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M8 5v14l11-7z"/>
                            </svg>
                          )}
                          <div className="absolute inset-0 flex items-center justify-center">
                            <div className="w-8 h-8 bg-black bg-opacity-70 rounded-full flex items-center justify-center">
                              <svg className="w-4 h-4 text-white ml-0.5" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M8 5v14l11-7z"/>
                              </svg>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <img
                          src={getOptimizedImageUrl(media, getContextualImageSize('thumbnail'), product.imageSizes, product.images?.indexOf(media) || 0)}
                          alt={`${product.title} ${index + 1}`}
                          className="w-full h-full object-cover"
                          loading="lazy"
                        />
                      )}
                      {isVideoThumbnail && (
                        <div className="absolute top-1 right-1 bg-black bg-opacity-50 text-white text-xs px-1 rounded">
                          Video
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Right: Product Info & Purchase */}
        <div className="lg:col-span-5">
          <div className="bg-white rounded-xl shadow-lg p-6">
            {/* Product Title */}
             <div className="mb-4">
               <h1 className="text-2xl font-bold text-gray-900">{product.title}</h1>
             </div>

            {/* Stars & Review */}
            <div className="flex items-center gap-2 mb-4">
              {reviewStats && reviewStats.totalReviews > 0 ? (
                <>
                  <div className="flex">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <span
                        key={star}
                        className={`text-lg ${
                          star <= Math.round(reviewStats.averageRating)
                            ? 'text-yellow-400'
                            : 'text-gray-300'
                        }`}
                      >
                        ★
                      </span>
                    ))}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-900">
                      {reviewStats.averageRating.toFixed(1)}
                    </span>
                    <span className="text-sm text-gray-600">
                      ({reviewStats.totalReviews} Bewertungen)
                    </span>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <span key={star} className="text-lg text-gray-300">
                        ★
                      </span>
                    ))}
                  </div>
                  <span className="text-sm text-gray-500">
                    Noch keine Bewertungen
                  </span>
                </>
              )}
            </div>

            {/* Price */}
            <div className="mb-6 p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-3 mb-2">
                <span className="text-3xl font-bold text-gray-900">
                  {(calculateFinalPrice() / 100).toFixed(2)} €
                </span>
                {product.isOnSale && product.offerPrice && (
                  <span className="text-lg text-gray-400 line-through">
                    {(() => {
                      // Calculate original price with variations for strikethrough
                      let originalPriceWithVariations = product.price;
                      if (product.variations) {
                        product.variations.forEach((variation: any) => {
                          const selectedOption = variation.options.find((option: any) => 
                            option.value === selectedVariations[variation.name]
                          );
                          if (selectedOption && selectedOption.priceAdjustment) {
                            originalPriceWithVariations += selectedOption.priceAdjustment;
                          }
                        });
                      }
                      return (originalPriceWithVariations / 100).toFixed(2);
                    })()} €
                  </span>
                )}
                {product.isOnSale && (
                  <span className="bg-red-100 text-red-800 px-3 py-1 rounded-full text-sm font-semibold flex items-center">
                    <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                    </svg>
                    Sale!
                  </span>
                )}
              </div>
              <div className="flex items-center text-sm text-gray-600">
                <div className="relative group">
                  <svg className="w-4 h-4 mr-1 cursor-help" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  {/* Tooltip */}
                  <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 whitespace-nowrap z-10">
                    Alle Preise sind Endpreise zzgl. Versandkosten. Gemäß § 19 UStG wird keine Umsatzsteuer erhoben und ausgewiesen.
                    {/* Tooltip arrow */}
                    <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-gray-900"></div>
                  </div>
                </div>
                <span className="text-gray-500">Preisinformationen</span>
              </div>
            </div>

            {/* Variations */}
            {product.variations && product.variations.length > 0 && (
              <div className="mb-6 p-4 bg-blue-50 rounded-lg">
                <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center">
                  <svg className="w-5 h-5 mr-2 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                  </svg>
                  Variationen
                </h3>
                <div className="space-y-4">
                  {product.variations.map((variation: any, index: number) => (
                    <div key={index}>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        {variation.name}
                      </label>
                      <select
                        value={selectedVariations[variation.name] || ''}
                        onChange={(e) => setSelectedVariations(prev => ({
                          ...prev,
                          [variation.name]: e.target.value
                        }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        {variation.options.map((option: any, optionIndex: number) => {
                          const optionStock = option.stockQuantity !== undefined ? option.stockQuantity : product.stockQuantity;
                          const optionInStock = option.inStock !== undefined ? option.inStock : product.inStock;
                          
                          return (
                            <option 
                              key={optionIndex} 
                              value={option.value}
                              disabled={!optionInStock || optionStock <= 0}
                            >
                              {option.value} 
                              {option.priceAdjustment !== undefined && option.priceAdjustment > 0 && ` (+${(option.priceAdjustment / 100).toFixed(2)} €)`}
                              {option.priceAdjustment !== undefined && option.priceAdjustment < 0 && ` (${(option.priceAdjustment / 100).toFixed(2)} €)`}
                              {optionStock > 0 && ` - ${optionStock} verfügbar`}
                              {(!optionInStock || optionStock <= 0) && ' - Nicht verfügbar'}
                            </option>
                          );
                        })}
                      </select>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Availability */}
            <div className={`mb-4 p-3 rounded-lg ${isAnyVariationAvailable() ? 'bg-green-50' : 'bg-red-50'}`}>
              <div className="flex items-center">
                <div className={`w-3 h-3 rounded-full mr-2 ${isAnyVariationAvailable() ? 'bg-green-500' : 'bg-red-500'}`}></div>
                <span className={`font-medium ${isAnyVariationAvailable() ? 'text-green-700' : 'text-red-700'}`}>
                  {isAnyVariationAvailable() ? "Sofort verfügbar!" : "Nicht verfügbar"}
                </span>
                {isAnyVariationAvailable() && (
                  <span className="ml-2 text-sm text-green-600">• Versand in 1-2 Werktagen</span>
                )}
              </div>
            </div>

            {/* PayPal Info */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-lg">P</span>
                </div>
                <div>
                  <span className="text-sm font-medium text-blue-800">
                    Bezahlen Sie nach 30 Tagen
                  </span>
                  <div className="text-xs text-blue-600">
                    Mehr erfahren
                  </div>
                </div>
              </div>
            </div>

            {/* Quantity Selector */}
            <div className="mb-6 p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center justify-between mb-3">
                <label className="text-sm font-medium text-gray-700 flex items-center">
                  <svg className="w-4 h-4 mr-2 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                  </svg>
                  Anzahl:
                </label>
                {/* Stock Status */}
                <div className="text-sm">
                  {isCurrentVariationInStock() ? (
                    <span className="text-green-600 font-medium">
                      {getCurrentStockQuantity()} verfügbar
                    </span>
                  ) : (
                    <span className="text-red-600 font-medium">
                      Nicht verfügbar
                    </span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  className="w-10 h-10 border border-gray-300 rounded-lg flex items-center justify-center hover:bg-gray-100 transition-colors"
                >
                  -
                </button>
                <span className="w-16 text-center border border-gray-300 rounded-lg py-2 bg-white font-medium">
                  {quantity}
                </span>
                <button
                  onClick={() => setQuantity(Math.min(getCurrentStockQuantity(), quantity + 1))}
                  disabled={quantity >= getCurrentStockQuantity() || getCurrentStockQuantity() <= 0}
                  className={`w-10 h-10 border border-gray-300 rounded-lg flex items-center justify-center transition-colors ${
                    quantity >= getCurrentStockQuantity() || getCurrentStockQuantity() <= 0
                      ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                      : 'hover:bg-gray-100'
                  }`}
                >
                  +
                </button>
              </div>
            </div>

            {/* Add to Cart Button */}
            <div className="mb-4">
            <AddToCartButton 
              slug={product.slug} 
              title={product.title} 
              price={calculateFinalPrice()}
              quantity={quantity}
              variations={selectedVariations}
              disabled={!areAllVariationsSelected()}
              inStock={isCurrentVariationInStock()}
              stockQuantity={getCurrentStockQuantity()}
              image={product.images?.[0]}
              imageSizes={product.imageSizes}
            />
            </div>

            {/* Shipping Info */}
            <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-4">
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                </svg>
                <span className="text-sm text-green-800">
                  Paketversand DE: Jetzt bestellen für eine Lieferung in 1-3 Werktage mit Versandkosten von 0.00 €
                </span>
              </div>
            </div>

          </div>
        </div>
      </div>

      {/* Product Description Tabs */}
      <div className="mt-12">
        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          <div className="border-b border-gray-200 bg-gray-50">
            <nav className="flex">
              <button 
                onClick={() => setActiveTab('description')}
                className={`flex-1 py-4 px-6 text-sm font-medium flex items-center justify-center transition-colors ${
                  activeTab === 'description' 
                    ? 'bg-blue-50 text-blue-600 border-b-2 border-blue-500' 
                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                }`}
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Beschreibung
              </button>
              <button 
                onClick={() => setActiveTab('properties')}
                className={`flex-1 py-4 px-6 text-sm font-medium flex items-center justify-center transition-colors ${
                  activeTab === 'properties' 
                    ? 'bg-blue-50 text-blue-600 border-b-2 border-blue-500' 
                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                }`}
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Eigenschaften
              </button>
              <button 
                onClick={() => setActiveTab('reviews')}
                className={`flex-1 py-4 px-6 text-sm font-medium flex items-center justify-center transition-colors ${
                  activeTab === 'reviews' 
                    ? 'bg-blue-50 text-blue-600 border-b-2 border-blue-500' 
                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                }`}
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                </svg>
                Bewertungen ({reviewStats?.totalReviews || 0})
              </button>
            </nav>
          </div>
          
          <div className="p-6">
          {activeTab === 'description' && (
            <div
              className="prose max-w-none"
              dangerouslySetInnerHTML={{ __html: descriptionHtml }}
            />
          )}
          
          {activeTab === 'properties' && (
            <div className="space-y-4">
              {product.properties && product.properties.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {product.properties.map((property: any, index: number) => (
                    <div key={index} className="flex justify-between py-2 border-b border-gray-200">
                      <span className="font-medium text-gray-900">{property.name}:</span>
                      <span className="text-gray-700">{property.value}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500">Keine Eigenschaften verfügbar.</p>
              )}
            </div>
          )}
          
          {activeTab === 'reviews' && (
            <div className="space-y-6">
              {reviewStats && reviewStats.totalReviews > 0 ? (
                <>
                  {/* Review Statistics */}
                  <div className="bg-gray-50 rounded-lg p-6">
                    <div className="flex items-center gap-6 mb-4">
                      <div className="text-center">
                        <div className="text-4xl font-bold text-gray-900">
                          {reviewStats.averageRating.toFixed(1)}
                        </div>
                        <div className="flex justify-center mt-1">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <span
                              key={star}
                              className={`text-lg ${
                                star <= Math.round(reviewStats.averageRating)
                                  ? 'text-yellow-400'
                                  : 'text-gray-300'
                              }`}
                            >
                              ★
                            </span>
                          ))}
                        </div>
                        <div className="text-sm text-gray-600 mt-1">
                          {reviewStats.totalReviews} Bewertungen
                        </div>
                      </div>
                      
                      {/* Rating Distribution */}
                      <div className="flex-1">
                        {[5, 4, 3, 2, 1].map((rating) => (
                          <div key={rating} className="flex items-center gap-2 mb-2">
                            <span className="text-sm text-gray-600 w-8">{rating}</span>
                            <span className="text-yellow-400">★</span>
                            <div className="flex-1 bg-gray-200 rounded-full h-2">
                              <div 
                                className="bg-yellow-400 h-2 rounded-full"
                                style={{ 
                                  width: `${reviewStats.totalReviews > 0 ? (reviewStats.ratingDistribution[rating as keyof typeof reviewStats.ratingDistribution] / reviewStats.totalReviews) * 100 : 0}%` 
                                }}
                              ></div>
                            </div>
                            <span className="text-sm text-gray-600 w-8">
                              {reviewStats.ratingDistribution[rating as keyof typeof reviewStats.ratingDistribution]}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                  
                  {/* Individual Reviews */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-gray-900">Kundenbewertungen</h3>
                    {reviewsLoading ? (
                      <div className="text-center py-8">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                        <p className="text-gray-500 mt-2">Lade Bewertungen...</p>
                      </div>
                    ) : reviews.length > 0 ? (
                      reviews.map((review) => (
                        <div key={review._id} className="border border-gray-200 rounded-lg p-4">
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <div className="flex">
                                {[1, 2, 3, 4, 5].map((star) => (
                                  <span
                                    key={star}
                                    className={`text-sm ${
                                      star <= review.rating
                                        ? 'text-yellow-400'
                                        : 'text-gray-300'
                                    }`}
                                  >
                                    ★
                                  </span>
                                ))}
                              </div>
                              <span className="text-sm font-medium text-gray-900">
                                {review.user.name}
                              </span>
                              {review.isVerified && (
                                <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">
                                  ✓ Verifizierter Kauf
                                </span>
                              )}
                            </div>
                            <span className="text-xs text-gray-500">
                              {new Date(review.createdAt).toLocaleDateString('de-DE')}
                            </span>
                          </div>
                          {review.title && (
                            <h4 className="font-medium text-gray-900 mb-2">{review.title}</h4>
                          )}
                          {review.comment && (
                            <p className="text-gray-700 text-sm">{review.comment}</p>
                          )}
                        </div>
                      ))
                    ) : (
                      <p className="text-gray-500 text-center py-8">
                        Noch keine Bewertungen vorhanden.
                      </p>
                    )}
                    
                    {/* Pagination */}
                    {reviewsPagination && reviewsPagination.pages > 1 && (
                      <div className="flex items-center justify-center gap-2 mt-6">
                        <button
                          onClick={() => setReviewsPage(Math.max(1, reviewsPage - 1))}
                          disabled={reviewsPage === 1}
                          className={`px-3 py-2 text-sm rounded-lg transition-colors ${
                            reviewsPage === 1
                              ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                              : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
                          }`}
                        >
                          ← Zurück
                        </button>
                        
                        <div className="flex items-center gap-1">
                          {Array.from({ length: reviewsPagination.pages }, (_, i) => i + 1).map((page) => (
                            <button
                              key={page}
                              onClick={() => setReviewsPage(page)}
                              className={`px-3 py-2 text-sm rounded-lg transition-colors ${
                                page === reviewsPage
                                  ? 'bg-blue-600 text-white'
                                  : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
                              }`}
                            >
                              {page}
                            </button>
                          ))}
                        </div>
                        
                        <button
                          onClick={() => setReviewsPage(Math.min(reviewsPagination.pages, reviewsPage + 1))}
                          disabled={reviewsPage === reviewsPagination.pages}
                          className={`px-3 py-2 text-sm rounded-lg transition-colors ${
                            reviewsPage === reviewsPagination.pages
                              ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                              : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
                          }`}
                        >
                          Weiter →
                        </button>
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <div className="text-center py-12">
                  <div className="text-6xl mb-4">⭐</div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    Noch keine Bewertungen
                  </h3>
                  <p className="text-gray-600 mb-4">
                    Sei der Erste, der dieses Produkt bewertet!
                  </p>
                  <button className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors">
                    Bewertung schreiben
                  </button>
                </div>
              )}
            </div>
          )}
          </div>
        </div>
      </div>

      {/* Recommended Products Section */}
      {recommendedProducts && recommendedProducts.length > 0 && (
        <div className="mt-12">
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center">
              <svg className="w-6 h-6 mr-3 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
              </svg>
              Das könnte dich auch interessieren
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {recommendedProducts.slice(0, 4).map((recProduct: any, index: number) => (
              <ProductCard 
                key={recProduct._id || index}
                product={{
                  _id: recProduct._id?.toString() || index.toString(),
                  slug: recProduct.slug,
                  title: recProduct.title,
                  price: recProduct.price,
                  offerPrice: recProduct.offerPrice,
                  isOnSale: recProduct.isOnSale,
                  isTopSeller: recProduct.isTopSeller || false,
                  inStock: recProduct.inStock,
                  stockQuantity: recProduct.stockQuantity,
                  images: recProduct.images || [],
                  imageSizes: (recProduct.imageSizes || []).map((imgSize: any) => ({
                    main: imgSize.main,
                    thumb: imgSize.thumb,
                    small: imgSize.small
                  })),
                  tags: recProduct.tags || [],
                  variations: recProduct.variations || []
                }} 
              />
            ))}
            </div>
          </div>
        </div>
      )}

       {/* Lightbox Modal */}
       {isLightboxOpen && (
         <div 
           className={`fixed inset-0 z-50 flex items-center justify-center p-4 ${
             isLightboxClosing 
               ? 'modal-backdrop-exit' 
               : 'modal-backdrop-enter'
           }`}
           onClick={handleLightboxClose}
           style={{
             background: 'rgba(255, 255, 255, 0.1)',
             backdropFilter: 'blur(10px)',
             WebkitBackdropFilter: 'blur(10px)'
           }}
         >
           <div className={`relative max-w-4xl max-h-full ${
             isLightboxClosing 
               ? 'modal-content-exit' 
               : 'modal-content-enter'
           }`}>
             {/* Close Button */}
             <button
               onClick={handleLightboxClose}
               className="absolute top-4 right-4 z-10 w-10 h-10 bg-white bg-opacity-80 text-gray-800 rounded-full flex items-center justify-center hover:bg-opacity-100 hover:scale-110 transition-all duration-200 shadow-lg modal-button-enter"
             >
               <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
               </svg>
             </button>

             {/* Navigation Arrows */}
             {allMedia.length > 1 && (
               <>
                 <button
                   onClick={(e) => {
                     e.stopPropagation();
                     setSelectedImageIndex((prev) => (prev - 1 + allMedia.length) % allMedia.length);
                   }}
                   className="absolute left-4 top-1/2 transform -translate-y-1/2 z-10 w-12 h-12 bg-white bg-opacity-80 text-gray-800 rounded-full flex items-center justify-center hover:bg-opacity-100 hover:scale-110 transition-all duration-200 shadow-lg modal-button-left-enter"
                 >
                   <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                     <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                   </svg>
                 </button>
                 <button
                   onClick={(e) => {
                     e.stopPropagation();
                     setSelectedImageIndex((prev) => (prev + 1) % allMedia.length);
                   }}
                   className="absolute right-4 top-1/2 transform -translate-y-1/2 z-10 w-12 h-12 bg-white bg-opacity-80 text-gray-800 rounded-full flex items-center justify-center hover:bg-opacity-100 hover:scale-110 transition-all duration-200 shadow-lg modal-button-right-enter"
                 >
                   <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                     <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                   </svg>
                 </button>
               </>
             )}

             {/* Media Content */}
             <div 
               className="max-w-full max-h-[80vh] flex items-center justify-center modal-content-enter"
               onClick={(e) => e.stopPropagation()}
             >
               {currentMedia ? (
                 isVideo ? (
                <video
                  key={selectedImageIndex}
                  controls
                  className="max-w-full max-h-full object-cover transition-all duration-300 ease-in-out"
                  poster={videoThumbnail || product.images?.[0]}
                  preload="metadata"
                >
                     <source src={currentMedia} type="video/mp4" />
                     Your browser does not support the video tag.
                   </video>
                 ) : (
                   <img
                     key={selectedImageIndex}
                     src={getOptimizedImageUrl(currentMedia, getContextualImageSize('product-detail'), product.imageSizes, product.images?.indexOf(currentMedia) || 0)}
                     alt={product.title}
                     className="max-w-full max-h-full object-contain transition-all duration-300 ease-in-out"
                     srcSet={generateSrcSet(currentMedia)}
                     sizes="100vw"
                   />
                 )
               ) : (
                 <div className="text-white text-lg">No Media</div>
               )}
             </div>

             {/* Media Counter */}
             {allMedia.length > 1 && (
               <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-white bg-opacity-80 text-gray-800 px-4 py-2 rounded text-sm shadow-lg">
                 {selectedImageIndex + 1} / {allMedia.length}
               </div>
             )}
           </div>
         </div>
       )}
       </div>
     </>
   );
 }