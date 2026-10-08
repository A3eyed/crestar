// @ts-nocheck
import { useMemo, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  Modal,
  FlatList,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { X, Search, ChevronDown, Check } from 'lucide-react-native';

/**
 * SearchableSelectModal
 *
 * A type-ahead dropdown field. Renders as a tappable field; when tapped it
 * opens a modal with a search box where the user can type to filter the
 * options and select one — no endless scrolling through long lists.
 *
 * Props:
 * - label: field label shown above the trigger
 * - required: shows a required asterisk
 * - placeholder: text when nothing selected (e.g. "Select your country...")
 * - searchPlaceholder: placeholder inside the search box
 * - options: array of { value, label } (or plain strings)
 * - selectedValue: currently selected value
 * - onSelect: (value) => void
 * - accentColor: highlight color for the selected state
 * - colors: theme colors object
 */
export default function SearchableSelectModal({
  label,
  required = false,
  placeholder = 'Select...',
  searchPlaceholder = 'Type to search...',
  options = [],
  selectedValue,
  onSelect,
  accentColor = '#D4AF37',
  colors,
}) {
  const insets = useSafeAreaInsets();
  const [visible, setVisible] = useState(false);
  const [query, setQuery] = useState('');

  // Normalize options to { value, label }
  const normalized = useMemo(
    () => options.map((opt) => (typeof opt === 'string' ? { value: opt, label: opt } : opt)),
    [options]
  );

  const selectedLabel = useMemo(() => {
    const found = normalized.find((o) => o.value === selectedValue);
    return found?.label || '';
  }, [normalized, selectedValue]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return normalized;
    return normalized.filter((o) => o.label.toLowerCase().includes(q));
  }, [normalized, query]);

  const openModal = () => {
    setQuery('');
    setVisible(true);
  };

  const handleSelect = (value) => {
    onSelect(value);
    setVisible(false);
  };

  return (
    <View style={{ marginBottom: 24 }}>
      {label ? (
        <Text
          style={{
            color: colors.text,
            fontSize: 15,
            fontWeight: '600',
            marginBottom: 8,
          }}
        >
          {label} {required && <Text style={{ color: accentColor }}>*</Text>}
        </Text>
      ) : null}

      {/* Trigger field */}
      <TouchableOpacity
        onPress={openModal}
        style={{
          backgroundColor: colors.inputBackground,
          borderWidth: 1.5,
          borderColor: selectedValue ? accentColor : colors.inputBorder,
          borderRadius: 12,
          paddingHorizontal: 16,
          paddingVertical: 15,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <Text
          style={{
            color: selectedValue ? colors.text : colors.inputPlaceholder,
            fontSize: 15,
            flex: 1,
          }}
          numberOfLines={1}
        >
          {selectedLabel || placeholder}
        </Text>
        <ChevronDown size={18} color={colors.textTertiary} />
      </TouchableOpacity>

      {/* Search modal */}
      <Modal visible={visible} animationType="slide" transparent>
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View
            style={{
              flex: 1,
              backgroundColor: colors.modalBackground,
              justifyContent: 'flex-end',
            }}
          >
            <View
              style={{
                backgroundColor: colors.background,
                borderTopLeftRadius: 24,
                borderTopRightRadius: 24,
                height: '80%',
                paddingBottom: insets.bottom,
              }}
            >
              {/* Header */}
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  paddingHorizontal: 20,
                  paddingTop: 20,
                  paddingBottom: 12,
                }}
              >
                <Text style={{ color: colors.text, fontSize: 18, fontWeight: '700' }}>
                  {label || 'Select'}
                </Text>
                <TouchableOpacity
                  onPress={() => setVisible(false)}
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 16,
                    backgroundColor: colors.cardBackgroundAlt,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <X size={18} color={colors.text} />
                </TouchableOpacity>
              </View>

              {/* Search box */}
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  backgroundColor: colors.inputBackground,
                  borderWidth: 1,
                  borderColor: colors.inputBorder,
                  borderRadius: 12,
                  paddingHorizontal: 12,
                  marginHorizontal: 20,
                  marginBottom: 12,
                }}
              >
                <Search size={18} color={colors.textTertiary} />
                <TextInput
                  placeholder={searchPlaceholder}
                  placeholderTextColor={colors.inputPlaceholder}
                  value={query}
                  onChangeText={setQuery}
                  autoFocus
                  autoCorrect={false}
                  autoCapitalize="none"
                  style={{
                    flex: 1,
                    paddingVertical: 12,
                    paddingHorizontal: 8,
                    color: colors.text,
                    fontSize: 15,
                  }}
                />
              </View>

              {/* Results */}
              <FlatList
                data={filtered}
                keyExtractor={(item) => String(item.value)}
                keyboardShouldPersistTaps="handled"
                renderItem={({ item }) => {
                  const isSelected = item.value === selectedValue;
                  return (
                    <TouchableOpacity
                      onPress={() => handleSelect(item.value)}
                      style={{
                        paddingHorizontal: 20,
                        paddingVertical: 15,
                        borderBottomWidth: 1,
                        borderBottomColor: colors.borderLight,
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        backgroundColor: isSelected ? accentColor + '15' : 'transparent',
                      }}
                    >
                      <Text
                        style={{
                          color: isSelected ? accentColor : colors.text,
                          fontSize: 15,
                          fontWeight: isSelected ? '600' : '400',
                          flex: 1,
                        }}
                      >
                        {item.label}
                      </Text>
                      {isSelected && <Check size={18} color={accentColor} />}
                    </TouchableOpacity>
                  );
                }}
                ListEmptyComponent={
                  <View style={{ alignItems: 'center', paddingVertical: 40 }}>
                    <Text style={{ color: colors.textSecondary, fontSize: 15 }}>
                      No matches for "{query}"
                    </Text>
                  </View>
                }
              />
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}
