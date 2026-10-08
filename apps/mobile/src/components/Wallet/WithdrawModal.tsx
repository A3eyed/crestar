// @ts-nocheck
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  TouchableWithoutFeedback,
  Keyboard,
} from "react-native";
import { X } from "lucide-react-native";
import { BankPicker } from "./BankPicker";

export function WithdrawModal({
  visible,
  colors,
  insets,
  balance,
  formatCurrency,
  withdrawAmount,
  setWithdrawAmount,
  savedPayoutMethods = [],
  loadingPayoutMethods,
  selectedPayoutMethod,
  setSelectedPayoutMethod,
  selectedBank,
  setSelectedBank,
  banks,
  loadingBanks,
  showBankPicker,
  setShowBankPicker,
  bankSearch,
  setBankSearch,
  withdrawing,
  onWithdraw,
  onClose,
}) {
  const methods = Array.isArray(savedPayoutMethods) ? savedPayoutMethods : [];
  const amount = parseFloat(withdrawAmount);
  const available = Number(balance) || 0;
  const canSubmit =
    Number.isFinite(amount) &&
    amount > 0 &&
    amount <= available &&
    !!selectedPayoutMethod &&
    !withdrawing;

  return (
    <>
      <Modal
        visible={visible}
        animationType="slide"
        transparent
        onRequestClose={onClose}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View
            style={{
              flex: 1,
              backgroundColor: colors.modalBackground,
              justifyContent: "flex-end",
            }}
          >
            <KeyboardAvoidingView
              behavior={Platform.OS === "ios" ? "padding" : undefined}
            >
              <View
                style={{
                  backgroundColor: colors.background,
                  borderTopLeftRadius: 24,
                  borderTopRightRadius: 24,
                  paddingBottom: (insets?.bottom || 0) + 16,
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
                      fontSize: 22,
                      fontWeight: "700",
                    }}
                  >
                    Cash out
                  </Text>
                  <TouchableOpacity
                    onPress={onClose}
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 18,
                      backgroundColor: colors.cardBackgroundAlt,
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <X size={20} color={colors.text} />
                  </TouchableOpacity>
                </View>
                <Text
                  style={{
                    color: colors.textSecondary,
                    fontSize: 14,
                    paddingHorizontal: 20,
                    marginBottom: 8,
                  }}
                >
                  Available: {formatCurrency(available)}
                </Text>
                <Text
                  style={{
                    color: colors.textTertiary,
                    fontSize: 12,
                    paddingHorizontal: 20,
                    marginBottom: 16,
                  }}
                >
                  This is already net of Crestar’s 3% fee.
                </Text>
                <ScrollView
                  style={{ maxHeight: 500 }}
                  contentContainerStyle={{ paddingHorizontal: 20 }}
                  keyboardShouldPersistTaps="handled"
                >
                  <TextInput
                    value={withdrawAmount}
                    onChangeText={setWithdrawAmount}
                    placeholder="Enter amount"
                    placeholderTextColor={colors.textTertiary}
                    keyboardType="decimal-pad"
                    style={{
                      backgroundColor: colors.inputBackground,
                      borderWidth: 1,
                      borderColor: colors.inputBorder,
                      borderRadius: 12,
                      padding: 16,
                      color: colors.text,
                      fontSize: 18,
                      fontWeight: "600",
                      marginBottom: 8,
                    }}
                  />
                  {amount > available ? (
                    <Text style={{ color: "#EF4444", marginBottom: 12 }}>
                      Amount is above your available balance.
                    </Text>
                  ) : null}
                  <Text
                    style={{
                      color: colors.text,
                      fontSize: 15,
                      fontWeight: "600",
                      marginBottom: 12,
                    }}
                  >
                    Locked payout method
                  </Text>
                  {loadingPayoutMethods ? (
                    <ActivityIndicator color={colors.accent} />
                  ) : methods.length === 0 ? (
                    <Text
                      style={{ color: colors.textSecondary, marginBottom: 16 }}
                    >
                      Add a payout method before cashing out.
                    </Text>
                  ) : (
                    methods.map((method) => (
                      <TouchableOpacity
                        key={method.id}
                        onPress={() => setSelectedPayoutMethod(method)}
                        style={{
                          padding: 16,
                          borderRadius: 12,
                          borderWidth: 2,
                          borderColor:
                            selectedPayoutMethod?.id === method.id
                              ? colors.accent
                              : colors.border,
                          marginBottom: 10,
                        }}
                      >
                        <Text
                          style={{
                            color: colors.text,
                            fontSize: 15,
                            fontWeight: "600",
                          }}
                        >
                          {method.method_name}
                        </Text>
                        <Text
                          style={{
                            color: colors.textSecondary,
                            fontSize: 13,
                            marginTop: 4,
                          }}
                        >
                          {method.details?.account_number ||
                            method.details?.phone_number ||
                            method.details?.iban ||
                            ""}
                        </Text>
                      </TouchableOpacity>
                    ))
                  )}
                  <View
                    style={{
                      flexDirection: "row",
                      gap: 12,
                      marginTop: 8,
                      marginBottom: 16,
                    }}
                  >
                    <TouchableOpacity
                      onPress={onClose}
                      style={{
                        flex: 1,
                        padding: 16,
                        borderRadius: 12,
                        backgroundColor: colors.cardBackgroundAlt,
                        alignItems: "center",
                      }}
                    >
                      <Text
                        style={{
                          color: colors.text,
                          fontSize: 16,
                          fontWeight: "600",
                        }}
                      >
                        Cancel
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={onWithdraw}
                      disabled={!canSubmit}
                      style={{
                        flex: 1,
                        padding: 16,
                        borderRadius: 12,
                        backgroundColor: canSubmit
                          ? "#D4AF37"
                          : "rgba(212,175,55,0.4)",
                        alignItems: "center",
                      }}
                    >
                      {withdrawing ? (
                        <ActivityIndicator color="#000000" />
                      ) : (
                        <Text
                          style={{
                            color: "#000000",
                            fontSize: 16,
                            fontWeight: "700",
                          }}
                        >
                          Cash out
                        </Text>
                      )}
                    </TouchableOpacity>
                  </View>
                </ScrollView>
              </View>
            </KeyboardAvoidingView>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
      <BankPicker
        visible={showBankPicker}
        colors={colors}
        insets={insets}
        banks={banks}
        loadingBanks={loadingBanks}
        selectedBank={selectedBank}
        bankSearch={bankSearch}
        setBankSearch={setBankSearch}
        onSelectBank={(bank) => {
          setSelectedBank(bank);
          setShowBankPicker(false);
          setBankSearch("");
        }}
        onClose={() => {
          setShowBankPicker(false);
          setBankSearch("");
        }}
      />
    </>
  );
}