// @ts-nocheck
import { Modal, View, Text, TouchableOpacity, Animated } from 'react-native';
import { useEffect, useRef } from 'react';
import { CheckCircle2, Globe, ArrowRight } from 'lucide-react-native';
import { useTheme } from '../utils/theme';
import { BlurView } from 'expo-blur';

export default function LogisticsSuccessModal({ visible, onClose, onListProduct, countries = [] }) {
  const colors = useTheme();
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          damping: 15,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      scaleAnim.setValue(0);
      fadeAnim.setValue(0);
    }
  }, [visible, scaleAnim, fadeAnim]);

  return (
    <Modal visible={visible} animationType="fade" transparent>
      <BlurView
        intensity={80}
        tint="dark"
        style={{
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center',
          padding: 20,
        }}
      >
        <Animated.View
          style={{
            transform: [{ scale: scaleAnim }],
            opacity: fadeAnim,
            width: '100%',
            maxWidth: 400,
          }}
        >
          <View
            style={{
              backgroundColor: colors.background,
              borderRadius: 24,
              padding: 32,
              borderWidth: 1,
              borderColor: colors.border,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 8 },
              shadowOpacity: 0.3,
              shadowRadius: 16,
              elevation: 16,
            }}
          >
            {/* Success Icon */}
            <View
              style={{
                width: 80,
                height: 80,
                borderRadius: 40,
                backgroundColor: 'rgba(212, 175, 55, 0.15)',
                alignItems: 'center',
                justifyContent: 'center',
                alignSelf: 'center',
                marginBottom: 24,
              }}
            >
              <CheckCircle2 size={48} color="#D4AF37" />
            </View>

            {/* Title */}
            <Text
              style={{
                color: colors.text,
                fontSize: 24,
                fontWeight: '700',
                textAlign: 'center',
                marginBottom: 12,
              }}
            >
              Global Fulfillment Active
            </Text>

            {/* Description */}
            <Text
              style={{
                color: colors.textSecondary,
                fontSize: 15,
                textAlign: 'center',
                lineHeight: 22,
                marginBottom: 24,
              }}
            >
              Your logistics network is now configured. You are ready to accept and fulfill orders
              across your defined territories.
            </Text>

            {/* Countries Badge */}
            {countries.length > 0 && (
              <View
                style={{
                  backgroundColor: 'rgba(212, 175, 55, 0.1)',
                  borderWidth: 1,
                  borderColor: 'rgba(212, 175, 55, 0.2)',
                  borderRadius: 12,
                  padding: 14,
                  marginBottom: 24,
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 10,
                }}
              >
                <Globe size={20} color="#D4AF37" />
                <View style={{ flex: 1 }}>
                  <Text
                    style={{
                      color: colors.text,
                      fontSize: 13,
                      fontWeight: '600',
                      marginBottom: 2,
                    }}
                  >
                    Now Serving
                  </Text>
                  <Text
                    style={{
                      color: colors.textSecondary,
                      fontSize: 12,
                    }}
                  >
                    {countries.join(', ')}
                  </Text>
                </View>
              </View>
            )}

            {/* Tip */}
            <View
              style={{
                backgroundColor: colors.cardBackground,
                borderRadius: 12,
                padding: 14,
                marginBottom: 24,
              }}
            >
              <Text
                style={{
                  color: colors.textTertiary,
                  fontSize: 12,
                  lineHeight: 18,
                  fontStyle: 'italic',
                }}
              >
                Your products are now visible to buyers in these markets. Ensure your descriptions
                are optimized for these territories.
              </Text>
            </View>

            {/* Buttons */}
            <View style={{ gap: 12 }}>
              <TouchableOpacity
                onPress={onListProduct}
                style={{
                  backgroundColor: colors.accent,
                  borderRadius: 14,
                  paddingVertical: 16,
                  alignItems: 'center',
                  flexDirection: 'row',
                  justifyContent: 'center',
                  gap: 8,
                }}
              >
                <Text
                  style={{
                    color: colors.accentText,
                    fontSize: 16,
                    fontWeight: '700',
                  }}
                >
                  List a Global Product
                </Text>
                <ArrowRight size={18} color={colors.accentText} />
              </TouchableOpacity>

              <TouchableOpacity
                onPress={onClose}
                style={{
                  backgroundColor: colors.inputBackground,
                  borderRadius: 14,
                  paddingVertical: 16,
                  alignItems: 'center',
                }}
              >
                <Text
                  style={{
                    color: colors.text,
                    fontSize: 16,
                    fontWeight: '600',
                  }}
                >
                  Back to Dashboard
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </Animated.View>
      </BlurView>
    </Modal>
  );
}
