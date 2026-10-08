// @ts-nocheck
import { View, Text, TextInput } from 'react-native';
import { calculateYouReceive, calculatePlatformFee } from '@/utils/pricingHelpers';
import { PLATFORM_FEE_PERCENT, EARNER_PERCENT } from '@/utils/platformFee';
import useStore from '@/utils/store';

export function PricingSection({ price, setPrice, colors }) {
  // Get seller's default currency from their business center or account settings
  const { userProfile } = useStore();
  const defaultCurrency = userProfile?.default_currency || 'GHS';
  const currencySymbol =
    defaultCurrency === 'USD'
      ? '$'
      : defaultCurrency === 'EUR'
        ? '€'
        : defaultCurrency === 'NGN'
          ? '₦'
          : '₵';

  return (
    <>
      <Text
        style={{
          color: colors.text,
          fontSize: 17,
          fontWeight: '700',
          marginBottom: 12,
        }}
      >
        Price ({defaultCurrency})
      </Text>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          backgroundColor: colors.inputBackground,
          borderWidth: 1,
          borderColor: colors.inputBorder,
          borderRadius: 12,
          paddingHorizontal: 16,
          marginBottom: 16,
        }}
      >
        <Text
          style={{
            color: colors.textTertiary,
            fontSize: 18,
            fontWeight: '600',
            marginRight: 4,
          }}
        >
          {currencySymbol}
        </Text>
        <TextInput
          placeholder="0.00"
          placeholderTextColor={colors.inputPlaceholder}
          value={price}
          onChangeText={setPrice}
          keyboardType="decimal-pad"
          style={{ flex: 1, padding: 16, color: colors.text, fontSize: 15 }}
        />
      </View>

      {price && (
        <View
          style={{
            backgroundColor: colors.cardBackground,
            borderRadius: 12,
            padding: 16,
            marginBottom: 24,
            borderWidth: 1,
            borderColor: colors.border,
          }}
        >
          <Text
            style={{
              color: colors.textSecondary,
              fontSize: 13,
              marginBottom: 8,
            }}
          >
            💰 Earnings Breakdown
          </Text>
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              marginBottom: 6,
            }}
          >
            <Text style={{ color: colors.text, fontSize: 14 }}>Buyer pays</Text>
            <Text style={{ color: colors.text, fontSize: 14, fontWeight: '600' }}>
              {currencySymbol}
              {parseFloat(price).toFixed(2)}
            </Text>
          </View>
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              marginBottom: 8,
            }}
          >
            <Text style={{ color: colors.textSecondary, fontSize: 14 }}>
              Crestar fee ({PLATFORM_FEE_PERCENT}%)
            </Text>
            <Text style={{ color: colors.textSecondary, fontSize: 14 }}>
              −{currencySymbol}
              {calculatePlatformFee(price)}
            </Text>
          </View>
          <View
            style={{
              height: 1,
              backgroundColor: colors.border,
              marginBottom: 8,
            }}
          />
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <Text style={{ color: colors.text, fontSize: 16, fontWeight: '700' }}>You receive</Text>
            <Text style={{ color: '#D4AF37', fontSize: 16, fontWeight: '700' }}>
              {currencySymbol}
              {calculateYouReceive(price)}
            </Text>
          </View>
          <Text
            style={{
              color: colors.textTertiary,
              fontSize: 12,
              lineHeight: 17,
              marginTop: 10,
            }}
          >
            Crestar charges one flat {PLATFORM_FEE_PERCENT}% fee on every sale — nothing else. You
            keep {EARNER_PERCENT}%. If you switch on creator promotion for this listing, sales that
            come from a creator&apos;s tagged video also pay the creator the commission you set (5%
            by default); the same flat {PLATFORM_FEE_PERCENT}% applies to both your share and
            theirs. See Terms of Service → Selling on Crestar for details.
          </Text>
        </View>
      )}
    </>
  );
}
