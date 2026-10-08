// @ts-nocheck
// Web sizing constants — synchronized with the mobile app standards
// (apps/mobile/src/utils/sizingUtils.ts). Keep both files in sync.

export const SIZING_CATEGORIES = [
  { key: 'apparel', label: 'Apparel', icon: '👕', description: 'XS–6XL with size system & type' },
  {
    key: 'shoes',
    label: 'Shoes / Footwear',
    icon: '👟',
    description: 'Numeric + width designations',
  },
  { key: 'pants', label: 'Pants / Jeans', icon: '👖', description: 'Waist × Inseam (e.g. 32/34)' },
  {
    key: 'dress_shirts',
    label: 'Dress Shirts',
    icon: '👔',
    description: 'Neck × Sleeve (e.g. 15/32)',
  },
  {
    key: 'home_furniture',
    label: 'Home & Furniture',
    icon: '🛋️',
    description: 'L × W × H dimensions',
  },
  {
    key: 'bags',
    label: 'Bags & Backpacks',
    icon: '🎒',
    description: 'Volume / Capacity (e.g. 20L)',
  },
  {
    key: 'unit_count',
    label: 'Unit / Count',
    icon: '📦',
    description: 'Pack count (e.g. 12-count)',
  },
  { key: 'custom', label: 'Custom / Other', icon: '✏️', description: 'Free-text sizing' },
  { key: 'none', label: 'No Sizing', icon: '—', description: 'One size / not applicable' },
];

export const SIZE_SYSTEMS = ['US', 'UK', 'EU', 'IT', 'JP', 'AU', 'FR'];

export const SIZE_TYPES = ['Regular', 'Petite', 'Tall', 'Plus', 'Maternity'];

export const ALPHA_SIZES_ORDERED = [
  'XS',
  'S',
  'M',
  'L',
  'XL',
  'XXL',
  'XXXL',
  '4XL',
  '5XL',
  '6XL',
  'One Size',
];

export const SHOE_SIZES_US = [
  '4',
  '4.5',
  '5',
  '5.5',
  '6',
  '6.5',
  '7',
  '7.5',
  '8',
  '8.5',
  '9',
  '9.5',
  '10',
  '10.5',
  '11',
  '11.5',
  '12',
  '12.5',
  '13',
  '14',
  '15',
];
export const SHOE_SIZES_UK = [
  '3',
  '3.5',
  '4',
  '4.5',
  '5',
  '5.5',
  '6',
  '6.5',
  '7',
  '7.5',
  '8',
  '8.5',
  '9',
  '9.5',
  '10',
  '10.5',
  '11',
  '12',
  '13',
  '14',
];
export const SHOE_SIZES_EU = [
  '35',
  '36',
  '37',
  '38',
  '39',
  '40',
  '41',
  '42',
  '43',
  '44',
  '45',
  '46',
  '47',
  '48',
];
export const SHOE_SIZES_JP = [
  '22',
  '22.5',
  '23',
  '23.5',
  '24',
  '24.5',
  '25',
  '25.5',
  '26',
  '26.5',
  '27',
  '27.5',
  '28',
  '28.5',
  '29',
  '30',
];

export const SHOE_WIDTHS = ['N (Narrow)', 'M (Medium)', 'W (Wide)', 'XW (Extra Wide)'];

export const WAIST_SIZES = [
  '24',
  '25',
  '26',
  '27',
  '28',
  '29',
  '30',
  '31',
  '32',
  '33',
  '34',
  '35',
  '36',
  '38',
  '40',
  '42',
  '44',
  '46',
  '48',
  '50',
  '52',
];
export const INSEAM_SIZES = ['26', '28', '30', '32', '34', '36'];

export const NECK_SIZES = [
  '13',
  '13.5',
  '14',
  '14.5',
  '15',
  '15.5',
  '16',
  '16.5',
  '17',
  '17.5',
  '18',
  '18.5',
  '19',
];
export const SLEEVE_SIZES = ['30', '31', '32', '33', '34', '35', '36'];

export const BAG_VOLUMES = [
  '5L',
  '8L',
  '10L',
  '12L',
  '15L',
  '18L',
  '20L',
  '22L',
  '25L',
  '30L',
  '35L',
  '40L',
  '45L',
  '50L',
  '60L',
  '70L',
  '80L',
  '100L',
];

export const UNIT_COUNTS = [
  '1-count',
  '2-count',
  '3-count',
  '4-count',
  '6-count',
  '8-count',
  '10-count',
  '12-count',
  '16-count',
  '24-count',
  '32-count',
  '36-count',
  '48-count',
  '72-count',
  '100-count',
];

export const DIMENSION_UNITS = ['cm', 'inches'];

// Categories that require per-variant size selection (same as mobile)
export const PER_VARIANT_SIZING = [
  'apparel',
  'shoes',
  'pants',
  'dress_shirts',
  'bags',
  'unit_count',
  'custom',
];

function getShoeSizesForSystem(system) {
  switch (system) {
    case 'UK':
      return SHOE_SIZES_UK;
    case 'EU':
      return SHOE_SIZES_EU;
    case 'JP':
      return SHOE_SIZES_JP;
    default:
      return SHOE_SIZES_US;
  }
}

/**
 * Returns the selectable size options for a sizing category + size system.
 * For pants and dress shirts, returns combined options (e.g. "32/34", "15/32").
 */
export function getSizeOptions(sizingCategory, sizeSystem = 'US') {
  switch (sizingCategory) {
    case 'apparel':
      return ALPHA_SIZES_ORDERED;
    case 'shoes':
      return getShoeSizesForSystem(sizeSystem);
    case 'pants': {
      const combos = [];
      WAIST_SIZES.forEach((w) => {
        INSEAM_SIZES.forEach((i) => {
          combos.push(`${w}/${i}`);
        });
      });
      return combos;
    }
    case 'dress_shirts': {
      const combos = [];
      NECK_SIZES.forEach((n) => {
        SLEEVE_SIZES.forEach((s) => {
          combos.push(`${n}/${s}`);
        });
      });
      return combos;
    }
    case 'bags':
      return BAG_VOLUMES;
    case 'unit_count':
      return UNIT_COUNTS;
    default:
      return [];
  }
}
