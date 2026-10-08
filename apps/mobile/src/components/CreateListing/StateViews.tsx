// @ts-nocheck
import { View, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import { StatusBar } from 'expo-status-bar';

export function LoadingState({ colors }) {
  return (
    <View
      style={{
        flex: 1,
        backgroundColor: colors.background,
        justifyContent: 'center',
        alignItems: 'center',
      }}
    >
      <StatusBar style={colors.statusBar} />
      <ActivityIndicator size="large" color={colors.text} />
    </View>
  );
}

export function OnboardingPrompt({ colors, onNavigate }) {
  return (
    <View
      style={{
        flex: 1,
        backgroundColor: colors.background,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
      }}
    >
      <StatusBar style={colors.statusBar} />
      <Text
        style={{
          color: colors.text,
          fontSize: 18,
          fontWeight: '700',
          marginBottom: 12,
        }}
      >
        Become a Seller First
      </Text>
      <Text
        style={{
          color: colors.textSecondary,
          fontSize: 15,
          textAlign: 'center',
          marginBottom: 32,
        }}
      >
        You need to complete seller onboarding before creating listings
      </Text>
      <TouchableOpacity
        onPress={onNavigate}
        style={{
          backgroundColor: colors.accent,
          paddingHorizontal: 32,
          paddingVertical: 14,
          borderRadius: 12,
        }}
      >
        <Text style={{ color: colors.accentText, fontSize: 16, fontWeight: '600' }}>
          Start Onboarding
        </Text>
      </TouchableOpacity>
    </View>
  );
}
