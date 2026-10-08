// @ts-nocheck
import { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  Modal,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { X, Search, Plus, Tag } from 'lucide-react-native';
import { Image } from 'expo-image';
import { BlurView } from 'expo-blur';
import useLocalization from '@/utils/localization';
import useUser from '@/utils/auth/useUser';

export function ProductTagModal({ visible, onClose, onSelectProduct, alreadyTagged }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const insets = useSafeAreaInsets();
  const { formatCurrency } = useLocalization();
  const { data: user } = useUser();

  // Fetch user's products when modal opens
  useEffect(() => {
    if (visible && user) {
      fetchProducts();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, user]);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      // Fetch: 1) creator's own products, 2) promotable affiliate products
      // from ALL sellers (TikTok Shop style), 3) own services
      const [ownRes, promotableRes, servicesRes] = await Promise.all([
        fetch(`/api/listings/products?sellerId=${user?.id}`).then((r) =>
          r.ok ? r.json() : { products: [] }
        ),
        fetch('/api/listings/products?promotable=true').then((r) =>
          r.ok ? r.json() : { products: [] }
        ),
        fetch('/api/listings/services').then((r) => (r.ok ? r.json() : { services: [] })),
      ]);

      const mapProduct = (p, isAffiliate) => ({
        id: p.id,
        name: p.title,
        price: p.price,
        image:
          Array.isArray(p.media) && p.media.length > 0
            ? p.media[0]
            : 'https://picsum.photos/100/100',
        seller:
          p.seller_id === user?.id
            ? `@${user?.username || 'you'}`
            : `@${p.seller_username || p.seller_business_name || 'seller'}`,
        itemType: 'product', // Track item type for correct DB column
        isAffiliate,
        commissionRate: parseFloat(p.affiliate_commission_rate) || 5,
      });

      const ownProducts = (ownRes.products || []).map((p) => mapProduct(p, false));
      const ownIds = new Set(ownProducts.map((p) => p.id));

      // Affiliate products from other sellers (exclude own)
      const affiliateProducts = (promotableRes.products || [])
        .filter((p) => !ownIds.has(p.id) && p.seller_id !== user?.id)
        .map((p) => mapProduct(p, true));

      const allProducts = [
        ...ownProducts,
        ...affiliateProducts,
        ...(servicesRes.services || []).map((s) => ({
          id: s.id,
          name: s.title,
          price: s.basic_price || 0,
          image:
            Array.isArray(s.media) && s.media.length > 0
              ? s.media[0]
              : 'https://picsum.photos/100/100',
          seller: `@${user?.username || 'you'}`,
          itemType: 'service', // Track item type for correct DB column
          isAffiliate: false,
        })),
      ];

      setProducts(allProducts);
    } catch (error) {
      console.error('Failed to fetch products:', error);
      setProducts([]);
    } finally {
      setLoading(false);
    }
  };

  const filteredProducts = products.filter((p) => {
    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase());
    const notAlreadyTagged = !alreadyTagged.find((tagged) => tagged.id === p.id);
    return matchesSearch && notAlreadyTagged;
  });

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={{ flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.95)' }}>
        <View
          style={{
            paddingTop: insets.top + 16,
            paddingHorizontal: 16,
            paddingBottom: 16,
            borderBottomWidth: 1,
            borderBottomColor: 'rgba(255, 255, 255, 0.1)',
          }}
        >
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 16,
            }}
          >
            <View>
              <Text style={{ color: '#FFFFFF', fontSize: 20, fontWeight: '700' }}>Tag Product</Text>
              <Text
                style={{
                  color: 'rgba(255, 255, 255, 0.6)',
                  fontSize: 13,
                  marginTop: 4,
                }}
              >
                Tag your products or earn commission promoting others
              </Text>
            </View>
            <TouchableOpacity
              onPress={onClose}
              style={{
                width: 36,
                height: 36,
                borderRadius: 18,
                backgroundColor: 'rgba(255, 255, 255, 0.1)',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <X size={20} color="#FFFFFF" />
            </TouchableOpacity>
          </View>

          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              backgroundColor: 'rgba(255, 255, 255, 0.1)',
              borderWidth: 1,
              borderColor: 'rgba(255, 255, 255, 0.15)',
              borderRadius: 12,
              paddingHorizontal: 12,
              paddingVertical: 10,
            }}
          >
            <Search size={18} color="rgba(255, 255, 255, 0.6)" />
            <TextInput
              placeholder="Search products..."
              placeholderTextColor="rgba(255, 255, 255, 0.4)"
              value={searchQuery}
              onChangeText={setSearchQuery}
              style={{
                flex: 1,
                marginLeft: 8,
                color: '#FFFFFF',
                fontSize: 15,
              }}
            />
          </View>
        </View>

        {loading ? (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
            <ActivityIndicator size="large" color="#FFFFFF" />
            <Text style={{ color: 'rgba(255, 255, 255, 0.6)', marginTop: 12 }}>
              Loading your products...
            </Text>
          </View>
        ) : (
          <ScrollView
            contentContainerStyle={{
              padding: 16,
              paddingBottom: insets.bottom + 20,
            }}
            showsVerticalScrollIndicator={false}
          >
            {filteredProducts.map((product) => (
              <TouchableOpacity
                key={product.id}
                onPress={() => {
                  onSelectProduct(product);
                  onClose();
                }}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  padding: 12,
                  marginBottom: 12,
                  overflow: 'hidden',
                  borderRadius: 12,
                }}
              >
                <BlurView
                  intensity={60}
                  tint="dark"
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    borderWidth: 1,
                    borderColor: 'rgba(255, 255, 255, 0.1)',
                  }}
                />

                <Image
                  source={{ uri: product.image }}
                  style={{
                    width: 60,
                    height: 60,
                    borderRadius: 8,
                    marginRight: 12,
                  }}
                  contentFit="cover"
                />

                <View style={{ flex: 1 }}>
                  <Text
                    style={{
                      color: '#FFFFFF',
                      fontSize: 15,
                      fontWeight: '600',
                      marginBottom: 4,
                    }}
                    numberOfLines={2}
                  >
                    {product.name}
                  </Text>
                  <Text
                    style={{
                      color: 'rgba(255, 255, 255, 0.6)',
                      fontSize: 13,
                      marginBottom: 4,
                    }}
                  >
                    {product.seller}
                  </Text>
                  <View
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 8,
                    }}
                  >
                    <Text
                      style={{
                        color: '#FFFFFF',
                        fontSize: 16,
                        fontWeight: '700',
                      }}
                    >
                      {formatCurrency(product.price)}
                    </Text>
                    {product.isAffiliate && (
                      <View
                        style={{
                          backgroundColor: 'rgba(212, 175, 55, 0.2)',
                          borderWidth: 1,
                          borderColor: 'rgba(212, 175, 55, 0.5)',
                          borderRadius: 6,
                          paddingHorizontal: 6,
                          paddingVertical: 2,
                        }}
                      >
                        <Text
                          style={{
                            color: '#D4AF37',
                            fontSize: 11,
                            fontWeight: '700',
                          }}
                        >
                          Earn {product.commissionRate}%
                        </Text>
                      </View>
                    )}
                  </View>
                </View>

                <View
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 16,
                    backgroundColor: 'rgba(255, 255, 255, 0.2)',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Plus size={18} color="#FFFFFF" />
                </View>
              </TouchableOpacity>
            ))}

            {filteredProducts.length === 0 && !loading && (
              <View style={{ alignItems: 'center', paddingVertical: 40 }}>
                <Tag size={48} color="rgba(255, 255, 255, 0.3)" />
                <Text
                  style={{
                    color: 'rgba(255, 255, 255, 0.6)',
                    fontSize: 16,
                    marginTop: 16,
                    textAlign: 'center',
                    paddingHorizontal: 32,
                  }}
                >
                  {products.length === 0
                    ? 'No products yet. Create listings to tag them in videos!'
                    : 'No products found'}
                </Text>
              </View>
            )}
          </ScrollView>
        )}
      </View>
    </Modal>
  );
}
