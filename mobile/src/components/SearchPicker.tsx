import { Ionicons } from '@expo/vector-icons';
import React, { useMemo, useState } from 'react';
import { FlatList, Modal, Pressable, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, s, type } from '../theme';

export type PickerItem = { key: string; title: string; subtitle?: string };

type Props = {
  visible: boolean;
  title: string;
  items: PickerItem[];
  suggestions?: PickerItem[];
  onSelect: (item: PickerItem) => void;
  onClose: () => void;
};

const trLower = (v: string) => v.replace(/İ/g, 'i').replace(/I/g, 'ı').toLowerCase();

export function SearchPicker({ visible, title, items, suggestions = [], onSelect, onClose }: Props) {
  const [query, setQuery] = useState('');

  const indexed = useMemo(
    () => items.map((it) => ({ item: it, search: trLower(`${it.title} ${it.subtitle || ''}`) })),
    [items],
  );

  const data = useMemo(() => {
    const q = trLower(query.trim());
    if (!q) return suggestions.length ? suggestions : items.slice(0, 100);
    const out: PickerItem[] = [];
    for (const e of indexed) {
      if (e.search.includes(q)) {
        out.push(e.item);
        if (out.length >= 100) break;
      }
    }
    return out;
  }, [query, indexed, items, suggestions]);

  const showingSuggestions = !query.trim() && suggestions.length > 0;
  const close = () => { setQuery(''); onClose(); };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={close}>
      <SafeAreaView style={s.screen} edges={['top', 'bottom']}>
        <View style={{ paddingHorizontal: 20, paddingTop: 8, gap: 12, flex: 1 }}>
          <View style={[s.row, { minHeight: 44 }]}>
            <Text style={[type.heading, { flex: 1 }]}>{title}</Text>
            <Pressable onPress={close} hitSlop={8} style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}>
              <Ionicons name="close" size={26} color={colors.text} />
            </Pressable>
          </View>
          <View style={[s.input, s.row, { gap: 8 }]}>
            <Ionicons name="search" size={18} color={colors.text40} />
            <TextInput
              style={{ flex: 1, fontSize: 16, color: colors.text, height: 50 }}
              placeholder="Ara…"
              placeholderTextColor={colors.text40}
              value={query}
              onChangeText={setQuery}
              autoFocus
              autoCorrect={false}
              autoCapitalize="none"
            />
          </View>
          {showingSuggestions && <Text style={type.captionBold}>Öneriler</Text>}
          <FlatList
            data={data}
            keyExtractor={(it) => it.key}
            keyboardShouldPersistTaps="handled"
            ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
            contentContainerStyle={{ paddingBottom: 24 }}
            ListEmptyComponent={<Text style={[type.body, { textAlign: 'center', paddingTop: 24 }]}>Sonuç yok</Text>}
            renderItem={({ item }) => (
              <Pressable
                onPress={() => { setQuery(''); onSelect(item); }}
                style={({ pressed }) => [
                  { backgroundColor: colors.surface, borderRadius: 14, paddingHorizontal: 16, paddingVertical: 12, minHeight: 52, justifyContent: 'center' },
                  pressed && { backgroundColor: colors.accentSoft },
                ]}
              >
                <Text style={{ fontSize: 16, color: colors.text }}>{item.title}</Text>
                {item.subtitle ? <Text style={type.caption}>{item.subtitle}</Text> : null}
              </Pressable>
            )}
          />
        </View>
      </SafeAreaView>
    </Modal>
  );
}
