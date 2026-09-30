import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { ActivityIndicator, Pressable, StyleProp, Text, ViewStyle } from 'react-native';
import { colors, shadow } from '../theme';

type Props = {
  title: string;
  onPress: () => void;
  kind?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'lg' | 'md' | 'sm';
  icon?: keyof typeof Ionicons.glyphMap;
  loading?: boolean;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
};

export function Button({ title, onPress, kind = 'secondary', size = 'md', icon, loading, disabled, style }: Props) {
  const height = size === 'lg' ? 56 : size === 'md' ? 48 : 40;
  const fontSize = size === 'sm' ? 14 : 16;
  const bg = kind === 'primary' ? colors.accent : kind === 'secondary' ? colors.accentSoft : kind === 'danger' ? colors.dangerSoft : 'transparent';
  const fg = kind === 'primary' ? '#fff' : kind === 'danger' ? colors.danger : kind === 'ghost' ? colors.text80 : colors.accent;
  const off = disabled || loading;
  return (
    <Pressable
      onPress={onPress}
      disabled={off}
      hitSlop={size === 'sm' ? 6 : 0}
      style={({ pressed }) => [
        {
          height,
          minWidth: 44,
          paddingHorizontal: size === 'sm' ? 14 : 20,
          borderRadius: height / 2,
          backgroundColor: bg,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
          borderWidth: kind === 'secondary' ? 1 : 0,
          borderColor: colors.accentBorder,
        },
        kind === 'primary' && !off && shadow.cta,
        off && { opacity: 0.45 },
        pressed && { transform: [{ scale: 0.98 }], opacity: 0.85 },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={fg} />
      ) : (
        <>
          {icon ? <Ionicons name={icon} size={size === 'sm' ? 16 : 20} color={fg} /> : null}
          <Text style={{ color: fg, fontSize, fontWeight: '700' }}>{title}</Text>
        </>
      )}
    </Pressable>
  );
}
