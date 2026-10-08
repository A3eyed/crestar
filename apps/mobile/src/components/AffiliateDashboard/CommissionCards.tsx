// @ts-nocheck
import { View, Text } from 'react-native';
import { Zap } from 'lucide-react-native';
import CurrencyPrice from '../CurrencyPrice';

export function CommissionSummaryCard({ earnings, formatCurrency, colors }) {
  const commissionCurrency = 'GHS';

  return (
    <View
      style={{
        backgroundColor: colors.cardBackground,
        borderRadius: 16,
        padding: 16,
        borderWidth: 1,
        borderColor: colors.border,
        flexDirection: 'row',
        justifyContent: 'space-between',
      }}
    >
      <View style={{ alignItems: 'center' }}>
        <Text
          style={{
            color: colors.textSecondary,
            fontSize: 12,
            marginBottom: 4,
          }}
        >
          Total Earned
        </Text>
        <CurrencyPrice
          price={earnings.totalEarned || 0}
          originalCurrency={commissionCurrency}
          showOriginal={false}
          size="medium"
          textStyle={{
            color: '#D4AF37',
            fontSize: 20,
            fontWeight: '700',
          }}
        />
      </View>
      <View style={{ width: 1, backgroundColor: colors.border }} />
      <View style={{ alignItems: 'center' }}>
        <Text
          style={{
            color: colors.textSecondary,
            fontSize: 12,
            marginBottom: 4,
          }}
        >
          Pending
        </Text>
        <CurrencyPrice
          price={earnings.pendingCommission || 0}
          originalCurrency={commissionCurrency}
          showOriginal={false}
          size="medium"
          textStyle={{
            color: '#F59E0B',
            fontSize: 20,
            fontWeight: '700',
          }}
        />
      </View>
      <View style={{ width: 1, backgroundColor: colors.border }} />
      <View style={{ alignItems: 'center' }}>
        <Text
          style={{
            color: colors.textSecondary,
            fontSize: 12,
            marginBottom: 4,
          }}
        >
          Available
        </Text>
        <CurrencyPrice
          price={earnings.availableCommission || 0}
          originalCurrency={commissionCurrency}
          showOriginal={false}
          size="medium"
          textStyle={{
            color: '#D4AF37',
            fontSize: 20,
            fontWeight: '700',
          }}
        />
      </View>
    </View>
  );
}

export function CommissionInfoBanner({ colors }) {
  return (
    <View
      style={{
        backgroundColor: 'rgba(212, 175, 55, 0.08)',
        borderRadius: 12,
        padding: 14,
        borderWidth: 1,
        borderColor: 'rgba(212, 175, 55, 0.2)',
        flexDirection: 'row',
        gap: 12,
        alignItems: 'flex-start',
      }}
    >
      <Zap size={20} color="#D4AF37" />
      <View style={{ flex: 1 }}>
        <Text
          style={{
            color: colors.text,
            fontSize: 14,
            fontWeight: '600',
            marginBottom: 4,
          }}
        >
          How Commissions Work
        </Text>
        <Text
          style={{
            color: colors.textSecondary,
            fontSize: 13,
            lineHeight: 18,
          }}
        >
          You earn the commission the seller sets on each product —{' '}
          <Text style={{ color: '#D4AF37', fontWeight: '700' }}>5%</Text> by default — on every sale
          driven through your tagged videos. On these creator-driven sales the seller keeps 85% and
          Crestar keeps 10%. Sellers pay no Crestar fee on their own direct sales. Commissions
          release when orders are delivered.
        </Text>
      </View>
    </View>
  );
}
