"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { getOptimizedImageUrl, getContextualImageSize } from "@/lib/image-utils";
import { isVariationInStock } from "@/lib/variation-stock";
import { TiShoppingCart } from "react-icons/ti";
import { useCartStore } from "@/lib/store/cart";

interface ProductCardProps {
  product: {
    _id: string;
    slug: string;
    title: string;
    price: number;
    offerPrice?: number;
    isOnSale: boolean;
    isTopSeller: boolean;
    inStock?: boolean;
    stockQuantity?: number;
    images: string[];
    imageSizes?: Array<{ main: string; thumb: string; small: string }>;
    tags?: string[];
    variations?: Array<{
      name: string;
      options: Array<{
        value: string;
        inStock?: boolean;
        stockQuantity?: number;
        priceAdjustment?: number;
      }>;
    }>;
  };
}

export default function ProductCard({ product }: ProductCardProps) {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const [intervalId, setIntervalId] = useState<NodeJS.Timeout | null>(null);
  const [hasStartedCycling, setHasStartedCycling] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedVariations, setSelectedVariations] = useState<Record<string, string>>({});
  const [quantity, setQuantity] = useState(1);
  const addItem = useCartStore((s) => s.addItem);

  // Initialize variations with first available option when modal opens
  useEffect(() => {
    if (isModalOpen && product.variations && product.variations.length > 0) {
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
  }, [isModalOpen, product.variations]);

  const images = product.images || [];
  const hasMultipleImages = images.length > 1;
  const imageCount = images.length;

  // Start cycling through images on hover
  useEffect(() => {
    if (isHovered && hasMultipleImages && imageCount > 0) {
      // First image change after 500ms (longer delay to avoid click conflicts)
      const firstTimeout = setTimeout(() => {
        setCurrentImageIndex((prev) => (prev + 1) % imageCount);
        setHasStartedCycling(true);
        
        // Then continue with 1.5 second intervals (slower to reduce conflicts)
        const id = setInterval(() => {
          setCurrentImageIndex((prev) => (prev + 1) % imageCount);
        }, 1500);
        setIntervalId(id);
      }, 500);

      return () => {
        clearTimeout(firstTimeout);
        if (intervalId) {
          clearInterval(intervalId);
        }
      };
    } else {
      if (intervalId) {
        clearInterval(intervalId);
        setIntervalId(null);
      }
      setCurrentImageIndex(0); // Reset to first image when not hovering
      setHasStartedCycling(false);
    }
  }, [isHovered, hasMultipleImages, imageCount]);

  const handleMouseEnter = () => {
    setIsHovered(true);
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
  };

  // Check if product is out of stock (considering variations)
  const isOutOfStock = () => {
    // If no variations, use main product stock
    if (!product.variations || product.variations.length === 0) {
      return !product.inStock || (product.stockQuantity || 0) <= 0;
    }
    
    // If variations exist, check if any variation option is available
    // A product is available if at least one variation option is in stock
    const hasAvailableVariation = product.variations.some((variation: any) => 
      variation.options && variation.options.some((option: any) => {
        // Check if this option is in stock
        const optionInStock = option.inStock !== undefined ? option.inStock : true; // Default to true if not specified
        const optionStock = option.stockQuantity !== undefined ? option.stockQuantity : 0; // Default to 0 if not specified
        return optionInStock && optionStock > 0;
      })
    );
    
    return !hasAvailableVariation;
  };
  

  const handleClick = (e: React.MouseEvent) => {
    // Let the Link handle navigation for all products, even out of stock ones
    // The product page will handle the out of stock display
  };

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    // If product has variations, open modal
    if (product.variations && product.variations.length > 0) {
      setIsModalOpen(true);
      return;
    }
    
    if (!isOutOfStock()) {
      addItem({
        slug: product.slug,
        title: product.title,
        price: product.offerPrice || product.price,
        quantity: 1,
        variations: {},
        image: product.images[0],
        imageSizes: product.imageSizes,
        stockQuantity: product.stockQuantity
      });
    }
  };

  const handleVariationChange = (variationName: string, value: string) => {
    setSelectedVariations(prev => ({
      ...prev,
      [variationName]: value
    }));
  };

  const handleAddToCartFromModal = () => {
    if (!isOutOfStock()) {
      addItem({
        slug: product.slug,
        title: product.title,
        price: product.offerPrice || product.price,
        quantity: quantity,
        variations: selectedVariations,
        image: product.images[0],
        imageSizes: product.imageSizes,
        stockQuantity: product.stockQuantity
      });
      setIsModalOpen(false);
      setSelectedVariations({});
      setQuantity(1);
    }
  };

  const isAllVariationsSelected = () => {
    if (!product.variations || product.variations.length === 0) return true;
    return product.variations.every(variation => 
      selectedVariations[variation.name] !== undefined
    );
  };

  // Get current stock quantity based on selected variations
  const getCurrentStockQuantity = () => {
    if (!product.variations || product.variations.length === 0) {
      return product.stockQuantity || 0;
    }
    
    // Find the selected option for each variation and get its stock
    let minStock = Infinity;
    product.variations.forEach((variation: any) => {
      const selectedOption = variation.options.find((option: any) => 
        option.value === selectedVariations[variation.name]
      );
      if (selectedOption) {
        const optionStock = selectedOption.stockQuantity !== undefined ? selectedOption.stockQuantity : product.stockQuantity;
        minStock = Math.min(minStock, optionStock || 0);
      }
    });
    
    return minStock === Infinity ? 0 : minStock;
  };

  // Check if current variation combination is in stock
  const isCurrentVariationInStock = () => {
    if (!product.variations || product.variations.length === 0) {
      return product.inStock;
    }
    
    return product.variations.every((variation: any) => {
      const selectedOption = variation.options.find((option: any) => 
        option.value === selectedVariations[variation.name]
      );
      if (!selectedOption) return false;
      
      const optionInStock = selectedOption.inStock !== undefined ? selectedOption.inStock : product.inStock;
      const optionStock = selectedOption.stockQuantity !== undefined ? selectedOption.stockQuantity : product.stockQuantity;
      return optionInStock && optionStock > 0;
    });
  };

  const getTotalPrice = () => {
    // Use offer price if available, otherwise use regular price
    let basePrice = product.isOnSale && product.offerPrice ? product.offerPrice : product.price;
    
    // Add variation price adjustments
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
    
    return (basePrice * quantity) / 100;
  };

  return (
    <>
      <Link
        href={`/shop/${product.slug}`}
        className="shop-grid-item block overflow-hidden"
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onClick={handleClick}
      >
      <div className="aspect-square bg-gray-100 relative overflow-hidden">
        {images.length > 0 ? (
          <>
            {images.map((image, index) => (
              <img
                key={`image-${index}`}
                src={getOptimizedImageUrl(
                  image, 
                  getContextualImageSize('shop-listing'), 
                  product.imageSizes, 
                  index
                )}
                alt={product.title}
                className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-300 ease-in-out ${
                  index === currentImageIndex ? 'opacity-100' : 'opacity-0'
                }`}
                loading="lazy"
              />
            ))}
          </>
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-400">
            No Image
          </div>
        )}
        
        {/* Image indicator dots */}
        {hasMultipleImages && (
          <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2 flex space-x-1">
            {images.map((_, index) => (
              <div
                key={index}
                className={`w-2 h-2 rounded-full transition-all duration-300 ${
                  index === currentImageIndex 
                    ? 'bg-white shadow-md' 
                    : 'bg-white/50'
                }`}
              />
            ))}
          </div>
        )}



      </div>
      
      <div className="p-4 relative">
        <div className="font-semibold text-gray-900 mb-2 line-clamp-2">
          {product.title}
        </div>
        
        {/* Price with large Euro and small Cent */}
        <div className="mb-3 flex items-center justify-between">
          <div>
            {product.isOnSale && product.offerPrice ? (
              <div className="flex items-baseline gap-2">
                <div className="flex items-baseline">
                  <span className="text-2xl font-bold text-red-600">
                    {Math.floor(product.offerPrice / 100)}
                  </span>
                  <span className="text-sm text-red-600 font-medium">
                    ,{(product.offerPrice % 100).toString().padStart(2, '0')}
                  </span>
                  <span className="text-sm text-red-600 ml-1">€</span>
                </div>
                <span className="line-through text-gray-400 text-sm">
                  {(product.price / 100).toFixed(2)} €
                </span>
              </div>
            ) : (
              <div className="flex items-baseline">
                <span className="text-2xl font-bold text-gray-900">
                  {Math.floor(product.price / 100)}
                </span>
                <span className="text-sm text-gray-900 font-medium">
                  ,{(product.price % 100).toString().padStart(2, '0')}
                </span>
                <span className="text-sm text-gray-900 ml-1">€</span>
              </div>
            )}
          </div>
          
          {/* Stock status and cart button */}
          <div className="flex items-center gap-2">
            {/* Stock status */}
            <div className="flex items-center gap-1">
              <div className={`w-2 h-2 rounded-full ${!isOutOfStock() ? 'bg-green-500' : 'bg-red-500'}`}></div>
              <span className={`text-xs font-medium ${!isOutOfStock() ? 'text-green-600' : 'text-red-600'}`}>
                {!isOutOfStock() ? 'Auf Lager' : 'Nicht verfügbar'}
              </span>
            </div>
            
            {/* Add to cart button */}
            <button
              onClick={handleAddToCart}
              disabled={isOutOfStock()}
              className={`p-2 rounded-full transition-all duration-200 ${
                isOutOfStock()
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : product.variations && product.variations.length > 0
                  ? 'bg-orange-500 text-white hover:bg-orange-600 shadow-lg hover:shadow-xl'
                  : 'bg-blue-600 text-white hover:bg-blue-700 shadow-lg hover:shadow-xl'
              }`}
              title={product.variations && product.variations.length > 0 ? 'Optionen auswählen' : 'In den Warenkorb'}
            >
              <TiShoppingCart className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
      </Link>

      {/* Variation Modal */}
    {isModalOpen && (
      <div 
        className="fixed inset-0 backdrop-blur-sm flex items-center justify-center z-50 p-4"
        onClick={() => setIsModalOpen(false)}
      >
        <div 
          className="bg-white rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto shadow-xl"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="p-6">
            <div className="flex justify-between items-center mb-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">{product.title}</h3>
                <div className="text-sm text-gray-600 mt-1">
                  {product.isOnSale && product.offerPrice ? (
                    <>
                      <span className="text-red-600 font-semibold">
                        {(product.offerPrice / 100).toFixed(2)} €
                      </span>
                      <span className="line-through text-gray-400 ml-2">
                        {(product.price / 100).toFixed(2)} €
                      </span>
                    </>
                  ) : (
                    <span className="font-semibold">{(product.price / 100).toFixed(2)} €</span>
                  )}
                </div>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="space-y-4">
              {product.variations?.map((variation) => (
                <div key={variation.name}>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {variation.name}
                  </label>
                  <select
                    value={selectedVariations[variation.name] || ''}
                    onChange={(e) => handleVariationChange(variation.name, e.target.value)}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    {variation.options.map((option) => {
                      const optionStock = option.stockQuantity !== undefined ? option.stockQuantity : (product.stockQuantity || 0);
                      const optionInStock = option.inStock !== undefined ? option.inStock : (product.inStock || false);
                      
                      return (
                        <option 
                          key={option.value} 
                          value={option.value}
                          disabled={!optionInStock || optionStock <= 0}
                        >
                          {option.value} 
                          {option.priceAdjustment && option.priceAdjustment > 0 && ` (+${(option.priceAdjustment / 100).toFixed(2)} €)`}
                          {option.priceAdjustment && option.priceAdjustment < 0 && ` (${(option.priceAdjustment / 100).toFixed(2)} €)`}
                          {optionStock > 0 && ` - ${optionStock} verfügbar`}
                          {(!optionInStock || optionStock <= 0) && ' - Nicht verfügbar'}
                        </option>
                      );
                    })}
                  </select>
                </div>
              ))}
              
              {/* Quantity selector */}
              <div className="p-4 bg-gray-50 rounded-lg">
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
            </div>
            
            {/* Price display */}
            <div className="mt-4 p-4 bg-gray-50 rounded-lg">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Gesamtpreis:</span>
                <span className="text-lg font-semibold text-gray-900">
                  {getTotalPrice().toFixed(2)} €
                </span>
              </div>
              {quantity > 1 && (
                <div className="text-xs text-gray-500 mt-1">
                  {quantity} × {((product.offerPrice || product.price) / 100).toFixed(2)} €
                </div>
              )}
            </div>
            
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setIsModalOpen(false)}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Abbrechen
              </button>
              <button
                onClick={handleAddToCartFromModal}
                disabled={!isAllVariationsSelected() || isOutOfStock()}
                className={`flex-1 px-4 py-2 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 ${
                  !isAllVariationsSelected() || isOutOfStock()
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    : 'bg-blue-600 text-white hover:bg-blue-700'
                }`}
              >
                <TiShoppingCart className="w-4 h-4" />
                In den Warenkorb
              </button>
            </div>
          </div>
        </div>
      </div>
    )}
    </>
  );
}
