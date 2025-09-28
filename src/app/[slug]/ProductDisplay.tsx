"use client";

import { useState, useEffect, useRef } from "react";
import AddToCartButton from "./AddToCartButton";
import SearchBar from "@/components/SearchBar";
import Breadcrumb from "@/components/Breadcrumb";
import { getOptimizedImageUrl, getContextualImageSize, generateSrcSet } from "@/lib/image-utils";
import ProductCard from "@/components/ProductCard";
import { getStockQuantityForVariations, isVariationInStock } from "@/lib/variation-stock";
import { FaTruckFast } from "react-icons/fa6";

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
  const [activeTab, setActiveTab] = useState('reviews');
  const [selectedVariations, setSelectedVariations] = useState<Record<string, string>>({});
  
  // Swipe functionality (Mobile + PC)
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);
  const [mouseStart, setMouseStart] = useState<number | null>(null);
  const [mouseEnd, setMouseEnd] = useState<number | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [windowWidth, setWindowWidth] = useState(0);
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const [hasMoved, setHasMoved] = useState(false); // distinguishes click vs drag
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
  
  // Reviews swipe functionality
  const [reviewsTouchStart, setReviewsTouchStart] = useState<number | null>(null);
  const [reviewsTouchEnd, setReviewsTouchEnd] = useState<number | null>(null);

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
      return product.inStock && (product.stockQuantity || 0) > 0;
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

  // Load reviews for the product (always via API to get proper user data)
  useEffect(() => {
    const loadReviews = async () => {
      try {
        setReviewsLoading(true);
        const response = await fetch(`/api/reviews/product/${product.slug}?page=${reviewsPage}&limit=3`);
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

    loadReviews();
  }, [product.slug, reviewsPage]);


  // Handle scroll to hide breadcrumb behind search bar and measure viewport
  useEffect(() => {
    const handleScroll = () => {
      const scrollTop = window.scrollY;
      // Hide breadcrumb when scrolled more than 20px
      setIsScrolled(scrollTop > 20);
    };

    // Measure viewport width for slider (SSR safe)
    const measure = () => {
      if (viewportRef.current) {
        setWindowWidth(viewportRef.current.clientWidth);
      } else {
        setWindowWidth(window.innerWidth);
      }
    };
    measure();
    
    const handleResize = () => {
      measure();
    };

    window.addEventListener('scroll', handleScroll);
    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', handleResize);
    };
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

  // Swipe handlers
  const minSwipeDistance = 50;

  const changeImage = (direction: 'left' | 'right') => {
    if (isTransitioning) return;
    
    setIsTransitioning(true);
    
    if (direction === 'left') {
      // Nach links: nächstes Bild oder zum ersten springen
      setSelectedImageIndex(selectedImageIndex < allMedia.length - 1 ? selectedImageIndex + 1 : 0);
    } else if (direction === 'right') {
      // Nach rechts: vorheriges Bild oder zum letzten springen
      setSelectedImageIndex(selectedImageIndex > 0 ? selectedImageIndex - 1 : allMedia.length - 1);
    }
    
    setTimeout(() => {
      setIsTransitioning(false);
    }, 300);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    e.preventDefault();
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
    setIsDragging(true);
    setDragOffset(0);
    setHasMoved(false);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    e.preventDefault();
    if (!touchStart) return;
    const currentTouch = e.targetTouches[0].clientX;
    setTouchEnd(currentTouch);
    setDragOffset(currentTouch - touchStart);
    if (Math.abs(currentTouch - touchStart) > 5) setHasMoved(true);
  };

  const handleTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;

    if (isLeftSwipe) {
      changeImage('left');
    }
    if (isRightSwipe) {
      changeImage('right');
    }
    
    setIsDragging(false);
    setDragOffset(0);
    // Open lightbox only on tap (no movement/swipe)
    if (!isLeftSwipe && !isRightSwipe && !hasMoved && !isVideo) {
      setIsLightboxOpen(true);
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setMouseEnd(null);
    setMouseStart(e.clientX);
    setIsDragging(true);
    setDragOffset(0);
    setHasMoved(false);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!mouseStart || !isDragging) return;
    const currentMouse = e.clientX;
    setMouseEnd(currentMouse);
    setDragOffset(currentMouse - mouseStart);
    if (Math.abs(currentMouse - mouseStart) > 5) setHasMoved(true);
  };

  const handleMouseUp = () => {
    if (!mouseStart || !mouseEnd) return;
    
    const distance = mouseStart - mouseEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;

    if (isLeftSwipe) {
      changeImage('left');
    }
    if (isRightSwipe) {
      changeImage('right');
    }
    
    setIsDragging(false);
    setDragOffset(0);
    // Open lightbox only on click (no movement/swipe)
    if (!isLeftSwipe && !isRightSwipe && !hasMoved && !isVideo) {
      setIsLightboxOpen(true);
    }
  };

  const handleMouseLeave = () => {
    if (isDragging) {
      // Convert dragOffset to the same sign convention as distance
      const distance = -dragOffset; // mouseStart - current
      const isLeftSwipe = distance > minSwipeDistance;
      const isRightSwipe = distance < -minSwipeDistance;

      if (isLeftSwipe) {
        changeImage('left');
      } else if (isRightSwipe) {
        changeImage('right');
      }
    }
    setIsDragging(false);
    setDragOffset(0);
    setHasMoved(false);
  };

  // Reviews swipe handlers
  const handleReviewsTouchStart = (e: React.TouchEvent) => {
    setReviewsTouchStart(e.targetTouches[0].clientX);
  };

  const handleReviewsTouchMove = (e: React.TouchEvent) => {
    setReviewsTouchEnd(e.targetTouches[0].clientX);
  };

  const handleReviewsTouchEnd = () => {
    if (!reviewsTouchStart || !reviewsTouchEnd || !reviewsPagination) return;
    
    const distance = reviewsTouchStart - reviewsTouchEnd;
    const isLeftSwipe = distance > 50;
    const isRightSwipe = distance < -50;

    if (isLeftSwipe && reviewsPage < reviewsPagination.pages) {
      setReviewsPage(reviewsPage + 1);
    } else if (isRightSwipe && reviewsPage > 1) {
      setReviewsPage(reviewsPage - 1);
    }
    
    setReviewsTouchStart(null);
    setReviewsTouchEnd(null);
  };


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

      <div className="max-w-7xl mx-auto px-4 md:py-10 pt-30 md:pt-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left: Main Product Image/Video */}
        <div className="lg:col-span-7">
          <div className="bg-white rounded-xl shadow-lg p-4">
            
            <div 
              className={`w-full h-[334x] md:h-[600px] bg-gray-50 rounded-lg overflow-hidden relative ${
                isVideo ? 'cursor-default' : 'cursor-grab hover:opacity-90 hover:scale-[1.02]'
              } ${isDragging ? 'cursor-grabbing' : ''}`}
              ref={viewportRef}
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseLeave}
             >
              {/* Galerie Container mit allen Bildern */}
              <div 
                className="flex h-full"
                style={{
                  width: `${allMedia.length * 100}%`,
                  transform: `translateX(${-(selectedImageIndex * (100 / allMedia.length)) + (windowWidth > 0 ? (dragOffset / windowWidth) * (100 / allMedia.length) : 0)}%)`,
                  transition: isDragging ? 'none' : 'transform 300ms ease-out'
                }}
              >
                {allMedia.map((media, index) => {
                  const isCurrentVideo = media && product.videos?.includes(media);
                  const videoIdx = product.videos?.indexOf(media) || 0;
                  const videoThumb = product.videoThumbnails?.[videoIdx];
                  
                  const slideWidthPercent = 100 / allMedia.length;
                  return (
                    <div
                      key={index}
                      className="h-full flex-shrink-0 flex items-center justify-center"
                      style={{ width: `${slideWidthPercent}%` }}
                    >
                      {isCurrentVideo ? (
                <video
                  controls
                  className="max-w-full max-h-full object-cover"
                          poster={videoThumb || product.images?.[0]}
                  preload="metadata"
                >
                          <source src={media} type="video/mp4" />
                  Your browser does not support the video tag.
                </video>
              ) : (
                <img
                          src={getOptimizedImageUrl(media, getContextualImageSize('product-detail'), product.imageSizes, product.images?.indexOf(media) || 0)}
                          alt={`${product.title} - Bild ${index + 1}`}
                  className="max-w-full max-h-full object-contain transition-opacity duration-500"
                          srcSet={generateSrcSet(media)}
                  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                />
                      )}
              </div>
                  );
                })}
              </div>
            
            {/* Navigation Buttons - nur auf Desktop */}
            {allMedia.length > 1 && (
              <>
                {/* Left Arrow - immer sichtbar */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    changeImage('right');
                  }}
                  className="absolute left-4 top-1/2 transform -translate-y-1/2 bg-black bg-opacity-50 hover:bg-opacity-70 text-white p-2 rounded-full transition-all duration-200 hidden md:block"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                
                {/* Right Arrow - immer sichtbar */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    changeImage('left');
                  }}
                  className="absolute right-4 top-1/2 transform -translate-y-1/2 bg-black bg-opacity-50 hover:bg-opacity-70 text-white p-2 rounded-full transition-all duration-200 hidden md:block"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </>
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
          {/* Navigation Menu */}
          <div className="mt-6 mb-4 hidden lg:block">
            <div className="bg-white rounded-xl shadow-lg p-4">
              <nav className="flex justify-center gap-6">
                <button
                  onClick={() => {
                    const element = document.getElementById('reviews-section');
                    if (element) {
                      const elementPosition = element.offsetTop;
                      const offsetPosition = elementPosition - 100; // 100px offset from top
                      window.scrollTo({
                        top: offsetPosition,
                        behavior: 'smooth'
                      });
                    }
                  }}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                >
                  <svg className="w-4 h-4 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                  </svg>
                  Bewertungen
                </button>
                <button
                  onClick={() => {
                    const element = document.getElementById('properties-section');
                    if (element) {
                      const elementPosition = element.offsetTop;
                      const offsetPosition = elementPosition - 100; // 100px offset from top
                      window.scrollTo({
                        top: offsetPosition,
                        behavior: 'smooth'
                      });
                    }
                  }}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                >
                  <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Eigenschaften
                </button>
                <button
                  onClick={() => {
                    const element = document.getElementById('description-section');
                    if (element) {
                      const elementPosition = element.offsetTop;
                      const offsetPosition = elementPosition - 100; // 100px offset from top
                      window.scrollTo({
                        top: offsetPosition,
                        behavior: 'smooth'
                      });
                    }
                  }}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                >
                  <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Beschreibung
                </button>
              </nav>
          </div>
        </div>

          {/* Product Information Sections (no tabs) */}
          <div className="space-y-6">
            
            {/* Product Info Box - Mobile only (over Reviews) */}
            <div className="lg:hidden bg-white rounded-xl shadow-lg p-6 mt-6">
              {/* Product Title */}
              <div className="mb-2">
                <h1 className="text-2xl font-bold text-gray-900">{product.title}</h1>
              </div>

              {/* Stars & Review */}
              <div className="flex items-center gap-2 mb-4">
                {reviewStats && reviewStats.totalReviews > 0 ? (
                  <>
                    <div className="flex">
                      {[1, 2, 3, 4, 5].map((star) => {
                        const rating = reviewStats.averageRating;
                        const fillPercentage = Math.max(0, Math.min(100, (rating - (star - 1)) * 100));
                        
                        return (
                          <span key={star} className="relative text-xl">
                            <span className="text-gray-300">★</span>
                            <span
                              className="absolute inset-0 text-yellow-400 overflow-hidden"
                              style={{ width: `${fillPercentage}%` }}
                            >
                              ★
                            </span>
                          </span>
                        );
                      })}
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
                        <span key={star} className="text-xl text-gray-300">
                          ★
                        </span>
                      ))}
                    </div>
                    <span className="text-sm text-gray-600">Noch keine Bewertungen</span>
                  </>
                )}
              </div>

              {/* Price */}
              <div className="mb-4">
                <div className="flex items-center gap-2">
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
                            if (selectedOption && selectedOption.priceModifier) {
                              originalPriceWithVariations += selectedOption.priceModifier;
                            }
                          });
                        }
                        return (originalPriceWithVariations / 100).toFixed(2);
                      })()} €
                    </span>
                  )}
                </div>
                {product.isOnSale && (
                  <div className="text-sm text-green-600 font-medium mt-1">
                    Du sparst {((product.price - (product.offerPrice || product.price)) / product.price * 100).toFixed(0)}%
                  </div>
                )}
              </div>

              {/* Variations */}
              {product.variations && product.variations.length > 0 && (
                <div className="mb-4">
                  {product.variations.map((variation: any) => (
                    <div key={variation.name} className="mb-3">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        {variation.name}:
                      </label>
                      <div className="flex flex-wrap gap-2">
                        {variation.options.map((option: any) => (
                          <button
                            key={option.value}
                            onClick={() => setSelectedVariations(prev => ({
                              ...prev,
                              [variation.name]: option.value
                            }))}
                            className={`px-3 py-2 text-sm rounded-lg border transition-colors ${
                              selectedVariations[variation.name] === option.value
                                ? 'bg-blue-600 text-white border-blue-600'
                                : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                            }`}
                          >
                            {option.value}
                            {option.priceModifier && option.priceModifier !== 0 && (
                              <span className="ml-1 text-xs">
                                {option.priceModifier > 0 ? '+' : ''}{option.priceModifier.toFixed(2)}€
                              </span>
                            )}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Quantity Selector */}
              <div className="mb-4">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium text-gray-700">
                    Anzahl:
                  </label>
                  <span className="text-sm text-gray-600">
                    {isCurrentVariationInStock() ? `${getCurrentStockQuantity()} verfügbar` : 'Ausverkauft'}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    className="w-8 h-8 rounded-lg border border-gray-300 flex items-center justify-center hover:bg-gray-50"
                  >
                    -
                  </button>
                  <span className="px-3 py-1 text-sm font-medium">{quantity}</span>
                  <button
                    onClick={() => setQuantity(Math.min(getCurrentStockQuantity(), quantity + 1))}
                    disabled={quantity >= getCurrentStockQuantity() || getCurrentStockQuantity() <= 0}
                    className={`w-8 h-8 rounded-lg border border-gray-300 flex items-center justify-center hover:bg-gray-50 ${
                      quantity >= getCurrentStockQuantity() || getCurrentStockQuantity() <= 0
                        ? 'opacity-50 cursor-not-allowed'
                        : ''
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
                
                {/* Availability Text */}
                <div className="mt-2 text-sm text-gray-600">
                  {isAnyVariationAvailable() ? (
                    <span className="flex items-center">
                      <FaTruckFast className="w-6 h-6 mr-2 text-gray-500" />
                      <span className="font-bold">Sofort verfügbar</span> <span className="ml-1">• Lieferzeit 2-4 Werktage</span>
                    </span>
                  ) : (
                    <span className="text-red-600"></span>
                  )}
                </div>
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
            {/* Navigation Menu - Mobile only (under purchase box) */}
            <div className="block lg:hidden mt-4">
              <div className="bg-white rounded-xl shadow-lg p-4">
                <nav className="flex justify-center items-center gap-2">
                  <button
                    onClick={() => {
                      const element = document.getElementById('reviews-section');
                      if (element) {
                        const elementPosition = element.offsetTop;
                        const offsetPosition = elementPosition - 100; // 100px offset from top
                        window.scrollTo({
                          top: offsetPosition,
                          behavior: 'smooth'
                        });
                      }
                    }}
                    className="px-3 py-2 text-sm font-medium text-gray-700 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                  >
                    Bewertungen
                  </button>
                  <span className="text-gray-300">|</span>
                  <button
                    onClick={() => {
                      const element = document.getElementById('properties-section');
                      if (element) {
                        const elementPosition = element.offsetTop;
                        const offsetPosition = elementPosition - 100; // 100px offset from top
                        window.scrollTo({
                          top: offsetPosition,
                          behavior: 'smooth'
                        });
                      }
                    }}
                    className="px-3 py-2 text-sm font-medium text-gray-700 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                  >
                    Eigenschaften
                  </button>
                  <span className="text-gray-300">|</span>
                  <button
                    onClick={() => {
                      const element = document.getElementById('description-section');
                      if (element) {
                        const elementPosition = element.offsetTop;
                        const offsetPosition = elementPosition - 100; // 100px offset from top
                        window.scrollTo({
                          top: offsetPosition,
                          behavior: 'smooth'
                        });
                      }
                    }}
                    className="px-3 py-2 text-sm font-medium text-gray-700 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                  >
                    Beschreibung
                  </button>
                </nav>
              </div>
            </div>
            
            {/* Reviews Section */}
            <div id="reviews-section" className="bg-white rounded-xl shadow-lg p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-gray-900 flex items-center">
                  
                  Bewertungen ({reviewStats?.totalReviews || 0})
                  {reviewStats && reviewStats.totalReviews > 0 && (
                    <div className="flex items-center ml-4">
                      <div className="flex">
                        {[1, 2, 3, 4, 5].map((star) => {
                          const rating = reviewStats.averageRating;
                          const fillPercentage = Math.max(0, Math.min(100, (rating - (star - 1)) * 100));
                          
                          return (
                            <span key={star} className="relative text-lg">
                              <span className="text-gray-300">★</span>
                              <span 
                                className="absolute inset-0 text-yellow-400 overflow-hidden"
                                style={{ width: `${fillPercentage}%` }}
                              >
                                ★
                              </span>
                            </span>
                          );
                        })}
                      </div>
                      <span className="text-sm font-medium text-gray-900 ml-2">
                        {reviewStats.averageRating.toFixed(1)}
                      </span>
                    </div>
                  )}
                </h2>
                
                {/* Pagination */}
                {reviewsPagination && reviewsPagination.pages > 1 && (
                  <div className="hidden md:flex items-center gap-2">
                    <button
                      onClick={() => setReviewsPage(Math.max(1, reviewsPage - 1))}
                      disabled={reviewsPage === 1}
                      className={`px-2 py-1 text-xs rounded transition-colors ${
                        reviewsPage === 1
                          ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                          : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      ← Zurück
                    </button>
                    <span className="text-xs text-gray-600 px-2">
                      {reviewsPage} von {reviewsPagination.pages}
                    </span>
                    <button
                      onClick={() => setReviewsPage(Math.min(reviewsPagination.pages, reviewsPage + 1))}
                      disabled={reviewsPage === reviewsPagination.pages}
                      className={`px-2 py-1 text-xs rounded transition-colors ${
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
              
              {reviewStats && reviewStats.totalReviews > 0 ? (
                <>
                  
                  {/* Individual Reviews */}
                  <div 
                    className="space-y-4 relative"
                    onTouchStart={handleReviewsTouchStart}
                    onTouchMove={handleReviewsTouchMove}
                    onTouchEnd={handleReviewsTouchEnd}
                  >
                    {reviewsLoading ? (
                      <div className="space-y-4">
                        {/* Skeleton Loading für Reviews */}
                        {[1, 2, 3].map((index) => (
                          <div key={index} className="border border-gray-200 rounded-lg p-4 animate-pulse">
                            <div className="flex items-start justify-between mb-3">
                              <div className="flex items-center gap-2">
                                <div className="flex gap-1">
                                  {[1, 2, 3, 4, 5].map((star) => (
                                    <div key={star} className="w-4 h-4 bg-gray-300 rounded-sm"></div>
                                  ))}
                                </div>
                                <div className="h-4 w-24 bg-gray-300 rounded"></div>
                                <div className="h-5 w-20 bg-green-200 rounded-full"></div>
                              </div>
                              <div className="h-3 w-16 bg-gray-300 rounded"></div>
                            </div>
                            <div className="h-4 w-3/4 bg-gray-300 rounded mb-2"></div>
                            <div className="space-y-2">
                              <div className="h-3 w-full bg-gray-300 rounded"></div>
                              <div className="h-3 w-5/6 bg-gray-300 rounded"></div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : reviews.length > 0 ? (
                      <>
                        {reviews.map((review) => (
                        <div key={review._id} className="border border-gray-200 rounded-lg p-4">
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <div className="flex">
                                {[1, 2, 3, 4, 5].map((star) => {
                                  const rating = review.rating;
                                  const fillPercentage = Math.max(0, Math.min(100, (rating - (star - 1)) * 100));
                                  
                                  return (
                                    <span key={star} className="relative text-lg">
                                      <span className="text-gray-300">★</span>
                                      <span 
                                        className="absolute inset-0 text-yellow-400 overflow-hidden"
                                        style={{ width: `${fillPercentage}%` }}
                                      >
                                        ★
                                      </span>
                                    </span>
                                  );
                                })}
                              </div>
                              <span className="text-sm font-medium text-gray-900">
                                {review.user.name === 'Anonymer Kunde' ? 'Anonym' : review.user.name}
                              </span>
                              {review.isVerified && (
                                <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">
                                  ✓
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
                        ))}
                      </>
                    ) : (
                      <p className="text-gray-500 text-center py-8">
                        Noch keine Bewertungen vorhanden.
                      </p>
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
              
              {/* Mobile Page Counter */}
              {reviewsPagination && reviewsPagination.pages > 1 && (
                <div className="flex justify-end mt-4 md:hidden">
                  <span className="text-xs text-gray-500">
                    {reviewsPage} von {reviewsPagination.pages}
                  </span>
                </div>
              )}
            </div>

            {/* Properties Section */}
            <div id="properties-section" className="bg-white rounded-xl shadow-lg p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center">
                <svg className="w-6 h-6 mr-3 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Eigenschaften
              </h2>
              
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

            {/* Description Section */}
            <div id="description-section" className="bg-white rounded-xl shadow-lg p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center">
                <svg className="w-6 h-6 mr-3 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Beschreibung
              </h2>
              
              <div
                className="prose max-w-none"
                dangerouslySetInnerHTML={{ __html: descriptionHtml }}
              />
            </div>
          </div>
        </div>

        {/* Right: Product Info & Purchase (sticky on desktop) */}
        <div className="hidden lg:col-span-5 lg:block">
          <div className="bg-white rounded-xl shadow-lg p-6 lg:sticky lg:top-28">
            {/* Product Title */}
             <div className="mb-2">
               <h1 className="text-2xl font-bold text-gray-900">{product.title}</h1>
             </div>

            {/* Stars & Review */}
            <div className="flex items-center gap-2 mb-4">
              {reviewStats && reviewStats.totalReviews > 0 ? (
                <>
                  <div className="flex">
                    {[1, 2, 3, 4, 5].map((star) => {
                      const rating = reviewStats.averageRating;
                      const fillPercentage = Math.max(0, Math.min(100, (rating - (star - 1)) * 100));
                      
                      return (
                        <span key={star} className="relative text-xl">
                          <span className="text-gray-300">★</span>
                      <span
                            className="absolute inset-0 text-yellow-400 overflow-hidden"
                            style={{ width: `${fillPercentage}%` }}
                      >
                        ★
                      </span>
                        </span>
                      );
                    })}
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
                      <span key={star} className="text-xl text-gray-300">
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



            {/* Bestseller Badge */}
            {product.isTopSeller && (
              <div className="mb-4 p-3 rounded-lg bg-yellow-50 border border-yellow-200">
                <div className="flex items-center">
                  <div className="w-3 h-3 rounded-full mr-2 bg-yellow-500"></div>
                  <span className="font-medium text-yellow-700">
                    Bestseller
                  </span>
                  <span className="ml-2 text-sm text-yellow-600">• Beliebtes Produkt</span>
                </div>
              </div>
            )}

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

            {/* Variations */}
            {product.variations && product.variations.length > 0 && (
              <div className="mb-4">
                <div className="space-y-3">
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
                              {(!optionInStock || optionStock <= 0) && ' - Ausverkauft'}
                            </option>
                          );
                        })}
                      </select>
                    </div>
                  ))}
                </div>
              </div>
            )}

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
                    <span className="font-medium">
                      Ausverkauft
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
            
            {/* Availability Text */}
            <div className="mt-2 text-sm text-gray-600">
              {isAnyVariationAvailable() ? (
                <span className="flex items-center">
                  <FaTruckFast className="w-6 h-6 mr-2 text-gray-500" />
                  <span className="font-bold">Sofort verfügbar</span> <span className="ml-1">• Lieferzeit 2-4 Werktage</span>
                </span>
              ) : (
                <span className="text-red-600"></span>
              )}
            </div>
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
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-3 md:gap-4">
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
                  variations: recProduct.variations || [],
                  reviews: recProduct.reviews || null
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