// @ts-nocheck
import { useState, useEffect, useRef } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { X } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '../utils/theme';
import useAuth from '../utils/auth/useAuth';
import useUpload from '../utils/useUpload';
import { authenticatedFetch } from '../utils/authenticatedFetch';
import { EARNING_OPTIONS } from '@/constants/earningOptions';
import { EarningOptionCard } from '@/components/MonetizationCenter/EarningOptionCard';
import { OnboardingHeader } from '@/components/MonetizationCenter/OnboardingHeader';
import { BasicDetailsStep } from '@/components/MonetizationCenter/BasicDetailsStep';
import { LocationStep } from '@/components/MonetizationCenter/LocationStep';
import { SubmitButton } from '@/components/MonetizationCenter/SubmitButton';
import { useMonetizationOnboarding } from '@/hooks/useMonetizationOnboarding';

export default function MonetizationCenterScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const colors = useTheme();
  const { isAuthenticated, isReady, auth, signIn } = useAuth();
  const [upload, { loading: uploading }] = useUpload();

  const [loading, setLoading] = useState(true);

  // One-shot guard: this screen may auto-redirect at most once per mount.
  // Without this, any disagreement with a dashboard's own access check
  // ping-pongs the user between the two screens forever.
  const hasRedirectedRef = useRef(false);

  const {
    selectedOption,
    step,
    formData,
    errors,
    isSubmitting,
    uploadProgress,
    availableRegions,
    availableIdTypes,
    handleSelectPath,
    handleBack,
    handleInputChange,
    handleImagePick,
    handleNext,
    handleSubmit,
  } = useMonetizationOnboarding(isAuthenticated, isReady, auth, signIn, upload, uploading);

  useEffect(() => {
    if (isAuthenticated) {
      checkExistingStatus();
    } else {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated]);

  const checkExistingStatus = async () => {
    try {
      // Short timeout + no retries: this check must never block the menu.
      // If it fails, we simply show the earning options (fail-open).
      const res = await authenticatedFetch(
        '/api/business-centers',
        {},
        { retry: false, timeout: 8000 }
      );
      if (res.ok) {
        const data = await res.json();
        if (data.center && data.center.verification_status === 'approved') {
          const option = EARNING_OPTIONS.find((opt) => opt.centerType === data.center.center_type);

          // Only auto-redirect when we can resolve a REAL dashboard route —
          // never fall back to '/'; if the type is unknown, just show the menu.
          if (option?.dashboardRoute && !hasRedirectedRef.current) {
            hasRedirectedRef.current = true;
            router.replace(option.dashboardRoute);
            return;
          }

          if (!option) {
            console.warn(
              '⚠️ No matching earning option found for center type:',
              data.center.center_type
            );
          }
        }
      } else if (res.status === 400) {
        // User might already have a center - check error response
        const errorData = await res.json().catch(() => ({}));
        if (errorData.dashboard_route && !hasRedirectedRef.current) {
          console.log('ℹ️ User already has a business center, redirecting to dashboard');
          hasRedirectedRef.current = true;
          router.replace(errorData.dashboard_route);
          return;
        }
      }
    } catch (err) {
      console.error('Failed to check status:', err);
    } finally {
      setLoading(false);
    }
  };

  // Remove handleSelectPathWrapper - user is already authenticated

  if (loading) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: colors.background,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <StatusBar style={colors.statusBar} />
        <ActivityIndicator size="large" color={colors.text} />
        <Text style={{ fontSize: 16, color: colors.textSecondary, marginTop: 12 }}>Loading...</Text>
      </View>
    );
  }

  // ─── ONBOARDING FORM VIEW ────────────────────────────────────
  if (selectedOption) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        <StatusBar style={colors.statusBar} />

        <OnboardingHeader
          selectedOption={selectedOption}
          step={step}
          colors={colors}
          insets={insets}
          onBack={handleBack}
          onClose={() => router.back()}
        />

        <ScrollView
          contentContainerStyle={{
            padding: 20,
            paddingBottom: insets.bottom + 100,
          }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {step === 1 && (
            <BasicDetailsStep
              selectedOption={selectedOption}
              formData={formData}
              errors={errors}
              onInputChange={handleInputChange}
              colors={colors}
            />
          )}

          {step === 2 && (
            <LocationStep
              selectedOption={selectedOption}
              formData={formData}
              errors={errors}
              availableRegions={availableRegions}
              onInputChange={handleInputChange}
              colors={colors}
            />
          )}

          <SubmitButton
            onPress={() => handleNext(() => handleSubmit(router))}
            disabled={isSubmitting || uploading}
            isSubmitting={isSubmitting}
            step={step}
            colors={colors}
          />
        </ScrollView>
      </View>
    );
  }

  // ─── START EARNING VIEW (MAIN MENU) ──────────────────────────
  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <StatusBar style={colors.statusBar} />

      {/* Header */}
      <View
        style={{
          paddingTop: insets.top + 16,
          paddingHorizontal: 20,
          paddingBottom: 20,
        }}
      >
        <TouchableOpacity
          onPress={() => router.back()}
          style={{
            width: 40,
            height: 40,
            borderRadius: 20,
            backgroundColor: colors.cardBackgroundAlt,
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 24,
          }}
        >
          <X size={24} color={colors.text} />
        </TouchableOpacity>

        <Text
          style={{
            color: colors.text,
            fontSize: 28,
            fontWeight: '700',
            marginBottom: 8,
          }}
        >
          Start Earning
        </Text>
        <Text style={{ color: colors.textSecondary, fontSize: 16, lineHeight: 22 }}>
          Choose how you want to start earning with Crestar
        </Text>
      </View>

      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: 20,
          paddingBottom: insets.bottom + 40,
        }}
        showsVerticalScrollIndicator={false}
      >
        <View style={{ gap: 20 }}>
          {EARNING_OPTIONS.map((option) => (
            <EarningOptionCard
              key={option.id}
              option={option}
              colors={colors}
              onPress={() => handleSelectPath(option)}
            />
          ))}

          {/* Bottom Info */}
          <View
            style={{
              marginTop: 16,
              paddingHorizontal: 20,
              paddingVertical: 16,
              backgroundColor: colors.cardBackground,
              borderRadius: 12,
              borderWidth: 1,
              borderColor: colors.border,
            }}
          >
            <Text
              style={{
                fontSize: 14,
                color: colors.text,
                fontWeight: '600',
                marginBottom: 8,
                textAlign: 'center',
              }}
            >
              🚀 Instant Setup
            </Text>
            <Text
              style={{
                fontSize: 12,
                color: colors.textSecondary,
                textAlign: 'center',
                lineHeight: 16,
              }}
            >
              No ID verification needed. Fill in your details and start earning immediately!
            </Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}
