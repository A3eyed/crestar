// @ts-nocheck
import { COUNTRIES } from '@/data/countries';
import SearchableSelectModal from '@/components/SearchableSelectModal';

/**
 * Country selector — searchable dropdown.
 * User taps the field, types their country name, and picks from the
 * filtered list instead of scrolling through the full country list.
 */
export function CountrySelector({ selectedCountry, onSelect, selectedColor, colors }) {
  const options = COUNTRIES.map((country) => ({
    value: country.code,
    label: country.name,
  }));

  return (
    <SearchableSelectModal
      label="Country"
      required
      placeholder="Select your country..."
      searchPlaceholder="Type your country name..."
      options={options}
      selectedValue={selectedCountry}
      onSelect={onSelect}
      accentColor={selectedColor || '#D4AF37'}
      colors={colors}
    />
  );
}
