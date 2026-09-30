import * as ImagePicker from 'expo-image-picker';
import React, { useState } from 'react';
import { Alert, Image, Pressable, ScrollView, Text, View } from 'react-native';
import { api } from '../api';
import { Button } from '../components/Button';
import { colors, s } from '../theme';
import type { AnalyzedTest, SessionDetail } from '../types';

type Props = {
  detail: SessionDetail;
  onBack: () => void;
  onAnalyzed: (tests: AnalyzedTest[]) => void;
};

export function NewTestScreen({ detail, onBack, onAnalyzed }: Props) {
  const [pages, setPages] = useState<string[]>([]);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState('');

  async function pick(fromCamera: boolean) {
    const perm = fromCamera
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('İzin gerekli', fromCamera ? 'Kamera izni verilmedi' : 'Galeri izni verilmedi');
      return;
    }
    const opts: ImagePicker.ImagePickerOptions = { mediaTypes: ['images'], quality: 0.7, allowsMultipleSelection: !fromCamera };
    const result = fromCamera ? await ImagePicker.launchCameraAsync(opts) : await ImagePicker.launchImageLibraryAsync(opts);
    if (result.canceled || !result.assets?.length) return;
    setPages((p) => [...p, ...result.assets.map((a) => a.uri)].slice(0, 10));
  }

  function removePage(i: number) {
    setPages((p) => p.filter((_, j) => j !== i));
  }

  async function analyze() {
    if (!pages.length) return;
    setAnalyzing(true);
    setError('');
    try {
      const { tests } = await api.analyze(detail.session.id, pages);
      if (!tests.length) {
        Alert.alert('Test bulunamadı', 'Sayfalarda okunabilir test bilgisi bulunamadı.');
        return;
      }
      onAnalyzed(tests);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setAnalyzing(false);
    }
  }

  return (
    <View style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={s.container}>
        <View style={s.row}>
          <Button title="‹ Geri" onPress={onBack} disabled={analyzing} />
          <Text style={[s.h2, { flex: 1 }]}>Yeni Test</Text>
        </View>
        <Text style={s.muted}>Testin tüm sayfalarını sırayla çek (konu başlığı, sorular, cevap anahtarı). Sonra Analiz Et.</Text>
        <View style={s.row}>
          <Button title="📷 Sayfa Çek" kind="primary" onPress={() => pick(true)} disabled={analyzing || pages.length >= 10} style={{ flex: 1 }} />
          <Button title="Galeri" onPress={() => pick(false)} disabled={analyzing || pages.length >= 10} />
        </View>
        <Text style={s.h2}>Sayfalar ({pages.length}/10)</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {pages.map((uri, i) => (
            <View key={uri + i} style={{ width: 100 }}>
              <Image source={{ uri }} style={{ width: 100, height: 130, borderRadius: 8, borderWidth: 1, borderColor: colors.border }} />
              <Text style={[s.muted, { textAlign: 'center' }]}>Sayfa {i + 1}</Text>
              <Pressable onPress={() => removePage(i)} disabled={analyzing} style={{ alignItems: 'center' }}>
                <Text style={s.error}>Kaldır</Text>
              </Pressable>
            </View>
          ))}
        </View>
        {error ? <Text style={s.error}>{error}</Text> : null}
        {analyzing ? <Text style={s.muted}>Sayfalar yapay zeka ile analiz ediliyor…</Text> : null}
      </ScrollView>
      <View style={{ padding: 16 }}>
        <Button title={`Analiz Et (${pages.length} sayfa)`} kind="primary" onPress={analyze} loading={analyzing} disabled={!pages.length} />
      </View>
    </View>
  );
}
