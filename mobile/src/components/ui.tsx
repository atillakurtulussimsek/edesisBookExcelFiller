import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Pressable, Text, TextInput, TextInputProps, View } from 'react-native';
import { colors, s, type } from '../theme';

export function ScreenHeader({ title, subtitle, onBack, right }: { title: string; subtitle?: string; onBack?: () => void; right?: React.ReactNode }) {
  return (
    <View style={{ paddingHorizontal: 20, paddingTop: 8, paddingBottom: 16, gap: 8 }}>
      <View style={[s.row, { minHeight: 44 }]}>
        {onBack ? (
          <Pressable onPress={onBack} hitSlop={8} style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center', marginLeft: -12 }}>
            <Ionicons name="chevron-back" size={26} color={colors.text} />
          </Pressable>
        ) : null}
        <View style={{ flex: 1 }} />
        {right}
      </View>
      <Text style={type.title} numberOfLines={2}>{title}</Text>
      {subtitle ? <Text style={type.caption}>{subtitle}</Text> : null}
    </View>
  );
}

export function Field({ label, hint, ...props }: TextInputProps & { label: string; hint?: string }) {
  return (
    <View style={{ gap: 6 }}>
      <Text style={type.captionBold}>{label}</Text>
      <TextInput placeholderTextColor={colors.text40} {...props} style={[s.input, props.style]} />
      {hint ? <Text style={type.caption}>{hint}</Text> : null}
    </View>
  );
}

export function SelectField({ label, value, placeholder, onPress, disabled }: { label: string; value?: string; placeholder: string; onPress: () => void; disabled?: boolean }) {
  return (
    <View style={{ gap: 6 }}>
      <Text style={type.captionBold}>{label}</Text>
      <Pressable
        onPress={onPress}
        disabled={disabled}
        style={({ pressed }) => [s.input, s.row, { justifyContent: 'space-between' }, pressed && { backgroundColor: colors.surfaceAlt }, disabled && { opacity: 0.6 }]}
      >
        <Text style={{ fontSize: 16, color: value ? colors.text : colors.text40, flex: 1 }} numberOfLines={1}>{value || placeholder}</Text>
        <Ionicons name="chevron-down" size={18} color={colors.text40} />
      </Pressable>
    </View>
  );
}

export function Chip({ text, tone = 'neutral', icon }: { text: string; tone?: 'neutral' | 'accent' | 'success' | 'warn'; icon?: keyof typeof Ionicons.glyphMap }) {
  const bg = tone === 'accent' ? colors.accentSoft : tone === 'success' ? colors.successSoft : tone === 'warn' ? colors.warnSoft : colors.surfaceAlt;
  const fg = tone === 'accent' ? colors.accent : tone === 'success' ? colors.success : tone === 'warn' ? colors.warn : colors.text60;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: bg, paddingHorizontal: 10, height: 28, borderRadius: 14 }}>
      {icon ? <Ionicons name={icon} size={13} color={fg} /> : null}
      <Text style={{ color: fg, fontSize: 13, fontWeight: '700' }}>{text}</Text>
    </View>
  );
}

export function EmptyState({ icon, title, text, action }: { icon: keyof typeof Ionicons.glyphMap; title: string; text: string; action?: React.ReactNode }) {
  return (
    <View style={{ alignItems: 'center', paddingVertical: 48, paddingHorizontal: 24, gap: 12 }}>
      <View style={{ width: 72, height: 72, borderRadius: 36, backgroundColor: colors.accentSoft, alignItems: 'center', justifyContent: 'center' }}>
        <Ionicons name={icon} size={32} color={colors.accent} />
      </View>
      <Text style={[type.heading, { textAlign: 'center' }]}>{title}</Text>
      <Text style={[type.body, { textAlign: 'center', color: colors.text60 }]}>{text}</Text>
      {action}
    </View>
  );
}

export function Notice({ text, tone }: { text: string; tone: 'error' | 'warn' | 'success' }) {
  const bg = tone === 'error' ? colors.dangerSoft : tone === 'warn' ? colors.warnSoft : colors.successSoft;
  const fg = tone === 'error' ? colors.danger : tone === 'warn' ? colors.warn : colors.success;
  const icon: keyof typeof Ionicons.glyphMap = tone === 'error' ? 'alert-circle' : tone === 'warn' ? 'information-circle' : 'checkmark-circle';
  return (
    <View style={[s.row, { backgroundColor: bg, borderRadius: 14, padding: 12, gap: 8 }]}>
      <Ionicons name={icon} size={18} color={fg} />
      <Text style={{ color: fg, fontSize: 14, flex: 1, lineHeight: 20 }}>{text}</Text>
    </View>
  );
}

export function AnswerGrid({ answers }: { answers: string }) {
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
      {answers.split('').map((a, i) => (
        <View key={i} style={{ width: 34, height: 34, borderRadius: 8, backgroundColor: colors.surfaceAlt, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ fontSize: 9, color: colors.text40, position: 'absolute', top: 2, left: 4 }}>{i + 1}</Text>
          <Text style={{ fontSize: 15, fontWeight: '700', color: colors.text }}>{a}</Text>
        </View>
      ))}
    </View>
  );
}
