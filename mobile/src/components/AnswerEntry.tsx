import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { colors, type } from '../theme';

const OPTIONS = ['A', 'B', 'C', 'D', 'E'];

type Props = {
  answers: string[]; // her soru için '' ya da A-E
  onChange: (answers: string[]) => void;
  disabled?: boolean;
};

// Soru soru A-E seçimi; son soru cevaplanınca yeni satır açılır
export function AnswerEntry({ answers, onChange, disabled }: Props) {
  const rows = answers.length ? answers : [''];

  function pick(i: number, letter: string) {
    const next = [...rows];
    next[i] = next[i] === letter ? '' : letter;
    if (i === next.length - 1 && next[i]) next.push('');
    onChange(next);
  }

  function removeLast() {
    const next = [...rows];
    if (next.length > 1 && next[next.length - 1] === '') next.pop();
    if (next.length > 1) next.pop();
    else next[0] = '';
    onChange(next);
  }

  const filled = rows.filter(Boolean).length;

  return (
    <View style={{ gap: 8 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Text style={type.captionBold}>Cevap anahtarı · {filled} soru</Text>
        <Pressable onPress={removeLast} disabled={disabled || filled === 0} hitSlop={8} style={{ flexDirection: 'row', alignItems: 'center', gap: 4, opacity: filled === 0 ? 0.4 : 1 }}>
          <Ionicons name="backspace-outline" size={16} color={colors.text60} />
          <Text style={type.caption}>Son soruyu sil</Text>
        </Pressable>
      </View>
      <View style={{ gap: 6 }}>
          {rows.map((a, i) => (
            <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Text style={{ width: 28, textAlign: 'right', fontSize: 14, fontWeight: '700', color: a ? colors.text : colors.text40, fontVariant: ['tabular-nums'] }}>{i + 1}</Text>
              {OPTIONS.map((o) => {
                const on = a === o;
                return (
                  <Pressable
                    key={o}
                    onPress={() => pick(i, o)}
                    disabled={disabled}
                    style={({ pressed }) => [
                      { flex: 1, height: 44, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: on ? colors.accent : colors.surfaceAlt, borderWidth: 1, borderColor: on ? colors.accent : colors.border },
                      pressed && { opacity: 0.7 },
                    ]}
                  >
                    <Text style={{ fontSize: 16, fontWeight: '700', color: on ? '#fff' : colors.text80 }}>{o}</Text>
                  </Pressable>
                );
              })}
            </View>
          ))}
      </View>
    </View>
  );
}
