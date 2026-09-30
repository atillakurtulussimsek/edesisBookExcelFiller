import React, { useCallback, useEffect, useState } from 'react';
import { Alert, FlatList, Text, View } from 'react-native';
import { api } from '../api';
import { Button } from '../components/Button';
import { colors, s } from '../theme';
import type { SessionDetail } from '../types';

type Props = {
  id: string;
  onBack: () => void;
  onNewTest: (detail: SessionDetail) => void;
  reloadKey: number;
};

export function SessionScreen({ id, onBack, onNewTest, reloadKey }: Props) {
  const [detail, setDetail] = useState<SessionDetail | null>(null);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setError('');
    try {
      setDetail(await api.getSession(id));
    } catch (e: any) {
      setError(e.message);
    }
  }, [id]);

  useEffect(() => { load(); }, [load, reloadKey]);

  async function removeTest(index: number) {
    Alert.alert('Sil', `${index + 1}. test silinsin mi?`, [
      { text: 'Vazgeç', style: 'cancel' },
      {
        text: 'Sil',
        style: 'destructive',
        onPress: async () => {
          try {
            const session = await api.deleteTest(id, index);
            setDetail((d) => (d ? { ...d, session } : d));
          } catch (e: any) {
            setError(e.message);
          }
        },
      },
    ]);
  }

  const tests = detail?.session.tests ?? [];

  return (
    <View style={[s.container, { flex: 1 }]}>
      <View style={s.row}>
        <Button title="‹ Geri" onPress={onBack} />
        <Text style={[s.h2, { flex: 1 }]} numberOfLines={2}>{detail?.session.header.kitapAdi ?? '…'}</Text>
      </View>
      {error ? <Text style={s.error}>{error}</Text> : null}
      <Button title="＋ Yeni Test Oluştur" kind="primary" onPress={() => detail && onNewTest(detail)} disabled={!detail} />
      <Text style={s.h2}>Eklenen Testler ({tests.length})</Text>
      <FlatList
        data={tests}
        keyExtractor={(_, i) => String(i)}
        ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
        ListEmptyComponent={<Text style={s.muted}>Henüz test yok.</Text>}
        renderItem={({ item, index }) => (
          <View style={s.card}>
            <View style={s.row}>
              <Text style={{ fontWeight: '700', color: colors.text, flex: 1 }}>
                {index + 1}. Test {item.testId !== '' ? `#${item.testId}` : ''} · {item.testTuru}
              </Text>
              <Button title="Sil" kind="danger" onPress={() => removeTest(index)} style={{ paddingVertical: 6, paddingHorizontal: 10 }} />
            </View>
            <Text style={s.muted}>{item.konuKodu} · {item.konuAdiUks}{item.konuAdiKitap ? ` · ${item.konuAdiKitap}` : ''}</Text>
            <Text style={[s.mono, { color: colors.text }]}>{item.cevaplar} ({item.soruSayisi})</Text>
          </View>
        )}
      />
    </View>
  );
}
