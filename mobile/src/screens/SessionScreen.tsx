import { Ionicons } from '@expo/vector-icons';
import React, { useCallback, useEffect, useState } from 'react';
import { Alert, FlatList, Pressable, Text, View } from 'react-native';
import { api } from '../api';
import { Button } from '../components/Button';
import { AnswerGrid, Chip, EmptyState, Notice, ScreenHeader } from '../components/ui';
import { colors, s, type } from '../theme';
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
    Alert.alert('Testi sil', `${index + 1}. test silinsin mi?`, [
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

  const all = detail?.session.tests ?? [];
  const tests = all.map((t, index) => ({ t, index })).reverse();
  const soruToplam = all.reduce((n, t) => n + t.soruSayisi, 0);
  const h = detail?.session.header;

  return (
    <View style={{ flex: 1 }}>
      <FlatList
        data={tests}
        keyExtractor={(it) => String(it.index)}
        contentContainerStyle={[s.content, { paddingTop: 0 }]}
        ListHeaderComponent={
          <View style={{ gap: 16 }}>
            <View style={{ marginHorizontal: -20 }}>
              <ScreenHeader title={h?.kitapAdi ?? '…'} subtitle={h ? `${h.yayinevi} · ISBN ${h.isbn}` : undefined} onBack={onBack} />
            </View>
            {error ? <Notice tone="error" text={error} /> : null}
            <View style={[s.row, { gap: 12 }]}>
              <Stat value={String(all.length)} label="Test" />
              <Stat value={String(soruToplam)} label="Soru" />
            </View>
            <Text style={type.captionBold}>Eklenen testler · son eklenen üstte</Text>
          </View>
        }
        ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
        ListEmptyComponent={
          detail ? (
            <EmptyState
              icon="camera-outline"
              title="İlk testi ekle"
              text="Testin sayfalarının fotoğrafını çek; test numarası, konu ve cevap anahtarı otomatik okunur."
            />
          ) : null
        }
        renderItem={({ item: { t, index } }) => (
          <View style={s.card}>
            <View style={[s.row, { gap: 10 }]}>
              <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: colors.accentSoft, alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ color: colors.accent, fontWeight: '700', fontSize: 15 }}>{index + 1}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[type.heading, { fontSize: 16 }]} numberOfLines={1}>
                  {t.testId !== '' ? `Test ${t.testId}` : 'Test'}{t.konuAdiKitap ? ` · ${t.konuAdiKitap}` : ''}
                </Text>
                <Text style={type.caption} numberOfLines={1}>{t.konuKodu} · {t.konuAdiUks}</Text>
              </View>
              <Pressable onPress={() => removeTest(index)} hitSlop={8} style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}>
                <Ionicons name="trash-outline" size={20} color={colors.text40} />
              </Pressable>
            </View>
            <View style={[s.row, { gap: 8 }]}>
              <Chip text={t.testTuru} />
              <Chip text={`${t.soruSayisi} soru`} tone="accent" />
            </View>
            <AnswerGrid answers={t.cevaplar} />
          </View>
        )}
      />
      <View style={s.bottomBar}>
        <Button title="Yeni Test Oluştur" kind="primary" size="lg" icon="camera" onPress={() => detail && onNewTest(detail)} disabled={!detail} />
      </View>
    </View>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <View style={[s.card, { flex: 1, padding: 16, gap: 2 }]}>
      <Text style={{ fontSize: 28, fontWeight: '700', color: colors.text, fontVariant: ['tabular-nums'] }}>{value}</Text>
      <Text style={type.caption}>{label}</Text>
    </View>
  );
}
