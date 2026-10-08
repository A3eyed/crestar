// @ts-nocheck
import { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Switch,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ArrowLeft, Plus, Trash2, Pencil, Bike } from 'lucide-react-native';
import { useTheme } from '../../utils/theme';
import useDelivererRates from '../../hooks/useDelivererRates';
import RateCardForm from '../../components/DelivererRates/RateCardForm';
import CurrencyPrice from '../../components/CurrencyPrice';

const MODEL_LABELS = {
  FLAT_TOWN: 'Per town',
  FLAT_REGION: 'Per region',
  ROUTE: 'Town to town',
  BASE_PLUS_PER_KM: 'Base + per km',
};

function describeScope(card) {
  if (card.pricing_model === 'ROUTE') {
    const routes = card.origin_scope?.routes || [];
    if (routes.length === 0) return 'No trips added yet';
    return routes.map((r) => `${r.fromTown} → ${r.toTown}`).join(' · ');
  }

  const parts = [];
  const dest = card.destination_scope || {};
  if (dest.towns?.length) parts.push(dest.towns.join(', '));
  if (dest.regions?.length) parts.push(dest.regions.join(', '));
  if (dest.countries?.length) parts.push(dest.countries.join(', '));
  return parts.length ? `Delivers to ${parts.join(' · ')}` : 'Delivers anywhere';
}

export default function DelivererRatesScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const colors = useTheme();

  const { rateCards, loading, saving, error, createRate, updateRate, deleteRate, refetch } =
    useDelivererRates();

  const [formVisible, setFormVisible] = useState(false);
  const [editing, setEditing] = useState(null);

  const openNew = () => {
    setEditing(null);
    setFormVisible(true);
  };

  const openEdit = (card) => {
    setEditing(card);
    setFormVisible(true);
  };

  const handleSubmit = async (payload) => {
    const result = editing ? await updateRate(editing.id, payload) : await createRate(payload);

    if (!result.ok) {
      Alert.alert('Something went wrong', result.error);
      return;
    }
    setFormVisible(false);
    setEditing(null);
  };

  const handleDelete = (card) => {
    Alert.alert('Delete this rate?', `"${card.name}" will no longer be offered to buyers.`, [
      { text: 'Keep it', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          const result = await deleteRate(card.id);
          if (!result.ok) Alert.alert('Something went wrong', result.error);
        },
      },
    ]);
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background, paddingTop: insets.top }}>
      <StatusBar style={colors.statusBar} />

      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingHorizontal: 20,
          paddingVertical: 12,
          borderBottomWidth: 1,
          borderBottomColor: colors.border,
        }}
      >
        <TouchableOpacity onPress={() => router.back()} style={{ padding: 4 }}>
          <ArrowLeft size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={{ color: colors.text, fontSize: 17, fontWeight: '700' }}>
          My delivery rates
        </Text>
        <TouchableOpacity onPress={openNew} style={{ padding: 4 }}>
          <Plus size={24} color={colors.accent} />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 20, paddingBottom: insets.bottom + 40 }}
        showsVerticalScrollIndicator={false}
      >
        <Text
          style={{ color: colors.textTertiary, fontSize: 14, lineHeight: 20, marginBottom: 20 }}
        >
          You set your own prices. Buyers see these at checkout on orders from sellers you've
          partnered with, and pick the one that suits them.
        </Text>

        {loading ? <ActivityIndicator color={colors.accent} style={{ marginTop: 40 }} /> : null}

        {error ? (
          <TouchableOpacity
            onPress={refetch}
            style={{
              padding: 14,
              borderRadius: 12,
              backgroundColor: 'rgba(239, 68, 68, 0.12)',
              marginBottom: 16,
            }}
          >
            <Text
              style={{ color: '#EF4444', fontSize: 14, fontWeight: '600', textAlign: 'center' }}
            >
              {error} — tap to retry
            </Text>
          </TouchableOpacity>
        ) : null}

        {!loading && rateCards.length === 0 ? (
          <View style={{ alignItems: 'center', paddingVertical: 50 }}>
            <Bike size={44} color={colors.textTertiary} />
            <Text
              style={{
                color: colors.text,
                fontSize: 17,
                fontWeight: '700',
                marginTop: 16,
                textAlign: 'center',
              }}
            >
              No rates yet
            </Text>
            <Text
              style={{
                color: colors.textTertiary,
                fontSize: 14,
                marginTop: 6,
                textAlign: 'center',
                lineHeight: 20,
              }}
            >
              Add your first price so sellers can offer you to their buyers.
            </Text>
            <TouchableOpacity
              onPress={openNew}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 8,
                marginTop: 24,
                paddingHorizontal: 22,
                paddingVertical: 14,
                borderRadius: 14,
                backgroundColor: colors.accent,
              }}
            >
              <Plus size={18} color={colors.accentText} />
              <Text style={{ color: colors.accentText, fontSize: 15, fontWeight: '700' }}>
                Add a rate
              </Text>
            </TouchableOpacity>
          </View>
        ) : null}

        {rateCards.map((card) => (
          <View
            key={card.id}
            style={{
              padding: 16,
              borderRadius: 16,
              borderWidth: 1,
              borderColor: card.is_active ? colors.border : colors.borderLight,
              backgroundColor: colors.cardBackground,
              marginBottom: 14,
              opacity: card.is_active ? 1 : 0.6,
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12 }}>
              <View style={{ flex: 1 }}>
                <Text style={{ color: colors.text, fontSize: 16, fontWeight: '700' }}>
                  {card.name}
                </Text>
                <Text style={{ color: colors.textTertiary, fontSize: 12, marginTop: 3 }}>
                  {MODEL_LABELS[card.pricing_model] || card.pricing_model}
                  {card.eta_text ? ` · ${card.eta_text}` : ''}
                </Text>
                <Text style={{ color: colors.textTertiary, fontSize: 12, marginTop: 6 }}>
                  {describeScope(card)}
                </Text>
              </View>

              <View style={{ alignItems: 'flex-end' }}>
                {card.pricing_model === 'BASE_PLUS_PER_KM' ? (
                  <View style={{ alignItems: 'flex-end' }}>
                    <CurrencyPrice
                      price={Number(card.base_fee) || 0}
                      originalCurrency={card.currency}
                      showOriginal={false}
                      size="small"
                      textStyle={{ color: colors.text, fontSize: 16, fontWeight: '700' }}
                    />
                    <Text style={{ color: colors.textTertiary, fontSize: 11, marginTop: 2 }}>
                      + {card.per_km_fee}/km
                    </Text>
                  </View>
                ) : (
                  <CurrencyPrice
                    price={Number(card.flat_fee) || 0}
                    originalCurrency={card.currency}
                    showOriginal={false}
                    size="small"
                    textStyle={{ color: colors.text, fontSize: 16, fontWeight: '700' }}
                  />
                )}
              </View>
            </View>

            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 16,
                marginTop: 14,
                paddingTop: 14,
                borderTopWidth: 1,
                borderTopColor: colors.borderLight,
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
                <Switch
                  value={card.is_active !== false}
                  onValueChange={(value) => updateRate(card.id, { isActive: value })}
                  trackColor={{ false: colors.border, true: '#D4AF37' }}
                  thumbColor="#FFFFFF"
                />
                <Text style={{ color: colors.textTertiary, fontSize: 13 }}>
                  {card.is_active !== false ? 'Offered to buyers' : 'Paused'}
                </Text>
              </View>

              <TouchableOpacity onPress={() => openEdit(card)} hitSlop={8}>
                <Pencil size={17} color={colors.textTertiary} />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => handleDelete(card)} hitSlop={8}>
                <Trash2 size={17} color="#EF4444" />
              </TouchableOpacity>
            </View>
          </View>
        ))}
      </ScrollView>

      <RateCardForm
        visible={formVisible}
        initialCard={editing}
        saving={saving}
        onClose={() => {
          setFormVisible(false);
          setEditing(null);
        }}
        onSubmit={handleSubmit}
        colors={colors}
      />
    </View>
  );
}
