// @ts-nocheck
import { Modal, View, Text, TouchableOpacity, ScrollView } from "react-native";
import { X } from "lucide-react-native";

export function LogisticsProfilePickerModal({
  visible,
  onClose,
  deliveryZones,
  selectedLogisticsProfile,
  onSelectProfile,
  colors,
  insets,
}) {
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
            maxHeight: "60%",
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
              style={{
                color: colors.text,
                fontSize: 18,
                fontWeight: "700",
              }}
            >
              Select Logistics Profile
            </Text>
            <TouchableOpacity onPress={onClose}>
              <X size={24} color={colors.text} />
            </TouchableOpacity>
          </View>

          <ScrollView>
            {deliveryZones.map((zone, idx) => {
              const cityName = zone.cityName || zone.city_name;
              const regionName = zone.regionName || zone.region_name;
              const fee = zone.deliveryFee ?? zone.delivery_fee ?? 0;
              const isFree =
                zone.isFreeDelivery ?? zone.is_free_delivery ?? false;
              const currency = zone.currency || "GHS";

              return (
                <TouchableOpacity
                  key={idx}
                  onPress={() => {
                    onSelectProfile({
                      ...zone,
                      id: idx,
                      cityName,
                      regionName,
                      deliveryFee: fee,
                      currency,
                    });
                    onClose();
                  }}
                  style={{
                    paddingHorizontal: 20,
                    paddingVertical: 14,
                    borderBottomWidth: 1,
                    borderBottomColor: colors.borderLight,
                    backgroundColor:
                      selectedLogisticsProfile?.id === idx
                        ? "rgba(212, 175, 55, 0.1)"
                        : "transparent",
                  }}
                >
                  <Text
                    style={{
                      color: colors.text,
                      fontSize: 15,
                      fontWeight: "600",
                      marginBottom: 4,
                    }}
                  >
                    {cityName}, {regionName}
                  </Text>
                  <Text style={{ color: colors.textSecondary, fontSize: 13 }}>
                    {isFree
                      ? "Complimentary Delivery"
                      : `${currency} ${fee.toFixed(2)} delivery fee`}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}
