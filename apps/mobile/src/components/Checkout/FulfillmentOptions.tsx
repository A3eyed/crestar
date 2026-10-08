// @ts-nocheck
import { View, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Store, Truck, Bike, Check, Star, MapPin, Globe } from 'lucide-react-native';
import CurrencyPrice from '../CurrencyPrice';

const GROUPS = [
  { type: 'pickup', title: 'Pick up yourself', icon: Store },
  { type: 'seller_delivery', title: 'Seller delivers', icon: Truck },
  { type: 'on_demand', title: 'On-demand deliverers', icon: Bike },
];

function OptionRow({ option, selected, onPress, colors }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.8}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        padding: 14,
        borderRadius: 14,
        borderWidth: selected ? 2 : 1,
        borderColor: selected ? colors.accent : colors.border,
        backgroundColor: selected ? colors.cardBackgroundAlt : colors.cardBackground,
        marginBottom: 10,
      }}
    >
      <View
        style={{
          width: 22,
          height: 22,
          borderRadius: 11,
          borderWidth: 2,
          borderColor: selected ? colors.accent : colors.border,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: selected ? colors.accent : 'transparent',
        }}
      >
        {selected ? <Check size={14} color={colors.accentText} /> : null}
      </View>

      <View style={{ flex: 1 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
          <Text style={{ color: colors.text, fontSize: 15, fontWeight: '700' }}>
            {option.label}
          </Text>
          {option.recommended ? (
            <View
              style={{
                backgroundColor: 'rgba(212, 175, 55, 0.18)',
                paddingHorizontal: 8,
                paddingVertical: 2,
                borderRadius: 6,
              }}
            >
              <Text style={{ color: '#D4AF37', fontSize: 11, fontWeight: '700' }}>
                Best for you
              </Text>
            </View>
          ) : null}
          {option.international ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
              <Globe size={11} color={colors.textTertiary} />
              <Text style={{ color: colors.textTertiary, fontSize: 11 }}>International</Text>
            </View>
          ) : null}
        </View>

        {option.place ? (
          <Text style={{ color: colors.textTertiary, fontSize: 12, marginTop: 2 }}>
            {option.place}
          </Text>
        ) : null}

        {option.type === 'pickup' && option.storeLocation ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 3 }}>
            <MapPin size={11} color={colors.textTertiary} />
            <Text style={{ color: colors.textTertiary, fontSize: 12 }} numberOfLines={1}>
              {[
                option.storeLocation.landmark,
                option.storeLocation.city,
                option.storeLocation.region,
              ]
                .filter(Boolean)
                .join(' · ')}
            </Text>
          </View>
        ) : null}

        {option.type === 'on_demand' ? (
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 8,
              marginTop: 3,
              flexWrap: 'wrap',
            }}
          >
            <Text style={{ color: colors.textTertiary, fontSize: 12 }}>{option.delivererName}</Text>
            {option.rating ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
                <Star size={10} color="#FFB800" fill="#FFB800" />
                <Text style={{ color: colors.textTertiary, fontSize: 12 }}>
                  {option.rating.toFixed(1)}
                </Text>
              </View>
            ) : null}
            {option.vehicleType ? (
              <Text style={{ color: colors.textTertiary, fontSize: 12 }}>
                {String(option.vehicleType).replace(/_/g, ' ')}
              </Text>
            ) : null}
          </View>
        ) : null}

        {option.eta ? (
          <Text style={{ color: colors.textTertiary, fontSize: 12, marginTop: 3 }}>
            {option.eta}
          </Text>
        ) : null}

        {option.instructions ? (
          <Text style={{ color: colors.textTertiary, fontSize: 12, marginTop: 3 }}>
            {option.instructions}
          </Text>
        ) : null}
      </View>

      {option.isFree ? (
        <Text style={{ color: '#D4AF37', fontSize: 15, fontWeight: '700' }}>Free</Text>
      ) : (
        <CurrencyPrice
          price={option.fee}
          originalCurrency={option.currency}
          showOriginal={false}
          size="small"
          textStyle={{ color: colors.text, fontSize: 15, fontWeight: '700' }}
        />
      )}
    </TouchableOpacity>
  );
}

export default function FulfillmentOptions({
  data,
  loading,
  selectedOptionId,
  onSelect,
  colors,
  showSellerHeading = false,
}) {
  if (loading) {
    return (
      <View style={{ paddingVertical: 24, alignItems: 'center' }}>
        <ActivityIndicator color={colors.accent} />
        <Text style={{ color: colors.textTertiary, fontSize: 13, marginTop: 8 }}>
          Finding ways to get this to you…
        </Text>
      </View>
    );
  }

  const options = data?.options || [];

  if (options.length === 0) {
    return (
      <View
        style={{
          padding: 16,
          borderRadius: 14,
          borderWidth: 1,
          borderColor: colors.border,
          backgroundColor: colors.cardBackground,
        }}
      >
        <Text style={{ color: colors.text, fontSize: 14, fontWeight: '600', marginBottom: 4 }}>
          No delivery to your area yet
        </Text>
        <Text style={{ color: colors.textTertiary, fontSize: 13, lineHeight: 18 }}>
          This seller hasn't set a fee for where you are. Try another town, or message them to ask
          if they can deliver.
        </Text>
      </View>
    );
  }

  return (
    <View style={{ marginBottom: 8 }}>
      {showSellerHeading && data?.seller?.businessName ? (
        <Text
          style={{
            color: colors.text,
            fontSize: 14,
            fontWeight: '700',
            marginBottom: 10,
          }}
        >
          {data.seller.businessName}
        </Text>
      ) : null}

      {GROUPS.map((group) => {
        const groupOptions = options.filter((o) => o.type === group.type);
        if (groupOptions.length === 0) return null;
        const GroupIcon = group.icon;

        return (
          <View key={group.type} style={{ marginBottom: 12 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 }}>
              <GroupIcon size={14} color={colors.textTertiary} />
              <Text
                style={{
                  color: colors.textTertiary,
                  fontSize: 12,
                  fontWeight: '700',
                  letterSpacing: 0.5,
                  textTransform: 'uppercase',
                }}
              >
                {group.title}
              </Text>
            </View>

            {groupOptions.map((option) => (
              <OptionRow
                key={option.id}
                option={option}
                selected={selectedOptionId === option.id}
                onPress={() => onSelect(option)}
                colors={colors}
              />
            ))}
          </View>
        );
      })}
    </View>
  );
}
