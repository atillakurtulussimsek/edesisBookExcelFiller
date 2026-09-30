import React, { useCallback, useEffect, useState } from 'react';
import { FlatList, Pressable, RefreshControl, Text, View } from 'react-native';
import { api } from '../api';
import { Button } from '../components/Button';
import { colors, s } from '../theme';
import type { SessionSummary } from '../types';

type Props = { onOpen: (id: string) => void; onSettings: () => void };

export function SessionsScreen({ onOpen, onSettings }: Props) {
  const [items, setItems] = useState<SessionSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      setItems(await api.listSessions());
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  return (
    <View style={[s.container, { flex: 1 }]}>
      <View style={s.row}>
        <Text style={[s.h1, { flex: 1 }]}>Devam Eden Kitaplar</Text>
        <Button title="Sunucu" onPress={onSettings} />
      </View>
      {error ? <Text style={s.error}>{error}</Text> : null}
      <FlatList
        data={items}
        keyExtractor={(it) => it.id}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={load} />}
        ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
        ListEmptyComponent={!loading ? <Text style={s.muted}>Devam eden kitap yok. Önce bilgisayardan Excel yükle.</Text> : null}
        renderItem={({ item }) => (
          <Pressable onPress={() => onOpen(item.id)} style={({ pressed }) => [s.card, pressed && { backgroundColor: '#eaf1fd' }]}>
            <Text style={{ fontSize: 16, fontWeight: '600', color: colors.text }}>{item.header.kitapAdi || item.sourceFileName}</Text>
            <Text style={s.muted}>{item.testCount} test · {new Date(item.updatedAt).toLocaleString('tr-TR')}</Text>
          </Pressable>
        )}
      />
    </View>
  );
}
