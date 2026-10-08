// @ts-nocheck
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  TextInput,
  FlatList,
  ActivityIndicator,
} from "react-native";
import { X, Search, Check } from "lucide-react-native";

export function BankPicker({
  visible,
  colors,
  insets,
  banks = [],
  loadingBanks,
  selectedBank,
  bankSearch = "",
  setBankSearch,
  onSelectBank,
  onClose,
}) {
  const query = String(bankSearch || "")
    .trim()
    .toLowerCase();
  const filteredBanks = (Array.isArray(banks) ? banks : []).filter((bank) =>
    String(bank?.name || "")
      .toLowerCase()
      .includes(query)
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
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
            height: "70%",
            paddingBottom: insets?.bottom || 16,
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
            <TouchableOpacity onPress={onClose}>
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
              />
            </View>
          </View>
          {loadingBanks ? (
            <View style={{ padding: 40, alignItems: "center" }}>
              <ActivityIndicator size="large" color={colors.accent} />
            </View>
          ) : (
            <FlatList
              data={filteredBanks}
              keyExtractor={(item, index) =>
                String(item.code || item.id || index)
              }
              keyboardShouldPersistTaps="handled"
              renderItem={({ item }) => (
                <TouchableOpacity
                  onPress={() => onSelectBank(item)}
                  style={{
                    paddingHorizontal: 20,
                    paddingVertical: 14,
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "space-between",
                    borderBottomWidth: 1,
                    borderBottomColor: colors.borderLight,
                  }}
                >
                  <Text style={{ color: colors.text, fontSize: 15, flex: 1 }}>
                    {item.name}
                  </Text>
                  {selectedBank?.code === item.code && (
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
          )}
        </View>
      </View>
    </Modal>
  );
}