// @ts-nocheck
import { View, Text, ScrollView, TouchableOpacity } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { ChevronLeft, Check } from "lucide-react-native";
import { useRouter } from "expo-router";
import useLocalization from "../../utils/localization";
import { AVAILABLE_LANGUAGES } from "../../data/translations";
import { useTheme } from "../../utils/theme";

export default function LanguageSettingsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { language, setLanguage, t } = useLocalization();
  const colors = useTheme();

  const handleSelectLanguage = async (langCode) => {
    await setLanguage(langCode);
    setTimeout(() => {
      router.back();
    }, 300);
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <StatusBar style={colors.statusBar} />

      {/* Header */}
      <View
        style={{
          paddingTop: insets.top + 10,
          paddingHorizontal: 16,
          paddingBottom: 16,
          borderBottomWidth: 1,
          borderBottomColor: colors.border,
        }}
      >
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={{ padding: 4 }}
          >
            <ChevronLeft size={28} color={colors.text} />
          </TouchableOpacity>
          <Text
            style={{
              color: colors.text,
              fontSize: 20,
              fontWeight: "700",
              marginLeft: 12,
            }}
          >
            {t("language")}
          </Text>
        </View>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          paddingBottom: insets.bottom + 20,
          paddingTop: 8,
        }}
        showsVerticalScrollIndicator={false}
      >
        <Text
          style={{
            color: colors.textTertiary,
            fontSize: 13,
            paddingHorizontal: 20,
            marginBottom: 12,
          }}
        >
          {t("chooseLanguage")}
        </Text>

        {/* Global marketplace notice */}
        <View
          style={{
            marginHorizontal: 20,
            marginBottom: 20,
            backgroundColor: colors.cardBackground,
            borderRadius: 12,
            padding: 16,
            borderLeftWidth: 3,
            borderLeftColor: "#D4AF37",
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
            🌍 {t("globalMarketplace")}
          </Text>
          <Text style={{ color: colors.textSecondary, fontSize: 13 }}>
            {t("globalMarketplaceDesc")}
          </Text>
        </View>

        {AVAILABLE_LANGUAGES.map((lang) => (
          <TouchableOpacity
            key={lang.code}
            onPress={() => handleSelectLanguage(lang.code)}
            style={{
              flexDirection: "row",
              alignItems: "center",
              paddingVertical: 16,
              paddingHorizontal: 20,
              backgroundColor:
                language === lang.code
                  ? colors.cardBackgroundAlt
                  : colors.cardBackground,
              marginBottom: 1,
              borderLeftWidth: 3,
              borderLeftColor:
                language === lang.code ? colors.text : "transparent",
            }}
          >
            <Text style={{ fontSize: 32, marginRight: 16 }}>{lang.flag}</Text>
            <View style={{ flex: 1 }}>
              <Text
                style={{
                  color: colors.text,
                  fontSize: 17,
                  fontWeight: language === lang.code ? "600" : "400",
                }}
              >
                {lang.nativeName}
              </Text>
              <Text
                style={{
                  color: colors.textTertiary,
                  fontSize: 13,
                  marginTop: 2,
                }}
              >
                {lang.name}
              </Text>
            </View>
            {language === lang.code && <Check size={24} color={colors.text} />}
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}
