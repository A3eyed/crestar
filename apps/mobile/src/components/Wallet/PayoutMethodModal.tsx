// @ts-nocheck
import { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Modal,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Linking,
} from "react-native";
import {
  X,
  CreditCard,
  AlertCircle,
  Search,
  ChevronRight,
  Check,
} from "lucide-react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { COUNTRIES } from "../../data/countries";
import { getPayoutMethodsByCountry } from "../../data/payoutMethods";
import { authenticatedFetch } from "../../utils/authenticatedFetch";

const SUPPORT_WHATSAPP =
  "https://wa.me/233543799308?text=Hi%20Crestar%2C%20I%20need%20to%20change%20my%20payout%20method.";

export function PayoutMethodModal({ visible, onClose, colors, onSuccess }) {
  const insets = useSafeAreaInsets();
  const [userCountry, setUserCountry] = useState("GH");
  const [selectedMethod, setSelectedMethod] = useState("");
  const [methodData, setMethodData] = useState({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [locked, setLocked] = useState(false);
  const [errors, setErrors] = useState({});
  const [bankPickerVisible, setBankPickerVisible] = useState(false);
  const [bankPickerField, setBankPickerField] = useState(null);
  const [bankSearch, setBankSearch] = useState("");

  useEffect(() => {
    if (visible) fetchUserProfile();
  }, [visible]);

  const fetchUserProfile = async () => {
    try {
      setLoading(true);
      let resolvedCountry = "GH";
      try {
        const response = await authenticatedFetch(
          "/api/business-centers",
          {},
          { retry: false, timeout: 8000 }
        );
        if (response.ok) {
          const data = await response.json();
          if (data.center?.country) resolvedCountry = data.center.country;
        }
      } catch (e) {}
      setUserCountry(resolvedCountry);
      try {
        const existingRes = await authenticatedFetch(
          "/api/wallet/payout-method",
          {},
          { retry: false, timeout: 8000 }
        );
        if (existingRes.ok) {
          const existingData = await existingRes.json();
          const existing =
            existingData.payoutMethod || existingData.payout_method;
          if (existing?.method_code) {
            setSelectedMethod(existing.method_code);
            setMethodData(
              existing.details && typeof existing.details === "object"
                ? existing.details
                : {}
            );
            setLocked(true);
          } else {
            setLocked(false);
          }
        }
      } catch (e) {}
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (key, value) => {
    setMethodData((prev) => ({ ...prev, [key]: value }));
    if (errors[key]) setErrors((prev) => ({ ...prev, [key]: null }));
  };

  const payoutMethods = userCountry
    ? getPayoutMethodsByCountry(userCountry)
    : [];
  const selectedPayoutMethod = payoutMethods.find(
    (m) => m.code === selectedMethod
  );
  const country = COUNTRIES.find((c) => c.code === userCountry);

  const validateForm = () => {
    if (!selectedPayoutMethod) return false;
    const newErrors = {};
    selectedPayoutMethod.fields.forEach((field) => {
      const value = methodData[field.key];
      if (value == null || value === "")
        newErrors[field.key] = `${field.label} is required`;
    });
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (locked) {
      Linking.openURL(SUPPORT_WHATSAPP).catch(() => {});
      return;
    }
    if (!validateForm()) {
      Alert.alert("Missing information", "Fill in every required field.");
      return;
    }
    setSaving(true);
    try {
      const response = await authenticatedFetch("/api/wallet/payout-method", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          method_type: selectedPayoutMethod.type || selectedMethod,
          method_code: selectedMethod,
          method_name: selectedPayoutMethod.name || selectedMethod,
          details: { ...methodData, country: userCountry },
        }),
      });
      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || "Failed to save payout method");
      }
      Alert.alert("Payout method saved", "Cash out will use this method.", [
        { text: "OK", onPress: () => onSuccess && onSuccess() },
      ]);
    } catch (error) {
      Alert.alert("Error", error.message || "Failed to save payout method.");
    } finally {
      setSaving(false);
    }
  };

  const handleClose = () => {
    setErrors({});
    setBankPickerVisible(false);
    onClose();
  };

  const pickerOptions = bankPickerField?.options || [];
  const filteredBanks = pickerOptions.filter((bank) =>
    String(bank)
      .toLowerCase()
      .includes(String(bankSearch || "").toLowerCase())
  );

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleClose}
    >
      <View
        style={{
          flex: 1,
          backgroundColor: "rgba(0,0,0,0.55)",
          justifyContent: "flex-end",
        }}
      >
        <TouchableOpacity
          style={{ flex: 1 }}
          onPress={handleClose}
          activeOpacity={1}
        />
        <View
          style={{
            backgroundColor: colors.background,
            borderTopLeftRadius: 24,
            borderTopRightRadius: 24,
            paddingTop: 20,
            paddingHorizontal: 20,
            paddingBottom: insets.bottom + 20,
            maxHeight: "90%",
          }}
        >
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 24,
            }}
          >
            <View
              style={{ flexDirection: "row", alignItems: "center", gap: 12 }}
            >
              <CreditCard size={24} color={colors.text} />
              <Text
                style={{ color: colors.text, fontSize: 20, fontWeight: "700" }}
              >
                Payout method
              </Text>
            </View>
            <TouchableOpacity
              onPress={handleClose}
              style={{
                width: 40,
                height: 40,
                borderRadius: 20,
                backgroundColor: colors.cardBackground,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <X size={20} color={colors.text} />
            </TouchableOpacity>
          </View>
          {loading ? (
            <Text
              style={{
                color: colors.textSecondary,
                textAlign: "center",
                padding: 40,
              }}
            >
              Loading...
            </Text>
          ) : (
            <ScrollView showsVerticalScrollIndicator={false}>
              <View
                style={{
                  backgroundColor: colors.cardBackground,
                  borderRadius: 12,
                  padding: 16,
                  marginBottom: 20,
                }}
              >
                <Text
                  style={{
                    color: colors.text,
                    fontSize: 14,
                    fontWeight: "600",
                    marginBottom: 4,
                  }}
                >
                  Available for: {country?.name || userCountry}
                </Text>
                <Text style={{ color: colors.textSecondary, fontSize: 13 }}>
                  {locked
                    ? "This method is locked. Message WhatsApp support to change it."
                    : "Choose how you want to receive payments."}
                </Text>
              </View>
              <View style={{ marginBottom: 24, gap: 12 }}>
                {payoutMethods.map((method) => (
                  <TouchableOpacity
                    key={method.code}
                    disabled={locked}
                    onPress={() => setSelectedMethod(method.code)}
                    style={{
                      padding: 16,
                      borderRadius: 12,
                      borderWidth: 1,
                      borderColor:
                        selectedMethod === method.code
                          ? colors.accent
                          : colors.border,
                      backgroundColor:
                        selectedMethod === method.code
                          ? colors.accent + "15"
                          : colors.cardBackground,
                      flexDirection: "row",
                      alignItems: "center",
                    }}
                  >
                    <Text style={{ fontSize: 24, marginRight: 12 }}>
                      {method.icon}
                    </Text>
                    <View style={{ flex: 1 }}>
                      <Text
                        style={{
                          color: colors.text,
                          fontSize: 15,
                          fontWeight: "600",
                        }}
                      >
                        {method.name}
                      </Text>
                      <Text
                        style={{ color: colors.textSecondary, fontSize: 13 }}
                      >
                        {method.description}
                      </Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
              {selectedPayoutMethod &&
                selectedPayoutMethod.fields.map((field) => (
                  <View key={field.key} style={{ marginBottom: 16 }}>
                    <Text
                      style={{
                        color: colors.text,
                        fontSize: 14,
                        fontWeight: "600",
                        marginBottom: 8,
                      }}
                    >
                      {field.label}
                    </Text>
                    {field.type === "bank_search" ? (
                      <TouchableOpacity
                        disabled={locked}
                        onPress={() => {
                          setBankPickerField(field);
                          setBankSearch("");
                          setBankPickerVisible(true);
                        }}
                        style={{
                          borderRadius: 8,
                          borderWidth: 1,
                          borderColor: errors[field.key]
                            ? "#EF4444"
                            : colors.border,
                          backgroundColor: colors.cardBackground,
                          padding: 14,
                          flexDirection: "row",
                          alignItems: "center",
                          justifyContent: "space-between",
                        }}
                      >
                        <Text
                          style={{
                            color: methodData[field.key]
                              ? colors.text
                              : colors.textTertiary,
                            fontSize: 15,
                          }}
                        >
                          {methodData[field.key] || "Tap to select bank"}
                        </Text>
                        <ChevronRight size={18} color={colors.textTertiary} />
                      </TouchableOpacity>
                    ) : field.type === "select" ? (
                      <View style={{ gap: 8 }}>
                        {(field.options || []).map((option) => (
                          <TouchableOpacity
                            key={option}
                            disabled={locked}
                            onPress={() => handleInputChange(field.key, option)}
                            style={{
                              padding: 12,
                              borderRadius: 8,
                              borderWidth: 1,
                              borderColor:
                                methodData[field.key] === option
                                  ? colors.accent
                                  : colors.border,
                            }}
                          >
                            <Text style={{ color: colors.text }}>{option}</Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    ) : (
                      <TextInput
                        editable={!locked}
                        placeholder={
                          field.placeholder ||
                          `Enter ${field.label.toLowerCase()}`
                        }
                        placeholderTextColor={colors.textTertiary}
                        value={methodData[field.key] || ""}
                        onChangeText={(value) =>
                          handleInputChange(field.key, value)
                        }
                        keyboardType={
                          field.type === "phone" ? "phone-pad" : "default"
                        }
                        style={{
                          color: colors.text,
                          fontSize: 15,
                          padding: 12,
                          borderRadius: 8,
                          borderWidth: 1,
                          borderColor: errors[field.key]
                            ? "#EF4444"
                            : colors.border,
                          backgroundColor: colors.cardBackground,
                        }}
                      />
                    )}
                    {errors[field.key] ? (
                      <View
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                          gap: 6,
                          marginTop: 6,
                        }}
                      >
                        <AlertCircle size={12} color="#EF4444" />
                        <Text style={{ color: "#EF4444", fontSize: 12 }}>
                          {errors[field.key]}
                        </Text>
                      </View>
                    ) : null}
                  </View>
                ))}
              <TouchableOpacity
                onPress={handleSave}
                disabled={(!selectedMethod && !locked) || saving}
                style={{
                  backgroundColor: "#D4AF37",
                  borderRadius: 12,
                  paddingVertical: 16,
                  alignItems: "center",
                  opacity: saving ? 0.6 : 1,
                  marginTop: 8,
                }}
              >
                <Text
                  style={{ color: "#000000", fontSize: 16, fontWeight: "700" }}
                >
                  {saving
                    ? "Saving..."
                    : locked
                    ? "Change on WhatsApp"
                    : "Save payout method"}
                </Text>
              </TouchableOpacity>
            </ScrollView>
          )}
        </View>
      </View>
      <Modal
        visible={bankPickerVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setBankPickerVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
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
              height: "70%",
              paddingBottom: insets.bottom,
            }}
          >
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
                Select bank
              </Text>
              <TouchableOpacity onPress={() => setBankPickerVisible(false)}>
                <X size={24} color={colors.text} />
              </TouchableOpacity>
            </View>
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
                  value={bankSearch}
                  onChangeText={setBankSearch}
                  placeholder="Search banks"
                  placeholderTextColor={colors.textTertiary}
                  style={{
                    flex: 1,
                    color: colors.text,
                    fontSize: 15,
                    paddingVertical: 14,
                  }}
                  autoFocus
                />
              </View>
            </View>
            <FlatList
              data={filteredBanks}
              keyExtractor={(item, index) => `${item}-${index}`}
              keyboardShouldPersistTaps="handled"
              renderItem={({ item }) => (
                <TouchableOpacity
                  onPress={() => {
                    if (bankPickerField)
                      handleInputChange(bankPickerField.key, item);
                    setBankPickerVisible(false);
                  }}
                  style={{
                    paddingHorizontal: 20,
                    paddingVertical: 16,
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "space-between",
                    borderBottomWidth: 1,
                    borderBottomColor: colors.borderLight,
                  }}
                >
                  <Text style={{ color: colors.text, fontSize: 15, flex: 1 }}>
                    {item}
                  </Text>
                  {methodData[bankPickerField?.key] === item && (
                    <Check size={18} color="#D4AF37" />
                  )}
                </TouchableOpacity>
              )}
              ListEmptyComponent={
                <View style={{ padding: 40, alignItems: "center" }}>
                  <Text style={{ color: colors.textSecondary }}>
                    No banks found
                  </Text>
                </View>
              }
            />
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </Modal>
  );
}