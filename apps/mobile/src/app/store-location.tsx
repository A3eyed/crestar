// @ts-nocheck
import { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ArrowLeft, MapPin, Crosshair, Store } from 'lucide-react-native';
import * as Location from 'expo-location';
import { useTheme } from '../utils/theme';
import { authenticatedFetch } from '../utils/authenticatedFetch';
import KeyboardAvoidingAnimatedView from '../components/KeyboardAvoidingAnimatedView';
import SearchableSelectModal from '../components/SearchableSelectModal';
import { COUNTRIES, getRegionsByCountry } from '../data/countries';

export default function StoreLocationScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const colors = useTheme();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [pinning, setPinning] = useState(false);

  const [country, setCountry] = useState('');
  const [region, setRegion] = useState('');
  const [city, setCity] = useState('');
  const [village, setVillage] = useState('');
  const [landmark, setLandmark] = useState('');
  const [latitude, setLatitude] = useState(null);
  const [longitude, setLongitude] = useState(null);

  useEffect(() => {
    loadLocation();
  }, []);

  const loadLocation = async () => {
    try {
      const response = await authenticatedFetch('/api/sellers/store-location');
      if (!response.ok) {
        throw new Error(
          `When loading your store location the response was [${response.status}] ${response.statusText}`
        );
      }
      const data = await response.json();
      const loc = data.location;
      if (loc) {
        setCountry(loc.country || '');
        setRegion(loc.region || '');
        setCity(loc.city || '');
        setVillage(loc.village || '');
        setLandmark(loc.store_landmark || '');
        setLatitude(loc.store_latitude ?? null);
        setLongitude(loc.store_longitude ?? null);
      }
    } catch (error) {
      console.error('Failed to load store location:', error);
      Alert.alert('Something went wrong', 'Could not load your store location.');
    } finally {
      setLoading(false);
    }
  };

  const pinCurrentSpot = async () => {
    setPinning(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Location off',
          'Allow location access so we can pin your shop. Riders use this to work out distance.'
        );
        return;
      }
      const position = await Location.getCurrentPositionAsync({});
      setLatitude(position.coords.latitude);
      setLongitude(position.coords.longitude);
      Alert.alert('Pinned', 'Your shop spot has been saved to this form. Tap Save to keep it.');
    } catch (error) {
      console.error('Failed to pin location:', error);
      Alert.alert('Something went wrong', 'Could not read your location. Try again.');
    } finally {
      setPinning(false);
    }
  };

  const handleSave = async () => {
    if (!country) {
      Alert.alert('Almost there', 'Choose the country your shop is in.');
      return;
    }
    if (!city.trim()) {
      Alert.alert('Almost there', 'Enter the town or city your shop is in.');
      return;
    }

    setSaving(true);
    try {
      const response = await authenticatedFetch('/api/sellers/store-location', {
        method: 'POST',
        body: JSON.stringify({
          country,
          region,
          city: city.trim(),
          village: village.trim(),
          storeLandmark: landmark.trim(),
          latitude,
          longitude,
        }),
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data?.error || 'Could not save your store location');
      }

      Alert.alert('Saved', 'Buyers can now see where your shop is.', [
        { text: 'Done', onPress: () => router.back() },
      ]);
    } catch (error) {
      console.error('Failed to save store location:', error);
      Alert.alert('Something went wrong', error.message || 'Could not save your store location.');
    } finally {
      setSaving(false);
    }
  };

  const selectedCountry = COUNTRIES.find((c) => c.name === country);
  const regions = selectedCountry ? getRegionsByCountry(selectedCountry.code) || [] : [];
  const previewLine = [city, region, country].filter(Boolean).join(', ');

  const inputStyle = {
    backgroundColor: colors.inputBackground,
    borderWidth: 1.5,
    borderColor: colors.inputBorder,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 15,
    color: colors.text,
    fontSize: 15,
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

        {/* Header */}
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
            Store location
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
            style={{ color: colors.textTertiary, fontSize: 14, lineHeight: 20, marginBottom: 24 }}
          >
            This shows on your shop so buyers know exactly where they're buying from — and it's
            where pickups happen.
          </Text>

          <SearchableSelectModal
            label="Country"
            required
            placeholder="Select country"
            searchPlaceholder="Search countries..."
            options={COUNTRIES.map((c) => ({ value: c.name, label: c.name }))}
            selectedValue={country}
            onSelect={(value) => {
              setCountry(value);
              setRegion('');
            }}
            accentColor={colors.accent}
            colors={colors}
          />

          {regions.length > 0 ? (
            <SearchableSelectModal
              label="Region / State"
              placeholder="Select region"
              searchPlaceholder="Search regions..."
              options={regions}
              selectedValue={region}
              onSelect={setRegion}
              accentColor={colors.accent}
              colors={colors}
            />
          ) : (
            <View style={{ marginBottom: 24 }}>
              <Text
                style={{ color: colors.text, fontSize: 15, fontWeight: '600', marginBottom: 8 }}
              >
                Region / State
              </Text>
              <TextInput
                value={region}
                onChangeText={setRegion}
                placeholder="Enter your region"
                placeholderTextColor={colors.inputPlaceholder}
                style={inputStyle}
              />
            </View>
          )}

          <View style={{ marginBottom: 24 }}>
            <Text style={{ color: colors.text, fontSize: 15, fontWeight: '600', marginBottom: 8 }}>
              Town / City <Text style={{ color: colors.accent }}>*</Text>
            </Text>
            <TextInput
              value={city}
              onChangeText={setCity}
              placeholder="e.g. Kumasi"
              placeholderTextColor={colors.inputPlaceholder}
              style={inputStyle}
            />
          </View>

          <View style={{ marginBottom: 24 }}>
            <Text style={{ color: colors.text, fontSize: 15, fontWeight: '600', marginBottom: 8 }}>
              Area / Suburb
            </Text>
            <TextInput
              value={village}
              onChangeText={setVillage}
              placeholder="e.g. Adum"
              placeholderTextColor={colors.inputPlaceholder}
              style={inputStyle}
            />
          </View>

          <View style={{ marginBottom: 24 }}>
            <Text style={{ color: colors.text, fontSize: 15, fontWeight: '600', marginBottom: 8 }}>
              Nearby landmark
            </Text>
            <TextInput
              value={landmark}
              onChangeText={setLandmark}
              placeholder="e.g. Opposite Melcom, next to the taxi rank"
              placeholderTextColor={colors.inputPlaceholder}
              style={inputStyle}
            />
            <Text style={{ color: colors.textTertiary, fontSize: 12, marginTop: 6 }}>
              A landmark helps buyers and riders find you far quicker than an address.
            </Text>
          </View>

          {/* Exact pin — powers per-kilometre rider pricing */}
          <TouchableOpacity
            onPress={pinCurrentSpot}
            disabled={pinning}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 10,
              padding: 16,
              borderRadius: 14,
              borderWidth: 1,
              borderColor: colors.border,
              backgroundColor: colors.cardBackground,
              marginBottom: 24,
            }}
          >
            {pinning ? (
              <ActivityIndicator size="small" color={colors.accent} />
            ) : (
              <Crosshair size={18} color={colors.accent} />
            )}
            <View style={{ flex: 1 }}>
              <Text style={{ color: colors.text, fontSize: 15, fontWeight: '600' }}>
                {latitude && longitude ? 'Shop spot pinned' : 'Pin my exact shop spot'}
              </Text>
              <Text style={{ color: colors.textTertiary, fontSize: 12, marginTop: 2 }}>
                {latitude && longitude
                  ? 'Riders can price by distance. Tap to re-pin.'
                  : 'Optional — lets riders charge by distance.'}
              </Text>
            </View>
          </TouchableOpacity>

          {/* How buyers will see it */}
          {previewLine ? (
            <View
              style={{
                padding: 16,
                borderRadius: 14,
                borderWidth: 1,
                borderColor: colors.border,
                backgroundColor: colors.cardBackgroundAlt,
              }}
            >
              <View
                style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 }}
              >
                <Store size={14} color={colors.textTertiary} />
                <Text
                  style={{
                    color: colors.textTertiary,
                    fontSize: 12,
                    fontWeight: '700',
                    textTransform: 'uppercase',
                    letterSpacing: 0.5,
                  }}
                >
                  How buyers see it
                </Text>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 8 }}>
                <MapPin size={15} color="#D4AF37" style={{ marginTop: 2 }} />
                <View style={{ flex: 1 }}>
                  <Text style={{ color: colors.text, fontSize: 15, fontWeight: '600' }}>
                    {previewLine}
                  </Text>
                  {village ? (
                    <Text style={{ color: colors.textTertiary, fontSize: 13, marginTop: 2 }}>
                      {village}
                    </Text>
                  ) : null}
                  {landmark ? (
                    <Text style={{ color: colors.textTertiary, fontSize: 13, marginTop: 2 }}>
                      Near {landmark}
                    </Text>
                  ) : null}
                </View>
              </View>
            </View>
          ) : null}
        </ScrollView>
      </View>
    </KeyboardAvoidingAnimatedView>
  );
}
