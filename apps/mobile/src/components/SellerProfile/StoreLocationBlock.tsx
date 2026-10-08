// @ts-nocheck
import { View, Text } from 'react-native';
import { BlurView } from 'expo-blur';
import { MapPin, Store, Truck, Bike, Clock } from 'lucide-react-native';

/**
 * Where this shop actually is — town, region, country and a nearby landmark,
 * plus the ways they hand orders over. Shown on the shop front so buyers know
 * who and where they're buying from before they add anything to the cart.
 */
export default function StoreLocationBlock({ location, settings, colors }) {
  if (!location?.city && !location?.country) return null;

  const placeLine = [location.city, location.region, location.country].filter(Boolean).join(', ');

  const badges = [];
  if (settings?.enable_store_pickup) {
    badges.push({ key: 'pickup', icon: Store, text: 'Pickup available' });
  }
  if (settings?.enable_own_delivery_zones) {
    badges.push({ key: 'delivery', icon: Truck, text: 'Delivers' });
  }
  if (settings?.allow_on_demand_deliverers) {
    badges.push({ key: 'ondemand', icon: Bike, text: 'On-demand riders' });
  }

  const textColor = colors?.text || '#FFFFFF';
  const mutedColor = colors?.textTertiary || 'rgba(255, 255, 255, 0.6)';

  return (
    <View style={{ paddingHorizontal: 20, marginBottom: 16 }}>
      <View style={{ overflow: 'hidden', borderRadius: 16 }}>
        <BlurView
          intensity={60}
          tint="dark"
          style={{
            padding: 16,
            borderWidth: 1,
            borderColor: 'rgba(255, 255, 255, 0.1)',
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10 }}>
            <MapPin size={16} color="#D4AF37" style={{ marginTop: 2 }} />
            <View style={{ flex: 1 }}>
              <Text style={{ color: textColor, fontSize: 15, fontWeight: '600' }}>{placeLine}</Text>

              {location.village ? (
                <Text style={{ color: mutedColor, fontSize: 13, marginTop: 2 }}>
                  {location.village}
                </Text>
              ) : null}

              {location.store_landmark ? (
                <Text style={{ color: mutedColor, fontSize: 13, marginTop: 2 }}>
                  Near {location.store_landmark}
                </Text>
              ) : null}

              {settings?.pickup_hours ? (
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 5,
                    marginTop: 6,
                  }}
                >
                  <Clock size={12} color={mutedColor} />
                  <Text style={{ color: mutedColor, fontSize: 12 }}>{settings.pickup_hours}</Text>
                </View>
              ) : null}
            </View>
          </View>

          {badges.length > 0 ? (
            <View
              style={{
                flexDirection: 'row',
                flexWrap: 'wrap',
                gap: 8,
                marginTop: 14,
              }}
            >
              {badges.map((badge) => {
                const BadgeIcon = badge.icon;
                return (
                  <View
                    key={badge.key}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 5,
                      paddingHorizontal: 10,
                      paddingVertical: 6,
                      borderRadius: 8,
                      backgroundColor: 'rgba(212, 175, 55, 0.15)',
                    }}
                  >
                    <BadgeIcon size={12} color="#D4AF37" />
                    <Text style={{ color: '#D4AF37', fontSize: 12, fontWeight: '600' }}>
                      {badge.text}
                    </Text>
                  </View>
                );
              })}
            </View>
          ) : null}
        </BlurView>
      </View>
    </View>
  );
}
