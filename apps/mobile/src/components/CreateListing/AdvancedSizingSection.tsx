// @ts-nocheck
import { useState } from "react";
import { View, Text, TouchableOpacity, TextInput } from "react-native";
import { Plus, X } from "lucide-react-native";
import {
  SIZE_SYSTEMS,
  SIZE_TYPES,
  ALPHA_SIZES_ORDERED,
  SHOE_WIDTHS,
  WAIST_SIZES,
  INSEAM_SIZES,
  NECK_SIZES,
  SLEEVE_SIZES,
  BAG_VOLUMES,
  UNIT_COUNTS,
  DIMENSION_UNITS,
  buildApparelLabel,
  buildShoeLabel,
  generatePantsCombos,
  generateShirtCombos,
  normalizeSize,
  sortSizes,
  getShoesBySystem,
} from "../../utils/sizingUtils";

const GENERAL_TYPES = [
  {
    key: "none",
    icon: "📦",
    label: "No size",
    description: "Electronics, beauty, books, and other single items",
  },
  {
    key: "electronics",
    icon: "📱",
    label: "Electronics",
    description: "Storage, model, or connectivity",
  },
  {
    key: "apparel",
    icon: "👕",
    label: "Apparel",
    description: "Letter sizes and fit",
  },
  { key: "shoes", icon: "👟", label: "Shoes", description: "US, UK, EU, JP" },
  { key: "pants", icon: "👖", label: "Pants", description: "Waist and inseam" },
  {
    key: "dress_shirts",
    icon: "👔",
    label: "Dress shirts",
    description: "Neck and sleeve",
  },
  {
    key: "home_furniture",
    icon: "🛋️",
    label: "Home",
    description: "Length, width, height",
  },
  { key: "bags", icon: "🎒", label: "Bags", description: "Capacity" },
  {
    key: "unit_count",
    icon: "🔢",
    label: "Pack count",
    description: "Multipacks that are not food or drink",
  },
  {
    key: "custom",
    icon: "✏️",
    label: "Custom",
    description: "Your own labels",
  },
];

const DRINK_VOLUMES = ["250ml", "330ml", "500ml", "750ml", "1L", "1.5L"];
const DRINK_PACKS = [1, 4, 6, 12, 24];
const FOOD_SERVINGS = ["Single", "Regular", "Large", "Family"];
const FOOD_PREP = ["Standard", "Mild", "Medium", "Spicy"];
const FOOD_PACKS = [1, 2, 4, 6];
const ELECTRONICS_OPTIONS = [
  "64GB",
  "128GB",
  "256GB",
  "512GB",
  "1TB",
  "Wi-Fi",
  "Wi-Fi + Cellular",
  "Standard",
  "Pro",
];

function Chip({ label, selected, onPress, colors, small = false }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={{
        paddingHorizontal: small ? 12 : 16,
        paddingVertical: small ? 7 : 10,
        borderRadius: 20,
        backgroundColor: selected ? colors.accent : colors.cardBackground,
        borderWidth: 1,
        borderColor: selected ? colors.accent : colors.border,
        margin: 3,
      }}
    >
      <Text
        style={{
          color: selected ? "#FFFFFF" : colors.text,
          fontSize: small ? 13 : 14,
          fontWeight: selected ? "600" : "400",
        }}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}

function SectionLabel({ label, colors }) {
  return (
    <Text
      style={{
        color: colors.textTertiary,
        fontSize: 12,
        fontWeight: "700",
        letterSpacing: 0.8,
        textTransform: "uppercase",
        marginTop: 12,
        marginBottom: 8,
      }}
    >
      {label}
    </Text>
  );
}

function SelectedSizesBadge({ sizes, onRemove, colors }) {
  if (!sizes?.length) return null;
  return (
    <View style={{ flexDirection: "row", flexWrap: "wrap", marginBottom: 12 }}>
      {sizes.map((s) => (
        <TouchableOpacity
          key={s}
          onPress={() => onRemove(s)}
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 4,
            backgroundColor: "rgba(212,175,55,0.12)",
            borderRadius: 16,
            paddingHorizontal: 10,
            paddingVertical: 5,
            margin: 3,
            borderWidth: 1,
            borderColor: "rgba(212,175,55,0.3)",
          }}
        >
          <Text style={{ color: "#D4AF37", fontSize: 12, fontWeight: "600" }}>
            {s}
          </Text>
          <X size={11} color="#D4AF37" />
        </TouchableOpacity>
      ))}
    </View>
  );
}

function Field({ value, onChangeText, placeholder, colors, keyboardType }) {
  return (
    <TextInput
      placeholder={placeholder}
      placeholderTextColor={colors.inputPlaceholder}
      value={String(value ?? "")}
      onChangeText={onChangeText}
      keyboardType={keyboardType}
      style={{
        flex: 1,
        backgroundColor: colors.inputBackground,
        borderWidth: 1,
        borderColor: colors.inputBorder,
        borderRadius: 10,
        padding: 12,
        color: colors.text,
        fontSize: 14,
      }}
    />
  );
}

function DrinkVariants({ rows, onChange, colors }) {
  const list = rows?.length
    ? rows
    : [
        {
          volume: "500ml",
          flavor: "",
          packSize: 1,
          price: "",
          stock: "",
          weightGrams: "",
        },
      ];
  const update = (index, patch) =>
    onChange(list.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  return (
    <View>
      <Text
        style={{
          color: colors.text,
          fontSize: 17,
          fontWeight: "700",
          marginBottom: 4,
        }}
      >
        Bottle and pack variants
      </Text>
      <Text
        style={{ color: colors.textSecondary, fontSize: 13, marginBottom: 12 }}
      >
        Volume, flavor, and pack. Apparel sizing is not used here.
      </Text>
      {list.map((row, index) => (
        <View
          key={index}
          style={{
            borderWidth: 1,
            borderColor: colors.border,
            borderRadius: 12,
            padding: 12,
            marginBottom: 12,
            backgroundColor: colors.cardBackground,
          }}
        >
          <SectionLabel label="Volume" colors={colors} />
          <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
            {DRINK_VOLUMES.map((v) => (
              <Chip
                key={v}
                label={v}
                selected={row.volume === v}
                onPress={() => update(index, { volume: v })}
                colors={colors}
                small
              />
            ))}
          </View>
          <SectionLabel label="Pack" colors={colors} />
          <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
            {DRINK_PACKS.map((n) => (
              <Chip
                key={n}
                label={n === 1 ? "Single" : `${n}-pack`}
                selected={Number(row.packSize) === n}
                onPress={() => update(index, { packSize: n })}
                colors={colors}
                small
              />
            ))}
          </View>
          <View style={{ flexDirection: "row", gap: 8, marginTop: 10 }}>
            <Field
              value={row.flavor}
              onChangeText={(v) => update(index, { flavor: v })}
              placeholder="Flavor"
              colors={colors}
            />
            <Field
              value={row.price}
              onChangeText={(v) => update(index, { price: v })}
              placeholder="Price"
              colors={colors}
              keyboardType="decimal-pad"
            />
          </View>
          <View style={{ flexDirection: "row", gap: 8, marginTop: 8 }}>
            <Field
              value={row.stock}
              onChangeText={(v) => update(index, { stock: v })}
              placeholder="Stock"
              colors={colors}
              keyboardType="number-pad"
            />
            <Field
              value={row.weightGrams}
              onChangeText={(v) => update(index, { weightGrams: v })}
              placeholder="Pack weight (g)"
              colors={colors}
              keyboardType="number-pad"
            />
          </View>
          {list.length > 1 && (
            <TouchableOpacity
              onPress={() => onChange(list.filter((_, i) => i !== index))}
            >
              <Text style={{ color: "#F87171", marginTop: 8 }}>Remove</Text>
            </TouchableOpacity>
          )}
        </View>
      ))}
      <TouchableOpacity
        onPress={() =>
          onChange([
            ...list,
            {
              volume: "500ml",
              flavor: "",
              packSize: 1,
              price: "",
              stock: "",
              weightGrams: "",
            },
          ])
        }
      >
        <Text style={{ color: "#D4AF37", fontWeight: "700" }}>
          + Add drink variant
        </Text>
      </TouchableOpacity>
    </View>
  );
}

function FoodVariants({ rows, onChange, colors }) {
  const list = rows?.length
    ? rows
    : [
        {
          servingSize: "Regular",
          weightLabel: "",
          preparation: "Standard",
          packSize: 1,
          price: "",
          stock: "",
        },
      ];
  const update = (index, patch) =>
    onChange(list.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  return (
    <View>
      <Text
        style={{
          color: colors.text,
          fontSize: 17,
          fontWeight: "700",
          marginBottom: 4,
        }}
      >
        Serving and pack variants
      </Text>
      <Text
        style={{ color: colors.textSecondary, fontSize: 13, marginBottom: 12 }}
      >
        Weight, preparation, and pack. Apparel sizing is not used here.
      </Text>
      {list.map((row, index) => (
        <View
          key={index}
          style={{
            borderWidth: 1,
            borderColor: colors.border,
            borderRadius: 12,
            padding: 12,
            marginBottom: 12,
            backgroundColor: colors.cardBackground,
          }}
        >
          <SectionLabel label="Serving" colors={colors} />
          <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
            {FOOD_SERVINGS.map((v) => (
              <Chip
                key={v}
                label={v}
                selected={row.servingSize === v}
                onPress={() => update(index, { servingSize: v })}
                colors={colors}
                small
              />
            ))}
          </View>
          <SectionLabel label="Preparation" colors={colors} />
          <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
            {FOOD_PREP.map((v) => (
              <Chip
                key={v}
                label={v}
                selected={row.preparation === v}
                onPress={() => update(index, { preparation: v })}
                colors={colors}
                small
              />
            ))}
          </View>
          <SectionLabel label="Pack" colors={colors} />
          <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
            {FOOD_PACKS.map((n) => (
              <Chip
                key={n}
                label={n === 1 ? "Single" : `${n}-pack`}
                selected={Number(row.packSize) === n}
                onPress={() => update(index, { packSize: n })}
                colors={colors}
                small
              />
            ))}
          </View>
          <View style={{ flexDirection: "row", gap: 8, marginTop: 10 }}>
            <Field
              value={row.weightLabel}
              onChangeText={(v) => update(index, { weightLabel: v })}
              placeholder="Weight, e.g. 400g"
              colors={colors}
            />
            <Field
              value={row.price}
              onChangeText={(v) => update(index, { price: v })}
              placeholder="Price"
              colors={colors}
              keyboardType="decimal-pad"
            />
          </View>
          <View style={{ marginTop: 8 }}>
            <Field
              value={row.stock}
              onChangeText={(v) => update(index, { stock: v })}
              placeholder="Stock"
              colors={colors}
              keyboardType="number-pad"
            />
          </View>
          {list.length > 1 && (
            <TouchableOpacity
              onPress={() => onChange(list.filter((_, i) => i !== index))}
            >
              <Text style={{ color: "#F87171", marginTop: 8 }}>Remove</Text>
            </TouchableOpacity>
          )}
        </View>
      ))}
      <TouchableOpacity
        onPress={() =>
          onChange([
            ...list,
            {
              servingSize: "Regular",
              weightLabel: "",
              preparation: "Standard",
              packSize: 1,
              price: "",
              stock: "",
            },
          ])
        }
      >
        <Text style={{ color: "#D4AF37", fontWeight: "700" }}>
          + Add food variant
        </Text>
      </TouchableOpacity>
    </View>
  );
}

export default function AdvancedSizingSection({
  listingKind = "general",
  drinkVariants,
  onDrinkVariantsChange,
  foodVariants,
  onFoodVariantsChange,
  sizingCategory,
  onSizingCategoryChange,
  sizeSystem,
  onSizeSystemChange,
  sizeType,
  onSizeTypeChange,
  dimensionalSpecs,
  onDimensionalSpecsChange,
  selectedSizes = [],
  onSizesChange,
  colors,
  showCategoryPicker = false,
}) {
  const [waistSelections, setWaistSelections] = useState([]);
  const [inseamSelections, setInseamSelections] = useState([]);
  const [neckSelections, setNeckSelections] = useState([]);
  const [sleeveSelections, setSleeveSelections] = useState([]);
  const [shoeWidthFilter, setShoeWidthFilter] = useState(null);
  const [customInput, setCustomInput] = useState("");

  if (listingKind === "drinks")
    return (
      <DrinkVariants
        rows={drinkVariants}
        onChange={onDrinkVariantsChange}
        colors={colors}
      />
    );
  if (listingKind === "food")
    return (
      <FoodVariants
        rows={foodVariants}
        onChange={onFoodVariantsChange}
        colors={colors}
      />
    );

  const toggle = (size) => {
    const norm = normalizeSize(size);
    const next = selectedSizes.includes(norm)
      ? selectedSizes.filter((s) => s !== norm)
      : [...selectedSizes, norm];
    onSizesChange(sortSizes(next, sizingCategory));
  };
  const isSelected = (size) => selectedSizes.includes(normalizeSize(size));
  const removeSize = (size) =>
    onSizesChange(selectedSizes.filter((s) => s !== normalizeSize(size)));
  const addCustom = () => {
    const val = customInput.trim();
    if (!val) return;
    const norm = normalizeSize(val);
    if (!selectedSizes.includes(norm))
      onSizesChange(sortSizes([...selectedSizes, norm], sizingCategory));
    setCustomInput("");
  };

  if (showCategoryPicker) {
    return (
      <View>
        <Text
          style={{
            color: colors.text,
            fontSize: 17,
            fontWeight: "700",
            marginBottom: 4,
          }}
        >
          Product options
        </Text>
        <Text
          style={{
            color: colors.textSecondary,
            fontSize: 13,
            marginBottom: 14,
          }}
        >
          For general products only. Food and drinks use their own variants.
        </Text>
        <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
          {GENERAL_TYPES.map((cat) => {
            const active = sizingCategory === cat.key;
            return (
              <TouchableOpacity
                key={cat.key}
                onPress={() => onSizingCategoryChange(cat.key)}
                style={{
                  width: "47%",
                  margin: "1.5%",
                  borderRadius: 12,
                  padding: 12,
                  backgroundColor: active
                    ? colors.accent
                    : colors.cardBackground,
                  borderWidth: 1.5,
                  borderColor: active ? colors.accent : colors.border,
                }}
              >
                <Text style={{ fontSize: 20, marginBottom: 4 }}>
                  {cat.icon}
                </Text>
                <Text
                  style={{
                    color: active ? "#FFFFFF" : colors.text,
                    fontSize: 13,
                    fontWeight: "600",
                  }}
                >
                  {cat.label}
                </Text>
                <Text
                  style={{
                    color: active
                      ? "rgba(255,255,255,0.75)"
                      : colors.textSecondary,
                    fontSize: 11,
                    marginTop: 2,
                  }}
                >
                  {cat.description}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    );
  }

  if (!sizingCategory || sizingCategory === "none") {
    return (
      <View
        style={{
          backgroundColor: colors.cardBackground,
          borderRadius: 12,
          padding: 16,
          borderWidth: 1,
          borderColor: colors.border,
        }}
      >
        <Text
          style={{
            color: colors.textSecondary,
            fontSize: 14,
            textAlign: "center",
          }}
        >
          No size options. Use this for electronics and other single-unit
          products.
        </Text>
      </View>
    );
  }

  const badge = (
    <SelectedSizesBadge
      sizes={selectedSizes}
      onRemove={removeSize}
      colors={colors}
    />
  );

  if (sizingCategory === "electronics") {
    return (
      <View>
        <Text
          style={{ color: colors.textSecondary, fontSize: 13, marginBottom: 8 }}
        >
          Storage, model, or connectivity. Not clothing size.
        </Text>
        {badge}
        <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
          {ELECTRONICS_OPTIONS.map((v) => (
            <Chip
              key={v}
              label={v}
              selected={isSelected(v)}
              onPress={() => toggle(v)}
              colors={colors}
              small
            />
          ))}
        </View>
        <View style={{ flexDirection: "row", gap: 8, marginTop: 12 }}>
          <TextInput
            placeholder="Custom, e.g. 45mm"
            placeholderTextColor={colors.inputPlaceholder}
            value={customInput}
            onChangeText={setCustomInput}
            style={{
              flex: 1,
              backgroundColor: colors.inputBackground,
              borderWidth: 1,
              borderColor: colors.inputBorder,
              borderRadius: 10,
              padding: 12,
              color: colors.text,
            }}
          />
          <TouchableOpacity
            onPress={addCustom}
            style={{
              backgroundColor: "#D4AF37",
              paddingHorizontal: 16,
              borderRadius: 10,
              justifyContent: "center",
            }}
          >
            <Plus size={20} color="#000" />
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  if (sizingCategory === "apparel") {
    return (
      <View>
        <SectionLabel label="Size system" colors={colors} />
        <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
          {SIZE_SYSTEMS.map((sys) => (
            <Chip
              key={sys}
              label={sys}
              selected={sizeSystem === sys}
              onPress={() => onSizeSystemChange(sys)}
              colors={colors}
              small
            />
          ))}
        </View>
        <SectionLabel label="Fit" colors={colors} />
        <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
          {SIZE_TYPES.map((type) => (
            <Chip
              key={type}
              label={type}
              selected={sizeType === type}
              onPress={() => onSizeTypeChange(type)}
              colors={colors}
              small
            />
          ))}
        </View>
        {badge}
        <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
          {ALPHA_SIZES_ORDERED.map((size) => {
            const label = buildApparelLabel(size, sizeType, sizeSystem);
            return (
              <Chip
                key={size}
                label={label}
                selected={isSelected(label)}
                onPress={() => toggle(label)}
                colors={colors}
              />
            );
          })}
        </View>
      </View>
    );
  }

  if (sizingCategory === "shoes") {
    return (
      <View>
        <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
          {["US", "UK", "EU", "JP"].map((sys) => (
            <Chip
              key={sys}
              label={sys}
              selected={(sizeSystem || "US") === sys}
              onPress={() => onSizeSystemChange(sys)}
              colors={colors}
              small
            />
          ))}
        </View>
        <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
          <Chip
            label="Standard"
            selected={!shoeWidthFilter}
            onPress={() => setShoeWidthFilter(null)}
            colors={colors}
            small
          />
          {SHOE_WIDTHS.filter((w) => !w.startsWith("M")).map((w) => (
            <Chip
              key={w}
              label={w}
              selected={shoeWidthFilter === w}
              onPress={() =>
                setShoeWidthFilter(shoeWidthFilter === w ? null : w)
              }
              colors={colors}
              small
            />
          ))}
        </View>
        {badge}
        <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
          {getShoesBySystem(sizeSystem || "US").map((size) => (
            <Chip
              key={size}
              label={buildShoeLabel(size, shoeWidthFilter, sizeSystem || "US")}
              selected={selectedSizes.includes(
                normalizeSize(
                  buildShoeLabel(size, shoeWidthFilter, sizeSystem || "US")
                )
              )}
              onPress={() => {
                const label = normalizeSize(
                  buildShoeLabel(size, shoeWidthFilter, sizeSystem || "US")
                );
                onSizesChange(
                  sortSizes(
                    selectedSizes.includes(label)
                      ? selectedSizes.filter((s) => s !== label)
                      : [...selectedSizes, label],
                    "shoes"
                  )
                );
              }}
              colors={colors}
              small
            />
          ))}
        </View>
      </View>
    );
  }

  if (sizingCategory === "pants") {
    const apply = (waists, inseams) => {
      if (waists.length && inseams.length)
        onSizesChange(
          sortSizes(
            Array.from(
              new Set([
                ...selectedSizes,
                ...generatePantsCombos(waists, inseams),
              ])
            ),
            "pants"
          )
        );
    };
    return (
      <View>
        <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
          {WAIST_SIZES.map((w) => (
            <Chip
              key={w}
              label={w}
              selected={waistSelections.includes(w)}
              onPress={() => {
                const next = waistSelections.includes(w)
                  ? waistSelections.filter((x) => x !== w)
                  : [...waistSelections, w];
                setWaistSelections(next);
                apply(next, inseamSelections);
              }}
              colors={colors}
              small
            />
          ))}
        </View>
        <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
          {INSEAM_SIZES.map((i) => (
            <Chip
              key={i}
              label={i}
              selected={inseamSelections.includes(i)}
              onPress={() => {
                const next = inseamSelections.includes(i)
                  ? inseamSelections.filter((x) => x !== i)
                  : [...inseamSelections, i];
                setInseamSelections(next);
                apply(waistSelections, next);
              }}
              colors={colors}
              small
            />
          ))}
        </View>
        {badge}
      </View>
    );
  }

  if (sizingCategory === "dress_shirts") {
    const apply = (necks, sleeves) => {
      if (necks.length && sleeves.length)
        onSizesChange(
          sortSizes(
            Array.from(
              new Set([
                ...selectedSizes,
                ...generateShirtCombos(necks, sleeves),
              ])
            ),
            "dress_shirts"
          )
        );
    };
    return (
      <View>
        <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
          {NECK_SIZES.map((n) => (
            <Chip
              key={n}
              label={n}
              selected={neckSelections.includes(n)}
              onPress={() => {
                const next = neckSelections.includes(n)
                  ? neckSelections.filter((x) => x !== n)
                  : [...neckSelections, n];
                setNeckSelections(next);
                apply(next, sleeveSelections);
              }}
              colors={colors}
              small
            />
          ))}
        </View>
        <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
          {SLEEVE_SIZES.map((s) => (
            <Chip
              key={s}
              label={s}
              selected={sleeveSelections.includes(s)}
              onPress={() => {
                const next = sleeveSelections.includes(s)
                  ? sleeveSelections.filter((x) => x !== s)
                  : [...sleeveSelections, s];
                setSleeveSelections(next);
                apply(neckSelections, next);
              }}
              colors={colors}
              small
            />
          ))}
        </View>
        {badge}
      </View>
    );
  }

  if (sizingCategory === "home_furniture") {
    const specs = dimensionalSpecs || {
      length: "",
      width: "",
      height: "",
      unit: "cm",
    };
    return (
      <View>
        <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
          {DIMENSION_UNITS.map((u) => (
            <Chip
              key={u}
              label={u}
              selected={(specs.unit || "cm") === u}
              onPress={() => onDimensionalSpecsChange({ ...specs, unit: u })}
              colors={colors}
              small
            />
          ))}
        </View>
        {["length", "width", "height"].map((field) => (
          <TextInput
            key={field}
            placeholder={field}
            placeholderTextColor={colors.inputPlaceholder}
            value={specs[field]}
            onChangeText={(v) =>
              onDimensionalSpecsChange({ ...specs, [field]: v })
            }
            keyboardType="decimal-pad"
            style={{
              backgroundColor: colors.inputBackground,
              borderWidth: 1,
              borderColor: colors.inputBorder,
              borderRadius: 10,
              padding: 12,
              color: colors.text,
              marginTop: 8,
            }}
          />
        ))}
      </View>
    );
  }

  if (sizingCategory === "bags")
    return (
      <View>
        {badge}
        <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
          {BAG_VOLUMES.map((v) => (
            <Chip
              key={v}
              label={v}
              selected={isSelected(v)}
              onPress={() => toggle(v)}
              colors={colors}
              small
            />
          ))}
        </View>
      </View>
    );
  if (sizingCategory === "unit_count" || sizingCategory === "custom") {
    const options = sizingCategory === "unit_count" ? UNIT_COUNTS : [];
    return (
      <View>
        {badge}
        <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
          {options.map((u) => (
            <Chip
              key={u}
              label={u}
              selected={isSelected(u)}
              onPress={() => toggle(u)}
              colors={colors}
              small
            />
          ))}
        </View>
        <View style={{ flexDirection: "row", gap: 8, marginTop: 12 }}>
          <TextInput
            placeholder="Custom option"
            placeholderTextColor={colors.inputPlaceholder}
            value={customInput}
            onChangeText={setCustomInput}
            style={{
              flex: 1,
              backgroundColor: colors.inputBackground,
              borderWidth: 1,
              borderColor: colors.inputBorder,
              borderRadius: 10,
              padding: 12,
              color: colors.text,
            }}
          />
          <TouchableOpacity
            onPress={addCustom}
            style={{
              backgroundColor: "#D4AF37",
              paddingHorizontal: 16,
              borderRadius: 10,
              justifyContent: "center",
            }}
          >
            <Plus size={20} color="#000" />
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return null;
}