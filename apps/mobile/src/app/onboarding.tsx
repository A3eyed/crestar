// @ts-nocheck
import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Modal,
} from "react-native";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Apple, Mail } from "lucide-react-native";
import GlassButton from "../components/GlassButton";
import GlassCard from "../components/GlassCard";
import useStore from "../utils/store";
import useAuth from "../utils/auth/useAuth";

export default function OnboardingScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { saveOnboarding } = useStore();
  const { signIn } = useAuth();

  const [step, setStep] = useState("input"); // 'input' | 'otp' | 'role'
  const [inputValue, setInputValue] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [selectedRoles, setSelectedRoles] = useState([]);

  const roles = [
    {
      id: "shop",
      label: "Shop",
      emoji: "🛍️",
      description: "Browse & buy products",
    },
    {
      id: "sell",
      label: "Sell",
      emoji: "💼",
      description: "List your products",
    },
    {
      id: "deliver",
      label: "Deliver",
      emoji: "🚗",
      description: "Earn delivering orders",
    },
  ];

  const handleContinue = () => {
    if (inputValue.trim()) {
      // Open authentication modal
      signIn();
    }
  };

  const handleVerifyOTP = () => {
    if (otpCode.length === 6) {
      // TODO: Verify OTP with backend
      setShowRoleModal(true);
    }
  };

  const toggleRole = (roleId) => {
    setSelectedRoles((prev) =>
      prev.includes(roleId)
        ? prev.filter((r) => r !== roleId)
        : [...prev, roleId],
    );
  };

  const handleCompleteOnboarding = async () => {
    if (selectedRoles.length > 0) {
      const user = {
        id: Date.now().toString(),
        identifier: inputValue,
        createdAt: new Date().toISOString(),
      };

      await saveOnboarding(user, selectedRoles);
      setShowRoleModal(false);
      router.replace("/(tabs)/feed");
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: "#000000" }}>
      <StatusBar style="light" />

      <ScrollView
        contentContainerStyle={{
          flexGrow: 1,
          paddingTop: insets.top + 40,
          paddingBottom: insets.bottom + 20,
          paddingHorizontal: 24,
        }}
        showsVerticalScrollIndicator={false}
      >
        {/* Logo */}
        <View style={{ alignItems: "center", marginBottom: 60 }}>
          <Text
            style={{
              color: "#FFFFFF",
              fontSize: 48,
              fontWeight: "700",
              letterSpacing: 3,
            }}
          >
            CRESTAR
          </Text>
          <Text
            style={{
              color: "rgba(255, 255, 255, 0.6)",
              fontSize: 14,
              marginTop: 8,
            }}
          >
            Social Commerce, Elevated
          </Text>
        </View>

        {step === "input" && (
          <View style={{ gap: 20 }}>
            {/* Input Field */}
            <GlassCard>
              <TextInput
                value={inputValue}
                onChangeText={setInputValue}
                placeholder="Phone or Email"
                placeholderTextColor="rgba(255, 255, 255, 0.4)"
                keyboardType="email-address"
                autoCapitalize="none"
                style={{
                  color: "#FFFFFF",
                  fontSize: 18,
                  fontWeight: "500",
                }}
              />
            </GlassCard>

            <GlassButton
              onPress={handleContinue}
              title="Continue"
              disabled={!inputValue.trim()}
            />

            {/* Divider */}
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                marginVertical: 20,
              }}
            >
              <View
                style={{
                  flex: 1,
                  height: 1,
                  backgroundColor: "rgba(255, 255, 255, 0.1)",
                }}
              />
              <Text
                style={{
                  color: "rgba(255, 255, 255, 0.4)",
                  marginHorizontal: 16,
                  fontSize: 12,
                }}
              >
                OR
              </Text>
              <View
                style={{
                  flex: 1,
                  height: 1,
                  backgroundColor: "rgba(255, 255, 255, 0.1)",
                }}
              />
            </View>

            {/* Social Buttons */}
            <GlassButton
              onPress={() => {}}
              title="Continue with Apple"
              icon={<Apple size={20} color="#FFFFFF" />}
              variant="secondary"
            />
            <GlassButton
              onPress={() => {}}
              title="Continue with Google"
              icon={<Mail size={20} color="#FFFFFF" />}
              variant="secondary"
            />
          </View>
        )}

        {step === "otp" && (
          <View style={{ gap: 20 }}>
            <Text
              style={{
                color: "#FFFFFF",
                fontSize: 20,
                fontWeight: "600",
                textAlign: "center",
              }}
            >
              Enter Verification Code
            </Text>
            <Text
              style={{
                color: "rgba(255, 255, 255, 0.6)",
                fontSize: 14,
                textAlign: "center",
              }}
            >
              Sent to {inputValue}
            </Text>

            <GlassCard>
              <TextInput
                value={otpCode}
                onChangeText={setOtpCode}
                placeholder="000000"
                placeholderTextColor="rgba(255, 255, 255, 0.4)"
                keyboardType="number-pad"
                maxLength={6}
                style={{
                  color: "#FFFFFF",
                  fontSize: 32,
                  fontWeight: "700",
                  textAlign: "center",
                  letterSpacing: 8,
                }}
              />
            </GlassCard>

            <GlassButton
              onPress={handleVerifyOTP}
              title="Verify"
              disabled={otpCode.length !== 6}
            />

            <TouchableOpacity onPress={() => setStep("input")}>
              <Text
                style={{
                  color: "rgba(255, 255, 255, 0.6)",
                  textAlign: "center",
                  fontSize: 14,
                }}
              >
                Change number
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      {/* Role Selection Modal */}
      <Modal
        visible={showRoleModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowRoleModal(false)}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: "rgba(0, 0, 0, 0.9)",
            justifyContent: "center",
            paddingHorizontal: 24,
          }}
        >
          <GlassCard intensity={80}>
            <Text
              style={{
                color: "#FFFFFF",
                fontSize: 24,
                fontWeight: "700",
                marginBottom: 8,
              }}
            >
              What are you here for?
            </Text>
            <Text
              style={{
                color: "rgba(255, 255, 255, 0.6)",
                fontSize: 14,
                marginBottom: 24,
              }}
            >
              Select all that apply
            </Text>

            {roles.map((role) => (
              <TouchableOpacity
                key={role.id}
                onPress={() => toggleRole(role.id)}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  padding: 16,
                  borderRadius: 12,
                  marginBottom: 12,
                  backgroundColor: selectedRoles.includes(role.id)
                    ? "rgba(255, 255, 255, 0.15)"
                    : "rgba(255, 255, 255, 0.05)",
                  borderWidth: 2,
                  borderColor: selectedRoles.includes(role.id)
                    ? "rgba(255, 255, 255, 0.4)"
                    : "transparent",
                }}
              >
                <Text style={{ fontSize: 32, marginRight: 16 }}>
                  {role.emoji}
                </Text>
                <View style={{ flex: 1 }}>
                  <Text
                    style={{
                      color: "#FFFFFF",
                      fontSize: 18,
                      fontWeight: "600",
                    }}
                  >
                    {role.label}
                  </Text>
                  <Text
                    style={{
                      color: "rgba(255, 255, 255, 0.6)",
                      fontSize: 12,
                      marginTop: 2,
                    }}
                  >
                    {role.description}
                  </Text>
                </View>
              </TouchableOpacity>
            ))}

            <GlassButton
              onPress={handleCompleteOnboarding}
              title="Get Started"
              disabled={selectedRoles.length === 0}
              style={{ marginTop: 12 }}
            />
          </GlassCard>
        </View>
      </Modal>
    </View>
  );
}
