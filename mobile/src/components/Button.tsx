import React from 'react';
import { ActivityIndicator, Pressable, Text } from 'react-native';
import { s } from '../theme';

type Props = {
  title: string;
  onPress: () => void;
  kind?: 'default' | 'primary' | 'danger';
  loading?: boolean;
  disabled?: boolean;
  style?: object;
};

export function Button({ title, onPress, kind = 'default', loading, disabled, style }: Props) {
  const isPrimary = kind === 'primary';
  const isDanger = kind === 'danger';
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        s.btn,
        isPrimary && s.btnPrimary,
        isDanger && s.btnDanger,
        (disabled || loading) && { opacity: 0.5 },
        pressed && { opacity: 0.7 },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={isPrimary ? '#fff' : undefined} />
      ) : (
        <Text style={[s.btnText, isPrimary && s.btnTextPrimary, isDanger && s.btnTextDanger]}>{title}</Text>
      )}
    </Pressable>
  );
}
