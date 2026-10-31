// @ts-nocheck
/**
 * Apple Guideline 3.1.2 — subscription renewal terms must appear
 * clearly next to the subscribe button (price, length, auto-renew, cancel).
 *
 * Place this component immediately above/below any Subscribe CTA.
 */
import { Text, View, Linking } from 'react-native';

export default function SubscriptionRenewalDisclosure({
  title = 'Subscription',
  priceLabel,
  periodLabel = 'month',
  style,
}) {
  const price = priceLabel || 'the price shown';
  return (
    <View style={[{ paddingHorizontal: 4, paddingVertical: 10 }, style]}>
      <Text
        style={{
          color: 'rgba(255,255,255,0.55)',
          fontSize: 11,
          lineHeight: 16,
          textAlign: 'center',
        }}
      >
        {title} is {price} per {periodLabel}. Payment is charged to your Apple ID
        or Google account at confirmation. The subscription renews automatically
        unless you turn off auto-renew at least 24 hours before the end of the
        current period. Manage or cancel in your device subscription settings.
        {' '}
        <Text
          style={{ color: 'rgba(212,175,55,0.9)' }}
          onPress={() => Linking.openURL('https://crestarhq.com/terms')}
        >
          Terms
        </Text>
        {' · '}
        <Text
          style={{ color: 'rgba(212,175,55,0.9)' }}
          onPress={() => Linking.openURL('https://crestarhq.com/privacy')}
        >
          Privacy
        </Text>
      </Text>
    </View>
  );
}
