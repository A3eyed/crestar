// @ts-nocheck
import { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Modal,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { X, Check } from 'lucide-react-native';
import ScopeEditor from './ScopeEditor';
import RouteEditor from './RouteEditor';

const PRICING_MODELS = [
  {
    value: 'FLAT_TOWN',
    label: 'One price per town',
    blurb: 'Same fee for every drop in the towns you cover.',
  },
  {
    value: 'FLAT_REGION',
    label: 'One price per region',
    blurb: 'Same fee anywhere inside the regions you cover.',
  },
  {
    value: 'ROUTE',
    label: 'Town-to-town trip',
    blurb: 'A set fare for specific runs, e.g. Accra → Kumasi.',
  },
  {
    value: 'BASE_PLUS_PER_KM',
    label: 'Base + per kilometre',
    blurb: 'A starting fee plus a rate for every km travelled.',
  },
];

const EMPTY = {
  name: '',
  currency: 'GHS',
  pricingModel: 'FLAT_TOWN',
  flatFee: '',
  baseFee: '',
  perKmFee: '',
  minimumFee: '',
  etaText: '',
  originScope: {},
  destinationScope: {},
  isActive: true,
};

export default function RateCardForm({ visible, initialCard, saving, onClose, onSubmit, colors }) {
  const insets = useSafeAreaInsets();
  const [form, setForm] = useState(EMPTY);

  useEffect(() => {
    if (!visible) return;
    if (initialCard) {
      setForm({
        name: initialCard.name || '',
        currency: initialCard.currency || 'GHS',
        pricingModel: initialCard.pricing_model || 'FLAT_TOWN',
        flatFee: initialCard.flat_fee != null ? String(initialCard.flat_fee) : '',
        baseFee: initialCard.base_fee != null ? String(initialCard.base_fee) : '',
        perKmFee: initialCard.per_km_fee != null ? String(initialCard.per_km_fee) : '',
        minimumFee: initialCard.minimum_fee != null ? String(initialCard.minimum_fee) : '',
        etaText: initialCard.eta_text || '',
        originScope: initialCard.origin_scope || {},
        destinationScope: initialCard.destination_scope || {},
        isActive: initialCard.is_active !== false,
      });
    } else {
      setForm(EMPTY);
    }
  }, [visible, initialCard]);

  const patch = (next) => setForm((prev) => ({ ...prev, ...next }));

  const isRoute = form.pricingModel === 'ROUTE';
  const isPerKm = form.pricingModel === 'BASE_PLUS_PER_KM';

  const handleSubmit = () => {
    if (!form.name.trim()) {
      Alert.alert('Almost there', 'Give this rate a name so you can tell them apart.');
      return;
    }
    if (isPerKm) {
      if (!form.baseFee || !form.perKmFee) {
        Alert.alert('Almost there', 'Enter both a base fee and a per-kilometre fee.');
        return;
      }
    } else if (!form.flatFee) {
      Alert.alert('Almost there', 'Enter the fee you want to charge.');
      return;
    }
    if (isRoute && (form.originScope?.routes || []).length === 0) {
      Alert.alert('Almost there', 'Add at least one trip for this fare.');
      return;
    }

    onSubmit({
      name: form.name.trim(),
      currency: form.currency,
      pricingModel: form.pricingModel,
      flatFee: isPerKm ? null : Number(form.flatFee),
      baseFee: isPerKm ? Number(form.baseFee) : null,
      perKmFee: isPerKm ? Number(form.perKmFee) : null,
      minimumFee: form.minimumFee === '' ? null : Number(form.minimumFee),
      originScope: form.originScope || {},
      destinationScope: form.destinationScope || {},
      etaText: form.etaText.trim() || null,
      isActive: form.isActive,
    });
  };

  const inputStyle = {
    backgroundColor: colors.inputBackground,
    borderWidth: 1,
    borderColor: colors.inputBorder,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 13,
    color: colors.text,
    fontSize: 15,
  };

  const labelStyle = {
    color: colors.text,
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View
        style={{ flex: 1, backgroundColor: colors.modalBackground, justifyContent: 'flex-end' }}
      >
        <View
          style={{
            backgroundColor: colors.background,
            borderTopLeftRadius: 24,
            borderTopRightRadius: 24,
            height: '92%',
          }}
        >
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingHorizontal: 20,
              paddingVertical: 16,
              borderBottomWidth: 1,
              borderBottomColor: colors.border,
            }}
          >
            <TouchableOpacity onPress={onClose} hitSlop={8}>
              <X size={22} color={colors.text} />
            </TouchableOpacity>
            <Text style={{ color: colors.text, fontSize: 17, fontWeight: '700' }}>
              {initialCard ? 'Edit rate' : 'New rate'}
            </Text>
            <TouchableOpacity onPress={handleSubmit} disabled={saving} hitSlop={8}>
              {saving ? (
                <ActivityIndicator size="small" color={colors.accent} />
              ) : (
                <Check size={22} color={colors.accent} />
              )}
            </TouchableOpacity>
          </View>

          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={{ padding: 20, paddingBottom: insets.bottom + 40 }}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <View style={{ marginBottom: 20 }}>
              <Text style={labelStyle}>Name this rate</Text>
              <TextInput
                value={form.name}
                onChangeText={(v) => patch({ name: v })}
                placeholder="e.g. Around Accra"
                placeholderTextColor={colors.inputPlaceholder}
                style={inputStyle}
              />
            </View>

            <Text style={labelStyle}>How do you want to charge?</Text>
            <View style={{ marginBottom: 20, gap: 10 }}>
              {PRICING_MODELS.map((model) => {
                const selected = form.pricingModel === model.value;
                return (
                  <TouchableOpacity
                    key={model.value}
                    onPress={() => patch({ pricingModel: model.value })}
                    activeOpacity={0.8}
                    style={{
                      padding: 14,
                      borderRadius: 12,
                      borderWidth: selected ? 2 : 1,
                      borderColor: selected ? colors.accent : colors.border,
                      backgroundColor: selected ? colors.cardBackgroundAlt : colors.cardBackground,
                    }}
                  >
                    <Text style={{ color: colors.text, fontSize: 14, fontWeight: '700' }}>
                      {model.label}
                    </Text>
                    <Text style={{ color: colors.textTertiary, fontSize: 12, marginTop: 3 }}>
                      {model.blurb}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {isPerKm ? (
              <View style={{ gap: 16, marginBottom: 20 }}>
                <View>
                  <Text style={labelStyle}>Base fee</Text>
                  <TextInput
                    value={form.baseFee}
                    onChangeText={(v) => patch({ baseFee: v })}
                    keyboardType="decimal-pad"
                    placeholder="0.00"
                    placeholderTextColor={colors.inputPlaceholder}
                    style={inputStyle}
                  />
                </View>
                <View>
                  <Text style={labelStyle}>Per kilometre</Text>
                  <TextInput
                    value={form.perKmFee}
                    onChangeText={(v) => patch({ perKmFee: v })}
                    keyboardType="decimal-pad"
                    placeholder="0.00"
                    placeholderTextColor={colors.inputPlaceholder}
                    style={inputStyle}
                  />
                </View>
                <View>
                  <Text style={labelStyle}>Minimum charge</Text>
                  <TextInput
                    value={form.minimumFee}
                    onChangeText={(v) => patch({ minimumFee: v })}
                    keyboardType="decimal-pad"
                    placeholder="0.00"
                    placeholderTextColor={colors.inputPlaceholder}
                    style={inputStyle}
                  />
                  <Text style={{ color: colors.textTertiary, fontSize: 12, marginTop: 6 }}>
                    Used when the shop hasn't pinned its exact spot, so distance is unknown.
                  </Text>
                </View>
              </View>
            ) : (
              <View style={{ marginBottom: 20 }}>
                <Text style={labelStyle}>Your fee</Text>
                <TextInput
                  value={form.flatFee}
                  onChangeText={(v) => patch({ flatFee: v })}
                  keyboardType="decimal-pad"
                  placeholder="0.00"
                  placeholderTextColor={colors.inputPlaceholder}
                  style={inputStyle}
                />
              </View>
            )}

            <View style={{ marginBottom: 20 }}>
              <Text style={labelStyle}>Delivery time</Text>
              <TextInput
                value={form.etaText}
                onChangeText={(v) => patch({ etaText: v })}
                placeholder="e.g. Within 2 hours"
                placeholderTextColor={colors.inputPlaceholder}
                style={inputStyle}
              />
            </View>

            {isRoute ? (
              <RouteEditor
                routes={form.originScope?.routes || []}
                onChange={(routes) => patch({ originScope: { ...form.originScope, routes } })}
                colors={colors}
              />
            ) : (
              <>
                <ScopeEditor
                  title="Where you collect from"
                  blurb="Leave empty if you'll collect from anywhere."
                  scope={form.originScope}
                  onChange={(scope) => patch({ originScope: scope })}
                  colors={colors}
                />
                <ScopeEditor
                  title="Where you deliver to"
                  blurb="Leave empty if you'll deliver anywhere."
                  scope={form.destinationScope}
                  onChange={(scope) => patch({ destinationScope: scope })}
                  colors={colors}
                />
              </>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}
