// @ts-nocheck
import { View, Text, TextInput, TouchableOpacity, Switch } from "react-native";
import { Clock, Star } from "lucide-react-native";
import { SPICY_LEVELS } from "@/constants/spicyLevels";

const HUB_TYPES = [
  { value: "food", label: "Food" },
  { value: "drinks", label: "Drinks" },
];

const SUGAR_PROFILES = ["Original", "Zero Sugar", "Low Sugar", "Unsweetened"];
const DIETARY = ["None", "Vegan", "Vegetarian", "Halal", "Gluten-free"];

export function FoodBeverageSection({
  hubType,
  setHubType,
  prepTime,
  setPrepTime,
  spicyLevel,
  setSpicyLevel,
  isTodaysSpecial,
  setIsTodaysSpecial,
  sugarProfile,
  setSugarProfile,
  sweetener,
  setSweetener,
  servingNote,
  setServingNote,
  dietaryFlag,
  setDietaryFlag,
  colors,
}) {
  const isDrink = hubType === "drinks";

  return (
    <>
      <Text
        style={{
          color: colors.text,
          fontSize: 17,
          fontWeight: "700",
          marginBottom: 12,
        }}
      >
        Listed under
      </Text>
      <View style={{ flexDirection: "row", gap: 8, marginBottom: 24 }}>
        {HUB_TYPES.map((type) => {
          const selected = hubType === type.value;
          return (
            <TouchableOpacity
              key={type.value}
              onPress={() => setHubType(type.value)}
              style={{
                paddingHorizontal: 16,
                paddingVertical: 10,
                borderRadius: 20,
                backgroundColor: selected
                  ? colors.accent
                  : colors.cardBackground,
                borderWidth: 1,
                borderColor: selected ? colors.accent : colors.border,
              }}
            >
              <Text
                style={{
                  color: selected ? "#FFFFFF" : colors.text,
                  fontWeight: selected ? "700" : "400",
                }}
              >
                {type.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <Text
        style={{
          color: colors.text,
          fontSize: 17,
          fontWeight: "700",
          marginBottom: 12,
        }}
      >
        Prep Time (minutes)
      </Text>
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          backgroundColor: colors.inputBackground,
          borderWidth: 1,
          borderColor: colors.inputBorder,
          borderRadius: 12,
          paddingHorizontal: 16,
          marginBottom: 24,
        }}
      >
        <Clock size={20} color={colors.textTertiary} />
        <TextInput
          placeholder="e.g. 30"
          placeholderTextColor={colors.inputPlaceholder}
          value={prepTime}
          onChangeText={setPrepTime}
          keyboardType="number-pad"
          style={{ flex: 1, padding: 16, color: colors.text, fontSize: 15 }}
        />
      </View>

      {!isDrink && (
        <>
          <Text
            style={{
              color: colors.text,
              fontSize: 17,
              fontWeight: "700",
              marginBottom: 12,
            }}
          >
            Spicy Level
          </Text>
          <View
            style={{
              flexDirection: "row",
              flexWrap: "wrap",
              gap: 8,
              marginBottom: 24,
            }}
          >
            {SPICY_LEVELS.map((level) => (
              <TouchableOpacity
                key={level.value}
                onPress={() => setSpicyLevel(level.value)}
                style={{
                  paddingHorizontal: 14,
                  paddingVertical: 10,
                  borderRadius: 20,
                  backgroundColor:
                    spicyLevel === level.value
                      ? colors.accent
                      : colors.cardBackground,
                  borderWidth: 1,
                  borderColor:
                    spicyLevel === level.value ? colors.accent : colors.border,
                }}
              >
                <Text
                  style={{
                    color: spicyLevel === level.value ? "#FFFFFF" : colors.text,
                    fontSize: 13,
                    fontWeight: spicyLevel === level.value ? "600" : "400",
                  }}
                >
                  {level.emoji} {level.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </>
      )}

      {isDrink && (
        <>
          <Text
            style={{
              color: colors.text,
              fontSize: 17,
              fontWeight: "700",
              marginBottom: 12,
            }}
          >
            Sugar profile
          </Text>
          <View
            style={{
              flexDirection: "row",
              flexWrap: "wrap",
              gap: 8,
              marginBottom: 16,
            }}
          >
            {SUGAR_PROFILES.map((profile) => {
              const selected = sugarProfile === profile;
              return (
                <TouchableOpacity
                  key={profile}
                  onPress={() => setSugarProfile(profile)}
                  style={{
                    paddingHorizontal: 14,
                    paddingVertical: 10,
                    borderRadius: 20,
                    backgroundColor: selected
                      ? colors.accent
                      : colors.cardBackground,
                    borderWidth: 1,
                    borderColor: selected ? colors.accent : colors.border,
                  }}
                >
                  <Text
                    style={{
                      color: selected ? "#FFFFFF" : colors.text,
                      fontSize: 13,
                    }}
                  >
                    {profile}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
          <TextInput
            placeholder="Sweetener, if not sugar. e.g. Stevia"
            placeholderTextColor={colors.inputPlaceholder}
            value={sweetener}
            onChangeText={setSweetener}
            style={{
              backgroundColor: colors.inputBackground,
              borderWidth: 1,
              borderColor: colors.inputBorder,
              borderRadius: 12,
              padding: 16,
              color: colors.text,
              marginBottom: 16,
            }}
          />
          <TextInput
            placeholder="Serving note, e.g. Best served ice-cold"
            placeholderTextColor={colors.inputPlaceholder}
            value={servingNote}
            onChangeText={setServingNote}
            style={{
              backgroundColor: colors.inputBackground,
              borderWidth: 1,
              borderColor: colors.inputBorder,
              borderRadius: 12,
              padding: 16,
              color: colors.text,
              marginBottom: 24,
            }}
          />
        </>
      )}

      <Text
        style={{
          color: colors.text,
          fontSize: 17,
          fontWeight: "700",
          marginBottom: 12,
        }}
      >
        Dietary flag
      </Text>
      <View
        style={{
          flexDirection: "row",
          flexWrap: "wrap",
          gap: 8,
          marginBottom: 24,
        }}
      >
        {DIETARY.map((flag) => {
          const selected = dietaryFlag === flag;
          return (
            <TouchableOpacity
              key={flag}
              onPress={() => setDietaryFlag(flag)}
              style={{
                paddingHorizontal: 14,
                paddingVertical: 10,
                borderRadius: 20,
                backgroundColor: selected
                  ? colors.accent
                  : colors.cardBackground,
                borderWidth: 1,
                borderColor: selected ? colors.accent : colors.border,
              }}
            >
              <Text
                style={{
                  color: selected ? "#FFFFFF" : colors.text,
                  fontSize: 13,
                }}
              >
                {flag}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          backgroundColor: colors.cardBackground,
          borderRadius: 12,
          padding: 16,
          marginBottom: 24,
          borderWidth: 1,
          borderColor: colors.border,
        }}
      >
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
          <Star size={20} color={colors.textTertiary} />
          <Text style={{ color: colors.text, fontSize: 15, fontWeight: "600" }}>
            Today's Special
          </Text>
        </View>
        <Switch
          value={isTodaysSpecial}
          onValueChange={setIsTodaysSpecial}
          trackColor={{ false: colors.border, true: colors.accent }}
          thumbColor="#FFFFFF"
        />
      </View>
    </>
  );
}