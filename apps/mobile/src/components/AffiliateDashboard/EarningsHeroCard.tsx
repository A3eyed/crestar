// @ts-nocheck
import { View, Text, TouchableOpacity } from 'react-native';
import { Zap, CheckCircle2, Clock } from 'lucide-react-native';
import CurrencyPrice from '../CurrencyPrice';
import { PLATFORM_FEE_PERCENT } from '@/utils/platformFee';

export function EarningsHeroCard({ earnings, formatCurrency, colors, onCashOut }) {
  const commissionCurrency = 'GHS'; // Platform pays commissions in GHS

  return (
    <View
      style={{
        borderRadius: 20,
        padding: 24,
        backgroundColor: '#D4AF37',
        overflow: 'hidden',
      }}
    >
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 8,
          marginBottom: 6,
        }}
      >
        <Zap size={16} color="rgba(255,255,255,0.8)" />
        <Text
          style={{
            color: 'rgba(255,255,255,0.8)',
            fontSize: 12,
            fontWeight: '600',
            letterSpacing: 1,
          }}
        >
          TOTAL LIFETIME EARNED
        </Text>
      </View>
      <CurrencyPrice
        price={earnings.totalEarned || 0}
        originalCurrency={commissionCurrency}
        size="xlarge"
        textStyle={{
          color: '#FFFFFF',
          fontSize: 40,
          fontWeight: '800',
          letterSpacing: -1,
          marginBottom: 4,
        }}
        convertedStyle={{
          color: 'rgba(255,255,255,0.7)',
          fontSize: 15,
          fontWeight: '500',
          marginTop: 4,
        }}
      />
      <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 13 }}>
        5% affiliate commission on every sale
      </Text>
      <Text
        style={{
          color: 'rgba(255,255,255,0.7)',
          fontSize: 12,
          marginTop: 4,
        }}
      >
        Net of Crestar&apos;s flat {PLATFORM_FEE_PERCENT}% fee — this is yours to keep.
      </Text>

      {/* Sub-cards */}
      <View style={{ flexDirection: 'row', gap: 10, marginTop: 20 }}>
        <View
          style={{
            flex: 1,
            backgroundColor: 'rgba(255,255,255,0.15)',
            borderRadius: 12,
            padding: 14,
          }}
        >
          <CheckCircle2 size={18} color="#FFFFFF" style={{ marginBottom: 6 }} />
          <Text
            style={{
              color: 'rgba(255,255,255,0.7)',
              fontSize: 11,
              marginBottom: 4,
            }}
          >
            AVAILABLE
          </Text>
          <CurrencyPrice
            price={earnings.availableCommission || 0}
            originalCurrency={commissionCurrency}
            showOriginal={false}
            size="medium"
            textStyle={{
              color: '#FFFFFF',
              fontSize: 20,
              fontWeight: '700',
            }}
          />
          <TouchableOpacity
            onPress={onCashOut}
            style={{
              marginTop: 10,
              backgroundColor: '#FFFFFF',
              borderRadius: 8,
              paddingVertical: 6,
              alignItems: 'center',
            }}
          >
            <Text
              style={{
                color: '#D4AF37',
                fontSize: 12,
                fontWeight: '700',
              }}
            >
              Cash Out
            </Text>
          </TouchableOpacity>
        </View>

        <View
          style={{
            flex: 1,
            backgroundColor: 'rgba(255,255,255,0.15)',
            borderRadius: 12,
            padding: 14,
          }}
        >
          <Clock size={18} color="#FFFFFF" style={{ marginBottom: 6 }} />
          <Text
            style={{
              color: 'rgba(255,255,255,0.7)',
              fontSize: 11,
              marginBottom: 4,
            }}
          >
            PENDING
          </Text>
          <CurrencyPrice
            price={earnings.pendingCommission || 0}
            originalCurrency={commissionCurrency}
            showOriginal={false}
            size="medium"
            textStyle={{
              color: '#FFFFFF',
              fontSize: 20,
              fontWeight: '700',
            }}
          />
          <Text
            style={{
              color: 'rgba(255,255,255,0.6)',
              fontSize: 11,
              marginTop: 10,
            }}
          >
            Releases on delivery
          </Text>
        </View>
      </View>
    </View>
  );
}
