// @ts-nocheck
import SearchableSelectModal from '@/components/SearchableSelectModal';

/**
 * Region/State selector — searchable dropdown.
 * User taps the field, types their region name, and picks from the
 * filtered list instead of scrolling a long horizontal chip row.
 */
export function RegionSelector({ regions, selectedRegion, onSelect, selectedColor, colors }) {
  return (
    <SearchableSelectModal
      label="Region/State"
      required
      placeholder="Select your region or state..."
      searchPlaceholder="Type your region name..."
      options={regions}
      selectedValue={selectedRegion}
      onSelect={onSelect}
      accentColor={selectedColor || '#D4AF37'}
      colors={colors}
    />
  );
}
