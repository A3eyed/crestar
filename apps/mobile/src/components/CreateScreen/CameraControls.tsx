// @ts-nocheck
import { View, Text, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FlipHorizontal, Zap, ZapOff, Image as ImageIcon, Radio, X } from 'lucide-react-native';

export function CameraControls({ onClose, onToggleFlash, flash, onGoLive, hasMonetization }) {
  const insets = useSafeAreaInsets();

  return (
    <View
      style={{
        position: 'absolute',
        top: insets.top + 16,
        left: 16,
        right: 16,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}
    >
      {/* Close / Exit button */}
      <TouchableOpacity
        onPress={onClose}
        style={{
          width: 44,
          height: 44,
          borderRadius: 22,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <X size={24} color="#FFFFFF" />
      </TouchableOpacity>

      <View style={{ flexDirection: 'row', gap: 12 }}>
        {hasMonetization && (
          <TouchableOpacity
            onPress={onGoLive}
            style={{
              backgroundColor: '#FFFFFF',
              paddingHorizontal: 16,
              paddingVertical: 8,
              borderRadius: 20,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <Radio size={16} color="#000000" />
            <Text style={{ color: '#000000', fontSize: 14, fontWeight: '700' }}>Go Live</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          onPress={onToggleFlash}
          style={{
            width: 44,
            height: 44,
            borderRadius: 22,
            backgroundColor: flash === 'on' ? 'rgba(255, 255, 255, 0.3)' : 'rgba(0, 0, 0, 0.5)',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {flash === 'on' ? (
            <Zap size={24} color="#FFFFFF" fill="#FFFFFF" />
          ) : (
            <ZapOff size={24} color="#FFFFFF" />
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

export function CameraBottomControls({
  onGalleryPick,
  onRecordPress,
  isRecording,
  onToggleFacing,
}) {
  const insets = useSafeAreaInsets();

  return (
    <View
      style={{
        position: 'absolute',
        bottom: insets.bottom + 30,
        left: 0,
        right: 0,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-around',
        paddingHorizontal: 40,
      }}
    >
      {/* Upload from device — TikTok style with label */}
      <TouchableOpacity onPress={onGalleryPick} style={{ alignItems: 'center', width: 60 }}>
        <View
          style={{
            width: 44,
            height: 44,
            borderRadius: 10,
            backgroundColor: 'rgba(255, 255, 255, 0.25)',
            borderWidth: 2,
            borderColor: '#FFFFFF',
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'hidden',
          }}
        >
          <ImageIcon size={24} color="#FFFFFF" />
        </View>
        <Text
          style={{
            color: '#FFFFFF',
            fontSize: 12,
            fontWeight: '600',
            marginTop: 6,
            textShadowColor: 'rgba(0, 0, 0, 0.5)',
            textShadowOffset: { width: 0, height: 1 },
            textShadowRadius: 2,
          }}
        >
          Upload
        </Text>
      </TouchableOpacity>

      {/* Record button — keep as-is */}
      <TouchableOpacity
        onPress={onRecordPress}
        style={{
          width: 80,
          height: 80,
          borderRadius: 40,
          backgroundColor: '#FFFFFF',
          borderWidth: 6,
          borderColor: isRecording ? 'rgba(255, 255, 255, 0.5)' : 'rgba(255, 255, 255, 0.5)',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {isRecording && (
          <View
            style={{
              width: 30,
              height: 30,
              borderRadius: 4,
              backgroundColor: '#000000',
            }}
          />
        )}
      </TouchableOpacity>

      {/* Flip camera with label */}
      <TouchableOpacity onPress={onToggleFacing} style={{ alignItems: 'center', width: 60 }}>
        <View
          style={{
            width: 44,
            height: 44,
            borderRadius: 22,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            borderWidth: 2,
            borderColor: '#FFFFFF',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <FlipHorizontal size={24} color="#FFFFFF" />
        </View>
        <Text
          style={{
            color: '#FFFFFF',
            fontSize: 12,
            fontWeight: '600',
            marginTop: 6,
            textShadowColor: 'rgba(0, 0, 0, 0.5)',
            textShadowOffset: { width: 0, height: 1 },
            textShadowRadius: 2,
          }}
        >
          Flip
        </Text>
      </TouchableOpacity>
    </View>
  );
}
