// @ts-nocheck
import { View, Text, TouchableOpacity } from "react-native";
import { ArrowRight } from "lucide-react-native";

export function EarningOptionCard({ option, colors, onPress }) {
  const Icon = option.icon;

  return (
    <TouchableOpacity
      onPress={onPress}
      style={{
        backgroundColor: colors.cardBackground,
        borderRadius: 16,
        overflow: "hidden",
        borderWidth: 1,
        borderColor: colors.border,
      }}
    >
      {/* Option Header */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          padding: 20,
          gap: 16,
        }}
      >
        <View
          style={{
            width: 60,
            height: 60,
            borderRadius: 16,
            backgroundColor: option.color + "20",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Icon size={30} color={option.color} />
        </View>

        <View style={{ flex: 1 }}>
          <Text
            style={{
              color: colors.text,
              fontSize: 18,
              fontWeight: "700",
              marginBottom: 4,
            }}
          >
            {option.title}
          </Text>
          <Text style={{ color: colors.textSecondary, fontSize: 14 }}>
            {option.subtitle}
          </Text>
        </View>

        <ArrowRight size={24} color={colors.textTertiary} />
      </View>

      {/* Benefits */}
      <View
        style={{
          backgroundColor: colors.cardBackgroundAlt,
          padding: 20,
          paddingTop: 16,
        }}
      >
        {option.benefits.map((benefit, index) => (
          <View
            key={index}
            style={{
              flexDirection: "row",
              alignItems: "flex-start",
              marginBottom: index === option.benefits.length - 1 ? 0 : 12,
              gap: 12,
            }}
          >
            <View
              style={{
                width: 6,
                height: 6,
                borderRadius: 3,
                backgroundColor: option.color,
                marginTop: 6,
              }}
            />
            <Text
              style={{
                color: colors.text,
                fontSize: 14,
                lineHeight: 18,
                flex: 1,
              }}
            >
              {benefit}
            </Text>
          </View>
        ))}
      </View>
    </TouchableOpacity>
  );
}
