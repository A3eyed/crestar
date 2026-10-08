// @ts-nocheck
import { View, Text, Modal, TouchableOpacity, ScrollView } from "react-native";
import { X } from "lucide-react-native";
import { useTheme } from "../utils/theme";

const SIZE_GUIDE = {
  XS: { chest: '30-32"', waist: '24-26"', hips: '32-34"' },
  S: { chest: '34-36"', waist: '28-30"', hips: '36-38"' },
  M: { chest: '38-40"', waist: '32-34"', hips: '40-42"' },
  L: { chest: '42-44"', waist: '36-38"', hips: '44-46"' },
  XL: { chest: '46-48"', waist: '40-42"', hips: '48-50"' },
  XXL: { chest: '50-52"', waist: '44-46"', hips: '52-54"' },
};

export default function SizeGuideModal({ visible, onClose }) {
  const colors = useTheme();

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
            maxHeight: "70%",
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
              borderBottomWidth: 1,
              borderBottomColor: colors.border,
            }}
          >
            <Text
              style={{
                color: colors.text,
                fontSize: 20,
                fontWeight: "700",
              }}
            >
              📏 Size Guide
            </Text>
            <TouchableOpacity onPress={onClose}>
              <X size={24} color={colors.text} />
            </TouchableOpacity>
          </View>

          <ScrollView
            contentContainerStyle={{
              padding: 20,
            }}
          >
            {/* Size Guide Table */}
            <View
              style={{
                backgroundColor: colors.cardBackground,
                borderRadius: 12,
                overflow: "hidden",
                borderWidth: 1,
                borderColor: colors.border,
              }}
            >
              {/* Table Header */}
              <View
                style={{
                  flexDirection: "row",
                  backgroundColor: colors.cardBackgroundAlt,
                  paddingVertical: 12,
                  paddingHorizontal: 16,
                }}
              >
                <Text
                  style={{
                    flex: 1,
                    color: colors.text,
                    fontSize: 14,
                    fontWeight: "700",
                  }}
                >
                  Size
                </Text>
                <Text
                  style={{
                    flex: 1,
                    color: colors.text,
                    fontSize: 14,
                    fontWeight: "700",
                    textAlign: "center",
                  }}
                >
                  Chest
                </Text>
                <Text
                  style={{
                    flex: 1,
                    color: colors.text,
                    fontSize: 14,
                    fontWeight: "700",
                    textAlign: "center",
                  }}
                >
                  Waist
                </Text>
                <Text
                  style={{
                    flex: 1,
                    color: colors.text,
                    fontSize: 14,
                    fontWeight: "700",
                    textAlign: "center",
                  }}
                >
                  Hips
                </Text>
              </View>

              {/* Table Rows */}
              {Object.entries(SIZE_GUIDE).map(([size, measurements], index) => (
                <View
                  key={size}
                  style={{
                    flexDirection: "row",
                    paddingVertical: 14,
                    paddingHorizontal: 16,
                    backgroundColor:
                      index % 2 === 0
                        ? colors.background
                        : colors.cardBackground,
                  }}
                >
                  <Text
                    style={{
                      flex: 1,
                      color: colors.text,
                      fontSize: 15,
                      fontWeight: "600",
                    }}
                  >
                    {size}
                  </Text>
                  <Text
                    style={{
                      flex: 1,
                      color: colors.textSecondary,
                      fontSize: 14,
                      textAlign: "center",
                    }}
                  >
                    {measurements.chest}
                  </Text>
                  <Text
                    style={{
                      flex: 1,
                      color: colors.textSecondary,
                      fontSize: 14,
                      textAlign: "center",
                    }}
                  >
                    {measurements.waist}
                  </Text>
                  <Text
                    style={{
                      flex: 1,
                      color: colors.textSecondary,
                      fontSize: 14,
                      textAlign: "center",
                    }}
                  >
                    {measurements.hips}
                  </Text>
                </View>
              ))}
            </View>

            {/* Measurement Tips */}
            <View
              style={{
                marginTop: 20,
                padding: 16,
                backgroundColor: "rgba(212, 175, 55, 0.08)",
                borderRadius: 12,
                borderWidth: 1,
                borderColor: "rgba(212, 175, 55, 0.15)",
              }}
            >
              <Text
                style={{
                  color: colors.text,
                  fontSize: 15,
                  fontWeight: "700",
                  marginBottom: 12,
                }}
              >
                💡 How to Measure
              </Text>
              <Text
                style={{
                  color: colors.textSecondary,
                  fontSize: 14,
                  lineHeight: 22,
                  marginBottom: 8,
                }}
              >
                <Text style={{ fontWeight: "600" }}>Chest:</Text> Measure around
                the fullest part of your chest, keeping the tape level under
                your arms.
              </Text>
              <Text
                style={{
                  color: colors.textSecondary,
                  fontSize: 14,
                  lineHeight: 22,
                  marginBottom: 8,
                }}
              >
                <Text style={{ fontWeight: "600" }}>Waist:</Text> Measure around
                your natural waistline, keeping the tape comfortably loose.
              </Text>
              <Text
                style={{
                  color: colors.textSecondary,
                  fontSize: 14,
                  lineHeight: 22,
                }}
              >
                <Text style={{ fontWeight: "600" }}>Hips:</Text> Measure around
                the fullest part of your hips, about 8 inches below your waist.
              </Text>
            </View>

            {/* Note */}
            <View
              style={{
                marginTop: 16,
                padding: 12,
                backgroundColor: "rgba(245, 158, 11, 0.1)",
                borderRadius: 10,
                borderWidth: 1,
                borderColor: "rgba(245, 158, 11, 0.2)",
              }}
            >
              <Text
                style={{
                  color: colors.textSecondary,
                  fontSize: 13,
                  lineHeight: 19,
                }}
              >
                ℹ️ Measurements may vary slightly by brand. When in doubt, size
                up for a more comfortable fit.
              </Text>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}
