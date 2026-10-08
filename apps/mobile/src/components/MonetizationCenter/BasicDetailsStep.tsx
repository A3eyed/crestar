// @ts-nocheck
import { View } from "react-native";
import { FormInput } from "./FormInput";
import { VehicleTypeSelector } from "./VehicleTypeSelector";
import { StepIndicator } from "./StepIndicator";

export function BasicDetailsStep({
  selectedOption,
  formData,
  errors,
  onInputChange,
  colors,
}) {
  return (
    <>
      <StepIndicator
        icon={() => null}
        title="📋 Basic Information"
        description="Tell us about yourself and your business"
        color={selectedOption.color}
        colors={colors}
      />

      <FormInput
        label="Full Name"
        required
        placeholder="e.g. John Mensah"
        value={formData.fullName}
        onChangeText={(value) => onInputChange("fullName", value)}
        error={errors.fullName}
        colors={colors}
      />

      {(selectedOption.id === "seller" || selectedOption.id === "foodhub") && (
        <>
          <FormInput
            label={
              selectedOption.id === "foodhub"
                ? "Kitchen/Restaurant Name"
                : "Business Name"
            }
            required
            placeholder={
              selectedOption.id === "foodhub"
                ? "e.g. Mama's Kitchen"
                : "e.g. TechHub Ghana"
            }
            value={formData.businessName}
            onChangeText={(value) => onInputChange("businessName", value)}
            error={errors.businessName}
            colors={colors}
          />

          <FormInput
            label="Phone Number"
            required
            placeholder="+233 XX XXX XXXX"
            value={formData.phoneNumber}
            onChangeText={(value) => onInputChange("phoneNumber", value)}
            error={errors.phoneNumber}
            keyboardType="phone-pad"
            colors={colors}
          />
        </>
      )}

      {selectedOption.id === "deliverer" && (
        <>
          <FormInput
            label="Phone Number"
            required
            placeholder="+233 XX XXX XXXX"
            value={formData.phoneNumber}
            onChangeText={(value) => onInputChange("phoneNumber", value)}
            error={errors.phoneNumber}
            keyboardType="phone-pad"
            colors={colors}
          />

          <VehicleTypeSelector
            selectedValue={formData.vehicleType}
            onSelect={(value) => onInputChange("vehicleType", value)}
            selectedColor={selectedOption.color}
            colors={colors}
          />
        </>
      )}
    </>
  );
}
