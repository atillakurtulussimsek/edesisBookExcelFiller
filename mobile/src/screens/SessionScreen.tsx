import * as ImagePicker from 'expo-image-picker';
import React, { useCallback, useEffect, useState } from 'react';
import { Alert, FlatList, Text, View } from 'react-native';
import { api } from '../api';
import { Button } from '../components/Button';
import { colors, s } from '../theme';
import type { AnalyzedTest, SessionDetail } from '../types';

type Props = {
  id: string;
  onBack: () => void;
  onAnalyzed: (detail: SessionDetail, tests: AnalyzedTest[]) => void;
  reloadKey: number;
};

export function SessionScreen({ id, onBack, onAnalyzed, reloadKey }: Props) {
  const [detail, setDetail] = useState<SessionDetail | null>(null);
  const [error, setError] = useState('');
  const [analyzing, setAnalyzing] = useState(false);

  const load = useCallback(async () => {
    setError('');
    try {
      setDetail(await api.getSession(id));
    } catch (e: any) {
      setError(e.message);
    }
  }, [id]);

  useEffect(() => { load(); }, [load, reloadKey]);

  async function pick(fromCamera: boolean) {
    const perm = fromCamera
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('İzin gerekli', fromCamera ? 'Kamera izni verilmedi' : 'Galeri izni verilmedi');
      return;
    }
    const opts: ImagePicker.ImagePickerOptions = { mediaTypes: ['images'], quality: 0.7 };
    const result = fromCamera ? await ImagePicker.launchCameraAsync(opts) : await ImagePicker.launchImageLibraryAsync(opts);
    if (result.canceled || !result.assets?.length) return;
    const asset = result.assets[0];
    await analyze(asset.uri, asset.mimeType || 'image/jpeg');
  }

  async function analyze(uri: string, mimeType: string) {
    if (!detail) return;
    setAnalyzing(true);
    setError('');
    try {
      const { tests } = await api.analyze(id, uri, mimeType);
      if (!tests.length) {
        Alert.alert('Test bulunamadı', 'Fotoğrafta okunabilir test bilgisi bulunamadı.');
        return;
      }
      onAnalyzed(detail, tests);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setAnalyzing(false);
    }
  }

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
      <View style={s.row}>
        <Button title="📷 Fotoğraf Çek" kind="primary" onPress={() => pick(true)} loading={analyzing} disabled={!detail} style={{ flex: 1 }} />
        <Button title="Galeri" onPress={() => pick(false)} disabled={!detail || analyzing} />
      </View>
      {analyzing ? <Text style={s.muted}>Fotoğraf yapay zeka ile analiz ediliyor…</Text> : null}
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
