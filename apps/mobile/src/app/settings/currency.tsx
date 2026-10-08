// @ts-nocheck
import { View, Text, ScrollView, TouchableOpacity, Alert } from "react-native";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ArrowLeft, Check } from "lucide-react-native";
import { useRouter } from "expo-router";
import { useState, useEffect, useCallback, useMemo } from "react";
import { useTheme } from "../../utils/theme";
import useLocalization from "../../utils/localization";
import { getCurrencySymbol } from "../../utils/currency";

// Popular currencies for Crestar Commerce
const POPULAR_CURRENCIES = [
  { code: "USD", name: "US Dollar", flag: "🇺🇸", popular: true },
  { code: "EUR", name: "Euro", flag: "🇪🇺", popular: true },
  { code: "GBP", name: "British Pound", flag: "🇬🇧", popular: true },
  { code: "GHS", name: "Ghana Cedi", flag: "🇬🇭", popular: true },
  { code: "NGN", name: "Nigerian Naira", flag: "🇳🇬", popular: true },
  { code: "INR", name: "Indian Rupee", flag: "🇮🇳", popular: true },
  { code: "CNY", name: "Chinese Yuan", flag: "🇨🇳", popular: true },
  { code: "BRL", name: "Brazilian Real", flag: "🇧🇷", popular: true },
];

// All supported currencies
const ALL_CURRENCIES = [
  { code: "GHS", name: "Ghana Cedi", flag: "🇬🇭", region: "Africa" },
  { code: "NGN", name: "Nigerian Naira", flag: "🇳🇬", region: "Africa" },
  { code: "KES", name: "Kenyan Shilling", flag: "🇰🇪", region: "Africa" },
  { code: "ZAR", name: "South African Rand", flag: "🇿🇦", region: "Africa" },
  { code: "EGP", name: "Egyptian Pound", flag: "🇪🇬", region: "Africa" },
  { code: "MAD", name: "Moroccan Dirham", flag: "🇲🇦", region: "Africa" },
  { code: "TZS", name: "Tanzanian Shilling", flag: "🇹🇿", region: "Africa" },
  { code: "UGX", name: "Ugandan Shilling", flag: "🇺🇬", region: "Africa" },
  { code: "XOF", name: "West African CFA Franc", flag: "🌍", region: "Africa" },
  {
    code: "XAF",
    name: "Central African CFA Franc",
    flag: "🌍",
    region: "Africa",
  },
  { code: "USD", name: "US Dollar", flag: "🇺🇸", region: "Americas" },
  { code: "CAD", name: "Canadian Dollar", flag: "🇨🇦", region: "Americas" },
  { code: "BRL", name: "Brazilian Real", flag: "🇧🇷", region: "Americas" },
  { code: "MXN", name: "Mexican Peso", flag: "🇲🇽", region: "Americas" },
  { code: "ARS", name: "Argentine Peso", flag: "🇦🇷", region: "Americas" },
  { code: "EUR", name: "Euro", flag: "🇪🇺", region: "Europe" },
  { code: "GBP", name: "British Pound", flag: "🇬🇧", region: "Europe" },
  { code: "CHF", name: "Swiss Franc", flag: "🇨🇭", region: "Europe" },
  { code: "SEK", name: "Swedish Krona", flag: "🇸🇪", region: "Europe" },
  { code: "NOK", name: "Norwegian Krone", flag: "🇳🇴", region: "Europe" },
  { code: "DKK", name: "Danish Krone", flag: "🇩🇰", region: "Europe" },
  { code: "PLN", name: "Polish Złoty", flag: "🇵🇱", region: "Europe" },
  { code: "CZK", name: "Czech Koruna", flag: "🇨🇿", region: "Europe" },
  { code: "HUF", name: "Hungarian Forint", flag: "🇭🇺", region: "Europe" },
  { code: "RON", name: "Romanian Leu", flag: "🇷🇴", region: "Europe" },
  { code: "TRY", name: "Turkish Lira", flag: "🇹🇷", region: "Europe" },
  { code: "RUB", name: "Russian Ruble", flag: "🇷🇺", region: "Europe" },
  { code: "AED", name: "UAE Dirham", flag: "🇦🇪", region: "Middle East" },
  { code: "SAR", name: "Saudi Riyal", flag: "🇸🇦", region: "Middle East" },
  { code: "QAR", name: "Qatari Riyal", flag: "🇶🇦", region: "Middle East" },
  { code: "KWD", name: "Kuwaiti Dinar", flag: "🇰🇼", region: "Middle East" },
  { code: "BHD", name: "Bahraini Dinar", flag: "🇧🇭", region: "Middle East" },
  { code: "ILS", name: "Israeli Shekel", flag: "🇮🇱", region: "Middle East" },
  { code: "JPY", name: "Japanese Yen", flag: "🇯🇵", region: "Asia" },
  { code: "CNY", name: "Chinese Yuan", flag: "🇨🇳", region: "Asia" },
  { code: "INR", name: "Indian Rupee", flag: "🇮🇳", region: "Asia" },
  { code: "KRW", name: "South Korean Won", flag: "🇰🇷", region: "Asia" },
  { code: "SGD", name: "Singapore Dollar", flag: "🇸🇬", region: "Asia" },
  { code: "HKD", name: "Hong Kong Dollar", flag: "🇭🇰", region: "Asia" },
  { code: "MYR", name: "Malaysian Ringgit", flag: "🇲🇾", region: "Asia" },
  { code: "THB", name: "Thai Baht", flag: "🇹🇭", region: "Asia" },
  { code: "IDR", name: "Indonesian Rupiah", flag: "🇮🇩", region: "Asia" },
  { code: "PHP", name: "Philippine Peso", flag: "🇵🇭", region: "Asia" },
  { code: "VND", name: "Vietnamese Dong", flag: "🇻🇳", region: "Asia" },
  { code: "AUD", name: "Australian Dollar", flag: "🇦🇺", region: "Oceania" },
  { code: "NZD", name: "New Zealand Dollar", flag: "🇳🇿", region: "Oceania" },
];

export default function CurrencySettingsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const colors = useTheme();
  const { currency, setCurrency, t } = useLocalization();
  const [selectedCurrency, setSelectedCurrency] = useState(currency || "GHS");

  useEffect(() => {
    setSelectedCurrency(currency || "GHS");
  }, [currency]);

  const handleSelectCurrency = useCallback(
    async (currencyCode) => {
      try {
        setSelectedCurrency(currencyCode);
        // Update both the zustand store and AsyncStorage
        await setCurrency(currencyCode);

        Alert.alert(
          t("currencyUpdated"),
          t("currencyUpdatedMsg", { currency: currencyCode }),
          [{ text: t("ok"), onPress: () => router.back() }],
        );
      } catch (error) {
        console.error("Failed to set currency:", error);
        Alert.alert(t("errorOccurred"), t("currencyUpdateError"));
      }
    },
    [router, setCurrency, t],
  );

  const renderCurrencyItem = useCallback(
    (currency) => {
      const isSelected = selectedCurrency === currency.code;
      const symbol = getCurrencySymbol(currency.code);

      return (
        <TouchableOpacity
          key={currency.code}
          onPress={() => handleSelectCurrency(currency.code)}
          style={{
            flexDirection: "row",
            alignItems: "center",
            paddingVertical: 14,
            paddingHorizontal: 16,
            backgroundColor: isSelected
              ? colors.cardBackgroundAlt
              : colors.background,
          }}
        >
          <Text style={{ fontSize: 32, marginRight: 12 }}>{currency.flag}</Text>
          <View style={{ flex: 1 }}>
            <Text
              style={{ color: colors.text, fontSize: 16, fontWeight: "600" }}
            >
              {currency.name}
            </Text>
            <Text
              style={{ color: colors.textTertiary, fontSize: 13, marginTop: 2 }}
            >
              {currency.code} • {symbol}
            </Text>
          </View>
          {isSelected && (
            <Check size={24} color={colors.primary} strokeWidth={3} />
          )}
        </TouchableOpacity>
      );
    },
    [selectedCurrency, colors, handleSelectCurrency],
  );

  const groupedCurrencies = useMemo(() => {
    return ALL_CURRENCIES.reduce((acc, curr) => {
      if (!acc[curr.region]) acc[curr.region] = [];
      acc[curr.region].push(curr);
      return acc;
    }, {});
  }, []);

  return (
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
          gap: 16,
        }}
      >
        <TouchableOpacity onPress={() => router.back()}>
          <ArrowLeft size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={{ color: colors.text, fontSize: 20, fontWeight: "700" }}>
          {t("currencyPreference")}
        </Text>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Info Banner */}
        <View
          style={{
            backgroundColor: colors.cardBackgroundAlt,
            marginHorizontal: 16,
            marginTop: 16,
            padding: 16,
            borderRadius: 12,
            borderWidth: 1,
            borderColor: colors.borderLight,
          }}
        >
          <Text
            style={{
              color: colors.text,
              fontSize: 14,
              fontWeight: "600",
              marginBottom: 6,
            }}
          >
            💡 {t("currencyDisplay")}
          </Text>
          <Text
            style={{
              color: colors.textSecondary,
              fontSize: 13,
              lineHeight: 18,
            }}
          >
            {t("currencyDisplayDesc")}
          </Text>
        </View>

        {/* Popular Currencies */}
        <View style={{ marginTop: 24 }}>
          <Text
            style={{
              color: colors.textTertiary,
              fontSize: 13,
              fontWeight: "600",
              marginBottom: 8,
              marginLeft: 16,
              textTransform: "uppercase",
              letterSpacing: 0.5,
            }}
          >
            {t("popularCurrencies")}
          </Text>
          <View
            style={{
              backgroundColor: colors.cardBackground,
              borderRadius: 12,
              overflow: "hidden",
              marginHorizontal: 16,
            }}
          >
            {POPULAR_CURRENCIES.map((curr, index) => (
              <View key={curr.code + "_popular"}>
                {renderCurrencyItem(curr)}
                {index < POPULAR_CURRENCIES.length - 1 && (
                  <View
                    style={{
                      height: 1,
                      backgroundColor: colors.borderLight,
                      marginLeft: 60,
                    }}
                  />
                )}
              </View>
            ))}
          </View>
        </View>

        {/* All Currencies by Region */}
        {Object.entries(groupedCurrencies).map(([region, currencies]) => (
          <View key={region} style={{ marginTop: 24 }}>
            <Text
              style={{
                color: colors.textTertiary,
                fontSize: 13,
                fontWeight: "600",
                marginBottom: 8,
                marginLeft: 16,
                textTransform: "uppercase",
                letterSpacing: 0.5,
              }}
            >
              {region}
            </Text>
            <View
              style={{
                backgroundColor: colors.cardBackground,
                borderRadius: 12,
                overflow: "hidden",
                marginHorizontal: 16,
              }}
            >
              {currencies.map((curr, index) => (
                <View key={curr.code + "_" + region}>
                  {renderCurrencyItem(curr)}
                  {index < currencies.length - 1 && (
                    <View
                      style={{
                        height: 1,
                        backgroundColor: colors.borderLight,
                        marginLeft: 60,
                      }}
                    />
                  )}
                </View>
              ))}
            </View>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}
