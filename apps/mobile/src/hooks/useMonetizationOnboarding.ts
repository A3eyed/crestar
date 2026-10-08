// @ts-nocheck
import { useState, useEffect } from 'react';
import { Alert, AppState, Platform } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import * as Haptics from 'expo-haptics';
import { authenticatedFetch } from '@/utils/authenticatedFetch';
import { getRegionsByCountry, getIdTypesByCountry } from '@/data/countries';

// Haptics must never break the user flow — swallow any errors
const safeImpact = (style) => {
  try {
    Haptics.impactAsync(style).catch(() => {});
  } catch (e) {
    // ignore
  }
};
const safeNotify = (type) => {
  try {
    Haptics.notificationAsync(type).catch(() => {});
  } catch (e) {
    // ignore
  }
};

const SUCCESS_MESSAGES = {
  seller: {
    title: "🎉 You're a Seller!",
    message:
      'You can start listing products now. Crestar charges one flat 3% fee on sales — you keep 97%. Complete payment setup via Profile → Settings → Wallet to receive payouts.',
    buttonText: 'Go to Seller Center',
  },
  foodhub: {
    title: '🎉 FoodHub Ready!',
    message:
      'You can start adding menu items now. Crestar charges one flat 3% fee on sales — you keep 97%. Complete payment setup via Profile → Settings → Wallet to receive payouts.',
    buttonText: 'Go to FoodHub',
  },
  creator: {
    title: "🎉 You're a Creator!",
    message:
      'Your creator account is live! Tag products in your videos and earn the commission each seller sets — 5% by default — on every sale you drive. Crestar takes one flat 3% fee, so you keep 97% of your commission. No stock needed!',
    buttonText: 'Start Creating',
  },
  deliverer: {
    title: "🎉 You're a Deliverer!",
    message:
      'You keep 97% of every delivery fee — Crestar takes one flat 3%. Go online to start accepting delivery requests.',
    buttonText: 'Go to Dashboard',
  },
};

export function useMonetizationOnboarding(
  isAuthenticated,
  isReady,
  auth,
  signIn,
  upload,
  uploading
) {
  const [selectedOption, setSelectedOption] = useState(null);
  const [step, setStep] = useState(1);
  const [uploadProgress, setUploadProgress] = useState(null);
  const [formData, setFormData] = useState({
    fullName: '',
    businessName: '',
    phoneNumber: '',
    vehicleType: '',
    country: '',
    region: '',
    city: '',
    idType: '',
    idPhotoFront: null,
    idPhotoBack: null,
    businessPermitPhoto: null,
    vehiclePhoto: null,
  });
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Background upload state persistence
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState === 'background' && uploading) {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
    });

    return () => {
      subscription?.remove();
    };
  }, [uploading]);

  const resetForm = () => {
    setFormData({
      fullName: '',
      businessName: '',
      phoneNumber: '',
      vehicleType: '',
      country: '',
      region: '',
      city: '',
      idType: '',
      idPhotoFront: null,
      idPhotoBack: null,
      businessPermitPhoto: null,
      vehiclePhoto: null,
    });
    setErrors({});
    setStep(1);
  };

  const handleSelectPath = (option) => {
    // Update state FIRST so the tap always responds, then haptics
    setSelectedOption(option);
    resetForm();
    safeImpact(Haptics.ImpactFeedbackStyle.Medium);
  };

  const handleBack = () => {
    safeImpact(Haptics.ImpactFeedbackStyle.Light);
    if (step > 1) {
      setStep(step - 1);
    } else {
      setSelectedOption(null);
      resetForm();
    }
  };

  const handleInputChange = (key, value) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
    if (errors[key]) {
      setErrors((prev) => ({ ...prev, [key]: null }));
    }
  };

  const compressImage = async (asset) => {
    try {
      safeImpact(Haptics.ImpactFeedbackStyle.Light);
      setUploadProgress({
        status: 'compressing',
        message: 'Optimizing image...',
      });

      const { width, height } = asset;
      const maxDimension = 1920;

      let resize = undefined;
      if (width > maxDimension || height > maxDimension) {
        const scale = maxDimension / Math.max(width, height);
        resize = {
          width: Math.round(width * scale),
          height: Math.round(height * scale),
        };
      }

      const manipResult = await ImageManipulator.manipulateAsync(
        asset.uri,
        resize ? [{ resize }] : [],
        {
          compress: 0.7,
          format: ImageManipulator.SaveFormat.JPEG,
        }
      );

      safeNotify(Haptics.NotificationFeedbackType.Success);

      return {
        ...asset,
        uri: manipResult.uri,
        width: manipResult.width,
        height: manipResult.height,
        mimeType: 'image/jpeg',
      };
    } catch (error) {
      console.error('Compression failed, using original:', error);
      safeNotify(Haptics.NotificationFeedbackType.Warning);
      return asset;
    }
  };

  const handleImagePick = async (key) => {
    try {
      safeImpact(Haptics.ImpactFeedbackStyle.Light);

      // Determine if this is an ID photo field (front or back)
      const isIdPhoto = key === 'idPhotoFront' || key === 'idPhotoBack';

      // Build alert options based on field type
      const alertOptions = [
        {
          text: 'Take Photo',
          onPress: async () => {
            try {
              const cameraPermission = await ImagePicker.requestCameraPermissionsAsync();

              if (!cameraPermission.granted) {
                safeNotify(Haptics.NotificationFeedbackType.Error);
                Alert.alert(
                  'Camera Permission Required',
                  'Please allow camera access in your device settings to capture ID photos.'
                );
                return;
              }

              safeImpact(Haptics.ImpactFeedbackStyle.Medium);
              const result = await ImagePicker.launchCameraAsync({
                mediaTypes: ['images'],
                allowsEditing: false,
                quality: 0.9,
              });

              if (!result.canceled && result.assets[0]) {
                handleInputChange(key, null);
                await uploadImageDirectly(result.assets[0], key).catch(() => {});
              }
            } catch (cameraError) {
              console.error('Camera error:', cameraError);
              safeNotify(Haptics.NotificationFeedbackType.Error);
              Alert.alert(
                'Camera Error',
                'Failed to open camera. Please try selecting from gallery instead.'
              );
            }
          },
        },
        {
          text: 'Choose from Gallery',
          onPress: async () => {
            try {
              const libraryPermission = await ImagePicker.requestMediaLibraryPermissionsAsync();

              if (!libraryPermission.granted) {
                safeNotify(Haptics.NotificationFeedbackType.Error);
                Alert.alert(
                  'Gallery Permission Required',
                  'Please allow gallery access in your device settings to select photos.'
                );
                return;
              }

              safeImpact(Haptics.ImpactFeedbackStyle.Medium);
              const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ['images'],
                allowsEditing: false,
                quality: 0.9,
              });

              if (!result.canceled && result.assets[0]) {
                handleInputChange(key, null);
                await uploadImageDirectly(result.assets[0], key).catch(() => {});
              }
            } catch (libraryError) {
              console.error('Library error:', libraryError);
              safeNotify(Haptics.NotificationFeedbackType.Error);
              Alert.alert('Gallery Error', 'Failed to access gallery. Please try again.');
            }
          },
        },
      ];

      // "Upload Both Sides" convenience option — iOS only, because Android
      // alerts support a maximum of 3 buttons (a 4th button is silently dropped)
      if (isIdPhoto && Platform.OS === 'ios') {
        alertOptions.push({
          text: 'Upload Both Sides',
          onPress: () => handleMultiImagePick(),
        });
      }

      // Add cancel button
      alertOptions.push({
        text: 'Cancel',
        style: 'cancel',
        onPress: () => safeImpact(Haptics.ImpactFeedbackStyle.Light),
      });

      Alert.alert(
        'Upload Image',
        isIdPhoto ? 'Choose how you want to upload your ID' : 'Choose upload method',
        alertOptions,
        { cancelable: true }
      );
    } catch (error) {
      console.error('Image pick error:', error);
      safeNotify(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Error', 'Failed to select image. Please try again.');
    }
  };

  const handleMultiImagePick = async () => {
    try {
      safeImpact(Haptics.ImpactFeedbackStyle.Medium);

      const libraryPermission = await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (!libraryPermission.granted) {
        safeNotify(Haptics.NotificationFeedbackType.Error);
        Alert.alert(
          'Gallery Permission Required',
          'Please allow gallery access to select multiple photos.'
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsMultipleSelection: true,
        selectionLimit: 2,
        quality: 0.9,
      });

      if (!result.canceled && result.assets.length > 0) {
        safeNotify(Haptics.NotificationFeedbackType.Success);

        // Upload sequentially: first image → front, second image → back.
        // No stale-state rollback tricks — each upload either succeeds and
        // sets its own field, or throws and we tell the user which one failed.
        try {
          handleInputChange('idPhotoFront', null);
          handleInputChange('idPhotoBack', null);

          const frontUrl = await uploadImageDirectly(result.assets[0], 'idPhotoFront', {
            silent: true,
          });

          let backUrl = null;
          if (result.assets[1]) {
            backUrl = await uploadImageDirectly(result.assets[1], 'idPhotoBack', {
              silent: true,
            });
          }

          if (frontUrl && result.assets[1] && !backUrl) {
            Alert.alert(
              'Partial Upload',
              'The front of your ID was uploaded, but the back failed. Please tap the back photo field to try again.',
              [{ text: 'OK' }]
            );
          } else if (frontUrl) {
            safeNotify(Haptics.NotificationFeedbackType.Success);
            Alert.alert(
              'Success',
              result.assets[1]
                ? 'Both ID sides uploaded successfully! ✓'
                : 'ID photo uploaded successfully! ✓',
              [{ text: 'OK' }]
            );
          }
        } catch (error) {
          console.error('Multi-upload failed:', error);
          Alert.alert(
            'Upload Failed',
            'One of the images failed to upload. Please check your connection and try again — any photo that did upload has been kept.',
            [{ text: 'OK' }]
          );
        }
      }
    } catch (error) {
      console.error('Multi-image pick error:', error);
      safeNotify(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Error', 'Failed to select images. Please try again.');
    }
  };

  const uploadImageDirectly = async (asset, key, options = {}) => {
    const { silent = false } = options;
    try {
      // 🛡️ CRITICAL: Validate asset is not a string (URL from previous upload)
      if (typeof asset === 'string') {
        safeNotify(Haptics.NotificationFeedbackType.Error);
        Alert.alert(
          'Image Already Uploaded',
          'This image is already uploaded. To change it, please select a new image from your device.',
          [{ text: 'OK' }]
        );
        return null;
      }

      // 🛡️ Validate asset has required properties
      if (!asset || typeof asset !== 'object' || !asset.uri) {
        safeNotify(Haptics.NotificationFeedbackType.Error);
        Alert.alert(
          'Invalid Image',
          'The selected image is invalid. Please try selecting a different image.',
          [{ text: 'OK' }]
        );
        return null;
      }

      // 🛡️ Validate image format (JPG, PNG, WebP only)
      const validFormats = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
      if (asset.mimeType && !validFormats.includes(asset.mimeType.toLowerCase())) {
        safeNotify(Haptics.NotificationFeedbackType.Error);
        Alert.alert(
          'Invalid Format',
          `Please use JPG, PNG, or WebP images only. Selected format: ${asset.mimeType}`,
          [{ text: 'OK' }]
        );
        return null;
      }

      safeImpact(Haptics.ImpactFeedbackStyle.Medium);
      setUploadProgress({
        status: 'preparing',
        message: 'Preparing upload...',
      });

      const compressedAsset = await compressImage(asset);

      setUploadProgress({
        status: 'uploading',
        message: 'Uploading image...',
      });

      // Direct upload with detailed error handling
      const result = await upload({
        reactNativeAsset: compressedAsset,
      });

      if (result.error) {
        console.error(`Upload failed for ${key}:`, result.error);
        safeNotify(Haptics.NotificationFeedbackType.Error);
        setUploadProgress(null);

        // Show more specific error message based on error type
        const errorMessage = result.error.includes('Network')
          ? 'Network error. Please check your internet connection and try again.'
          : result.error.includes('timed out')
            ? 'Upload timed out. Please try again with a better connection.'
            : result.error.includes('too large')
              ? 'Image file is too large. Please try a smaller image.'
              : result.error.includes('Invalid')
                ? 'Invalid image format. Please use JPG, PNG, or WebP.'
                : result.error.includes('URL string') || result.error.includes('existing URL')
                  ? 'Cannot re-upload an existing image. Please select a new image from your device.'
                  : 'Failed to upload image. Please try again.';

        Alert.alert('Upload Failed', errorMessage, [{ text: 'OK' }]);

        // Throw error to trigger rollback in multi-upload
        throw new Error(errorMessage);
      }

      if (!result.url) {
        safeNotify(Haptics.NotificationFeedbackType.Error);
        setUploadProgress(null);

        Alert.alert('Upload Failed', 'Server did not return image URL. Please try again.', [
          { text: 'OK' },
        ]);

        throw new Error('Server did not return image URL. Please try again.');
      }

      safeNotify(Haptics.NotificationFeedbackType.Success);

      // Update form data with the URL - image preview will display immediately
      handleInputChange(key, result.url);

      setUploadProgress(null);

      if (!silent) {
        Alert.alert('Success', 'Image uploaded successfully! ✓', [{ text: 'OK' }]);
      }

      return result.url;
    } catch (uploadError) {
      console.error(`Upload exception for ${key}:`, uploadError.message);

      safeNotify(Haptics.NotificationFeedbackType.Error);
      setUploadProgress(null);

      // Only show alert if we haven't already shown one above
      // (Check if error was already handled by showing specific message)
      if (
        !uploadError.message.includes('Network') &&
        !uploadError.message.includes('timed out') &&
        !uploadError.message.includes('too large') &&
        !uploadError.message.includes('Invalid') &&
        !uploadError.message.includes('URL string') &&
        !uploadError.message.includes('existing URL') &&
        !uploadError.message.includes('Server did not return')
      ) {
        const errorMessage =
          uploadError.message ||
          'An unexpected error occurred. Please check your internet connection and try again.';

        Alert.alert('Upload Error', errorMessage, [{ text: 'OK' }]);
      }

      // Re-throw to trigger rollback in multi-upload
      throw uploadError;
    }
  };

  const validateStep = () => {
    const newErrors = {};

    if (step === 1) {
      if (!formData.fullName) newErrors.fullName = 'Full name is required';

      // Sellers and FoodHubs need business name and phone number
      if (selectedOption?.id === 'seller' || selectedOption?.id === 'foodhub') {
        if (!formData.businessName) newErrors.businessName = 'Business name is required';
        if (!formData.phoneNumber) newErrors.phoneNumber = 'Phone number is required';
      }

      // Deliverers need phone number and vehicle type
      if (selectedOption?.id === 'deliverer') {
        if (!formData.phoneNumber) newErrors.phoneNumber = 'Phone number is required';
        if (!formData.vehicleType) newErrors.vehicleType = 'Vehicle type is required';
      }
    } else if (step === 2) {
      if (!formData.country) newErrors.country = 'Country is required';
      if (!formData.region) newErrors.region = 'Region is required';
      if (!formData.city) newErrors.city = 'City is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = (onSubmit) => {
    safeImpact(Haptics.ImpactFeedbackStyle.Medium);
    if (!validateStep()) {
      safeNotify(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Missing Information', 'Please fill in all required fields');
      return;
    }

    if (step === 2) {
      safeNotify(Haptics.NotificationFeedbackType.Success);
      onSubmit();
    } else {
      safeNotify(Haptics.NotificationFeedbackType.Success);
      setStep(step + 1);
    }
  };

  const handleSubmit = async (router) => {
    safeImpact(Haptics.ImpactFeedbackStyle.Heavy);

    // ✅ Validate business center type is valid before submission
    const validCenterTypes = ['seller', 'foodhub', 'deliverer', 'creator'];
    if (!selectedOption?.centerType || !validCenterTypes.includes(selectedOption.centerType)) {
      safeNotify(Haptics.NotificationFeedbackType.Error);
      Alert.alert(
        'Invalid Selection',
        'The selected business center type is invalid. Please go back and select again.'
      );
      return;
    }

    setIsSubmitting(true);

    try {
      const payload = {
        centerType: selectedOption.centerType,
        fullName: formData.fullName,
        businessName: formData.businessName || null,
        phoneNumber: formData.phoneNumber || null,
        vehicleType: formData.vehicleType || null,
        country: formData.country,
        region: formData.region,
        city: formData.city,
        vehiclePhoto: formData.vehiclePhoto || null,
      };

      const response = await authenticatedFetch('/api/business-centers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));

        // ✅ User already has a business center — redirect them to its dashboard
        if (response.status === 400 && errData.dashboard_route) {
          safeNotify(Haptics.NotificationFeedbackType.Warning);
          Alert.alert(
            'Already Set Up',
            'You already have a business center. Taking you to your dashboard.',
            [
              {
                text: 'OK',
                onPress: () => router.replace(errData.dashboard_route),
              },
            ]
          );
          return;
        }

        throw new Error(errData.error || 'Failed to submit application');
      }

      const result = await response.json();

      const msg = SUCCESS_MESSAGES[selectedOption.centerType];

      safeNotify(Haptics.NotificationFeedbackType.Success);

      Alert.alert(msg.title, msg.message, [
        {
          text: msg.buttonText,
          onPress: () => {
            const dashboardRoute = result.dashboard_route || selectedOption.dashboardRoute;
            router.replace(dashboardRoute);
          },
        },
      ]);
    } catch (error) {
      console.error('Onboarding error:', error);
      safeNotify(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Error', error.message || 'Failed to submit application. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const availableRegions = getRegionsByCountry(formData.country);
  const availableIdTypes = getIdTypesByCountry(formData.country);

  return {
    selectedOption,
    step,
    formData,
    errors,
    isSubmitting,
    uploading,
    uploadProgress,
    availableRegions,
    availableIdTypes,
    handleSelectPath,
    handleBack,
    handleInputChange,
    handleImagePick,
    handleNext,
    handleSubmit,
  };
}
