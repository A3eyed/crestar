// @ts-nocheck
import { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  Switch,
  Modal,
  FlatList,
  Keyboard,
  TouchableWithoutFeedback,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import {
  ArrowLeft,
  Plus,
  Trash2,
  MapPin,
  CheckCircle2,
  Truck,
  ChevronRight,
  Search,
  X,
  Globe,
  Map,
  Building,
  Home,
} from "lucide-react-native";
import { BlurView } from "expo-blur";
import AsyncStorage from "@react-native-async-storage/async-storage";
import useAuth from "../utils/auth/useAuth";
import useLocalization from "../utils/localization";
import { useTheme } from "../utils/theme";
import {
  COUNTRIES,
  getCountryByCode,
  getRegionsByCountry,
} from "../data/countries";
import { authenticatedFetch } from "../utils/authenticatedFetch";
import LogisticsSuccessModal from "../components/LogisticsSuccessModal";

const LOGISTICS_MODAL_SHOWN_KEY = "@logistics_success_modal_shown";

export default function DeliveryZonesScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const colors = useTheme();
  const { isAuthenticated, signIn } = useAuth();
  const { formatCurrency } = useLocalization();

  const [zones, setZones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  // Location picker state - now using COUNTRIES data
  const [selectedCountry, setSelectedCountry] = useState("");
  const [selectedRegion, setSelectedRegion] = useState("");
  const [selectedCity, setSelectedCity] = useState("");

  // Picker modals
  const [showCountryPicker, setShowCountryPicker] = useState(false);
  const [showRegionPicker, setShowRegionPicker] = useState(false);
  const [showCityPicker, setShowCityPicker] = useState(false);
  const [pickerSearch, setPickerSearch] = useState("");

  // Zone details
  const [newFee, setNewFee] = useState("");
  const [isFreeDelivery, setIsFreeDelivery] = useState(false);
  const [newEstTime, setNewEstTime] = useState("");

  useEffect(() => {
    if (isAuthenticated) {
      fetchZones();
    }
  }, [isAuthenticated]);

  const fetchZones = async () => {
    try {
      const response = await authenticatedFetch("/api/sellers/delivery-zones");
      if (response.ok) {
        const data = await response.json();
        setZones(data.zones || []);
      }
    } catch (error) {
      console.error("Failed to fetch zones:", error);
    } finally {
      setLoading(false);
    }
  };

  // Get available countries from COUNTRIES data
  const countries = COUNTRIES.map((c) => c.name);

  // Get regions for selected country — falls back to empty array (manual entry)
  const regions = selectedCountry
    ? getRegionsByCountry(
        COUNTRIES.find((c) => c.name === selectedCountry)?.code,
      ) || []
    : [];

  // If the selected country has no predefined regions, seller types it manually
  const hasRegionOptions = regions.length > 0;

  const handleAddZone = () => {
    if (!selectedCountry || !selectedRegion || !selectedCity) {
      Alert.alert("Missing Info", "Please select Country, Region, and City");
      return;
    }
    if (!isFreeDelivery && !newFee.trim()) {
      Alert.alert(
        "Missing Info",
        "Please enter a delivery fee or mark as free",
      );
      return;
    }

    const countryData = COUNTRIES.find((c) => c.name === selectedCountry);
    const regionName = `${selectedRegion}, ${selectedCountry}`;

    setZones((prev) => [
      ...prev,
      {
        country: countryData?.code || selectedCountry,
        countryName: selectedCountry,
        regionName: selectedRegion,
        cityName: selectedCity,
        deliveryFee: isFreeDelivery ? 0 : parseFloat(newFee) || 0,
        isFreeDelivery,
        estimatedTime: newEstTime.trim() || null,
        currency: countryData?.currency || "GHS",
      },
    ]);
    resetForm();
  };

  const resetForm = () => {
    setSelectedCountry("");
    setSelectedRegion("");
    setSelectedCity("");
    setNewFee("");
    setIsFreeDelivery(false);
    setNewEstTime("");
    setShowAddForm(false);
  };

  const handleRemoveZone = (index) => {
    setZones((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    if (zones.length === 0) {
      Alert.alert("No Zones", "Add at least one delivery zone");
      return;
    }
    setSaving(true);
    try {
      const response = await authenticatedFetch("/api/sellers/delivery-zones", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          zones: zones.map((z) => ({
            country: z.country,
            regionName: z.regionName || z.region_name,
            cityName: z.cityName || z.city_name,
            deliveryFee: z.deliveryFee ?? z.delivery_fee ?? 0,
            isFreeDelivery: z.isFreeDelivery ?? z.is_free_delivery ?? false,
            estimatedTime: z.estimatedTime || z.estimated_time || null,
            currency: z.currency || "GHS",
          })),
        }),
      });
      if (!response.ok) throw new Error("Failed to save");

      // Check if this is the first time setting up logistics
      const modalShown = await AsyncStorage.getItem(LOGISTICS_MODAL_SHOWN_KEY);
      const hasInternationalZones = zones.length > 0;

      if (!modalShown && hasInternationalZones) {
        // Mark as shown
        await AsyncStorage.setItem(LOGISTICS_MODAL_SHOWN_KEY, "true");
        // Show success modal
        setShowSuccessModal(true);
      } else {
        // Just show simple alert
        Alert.alert("Saved!", "Your logistics configuration has been updated", [
          { text: "OK", onPress: () => router.back() },
        ]);
      }
    } catch (error) {
      console.error("Save zones error:", error);
      Alert.alert("Error", "Failed to save delivery zones");
    } finally {
      setSaving(false);
    }
  };

  // Get unique countries from zones for success modal
  const configuredCountries = [
    ...new Set(zones.map((z) => z.countryName || z.country)),
  ];

  const renderPickerModal = (
    visible,
    setVisible,
    items,
    onSelect,
    title,
    selectedValue,
  ) => {
    const filtered = items.filter((item) =>
      item.toLowerCase().includes(pickerSearch.toLowerCase()),
    );

    return (
      <Modal visible={visible} animationType="slide" transparent>
        <View
          style={{
            flex: 1,
            backgroundColor: colors.modalBackground,
            justifyContent: "flex-end",
          }}
        >
          <View
            style={{
              backgroundColor: colors.background,
              borderTopLeftRadius: 24,
              borderTopRightRadius: 24,
              maxHeight: "75%",
              paddingBottom: insets.bottom,
            }}
          >
            {/* Header */}
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                paddingHorizontal: 20,
                paddingTop: 20,
                paddingBottom: 12,
              }}
            >
              <Text
                style={{ color: colors.text, fontSize: 18, fontWeight: "700" }}
              >
                {title}
              </Text>
              <TouchableOpacity
                onPress={() => {
                  setVisible(false);
                  setPickerSearch("");
                }}
              >
                <X size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            {/* Search */}
            <View style={{ paddingHorizontal: 20, marginBottom: 12 }}>
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  backgroundColor: colors.inputBackground,
                  borderRadius: 12,
                  paddingHorizontal: 12,
                  gap: 8,
                }}
              >
                <Search size={18} color={colors.textTertiary} />
                <TextInput
                  value={pickerSearch}
                  onChangeText={setPickerSearch}
                  placeholder={`Search ${title.toLowerCase()}...`}
                  placeholderTextColor={colors.textTertiary}
                  style={{
                    flex: 1,
                    color: colors.text,
                    fontSize: 15,
                    paddingVertical: 14,
                  }}
                />
              </View>
            </View>

            {/* List */}
            <FlatList
              data={filtered}
              keyExtractor={(item) => item}
              renderItem={({ item }) => (
                <TouchableOpacity
                  onPress={() => {
                    onSelect(item);
                    setVisible(false);
                    setPickerSearch("");
                  }}
                  style={{
                    paddingHorizontal: 20,
                    paddingVertical: 14,
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "space-between",
                    borderBottomWidth: 1,
                    borderBottomColor: colors.borderLight,
                    backgroundColor:
                      selectedValue === item
                        ? "rgba(212, 175, 55, 0.1)"
                        : "transparent",
                  }}
                >
                  <Text
                    style={{
                      color: selectedValue === item ? "#D4AF37" : colors.text,
                      fontSize: 15,
                      fontWeight: selectedValue === item ? "600" : "400",
                    }}
                  >
                    {item}
                  </Text>
                  {selectedValue === item && (
                    <CheckCircle2 size={18} color="#D4AF37" />
                  )}
                </TouchableOpacity>
              )}
              ListEmptyComponent={
                <View style={{ padding: 40, alignItems: "center" }}>
                  <Text style={{ color: colors.textSecondary }}>
                    No results
                  </Text>
                </View>
              }
            />
          </View>
        </View>
      </Modal>
    );
  };

  const renderLocationStep = (icon, label, value, onPress, disabled) => {
    const Icon = icon;
    return (
      <TouchableOpacity
        onPress={onPress}
        disabled={disabled}
        style={{
          flexDirection: "row",
          alignItems: "center",
          backgroundColor: colors.inputBackground,
          borderWidth: 1,
          borderColor: value ? "#D4AF37" : colors.inputBorder,
          borderRadius: 12,
          padding: 14,
          marginBottom: 10,
          opacity: disabled ? 0.4 : 1,
          gap: 12,
        }}
      >
        <View
          style={{
            width: 36,
            height: 36,
            borderRadius: 18,
            backgroundColor: value
              ? "rgba(212, 175, 55, 0.15)"
              : colors.cardBackgroundAlt,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Icon size={18} color={value ? "#D4AF37" : colors.textTertiary} />
        </View>
        <View style={{ flex: 1 }}>
          <Text
            style={{
              color: colors.textTertiary,
              fontSize: 11,
              fontWeight: "600",
              textTransform: "uppercase",
              letterSpacing: 0.5,
            }}
          >
            {label}
          </Text>
          <Text
            style={{
              color: value ? colors.text : colors.textTertiary,
              fontSize: 15,
              fontWeight: value ? "600" : "400",
              marginTop: 2,
            }}
          >
            {value || `Select ${label.toLowerCase()}...`}
          </Text>
        </View>
        {value ? (
          <CheckCircle2 size={18} color="#D4AF37" />
        ) : (
          <ChevronRight size={18} color={colors.textTertiary} />
        )}
      </TouchableOpacity>
    );
  };

  if (!isAuthenticated) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: colors.background,
          alignItems: "center",
          justifyContent: "center",
          paddingHorizontal: 32,
        }}
      >
        <StatusBar style={colors.statusBar} />
        <TouchableOpacity
          onPress={() => router.back()}
          style={{
            position: "absolute",
            top: insets.top + 12,
            left: 16,
            width: 40,
            height: 40,
            borderRadius: 20,
            backgroundColor: colors.inputBackground,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <ArrowLeft size={22} color={colors.text} />
        </TouchableOpacity>
        <Globe size={56} color={colors.textTertiary} />
        <Text
          style={{
            color: colors.text,
            fontSize: 20,
            fontWeight: "700",
            marginTop: 20,
            marginBottom: 8,
            textAlign: "center",
          }}
        >
          Sign in to manage zones
        </Text>
        <Text
          style={{
            color: colors.textSecondary,
            fontSize: 15,
            textAlign: "center",
            marginBottom: 28,
            lineHeight: 22,
          }}
        >
          You need to be signed in to configure delivery zones.
        </Text>
        <TouchableOpacity
          onPress={() => signIn()}
          style={{
            backgroundColor: "#111827",
            borderRadius: 12,
            paddingVertical: 14,
            paddingHorizontal: 40,
          }}
        >
          <Text style={{ color: "#FFFFFF", fontSize: 16, fontWeight: "700" }}>
            Sign In
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (loading) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: colors.background,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <StatusBar style={colors.statusBar} />
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        <StatusBar style={colors.statusBar} />

        {/* Header */}
        <View
          style={{
            paddingTop: insets.top + 12,
            paddingHorizontal: 16,
            paddingBottom: 12,
            borderBottomWidth: 1,
            borderBottomColor: colors.border,
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "center", gap: 16 }}>
            <TouchableOpacity onPress={() => router.back()}>
              <ArrowLeft size={24} color={colors.text} />
            </TouchableOpacity>
            <Text
              style={{ color: colors.text, fontSize: 20, fontWeight: "700" }}
            >
              Logistics & Global Fulfillment
            </Text>
          </View>
          <TouchableOpacity
            onPress={() => setShowAddForm(true)}
            style={{
              backgroundColor: colors.accent,
              paddingHorizontal: 14,
              paddingVertical: 8,
              borderRadius: 20,
              flexDirection: "row",
              alignItems: "center",
              gap: 6,
            }}
          >
            <Plus size={16} color="#FFFFFF" />
            <Text style={{ color: "#FFFFFF", fontSize: 14, fontWeight: "600" }}>
              Add
            </Text>
          </TouchableOpacity>
        </View>

        <ScrollView
          contentContainerStyle={{
            padding: 16,
            paddingBottom: insets.bottom + 100,
          }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Info Banner */}
          <View
            style={{
              backgroundColor: "rgba(212, 175, 55, 0.1)",
              borderWidth: 1,
              borderColor: "rgba(212, 175, 55, 0.2)",
              borderRadius: 12,
              padding: 16,
              marginBottom: 20,
            }}
          >
            <View
              style={{
                flexDirection: "row",
                alignItems: "flex-start",
                gap: 12,
              }}
            >
              <Globe size={24} color="#D4AF37" style={{ marginTop: 2 }} />
              <View style={{ flex: 1 }}>
                <Text
                  style={{
                    color: colors.text,
                    fontSize: 15,
                    fontWeight: "700",
                    marginBottom: 6,
                  }}
                >
                  Global Logistics & Fulfillment
                </Text>
                <Text
                  style={{
                    color: colors.textSecondary,
                    fontSize: 13,
                    lineHeight: 19,
                    marginBottom: 8,
                  }}
                >
                  Expand your market reach. Define localized delivery rates for
                  cross-border and regional fulfillment.
                </Text>
                <Text
                  style={{
                    color: colors.textTertiary,
                    fontSize: 12,
                    lineHeight: 18,
                  }}
                >
                  Configure customized shipping fees for any territory you
                  serve. Ensure accurate checkout pricing for your customers by
                  setting precise rates for countries, regions, and specific
                  municipalities.
                </Text>
              </View>
            </View>
          </View>

          {/* Add Form */}
          {showAddForm && (
            <View
              style={{
                backgroundColor: colors.cardBackground,
                borderRadius: 16,
                padding: 16,
                marginBottom: 20,
                borderWidth: 1,
                borderColor: colors.border,
              }}
            >
              <Text
                style={{
                  color: colors.text,
                  fontSize: 16,
                  fontWeight: "700",
                  marginBottom: 4,
                }}
              >
                Configure Logistics Zone
              </Text>
              <Text
                style={{
                  color: colors.textSecondary,
                  fontSize: 13,
                  marginBottom: 16,
                }}
              >
                Define delivery terms for a specific territory
              </Text>

              {/* Country picker */}
              {renderLocationStep(
                Globe,
                "Country",
                selectedCountry,
                () => setShowCountryPicker(true),
                false,
              )}

              {/* Region — picker if options exist, text input otherwise */}
              {selectedCountry &&
                hasRegionOptions &&
                renderLocationStep(
                  Map,
                  "Region / State",
                  selectedRegion,
                  () => setShowRegionPicker(true),
                  false,
                )}

              {selectedCountry && !hasRegionOptions && (
                <View style={{ marginBottom: 10 }}>
                  <Text
                    style={{
                      color: colors.textTertiary,
                      fontSize: 11,
                      fontWeight: "600",
                      textTransform: "uppercase",
                      letterSpacing: 0.5,
                      marginBottom: 8,
                    }}
                  >
                    REGION / STATE / PROVINCE
                  </Text>
                  <TextInput
                    value={selectedRegion}
                    onChangeText={setSelectedRegion}
                    placeholder="e.g. Bavaria, Ontario, Île-de-France"
                    placeholderTextColor={colors.inputPlaceholder}
                    style={{
                      backgroundColor: colors.inputBackground,
                      borderWidth: 1,
                      borderColor: selectedRegion
                        ? "#D4AF37"
                        : colors.inputBorder,
                      borderRadius: 12,
                      padding: 14,
                      color: colors.text,
                      fontSize: 15,
                    }}
                  />
                </View>
              )}

              {/* City input field */}
              {(selectedRegion || (!hasRegionOptions && selectedCountry)) && (
                <View style={{ marginBottom: 10 }}>
                  <Text
                    style={{
                      color: colors.textTertiary,
                      fontSize: 11,
                      fontWeight: "600",
                      textTransform: "uppercase",
                      letterSpacing: 0.5,
                      marginBottom: 8,
                    }}
                  >
                    CITY / MUNICIPALITY
                  </Text>
                  <TextInput
                    value={selectedCity}
                    onChangeText={setSelectedCity}
                    placeholder="e.g. Accra, Lagos, Nairobi"
                    placeholderTextColor={colors.inputPlaceholder}
                    style={{
                      backgroundColor: colors.inputBackground,
                      borderWidth: 1,
                      borderColor: selectedCity
                        ? "#D4AF37"
                        : colors.inputBorder,
                      borderRadius: 12,
                      padding: 14,
                      color: colors.text,
                      fontSize: 15,
                    }}
                  />
                </View>
              )}

              {/* Divider */}
              <View
                style={{
                  height: 1,
                  backgroundColor: colors.border,
                  marginVertical: 16,
                }}
              />

              {/* Free delivery toggle */}
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginBottom: 16,
                }}
              >
                <View>
                  <Text
                    style={{
                      color: colors.text,
                      fontSize: 15,
                      fontWeight: "600",
                    }}
                  >
                    Complimentary Delivery
                  </Text>
                  <Text
                    style={{
                      color: colors.textTertiary,
                      fontSize: 12,
                      marginTop: 2,
                    }}
                  >
                    No delivery fee for this zone
                  </Text>
                </View>
                <Switch
                  value={isFreeDelivery}
                  onValueChange={setIsFreeDelivery}
                  trackColor={{
                    false: colors.inputBackground,
                    true: "#D4AF37",
                  }}
                  thumbColor="#FFFFFF"
                />
              </View>

              {!isFreeDelivery && (
                <>
                  <Text
                    style={{
                      color: colors.textSecondary,
                      fontSize: 13,
                      marginBottom: 8,
                    }}
                  >
                    Delivery Fee (
                    {COUNTRIES.find((c) => c.name === selectedCountry)
                      ?.currency || "GHS"}
                    )
                  </Text>
                  <TextInput
                    value={newFee}
                    onChangeText={setNewFee}
                    placeholder="0.00"
                    placeholderTextColor={colors.inputPlaceholder}
                    keyboardType="numeric"
                    style={{
                      backgroundColor: colors.inputBackground,
                      borderWidth: 1,
                      borderColor: newFee ? "#D4AF37" : colors.inputBorder,
                      borderRadius: 12,
                      padding: 12,
                      color: colors.text,
                      fontSize: 15,
                      marginBottom: 16,
                    }}
                  />
                </>
              )}

              <Text
                style={{
                  color: colors.textSecondary,
                  fontSize: 13,
                  marginBottom: 8,
                }}
              >
                Estimated Fulfillment Time (Optional)
              </Text>
              <TextInput
                value={newEstTime}
                onChangeText={setNewEstTime}
                placeholder="e.g. 2-5 business days"
                placeholderTextColor={colors.inputPlaceholder}
                style={{
                  backgroundColor: colors.inputBackground,
                  borderWidth: 1,
                  borderColor: newEstTime ? "#D4AF37" : colors.inputBorder,
                  borderRadius: 12,
                  padding: 12,
                  color: colors.text,
                  fontSize: 15,
                  marginBottom: 20,
                }}
              />

              {/* Buttons */}
              <View style={{ flexDirection: "row", gap: 12 }}>
                <TouchableOpacity
                  onPress={resetForm}
                  style={{
                    flex: 1,
                    paddingVertical: 14,
                    borderRadius: 12,
                    backgroundColor: colors.inputBackground,
                    alignItems: "center",
                  }}
                >
                  <Text
                    style={{
                      color: colors.text,
                      fontSize: 15,
                      fontWeight: "600",
                    }}
                  >
                    Cancel
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={handleAddZone}
                  style={{
                    flex: 1,
                    paddingVertical: 14,
                    borderRadius: 12,
                    backgroundColor: "#D4AF37",
                    alignItems: "center",
                  }}
                >
                  <Text
                    style={{
                      color: "#FFFFFF",
                      fontSize: 15,
                      fontWeight: "700",
                    }}
                  >
                    Add Zone
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Zones List */}
          {zones.length === 0 ? (
            <View style={{ alignItems: "center", paddingVertical: 60 }}>
              <Globe size={48} color={colors.textTertiary} />
              <Text
                style={{
                  color: colors.textSecondary,
                  fontSize: 16,
                  marginTop: 16,
                  fontWeight: "600",
                }}
              >
                No logistics zones configured
              </Text>
              <Text
                style={{
                  color: colors.textTertiary,
                  fontSize: 14,
                  marginTop: 8,
                  textAlign: "center",
                  paddingHorizontal: 40,
                }}
              >
                Configure delivery zones to expand your fulfillment network
              </Text>
            </View>
          ) : (
            zones.map((zone, index) => {
              const cityName = zone.cityName || zone.city_name;
              const regionName = zone.regionName || zone.region_name;
              const countryName = zone.countryName || zone.country;
              const fee = zone.deliveryFee ?? zone.delivery_fee ?? 0;
              const isFree =
                zone.isFreeDelivery ?? zone.is_free_delivery ?? false;
              const estTime = zone.estimatedTime || zone.estimated_time;
              const currency = zone.currency || "GHS";

              return (
                <View
                  key={index}
                  style={{
                    overflow: "hidden",
                    borderRadius: 12,
                    marginBottom: 12,
                  }}
                >
                  <BlurView
                    intensity={40}
                    tint={colors.glass.tint}
                    style={{
                      padding: 16,
                      borderWidth: 1,
                      borderColor: colors.border,
                      flexDirection: "row",
                      alignItems: "center",
                    }}
                  >
                    <View
                      style={{
                        width: 40,
                        height: 40,
                        borderRadius: 20,
                        backgroundColor: isFree
                          ? "rgba(212, 175, 55, 0.15)"
                          : "rgba(212, 175, 55, 0.15)",
                        alignItems: "center",
                        justifyContent: "center",
                        marginRight: 12,
                      }}
                    >
                      {isFree ? (
                        <CheckCircle2 size={20} color="#D4AF37" />
                      ) : (
                        <Globe size={20} color="#D4AF37" />
                      )}
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text
                        style={{
                          color: colors.text,
                          fontSize: 15,
                          fontWeight: "600",
                        }}
                      >
                        {cityName}
                      </Text>
                      <Text
                        style={{
                          color: colors.textTertiary,
                          fontSize: 12,
                          marginTop: 2,
                        }}
                      >
                        {regionName}
                      </Text>
                      <View
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                          gap: 8,
                          marginTop: 4,
                        }}
                      >
                        <Text
                          style={{
                            color: isFree ? "#D4AF37" : colors.accent,
                            fontSize: 14,
                            fontWeight: "700",
                          }}
                        >
                          {isFree
                            ? "Free Delivery"
                            : `${currency} ${fee.toFixed(2)}`}
                        </Text>
                        {estTime && (
                          <Text
                            style={{ color: colors.textTertiary, fontSize: 12 }}
                          >
                            • {estTime}
                          </Text>
                        )}
                      </View>
                    </View>
                    <TouchableOpacity
                      onPress={() => handleRemoveZone(index)}
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: 18,
                        backgroundColor: "rgba(239, 68, 68, 0.15)",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <Trash2 size={16} color={colors.error} />
                    </TouchableOpacity>
                  </BlurView>
                </View>
              );
            })
          )}
        </ScrollView>

        {/* Save Button */}
        {zones.length > 0 && (
          <View
            style={{
              position: "absolute",
              bottom: 0,
              left: 0,
              right: 0,
              backgroundColor: colors.background,
              borderTopWidth: 1,
              borderTopColor: colors.border,
              paddingTop: 16,
              paddingBottom: insets.bottom + 16,
              paddingHorizontal: 20,
            }}
          >
            <TouchableOpacity
              onPress={handleSave}
              disabled={saving}
              style={{
                backgroundColor: colors.accent,
                borderRadius: 16,
                paddingVertical: 16,
                alignItems: "center",
                flexDirection: "row",
                justifyContent: "center",
                gap: 8,
                opacity: saving ? 0.6 : 1,
              }}
            >
              {saving ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <>
                  <CheckCircle2 size={20} color="#FFFFFF" />
                  <Text
                    style={{
                      color: "#FFFFFF",
                      fontSize: 18,
                      fontWeight: "700",
                    }}
                  >
                    Save Logistics Configuration ({zones.length})
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        )}

        {/* Picker Modals */}
        {renderPickerModal(
          showCountryPicker,
          setShowCountryPicker,
          countries,
          (val) => {
            setSelectedCountry(val);
            setSelectedRegion("");
            setSelectedCity("");
          },
          "Select Country",
          selectedCountry,
        )}

        {renderPickerModal(
          showRegionPicker,
          setShowRegionPicker,
          regions,
          (val) => {
            setSelectedRegion(val);
            setSelectedCity("");
          },
          "Select Region / State",
          selectedRegion,
        )}

        {/* Success Modal */}
        <LogisticsSuccessModal
          visible={showSuccessModal}
          countries={configuredCountries}
          onClose={() => {
            setShowSuccessModal(false);
            router.back();
          }}
          onListProduct={() => {
            setShowSuccessModal(false);
            router.push("/create-listing");
          }}
        />
      </View>
    </TouchableWithoutFeedback>
  );
}
