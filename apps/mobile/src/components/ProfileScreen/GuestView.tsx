// @ts-nocheck
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@/utils/auth/useAuth';
import { User } from 'lucide-react-native';

export function GuestView({ colors }) {
  const insets = useSafeAreaInsets();
  const { signIn, signUp } = useAuth();
  // Resolve mode from the theme itself so this never breaks if palette hexes change
  const isDark = colors.statusBar === 'light';

  const placeholderFill = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.035)';
  const placeholderRing = isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.08)';
  const iconTint = isDark ? 'rgba(255,255,255,0.45)' : 'rgba(0,0,0,0.3)';
  const mutedText = isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.45)';

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <StatusBar style={colors.statusBar} />

      <View
        style={{
          flex: 1,
          paddingTop: insets.top,
          paddingBottom: insets.bottom + 90,
          paddingHorizontal: 32,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {/* Avatar placeholder */}
        <View
          style={{
            width: 96,
            height: 96,
            borderRadius: 48,
            backgroundColor: placeholderFill,
            borderWidth: StyleSheet.hairlineWidth,
            borderColor: placeholderRing,
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 24,
          }}
        >
          <User size={40} color={iconTint} strokeWidth={1.25} />
        </View>

        {/* Headline */}
        <Text
          style={{
            color: colors.text,
            fontSize: 22,
            fontWeight: '600',
            letterSpacing: -0.5,
            textAlign: 'center',
            marginBottom: 28,
          }}
        >
          Sign in to Crestar
        </Text>

        {/* Primary action */}
        <TouchableOpacity
          onPress={() => signIn()}
          activeOpacity={0.85}
          style={{
            backgroundColor: '#D4AF37',
            borderRadius: 999,
            paddingVertical: 15,
            width: '100%',
            maxWidth: 320,
            alignItems: 'center',
            shadowColor: '#D4AF37',
            shadowOpacity: isDark ? 0.28 : 0.22,
            shadowRadius: 18,
            shadowOffset: { width: 0, height: 8 },
            elevation: 4,
          }}
        >
          <Text
            style={{
              color: '#0A0A0A',
              fontSize: 16,
              fontWeight: '700',
              letterSpacing: 0.1,
            }}
          >
            Sign In
          </Text>
        </TouchableOpacity>

        {/* Secondary link */}
        <TouchableOpacity
          onPress={() => signUp()}
          activeOpacity={0.6}
          hitSlop={{ top: 14, bottom: 14, left: 14, right: 14 }}
          style={{ marginTop: 20 }}
        >
          <Text
            style={{
              color: mutedText,
              fontSize: 14,
              fontWeight: '500',
              letterSpacing: -0.1,
            }}
          >
            Create account
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
