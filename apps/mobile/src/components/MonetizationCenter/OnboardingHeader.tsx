// @ts-nocheck
import { View, Text, TouchableOpacity } from 'react-native';
import { ArrowLeft, X } from 'lucide-react-native';

export function OnboardingHeader({ selectedOption, step, colors, insets, onBack, onClose }) {
  const Icon = selectedOption.icon;

  return (
    <View
      style={{
        paddingTop: insets.top + 16,
        paddingHorizontal: 20,
        paddingBottom: 16,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
      }}
    >
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <TouchableOpacity
          onPress={onBack}
          style={{
            width: 40,
            height: 40,
            borderRadius: 20,
            backgroundColor: colors.cardBackgroundAlt,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <ArrowLeft size={24} color={colors.text} />
        </TouchableOpacity>

        <View style={{ alignItems: 'center' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Icon size={22} color={selectedOption.color} />
            <Text
              style={{
                color: colors.text,
                fontSize: 18,
                fontWeight: '700',
              }}
            >
              {selectedOption.title}
            </Text>
          </View>
          <Text
            style={{
              color: colors.textSecondary,
              fontSize: 14,
              marginTop: 2,
            }}
          >
            Step {step} of 2
          </Text>
        </View>

        <TouchableOpacity
          onPress={onClose}
          style={{
            width: 40,
            height: 40,
            borderRadius: 20,
            backgroundColor: colors.cardBackgroundAlt,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <X size={24} color={colors.text} />
        </TouchableOpacity>
      </View>
    </View>
  );
}
