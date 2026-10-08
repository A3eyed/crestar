// @ts-nocheck
import {
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Switch,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ArrowLeft, Store, Truck, Bike, ChevronRight, MapPin } from 'lucide-react-native';
import { useTheme } from '../utils/theme';
import useFulfillmentSettings from '../hooks/useFulfillmentSettings';
import KeyboardAvoidingAnimatedView from '../components/KeyboardAvoidingAnimatedView';

function MethodCard({ icon: Icon, title, blurb, value, onToggle, colors, children }) {
  return (
    <View
      style={{
        padding: 16,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: value ? colors.accent : colors.border,
        backgroundColor: colors.cardBackground,
        marginBottom: 16,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12 }}>
        <View
          style={{
            width: 40,
            height: 40,
            borderRadius: 20,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'rgba(212, 175, 55, 0.15)',
          }}
        >
          <Icon size={19} color="#D4AF37" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ color: colors.text, fontSize: 16, fontWeight: '700' }}>{title}</Text>
          <Text style={{ color: colors.textTertiary, fontSize: 13, marginTop: 3, lineHeight: 18 }}>
            {blurb}
          </Text>
        </View>
        <Switch
          value={value}
          onValueChange={onToggle}
          trackColor={{ false: colors.border, true: '#D4AF37' }}
          thumbColor="#FFFFFF"
        />
      </View>

      {value && children ? <View style={{ marginTop: 16 }}>{children}</View> : null}
    </View>
  );
}

function LinkRow({ label, onPress, colors, icon: Icon }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        paddingVertical: 14,
        paddingHorizontal: 14,
        borderRadius: 12,
        backgroundColor: colors.cardBackgroundAlt,
      }}
    >
      {Icon ? <Icon size={16} color={colors.textTertiary} /> : null}
      <Text style={{ color: colors.text, fontSize: 14, fontWeight: '600', flex: 1 }}>{label}</Text>
      <ChevronRight size={16} color={colors.textTertiary} />
    </TouchableOpacity>
  );
}

export default function FulfillmentSettingsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const colors = useTheme();

  const { settings, loading, saving, update, save } = useFulfillmentSettings();

  const handleSave = async () => {
    const result = await save();
    if (result.ok) {
      Alert.alert('Saved', 'Buyers will now see these options at checkout.', [
        { text: 'Done', onPress: () => router.back() },
      ]);
      return;
    }

    if (result.code === 'STORE_LOCATION_REQUIRED') {
      Alert.alert('Add your store location first', result.error, [
        { text: 'Not now', style: 'cancel' },
        { text: 'Add it', onPress: () => router.push('/store-location') },
      ]);
      return;
    }

    Alert.alert('Something went wrong', result.error);
  };

  const inputStyle = {
    backgroundColor: colors.inputBackground,
    borderWidth: 1,
    borderColor: colors.inputBorder,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 13,
    color: colors.text,
    fontSize: 14,
  };

  if (loading) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: colors.background,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <StatusBar style={colors.statusBar} />
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }

  return (
    <KeyboardAvoidingAnimatedView style={{ flex: 1 }} behavior="padding">
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
            Delivery & pickup
          </Text>
          <TouchableOpacity onPress={handleSave} disabled={saving} style={{ padding: 4 }}>
            {saving ? (
              <ActivityIndicator size="small" color={colors.accent} />
            ) : (
              <Text style={{ color: colors.accent, fontSize: 16, fontWeight: '700' }}>Save</Text>
            )}
          </TouchableOpacity>
        </View>

        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ padding: 20, paddingBottom: insets.bottom + 40 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Text
            style={{ color: colors.textTertiary, fontSize: 14, lineHeight: 20, marginBottom: 20 }}
          >
            Pick every way you're happy to get orders to buyers. Buyers choose one of these at
            checkout and the fee is added to their total.
          </Text>

          <MethodCard
            icon={Store}
            title="Store pickup"
            blurb="Buyers collect from your shop. Always free for them."
            value={Boolean(settings.enable_store_pickup)}
            onToggle={(v) => update({ enable_store_pickup: v })}
            colors={colors}
          >
            <View style={{ gap: 12 }}>
              <View>
                <Text
                  style={{ color: colors.text, fontSize: 13, fontWeight: '600', marginBottom: 6 }}
                >
                  Opening hours
                </Text>
                <TextInput
                  value={settings.pickup_hours || ''}
                  onChangeText={(v) => update({ pickup_hours: v })}
                  placeholder="e.g. Mon–Sat, 9am – 6pm"
                  placeholderTextColor={colors.inputPlaceholder}
                  style={inputStyle}
                />
              </View>

              <View>
                <Text
                  style={{ color: colors.text, fontSize: 13, fontWeight: '600', marginBottom: 6 }}
                >
                  Pickup instructions
                </Text>
                <TextInput
                  value={settings.pickup_instructions || ''}
                  onChangeText={(v) => update({ pickup_instructions: v })}
                  placeholder="e.g. Ask for Ama at the front counter"
                  placeholderTextColor={colors.inputPlaceholder}
                  multiline
                  style={{ ...inputStyle, minHeight: 70, textAlignVertical: 'top' }}
                />
              </View>

              <LinkRow
                label="Set my store location"
                icon={MapPin}
                onPress={() => router.push('/store-location')}
                colors={colors}
              />
            </View>
          </MethodCard>

          <MethodCard
            icon={Truck}
            title="I deliver myself"
            blurb="Pick the towns you deliver to and set your own fee for each — at home and abroad."
            value={Boolean(settings.enable_own_delivery_zones)}
            onToggle={(v) => update({ enable_own_delivery_zones: v })}
            colors={colors}
          >
            <LinkRow
              label="Manage my towns & fees"
              icon={MapPin}
              onPress={() => router.push('/delivery-zones')}
              colors={colors}
            />
          </MethodCard>

          <MethodCard
            icon={Bike}
            title="On-demand deliverers"
            blurb="Let Delivery Center riders you've partnered with quote their own price to your buyers."
            value={Boolean(settings.allow_on_demand_deliverers)}
            onToggle={(v) => update({ allow_on_demand_deliverers: v })}
            colors={colors}
          >
            <LinkRow
              label="Manage rider partners"
              icon={Bike}
              onPress={() => router.push('/deliverer-requests')}
              colors={colors}
            />
          </MethodCard>

          <View
            style={{
              padding: 14,
              borderRadius: 12,
              backgroundColor: 'rgba(212, 175, 55, 0.1)',
              marginTop: 4,
            }}
          >
            <Text style={{ color: colors.textTertiary, fontSize: 12, lineHeight: 18 }}>
              Shipping abroad? Add the country as one of your towns and set the fee yourself —
              Crestar doesn't use outside couriers, so the price is entirely yours.
            </Text>
          </View>
        </ScrollView>
      </View>
    </KeyboardAvoidingAnimatedView>
  );
}
