// @ts-nocheck
import { View } from "react-native";
import { MapPin } from "lucide-react-native";
import { CountrySelector } from "./CountrySelector";
import { RegionSelector } from "./RegionSelector";
import { FormInput } from "./FormInput";
import { StepIndicator } from "./StepIndicator";

export function LocationStep({
  selectedOption,
  formData,
  errors,
  availableRegions,
  onInputChange,
  colors,
}) {
  return (
    <>
      <StepIndicator
        icon={MapPin}
        title="Location Information"
        description="Select your country and location for verification"
        color={selectedOption.color}
        colors={colors}
      />

      <CountrySelector
        selectedCountry={formData.country}
        onSelect={(code) => {
          onInputChange("country", code);
          onInputChange("region", "");
          onInputChange("idType", "");
          // Reset ID photos when country changes to prevent mismatched submissions
          onInputChange("idPhotoFront", null);
          onInputChange("idPhotoBack", null);
          onInputChange("businessPermitPhoto", null);
        }}
        selectedColor={selectedOption.color}
        colors={colors}
      />

      {formData.country && (
        <RegionSelector
          regions={availableRegions}
          selectedRegion={formData.region}
          onSelect={(region) => onInputChange("region", region)}
          selectedColor={selectedOption.color}
          colors={colors}
        />
      )}

      {formData.region && (
        <FormInput
          label="City/Town"
          required
          placeholder="e.g. Accra, Lagos, Nairobi..."
          value={formData.city}
          onChangeText={(value) => onInputChange("city", value)}
          error={errors.city}
          colors={colors}
        />
      )}
    </>
  );
}
