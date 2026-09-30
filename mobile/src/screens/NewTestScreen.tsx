import { Ionicons } from '@expo/vector-icons';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';
import React, { useState } from 'react';
import { Alert, Image, Pressable, ScrollView, Text, View } from 'react-native';
import { api } from '../api';
import { Button } from '../components/Button';
import { Notice, ScreenHeader } from '../components/ui';
import { colors, s, type } from '../theme';
import type { AnalyzedTest, SessionDetail } from '../types';

type Props = {
  detail: SessionDetail;
  onBack: () => void;
  onAnalyzed: (tests: AnalyzedTest[]) => void;
};

const MAX_PAGES = 10;

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
    const opts: ImagePicker.ImagePickerOptions = { mediaTypes: ['images'], quality: 1, allowsMultipleSelection: !fromCamera };
    const result = fromCamera ? await ImagePicker.launchCameraAsync(opts) : await ImagePicker.launchImageLibraryAsync(opts);
    if (result.canceled || !result.assets?.length) return;
    const t0 = Date.now();
    const shrunk = await Promise.all(result.assets.map((a) => shrink(a.uri)));
    console.log(`[foto] ${result.assets.length} sayfa küçültüldü (${Date.now() - t0} ms)`);
    setPages((p) => [...p, ...shrunk].slice(0, MAX_PAGES));
  }

  async function shrink(uri: string): Promise<string> {
    const rendered = await ImageManipulator.manipulate(uri).resize({ width: 1400 }).renderAsync();
    const saved = await rendered.saveAsync({ format: SaveFormat.JPEG, compress: 0.6 });
    return saved.uri;
  }

  function removePage(i: number) {
    setPages((p) => p.filter((_, j) => j !== i));
  }

  async function analyze() {
    if (!pages.length) return;
    setAnalyzing(true);
    setError('');
    const t0 = Date.now();
    console.log(`[analiz] ${pages.length} sayfa gönderiliyor…`);
    try {
      const { tests } = await api.analyze(detail.session.id, pages);
      console.log(`[analiz] yanıt geldi: ${tests.length} test (${Date.now() - t0} ms)`, JSON.stringify(tests));
      if (!tests.length) {
        Alert.alert('Test bulunamadı', 'Sayfalarda okunabilir test bilgisi bulunamadı. Daha net bir fotoğraf dene.');
        return;
      }
      onAnalyzed(tests);
    } catch (e: any) {
      console.log(`[analiz] HATA (${Date.now() - t0} ms):`, e.message);
      setError(e.message);
    } finally {
      setAnalyzing(false);
    }
  }

  const canAdd = !analyzing && pages.length < MAX_PAGES;

  return (
    <View style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={[s.content, { paddingTop: 0 }]}>
        <View style={{ marginHorizontal: -20 }}>
          <ScreenHeader title="Yeni Test" subtitle="Testin tüm sayfalarını sırayla çek: başlık, sorular, cevap anahtarı" onBack={analyzing ? undefined : onBack} />
        </View>

        <View style={[s.row, { gap: 12 }]}>
          <Button title="Sayfa Çek" kind="primary" icon="camera" onPress={() => pick(true)} disabled={!canAdd} style={{ flex: 1 }} />
          <Button title="Galeri" kind="secondary" icon="images-outline" onPress={() => pick(false)} disabled={!canAdd} />
        </View>

        <View style={[s.row, { justifyContent: 'space-between' }]}>
          <Text style={type.captionBold}>Sayfalar</Text>
          <Text style={type.caption}>{pages.length} / {MAX_PAGES}</Text>
        </View>

        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
          {pages.map((uri, i) => (
            <View key={uri + i} style={{ width: '30%', gap: 6 }}>
              <View style={{ borderRadius: 14, overflow: 'hidden', backgroundColor: colors.surfaceAlt }}>
                <Image source={{ uri }} style={{ width: '100%', aspectRatio: 3 / 4 }} />
                <View style={{ position: 'absolute', top: 6, left: 6, backgroundColor: colors.text, paddingHorizontal: 8, height: 22, borderRadius: 11, justifyContent: 'center' }}>
                  <Text style={{ color: '#fff', fontSize: 12, fontWeight: '700' }}>{i + 1}</Text>
                </View>
                <Pressable onPress={() => removePage(i)} disabled={analyzing} hitSlop={8} style={{ position: 'absolute', top: 4, right: 4, width: 28, height: 28, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.9)', alignItems: 'center', justifyContent: 'center' }}>
                  <Ionicons name="close" size={16} color={colors.text} />
                </Pressable>
              </View>
            </View>
          ))}
          {canAdd ? (
            <Pressable onPress={() => pick(true)} style={({ pressed }) => [{ width: '30%', aspectRatio: 3 / 4, borderRadius: 14, borderWidth: 1.5, borderStyle: 'dashed', borderColor: colors.accentBorder, backgroundColor: colors.accentSoft, alignItems: 'center', justifyContent: 'center', gap: 4 }, pressed && { opacity: 0.7 }]}>
              <Ionicons name="add" size={28} color={colors.accent} />
              <Text style={{ color: colors.accent, fontSize: 13, fontWeight: '700' }}>Sayfa ekle</Text>
            </Pressable>
          ) : null}
        </View>

        {error ? <Notice tone="error" text={error} /> : null}
        {analyzing ? <Notice tone="warn" text="Sayfalar yapay zeka ile okunuyor, birkaç saniye sürer…" /> : null}
      </ScrollView>
      <View style={s.bottomBar}>
        <Button
          title={pages.length ? `Analiz Et · ${pages.length} sayfa` : 'Önce sayfa çek'}
          kind="primary"
          size="lg"
          icon="sparkles"
          onPress={analyze}
          loading={analyzing}
          disabled={!pages.length}
        />
      </View>
    </View>
  );
}
