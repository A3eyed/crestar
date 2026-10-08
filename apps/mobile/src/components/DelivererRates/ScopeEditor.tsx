// @ts-nocheck
import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity } from 'react-native';
import { Plus, X } from 'lucide-react-native';
import SearchableSelectModal from '../SearchableSelectModal';
import { COUNTRIES, getRegionsByCountry } from '../../data/countries';

function Chips({ values, onRemove, colors }) {
  if (!values || values.length === 0) return null;
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 10 }}>
      {values.map((value) => (
        <View
          key={value}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 6,
            paddingHorizontal: 10,
            paddingVertical: 6,
            borderRadius: 8,
            backgroundColor: 'rgba(212, 175, 55, 0.15)',
          }}
        >
          <Text style={{ color: '#D4AF37', fontSize: 13, fontWeight: '600' }}>{value}</Text>
          <TouchableOpacity onPress={() => onRemove(value)} hitSlop={8}>
            <X size={13} color="#D4AF37" />
          </TouchableOpacity>
        </View>
      ))}
    </View>
  );
}

/**
 * Where a deliverer is willing to collect from / drop off.
 * Leaving everything empty means "anywhere".
 */
export default function ScopeEditor({ title, blurb, scope, onChange, colors }) {
  const [townDraft, setTownDraft] = useState('');
  const [countryForRegions, setCountryForRegions] = useState('');

  const countries = scope?.countries || [];
  const regions = scope?.regions || [];
  const towns = scope?.towns || [];

  const patch = (next) => onChange({ ...scope, ...next });

  const addTown = () => {
    const value = townDraft.trim();
    if (!value) return;
    if (towns.some((t) => t.toLowerCase() === value.toLowerCase())) {
      setTownDraft('');
      return;
    }
    patch({ towns: [...towns, value] });
    setTownDraft('');
  };

  const regionOptions = countryForRegions
    ? getRegionsByCountry(COUNTRIES.find((c) => c.name === countryForRegions)?.code) || []
    : [];

  return (
    <View
      style={{
        padding: 14,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: colors.cardBackground,
        marginBottom: 16,
      }}
    >
      <Text style={{ color: colors.text, fontSize: 15, fontWeight: '700' }}>{title}</Text>
      {blurb ? (
        <Text style={{ color: colors.textTertiary, fontSize: 12, marginTop: 3, marginBottom: 14 }}>
          {blurb}
        </Text>
      ) : null}

      {/* Countries */}
      <Chips
        values={countries}
        onRemove={(value) => patch({ countries: countries.filter((c) => c !== value) })}
        colors={colors}
      />
      <SearchableSelectModal
        label="Add a country"
        placeholder="Select country"
        searchPlaceholder="Search countries..."
        options={COUNTRIES.map((c) => ({ value: c.name, label: c.name }))}
        selectedValue=""
        onSelect={(value) => {
          setCountryForRegions(value);
          if (!countries.includes(value)) patch({ countries: [...countries, value] });
        }}
        accentColor={colors.accent}
        colors={colors}
      />

      {/* Regions */}
      <Chips
        values={regions}
        onRemove={(value) => patch({ regions: regions.filter((r) => r !== value) })}
        colors={colors}
      />
      {regionOptions.length > 0 ? (
        <SearchableSelectModal
          label={`Add a region in ${countryForRegions}`}
          placeholder="Select region"
          searchPlaceholder="Search regions..."
          options={regionOptions}
          selectedValue=""
          onSelect={(value) => {
            if (!regions.includes(value)) patch({ regions: [...regions, value] });
          }}
          accentColor={colors.accent}
          colors={colors}
        />
      ) : null}

      {/* Towns */}
      <Chips
        values={towns}
        onRemove={(value) => patch({ towns: towns.filter((t) => t !== value) })}
        colors={colors}
      />
      <Text style={{ color: colors.text, fontSize: 14, fontWeight: '600', marginBottom: 8 }}>
        Add a town
      </Text>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <TextInput
          value={townDraft}
          onChangeText={setTownDraft}
          onSubmitEditing={addTown}
          placeholder="e.g. Tema"
          placeholderTextColor={colors.inputPlaceholder}
          style={{
            flex: 1,
            backgroundColor: colors.inputBackground,
            borderWidth: 1,
            borderColor: colors.inputBorder,
            borderRadius: 12,
            paddingHorizontal: 14,
            paddingVertical: 12,
            color: colors.text,
            fontSize: 14,
          }}
        />
        <TouchableOpacity
          onPress={addTown}
          style={{
            width: 46,
            borderRadius: 12,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: colors.accent,
          }}
        >
          <Plus size={18} color={colors.accentText} />
        </TouchableOpacity>
      </View>
    </View>
  );
}
