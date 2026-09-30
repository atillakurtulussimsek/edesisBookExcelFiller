import React, { useMemo, useState } from 'react';
import { FlatList, Modal, Pressable, SafeAreaView, Text, TextInput, View } from 'react-native';
import { colors, s } from '../theme';
import { Button } from './Button';

export type PickerItem = { key: string; title: string; subtitle?: string };

type Props = {
  visible: boolean;
  title: string;
  items: PickerItem[];
  suggestions?: PickerItem[];
  onSelect: (item: PickerItem) => void;
  onClose: () => void;
};

const trLower = (v: string) => v.toLocaleLowerCase('tr');

export function SearchPicker({ visible, title, items, suggestions = [], onSelect, onClose }: Props) {
  const [query, setQuery] = useState('');

  const data = useMemo(() => {
    const q = trLower(query.trim());
    if (!q) return suggestions.length ? suggestions : items.slice(0, 100);
    return items.filter((it) => trLower(it.title).includes(q) || trLower(it.subtitle || '').includes(q)).slice(0, 100);
  }, [query, items, suggestions]);

  const showingSuggestions = !query.trim() && suggestions.length > 0;

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={s.screen}>
        <View style={[s.container, { flex: 1 }]}>
          <View style={s.row}>
            <Text style={[s.h2, { flex: 1 }]}>{title}</Text>
            <Button title="Kapat" onPress={() => { setQuery(''); onClose(); }} />
          </View>
          <TextInput
            style={s.input}
            placeholder="Ara…"
            value={query}
            onChangeText={setQuery}
            autoFocus
            autoCorrect={false}
            autoCapitalize="none"
          />
          {showingSuggestions && <Text style={s.muted}>Öneriler (aramak için yaz)</Text>}
          <FlatList
            data={data}
            keyExtractor={(it) => it.key}
            keyboardShouldPersistTaps="handled"
            ItemSeparatorComponent={() => <View style={{ height: 1, backgroundColor: colors.border }} />}
            ListEmptyComponent={<Text style={s.muted}>Sonuç yok</Text>}
            renderItem={({ item }) => (
              <Pressable
                onPress={() => { setQuery(''); onSelect(item); }}
                style={({ pressed }) => [{ paddingVertical: 12, paddingHorizontal: 4 }, pressed && { backgroundColor: '#eaf1fd' }]}
              >
                <Text style={{ fontSize: 16, color: colors.text }}>{item.title}</Text>
                {item.subtitle ? <Text style={s.muted}>{item.subtitle}</Text> : null}
              </Pressable>
            )}
          />
        </View>
      </SafeAreaView>
    </Modal>
  );
}
