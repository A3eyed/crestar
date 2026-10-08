// @ts-nocheck
import { View, Text, ScrollView, Alert } from 'react-native';
import { useState, useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import useAuth from '@/utils/auth/useAuth';
import useLocalization from '@/utils/localization';
import useCartStore from '@/utils/cartStore';
import { useTheme } from '@/utils/theme';
import SizeGuideModal from '@/components/SizeGuideModal';
import { useProductData } from '@/hooks/useProductData';
import { useProductVariants } from '@/hooks/useProductVariants';
import { useProductPricing } from '@/hooks/useProductPricing';
import { useProductStock } from '@/hooks/useProductStock';
import { ProductHeader } from '../../components/ProductDetail/ProductHeader';
import { ProductImageGallery } from '../../components/ProductDetail/ProductImageGallery';
import { ImageIndicators } from '../../components/ProductDetail/ImageIndicators';
import { ProductInfo } from '../../components/ProductDetail/ProductInfo';
import { ColorSelector } from '../../components/ProductDetail/ColorSelector';
import { SizeSelector } from '../../components/ProductDetail/SizeSelector';
import { ProductDescription } from '../../components/ProductDetail/ProductDescription';
import { ProductFeatures } from '../../components/ProductDetail/ProductFeatures';
import { BottomActionBar } from '../../components/ProductDetail/BottomActionBar';
import { LoadingState, ErrorState } from '../../components/ProductDetail/StateViews';

export default function ProductDetailScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const { formatCurrency } = useLocalization();
  const { isAuthenticated, signIn } = useAuth();
  const { addItem, setBuyNowItem } = useCartStore();
  const colors = useTheme();

  const [quantity, setQuantity] = useState(1);
  const [selectedImage, setSelectedImage] = useState(0);
  const [showSizeGuide, setShowSizeGuide] = useState(false);

  // Fetch product data — now includes isMockData flag and mock fallback
  const { product, loading, error, variants, variantStock, variantImages, isMockData } =
    useProductData(id);

  // Handle variants
  const {
    selectedColor,
    selectedSize,
    availableSizes,
    displayImages,
    setSelectedSize,
    handleColorSelect,
    getUniqueColors,
  } = useProductVariants(variants, variantImages, product?.images || []);

  // Get pricing
  const { getCurrentPrice } = useProductPricing(product, variants, selectedColor);

  // Get stock info
  const { getCurrentStock, isLowStock, isColorOutOfStock } = useProductStock(
    product,
    variantStock,
    selectedColor
  );

  // Reset image index when display images change (e.g. color variant selected)
  useEffect(() => {
    setSelectedImage(0);
  }, [displayImages]);

  const handleAddToCart = async () => {
    if (!isAuthenticated) {
      signIn();
      return;
    }

    // Validate variant selection
    const uniqueColors = getUniqueColors();
    if (uniqueColors.length > 0 && !selectedColor) {
      Alert.alert('Select Color', 'Please select a color variant');
      return;
    }

    if (availableSizes.length > 0 && !selectedSize) {
      Alert.alert('Select Size', 'Please select a size');
      return;
    }

    // Block purchase when out of stock
    if (getCurrentStock() === 0) {
      Alert.alert('Out of Stock', 'This variant is currently out of stock');
      return;
    }

    try {
      await addItem(
        {
          id: product.id,
          name: product.name,
          price: getCurrentPrice(),
          image: displayImages[0] || product.images?.[0],
          seller: product.seller,
          sellerId: product.sellerId,
          selectedColor,
          selectedSize,
        },
        quantity
      );
      router.back();
    } catch (err) {
      console.error('Add to cart error:', err);
      Alert.alert('Error', 'Could not add item to cart. Please try again.');
    }
  };

  const handleBuyNow = async () => {
    if (!isAuthenticated) {
      signIn();
      return;
    }

    // Validate variant selection
    const uniqueColors = getUniqueColors();
    if (uniqueColors.length > 0 && !selectedColor) {
      Alert.alert('Select Color', 'Please select a color variant');
      return;
    }

    if (availableSizes.length > 0 && !selectedSize) {
      Alert.alert('Select Size', 'Please select a size');
      return;
    }

    // Block purchase when out of stock
    if (getCurrentStock() === 0) {
      Alert.alert('Out of Stock', 'This variant is currently out of stock');
      return;
    }

    // TikTok-style express lane: skip the cart entirely
    setBuyNowItem(
      {
        id: product.id,
        name: product.name,
        price: getCurrentPrice(),
        image: displayImages[0] || product.images?.[0],
        seller: product.seller,
        sellerId: product.sellerId,
        seller_currency: product.seller_currency || 'GHS',
        selectedColor,
        selectedSize,
      },
      quantity
    );
    router.push('/checkout?mode=buynow');
  };

  const handleSellerPress = () => {
    router.push(`/seller/${product.sellerId}`);
  };

  const handleMessagePress = () => {
    if (!isAuthenticated) {
      signIn();
      return;
    }
    router.push({
      pathname: '/chat',
      params: {
        partnerId: product.sellerId,
        partnerName: product.seller,
        partnerType: 'seller',
      },
    });
  };

  if (loading) {
    return <LoadingState colors={colors} insets={insets} onBack={() => router.back()} />;
  }

  if (!product) {
    return <ErrorState colors={colors} insets={insets} onBack={() => router.back()} />;
  }

  const imagesToDisplay = displayImages.length > 0 ? displayImages : product.images;
  const currentPrice = getCurrentPrice();

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <StatusBar style={colors.statusBar} />

      {/* Demo Mode badge */}
      {isMockData && (
        <View
          style={{
            position: 'absolute',
            top: insets.top + 14,
            left: '50%',
            transform: [{ translateX: -40 }],
            zIndex: 20,
            backgroundColor: 'rgba(255,165,0,0.9)',
            paddingHorizontal: 10,
            paddingVertical: 4,
            borderRadius: 8,
          }}
        >
          <Text style={{ color: '#000', fontSize: 11, fontWeight: '700' }}>Demo Mode</Text>
        </View>
      )}

      <ProductHeader onBack={() => router.back()} insets={insets} />

      <ScrollView
        contentContainerStyle={{ paddingBottom: insets.bottom + 140 }}
        showsVerticalScrollIndicator={false}
      >
        <ProductImageGallery images={imagesToDisplay} onImageChange={setSelectedImage} />
        <ImageIndicators images={imagesToDisplay} selectedIndex={selectedImage} colors={colors} />
        <ProductInfo
          product={{ ...product, price: currentPrice }}
          colors={colors}
          formatCurrency={formatCurrency}
          onSellerPress={handleSellerPress}
          onMessagePress={handleMessagePress}
        />
        <View style={{ paddingHorizontal: 20 }}>
          <ColorSelector
            colors={colors}
            uniqueColors={getUniqueColors()}
            selectedColor={selectedColor}
            variantStock={variantStock}
            variantImages={variantImages}
            onColorSelect={(color) => handleColorSelect(color, variantStock)}
            getCurrentStock={getCurrentStock}
            isLowStock={isLowStock}
            isColorOutOfStock={isColorOutOfStock}
          />
          <SizeSelector
            colors={colors}
            availableSizes={availableSizes}
            selectedSize={selectedSize}
            onSizeSelect={setSelectedSize}
            onShowSizeGuide={() => setShowSizeGuide(true)}
          />
        </View>
        <ProductDescription description={product.description} colors={colors} />
        <View style={{ paddingHorizontal: 20 }}>
          <ProductFeatures features={product.features} colors={colors} />
        </View>
      </ScrollView>

      <SizeGuideModal visible={showSizeGuide} onClose={() => setShowSizeGuide(false)} />
      <BottomActionBar
        colors={colors}
        insets={insets}
        quantity={quantity}
        onQuantityChange={setQuantity}
        onAddToCart={handleAddToCart}
        onBuyNow={handleBuyNow}
      />
    </View>
  );
}
