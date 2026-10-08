// @ts-nocheck
import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity } from 'react-native';
import { Plus, X, ArrowRight } from 'lucide-react-native';

/**
 * Town-to-town trips priced as a single fare, e.g. "Accra → Kumasi".
 * A deliverer adds every run they're happy to make on this rate.
 */
export default function RouteEditor({ routes = [], onChange, colors }) {
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  const addRoute = () => {
    const fromTown = from.trim();
    const toTown = to.trim();
    if (!fromTown || !toTown) return;

    const exists = routes.some(
      (r) =>
        String(r.fromTown).toLowerCase() === fromTown.toLowerCase() &&
        String(r.toTown).toLowerCase() === toTown.toLowerCase()
    );
    if (!exists) {
      onChange([...routes, { fromTown, toTown }]);
    }
    setFrom('');
    setTo('');
  };

  const removeRoute = (index) => {
    onChange(routes.filter((_, i) => i !== index));
  };

  const inputStyle = {
    flex: 1,
    backgroundColor: colors.inputBackground,
    borderWidth: 1,
    borderColor: colors.inputBorder,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: colors.text,
    fontSize: 14,
  };

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
      <Text style={{ color: colors.text, fontSize: 15, fontWeight: '700' }}>Trips</Text>
      <Text style={{ color: colors.textTertiary, fontSize: 12, marginTop: 3, marginBottom: 14 }}>
        Add each run this price covers, e.g. collect in Accra and deliver in Kumasi.
      </Text>

      {routes.map((route, index) => (
        <View
          key={`${route.fromTown}-${route.toTown}-${index}`}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 8,
            paddingVertical: 10,
            paddingHorizontal: 12,
            borderRadius: 10,
            backgroundColor: colors.cardBackgroundAlt,
            marginBottom: 8,
          }}
        >
          <Text style={{ color: colors.text, fontSize: 14, fontWeight: '600' }}>
            {route.fromTown}
          </Text>
          <ArrowRight size={14} color={colors.textTertiary} />
          <Text style={{ color: colors.text, fontSize: 14, fontWeight: '600', flex: 1 }}>
            {route.toTown}
          </Text>
          <TouchableOpacity onPress={() => removeRoute(index)} hitSlop={8}>
            <X size={15} color={colors.textTertiary} />
          </TouchableOpacity>
        </View>
      ))}

      <View style={{ flexDirection: 'row', gap: 8, marginTop: 4 }}>
        <TextInput
          value={from}
          onChangeText={setFrom}
          placeholder="Collect from"
          placeholderTextColor={colors.inputPlaceholder}
          style={inputStyle}
        />
        <TextInput
          value={to}
          onChangeText={setTo}
          onSubmitEditing={addRoute}
          placeholder="Deliver to"
          placeholderTextColor={colors.inputPlaceholder}
          style={inputStyle}
        />
        <TouchableOpacity
          onPress={addRoute}
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
