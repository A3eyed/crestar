// @ts-nocheck
import { View, TouchableOpacity, Text } from 'react-native';
import { Search } from 'lucide-react-native';
import { useRouter } from 'expo-router';

export function TopBar({ insets, onSearchPress, liveSessions, onLivePress }) {
  const router = useRouter();
  const sessions = Array.isArray(liveSessions) ? liveSessions : [];

  return (
    <View
      style={{
        position: 'absolute',
        top: insets.top + 12,
        left: 0,
        right: 0,
        zIndex: 10,
        paddingHorizontal: 16,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}
    >
      <TouchableOpacity onPress={onSearchPress}>
        <View
          style={{
            width: 40,
            height: 40,
            borderRadius: 20,
            backgroundColor: 'rgba(0, 0, 0, 0.4)',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Search size={20} color="#FFFFFF" />
        </View>
      </TouchableOpacity>

      {/* Brand name centered */}
      <View>
        <Text
          style={{
            color: '#FFFFFF',
            fontSize: 18,
            fontWeight: '700',
            letterSpacing: 2,
          }}
        >
          CRESTAR
        </Text>
      </View>

      {/* Live button */}
      {sessions.length > 0 ? (
        <TouchableOpacity onPress={onLivePress}>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 5,
              backgroundColor: 'rgba(0, 0, 0, 0.6)',
              borderWidth: 1,
              borderColor: 'rgba(255,255,255,0.3)',
              paddingHorizontal: 10,
              paddingVertical: 8,
              borderRadius: 20,
            }}
          >
            <View
              style={{
                width: 6,
                height: 6,
                borderRadius: 3,
                backgroundColor: '#FFF',
              }}
            />
            <Text style={{ color: '#FFF', fontSize: 12, fontWeight: '700' }}>LIVE</Text>
            <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 11 }}>{sessions.length}</Text>
          </View>
        </TouchableOpacity>
      ) : (
        <View style={{ width: 40 }} />
      )}
    </View>
  );
}
