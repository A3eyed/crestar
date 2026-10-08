// @ts-nocheck
import { View } from "react-native";
import { CheckCircle2 } from "lucide-react-native";
import { IdTypeSelector } from "./IdTypeSelector";
import { ImageUploadField } from "./ImageUploadField";
import { StepIndicator } from "./StepIndicator";

export function IdVerificationStep({
  selectedOption,
  formData,
  errors,
  availableIdTypes,
  onInputChange,
  onImagePick,
  uploading,
  uploadProgress,
  colors,
}) {
  const selectedIdType = availableIdTypes.find(
    (id) => id.code === formData.idType,
  );

  return (
    <>
      <StepIndicator
        icon={CheckCircle2}
        title="Identity Verification"
        description="Upload your ID for instant verification"
        color={selectedOption.color}
        colors={colors}
      />

      <IdTypeSelector
        idTypes={availableIdTypes}
        selectedIdType={formData.idType}
        onSelect={(code) => onInputChange("idType", code)}
        selectedColor={selectedOption.color}
        colors={colors}
      />

      <ImageUploadField
        label="ID Photo (Front)"
        required
        imageUrl={formData.idPhotoFront}
        onPress={() => onImagePick("idPhotoFront")}
        uploading={uploading}
        uploadProgress={uploadProgress}
        error={errors.idPhotoFront}
        colors={colors}
      />

      {selectedIdType?.requiresBothSides && (
        <ImageUploadField
          label="ID Photo (Back)"
          required
          imageUrl={formData.idPhotoBack}
          onPress={() => onImagePick("idPhotoBack")}
          uploading={uploading}
          uploadProgress={uploadProgress}
          error={errors.idPhotoBack}
          colors={colors}
        />
      )}

      {selectedOption.id === "foodhub" && (
        <ImageUploadField
          label="Business Permit (Optional)"
          helpText="Helps build trust with customers"
          imageUrl={formData.businessPermitPhoto}
          onPress={() => onImagePick("businessPermitPhoto")}
          uploading={uploading}
          uploadProgress={uploadProgress}
          colors={colors}
        />
      )}

      {selectedOption.id === "deliverer" && (
        <ImageUploadField
          label="Vehicle Photo (Optional)"
          imageUrl={formData.vehiclePhoto}
          onPress={() => onImagePick("vehiclePhoto")}
          uploading={uploading}
          uploadProgress={uploadProgress}
          colors={colors}
        />
      )}
    </>
  );
}
