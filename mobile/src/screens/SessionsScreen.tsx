import { Ionicons } from '@expo/vector-icons';
import React, { useCallback, useEffect, useState } from 'react';
import { FlatList, Pressable, RefreshControl, Text, View } from 'react-native';
import { api } from '../api';
import { Chip, EmptyState, Notice, ScreenHeader } from '../components/ui';
import { colors, s, type } from '../theme';
import type { SessionSummary } from '../types';

type Props = { onOpen: (id: string) => void; onSettings: () => void };

function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]?.toUpperCase()).join('');
}

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
    <View style={{ flex: 1 }}>
      <FlatList
        data={items}
        keyExtractor={(it) => it.id}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={load} tintColor={colors.accent} />}
        contentContainerStyle={[s.content, { paddingTop: 0 }]}
        ListHeaderComponent={
          <View style={{ marginHorizontal: -20 }}>
            <ScreenHeader
              title="Kitaplar"
              subtitle={items.length ? `${items.length} kitap devam ediyor` : undefined}
              right={
                <Pressable onPress={onSettings} hitSlop={8} style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}>
                  <Ionicons name="settings-outline" size={24} color={colors.text60} />
                </Pressable>
              }
            />
            {error ? <View style={{ paddingHorizontal: 20, paddingBottom: 12 }}><Notice tone="error" text={error} /></View> : null}
          </View>
        }
        ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
        ListEmptyComponent={
          !loading ? (
            <EmptyState
              icon="book-outline"
              title="Devam eden kitap yok"
              text="Bilgisayardaki web arayüzünden kitabın Excel şablonunu yükle; burada görünecek."
            />
          ) : null
        }
        renderItem={({ item }) => {
          const name = item.header.kitapAdi || item.sourceFileName;
          return (
            <Pressable onPress={() => onOpen(item.id)} style={({ pressed }) => [s.card, { flexDirection: 'row', alignItems: 'center', gap: 16 }, pressed && { transform: [{ scale: 0.99 }] }]}>
              <View style={{ width: 52, height: 52, borderRadius: 16, backgroundColor: colors.accentSoft, alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ color: colors.accent, fontWeight: '700', fontSize: 18 }}>{initials(name)}</Text>
              </View>
              <View style={{ flex: 1, gap: 6 }}>
                <Text style={[type.heading, { fontSize: 16 }]} numberOfLines={2}>{name}</Text>
                <View style={[s.row, { gap: 8 }]}>
                  <Chip text={`${item.testCount} test`} tone="accent" icon="layers-outline" />
                  <Text style={type.caption}>{new Date(item.updatedAt).toLocaleDateString('tr-TR')}</Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={20} color={colors.text40} />
            </Pressable>
          );
        }}
      />
    </View>
  );
}
