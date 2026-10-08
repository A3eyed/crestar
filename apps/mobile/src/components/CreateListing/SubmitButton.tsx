// @ts-nocheck
import { View, Text, TouchableOpacity, ActivityIndicator } from 'react-native';

export function SubmitButton({ onSubmit, submitting, disabled, colors }) {
  return (
    <TouchableOpacity
      onPress={onSubmit}
      disabled={disabled || submitting}
      style={{
        backgroundColor: colors.accent,
        paddingVertical: 16,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        opacity: disabled || submitting ? 0.5 : 1,
      }}
    >
      {submitting ? (
        <ActivityIndicator size="small" color={colors.accentText} />
      ) : (
        <Text style={{ color: colors.accentText, fontSize: 16, fontWeight: '700' }}>
          Publish Listing
        </Text>
      )}
    </TouchableOpacity>
  );
}
