// @ts-nocheck
import { View, Text, TextInput } from "react-native";
import { AlertCircle } from "lucide-react-native";

export function FormInput({
  label,
  required,
  placeholder,
  value,
  onChangeText,
  error,
  colors,
  keyboardType,
}) {
  return (
    <View style={{ marginBottom: 24 }}>
      <Text
        style={{
          color: colors.text,
          fontSize: 15,
          fontWeight: "600",
          marginBottom: 8,
        }}
      >
        {label} {required && <Text style={{ color: "#D4AF37" }}>*</Text>}
      </Text>
      <View
        style={{
          borderRadius: 12,
          borderWidth: 1,
          borderColor: error ? "#D4AF37" : colors.inputBorder,
          backgroundColor: colors.inputBackground,
        }}
      >
        <TextInput
          placeholder={placeholder}
          placeholderTextColor={colors.inputPlaceholder}
          value={value}
          onChangeText={onChangeText}
          keyboardType={keyboardType}
          style={{ color: colors.text, fontSize: 15, padding: 16 }}
        />
      </View>
      {error && (
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 6,
            marginTop: 8,
          }}
        >
          <AlertCircle size={14} color="#D4AF37" />
          <Text style={{ color: "#D4AF37", fontSize: 13 }}>{error}</Text>
        </View>
      )}
    </View>
  );
}
