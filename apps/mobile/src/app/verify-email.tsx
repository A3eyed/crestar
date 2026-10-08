// @ts-nocheck
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Platform,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "expo-router";
import { ArrowLeft, Mail } from "lucide-react-native";
import KeyboardAvoidingAnimatedView from "@/components/KeyboardAvoidingAnimatedView";
import useUser from "@/utils/auth/useUser";
import { useTheme } from "@/utils/theme";
import { authenticatedFetch } from "@/utils/authenticatedFetch";

export default function VerifyEmailScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { data: user, refetch } = useUser();
  const colors = useTheme();

  const [code, setCode] = useState(["", "", "", "", "", ""]);
  const [verifying, setVerifying] = useState(false);
  const [sending, setSending] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const inputs = useRef([]);

  useEffect(() => {
    // Auto-send a code on screen mount
    sendCode(true);
  }, []);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const t = setInterval(
      () => setResendCooldown((v) => Math.max(0, v - 1)),
      1000,
    );
    return () => clearInterval(t);
  }, [resendCooldown]);

  const sendCode = async (silent = false) => {
    try {
      setSending(true);
      const res = await authenticatedFetch("/api/auth/send-verification", {
        method: "POST",
      });

      let data = {};
      try {
        data = await res.json();
      } catch (parseErr) {
        if (!silent)
          Alert.alert("Error", "Server returned an unexpected response.");
        return;
      }

      if (res.status === 429) {
        // Server-side rate limit — sync cooldown with server
        setResendCooldown(data.cooldown || 60);
        return;
      }
      if (res.ok) {
        if (data.alreadyVerified) {
          Alert.alert("Already verified", "Your email is already verified.", [
            { text: "OK", onPress: () => router.replace("/(tabs)/feed") },
          ]);
          return;
        }
        setResendCooldown(60);
        if (!silent)
          Alert.alert("Code sent", "Check your inbox for the 6-digit code.");
      } else {
        if (!silent) Alert.alert("Error", data.error || "Could not send code.");
      }
    } catch (err) {
      if (!silent)
        Alert.alert("Error", "Could not send code. Please try again.");
    } finally {
      setSending(false);
    }
  };

  const handleChangeDigit = (text, index) => {
    const digit = text.replace(/[^0-9]/g, "").slice(-1);
    const next = [...code];
    next[index] = digit;
    setCode(next);
    if (digit && index < 5) inputs.current[index + 1]?.focus();
    if (next.every((d) => d !== "")) {
      verifyCode(next.join(""));
    }
  };

  const handleKeyPress = (e, index) => {
    if (e.nativeEvent.key === "Backspace" && !code[index] && index > 0) {
      inputs.current[index - 1]?.focus();
    }
  };

  const verifyCode = async (full) => {
    try {
      setVerifying(true);
      const res = await authenticatedFetch("/api/auth/verify-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: full }),
      });

      let data = {};
      try {
        data = await res.json();
      } catch (parseErr) {
        Alert.alert("Error", "Server returned an unexpected response.");
        return;
      }

      if (res.ok && data.success) {
        await refetch?.();
        Alert.alert(
          "Email verified",
          "Your email has been verified successfully!",
          [{ text: "Continue", onPress: () => router.replace("/(tabs)/feed") }],
        );
      } else {
        setCode(["", "", "", "", "", ""]);
        inputs.current[0]?.focus();
        Alert.alert("Verification failed", data.error || "Incorrect code.");
      }
    } catch (err) {
      Alert.alert("Error", "Could not verify code. Please try again.");
    } finally {
      setVerifying(false);
    }
  };

  return (
    <KeyboardAvoidingAnimatedView
      style={{ flex: 1, backgroundColor: colors.background }}
      behavior="padding"
    >
      <StatusBar style={colors.statusBar} />
      <View
        style={{
          paddingTop: insets.top + 12,
          paddingHorizontal: 16,
          paddingBottom: 12,
          flexDirection: "row",
          alignItems: "center",
          gap: 12,
        }}
      >
        <TouchableOpacity onPress={() => router.back()}>
          <ArrowLeft size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={{ color: colors.text, fontSize: 18, fontWeight: "700" }}>
          Verify Email
        </Text>
      </View>

      <View style={{ flex: 1, paddingHorizontal: 24, paddingTop: 32 }}>
        <View style={{ alignItems: "center", marginBottom: 24 }}>
          <View
            style={{
              width: 72,
              height: 72,
              borderRadius: 36,
              backgroundColor: colors.cardBackground,
              alignItems: "center",
              justifyContent: "center",
              marginBottom: 16,
            }}
          >
            <Mail size={32} color={colors.text} />
          </View>
          <Text
            style={{
              color: colors.text,
              fontSize: 22,
              fontWeight: "700",
              marginBottom: 8,
              textAlign: "center",
            }}
          >
            Check your email
          </Text>
          <Text
            style={{
              color: colors.textSecondary,
              fontSize: 14,
              textAlign: "center",
              lineHeight: 20,
            }}
          >
            We sent a 6-digit code to{"\n"}
            <Text style={{ color: colors.text, fontWeight: "600" }}>
              {user?.email || "your email"}
            </Text>
          </Text>
        </View>

        <View
          style={{
            flexDirection: "row",
            justifyContent: "center",
            gap: 8,
            marginBottom: 24,
          }}
        >
          {code.map((digit, i) => (
            <TextInput
              key={i}
              ref={(r) => (inputs.current[i] = r)}
              value={digit}
              onChangeText={(t) => handleChangeDigit(t, i)}
              onKeyPress={(e) => handleKeyPress(e, i)}
              keyboardType="number-pad"
              maxLength={1}
              editable={!verifying}
              autoFocus={i === 0}
              style={{
                width: 48,
                height: 56,
                borderRadius: 12,
                borderWidth: 2,
                borderColor: digit ? colors.text : colors.border,
                backgroundColor: colors.cardBackground,
                color: colors.text,
                fontSize: 24,
                fontWeight: "700",
                textAlign: "center",
              }}
            />
          ))}
        </View>

        {verifying && (
          <View style={{ alignItems: "center", marginBottom: 16 }}>
            <ActivityIndicator color={colors.text} />
            <Text
              style={{
                color: colors.textSecondary,
                fontSize: 13,
                marginTop: 8,
              }}
            >
              Verifying…
            </Text>
          </View>
        )}

        <TouchableOpacity
          onPress={() => sendCode(false)}
          disabled={sending || resendCooldown > 0}
          style={{ alignItems: "center", paddingVertical: 12 }}
        >
          <Text
            style={{
              color: resendCooldown > 0 ? colors.textTertiary : colors.text,
              fontSize: 14,
              fontWeight: "600",
            }}
          >
            {sending
              ? "Sending…"
              : resendCooldown > 0
                ? `Resend code in ${resendCooldown}s`
                : "Resend code"}
          </Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingAnimatedView>
  );
}
