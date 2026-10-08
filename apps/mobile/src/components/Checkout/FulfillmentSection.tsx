// @ts-nocheck
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator } from 'react-native';
import { MapPin, RefreshCw } from 'lucide-react-native';
import SearchableSelectModal from '../SearchableSelectModal';
import FulfillmentOptions from './FulfillmentOptions';
import { COUNTRIES, getRegionsByCountry } from '../../data/countries';

/**
 * The "how do you want this?" block on checkout.
 *
 * The buyer tells us where they are, then picks one option per seller —
 * store pickup, the seller's own delivery, or an on-demand rider.
 */
export default function FulfillmentSection({
  sellerIds = [],
  optionsBySeller = {},
  selectionBySeller = {},
  buyerLocation,
  onBuyerLocationChange,
  loading,
  error,
  onSelect,
  onRetry,
  colors,
}) {
  const countryOptions = COUNTRIES.map((c) => ({ value: c.name, label: c.name }));

  const selectedCountry = COUNTRIES.find((c) => c.name === buyerLocation?.country);
  const regions = selectedCountry ? getRegionsByCountry(selectedCountry.code) || [] : [];

  return (
    <View style={{ marginBottom: 24 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14 }}>
        <MapPin size={18} color={colors.accent} />
        <Text style={{ color: colors.text, fontSize: 17, fontWeight: '700' }}>
          Delivery options
        </Text>
      </View>

      {/* Where the buyer is — this decides which fees apply */}
      <View
        style={{
          padding: 16,
          borderRadius: 16,
          borderWidth: 1,
          borderColor: colors.border,
          backgroundColor: colors.cardBackground,
          marginBottom: 16,
        }}
      >
        <Text style={{ color: colors.textTertiary, fontSize: 13, marginBottom: 12 }}>
          Tell us where you are so we can show the right fees.
        </Text>

        <SearchableSelectModal
          label="Country"
          required
          placeholder="Select country"
          searchPlaceholder="Search countries..."
          options={countryOptions}
          selectedValue={buyerLocation?.country || ''}
          onSelect={(value) => onBuyerLocationChange({ country: value, region: '', city: '' })}
          accentColor={colors.accent}
          colors={colors}
        />

        {regions.length > 0 ? (
          <SearchableSelectModal
            label="Region / State"
            placeholder="Select region"
            searchPlaceholder="Search regions..."
            options={regions}
            selectedValue={buyerLocation?.region || ''}
            onSelect={(value) =>
              onBuyerLocationChange({ ...buyerLocation, region: value, city: '' })
            }
            accentColor={colors.accent}
            colors={colors}
          />
        ) : (
          <View style={{ marginBottom: 24 }}>
            <Text style={{ color: colors.text, fontSize: 15, fontWeight: '600', marginBottom: 8 }}>
              Region / State
            </Text>
            <TextInput
              value={buyerLocation?.region || ''}
              onChangeText={(value) => onBuyerLocationChange({ ...buyerLocation, region: value })}
              placeholder="Enter your region"
              placeholderTextColor={colors.inputPlaceholder}
              style={{
                backgroundColor: colors.inputBackground,
                borderWidth: 1.5,
                borderColor: colors.inputBorder,
                borderRadius: 12,
                paddingHorizontal: 16,
                paddingVertical: 15,
                color: colors.text,
                fontSize: 15,
              }}
            />
          </View>
        )}

        <View>
          <Text style={{ color: colors.text, fontSize: 15, fontWeight: '600', marginBottom: 8 }}>
            Town / City <Text style={{ color: colors.accent }}>*</Text>
          </Text>
          <TextInput
            value={buyerLocation?.city || ''}
            onChangeText={(value) => onBuyerLocationChange({ ...buyerLocation, city: value })}
            placeholder="e.g. Tema"
            placeholderTextColor={colors.inputPlaceholder}
            style={{
              backgroundColor: colors.inputBackground,
              borderWidth: 1.5,
              borderColor: colors.inputBorder,
              borderRadius: 12,
              paddingHorizontal: 16,
              paddingVertical: 15,
              color: colors.text,
              fontSize: 15,
            }}
          />
        </View>
      </View>

      {error ? (
        <TouchableOpacity
          onPress={onRetry}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            padding: 14,
            borderRadius: 12,
            backgroundColor: 'rgba(239, 68, 68, 0.12)',
            marginBottom: 12,
          }}
        >
          <RefreshCw size={15} color="#EF4444" />
          <Text style={{ color: '#EF4444', fontSize: 14, fontWeight: '600' }}>{error}</Text>
        </TouchableOpacity>
      ) : null}

      {sellerIds.length === 0 && loading ? <ActivityIndicator color={colors.accent} /> : null}

      {sellerIds.map((sellerId) => (
        <FulfillmentOptions
          key={sellerId}
          data={optionsBySeller[sellerId]}
          loading={loading && !optionsBySeller[sellerId]}
          selectedOptionId={selectionBySeller[sellerId]?.id}
          onSelect={(option) => onSelect(sellerId, option)}
          colors={colors}
          showSellerHeading={sellerIds.length > 1}
        />
      ))}
    </View>
  );
}
