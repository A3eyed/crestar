// @ts-nocheck
import { TouchableOpacity, Text } from 'react-native';
import { BlurView } from 'expo-blur';

export function SubmitButton({ onPress, disabled, isSubmitting, step, colors }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      style={{
        borderRadius: 16,
        overflow: 'hidden',
        opacity: disabled ? 0.6 : 1,
        marginTop: 8,
      }}
    >
      <BlurView
        intensity={80}
        tint={colors.glass.tint}
        style={{
          paddingVertical: 16,
          paddingHorizontal: 24,
          borderWidth: 1,
          borderColor: colors.glass.border,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Text
          style={{
            color: colors.text,
            fontSize: 16,
            fontWeight: '600',
            letterSpacing: 0.5,
          }}
        >
          {isSubmitting ? 'Submitting...' : step === 2 ? 'Start Earning' : 'Continue'}
        </Text>
      </BlurView>
    </TouchableOpacity>
  );
}
