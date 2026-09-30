import { Ionicons } from '@expo/vector-icons';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';
import DocumentScanner, { ResponseType } from 'react-native-document-scanner-plugin';
import React, { useState } from 'react';
import { Alert, Image, Pressable, ScrollView, Text, View } from 'react-native';
import { api } from '../api';
import { Button } from '../components/Button';
import { Chip, Notice, ScreenHeader } from '../components/ui';
import { colors, s, type } from '../theme';
import type { Job, SessionDetail } from '../types';

type Props = {
  detail: SessionDetail;
  onBack: () => void;
  onSubmitted: (jobs: Job[]) => void;
};

const MAX_PAGES = 10;

export function NewTestScreen({ detail, onBack, onSubmitted }: Props) {
  const [pages, setPages] = useState<string[]>([]);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [sentCount, setSentCount] = useState(0);
  const [jobs, setJobs] = useState<Job[]>(detail.session.jobs ?? []);

  // Tarayıcı: sayfa kenarlarını otomatik bulur, kırpar ve düzleştirir (Adobe Scan / Drive gibi)
  async function scan() {
    const remaining = MAX_PAGES - pages.length;
    if (remaining <= 0) return;
    try {
      const { scannedImages, status } = await DocumentScanner.scanDocument({
        maxNumDocuments: remaining,
        croppedImageQuality: 85,
        responseType: ResponseType.ImageFilePath,
      });
      if (status !== 'success' || !scannedImages?.length) return;
      const uris = scannedImages.map((u) => (u.startsWith('file://') || u.startsWith('content://') ? u : `file://${u}`));
      const t0 = Date.now();
      const shrunk = await Promise.all(uris.map((u) => shrink(u)));
      console.log(`[tara] ${uris.length} sayfa tarandı ve küçültüldü (${Date.now() - t0} ms)`);
      setPages((p) => [...p, ...shrunk].slice(0, MAX_PAGES));
    } catch (e: any) {
      console.log('[tara] tarayıcı açılamadı, kameraya düşülüyor:', e?.message);
      await pick(true);
    }
  }

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

  async function submit() {
    if (!pages.length) return;
    setSending(true);
    setError('');
    const t0 = Date.now();
    try {
      const { job, session } = await api.submitJob(detail.session.id, pages);
      console.log(`[kuyruk] iş ${job.order} gönderildi (${Date.now() - t0} ms)`);
      setJobs(session.jobs ?? []);
      setSentCount((n) => n + 1);
      setPages([]);
    } catch (e: any) {
      console.log(`[kuyruk] HATA (${Date.now() - t0} ms):`, e.message);
      setError(e.message);
    } finally {
      setSending(false);
    }
  }

  const canAdd = !sending && pages.length < MAX_PAGES;
  const waiting = jobs.filter((j) => j.status === 'queued' || j.status === 'analyzing').length;
  const ready = jobs.filter((j) => j.status === 'ready').length;

  return (
    <View style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={[s.content, { paddingTop: 0 }]}>
        <View style={{ marginHorizontal: -20 }}>
          <ScreenHeader
            title="Yeni Test"
            subtitle="Sayfaları tara (kenarlar otomatik kırpılır), gönder, sıradaki teste geç."
            onBack={() => onSubmitted(jobs)}
            right={
              jobs.length ? (
                <View style={[s.row, { gap: 6 }]}>
                  {waiting ? <Chip text={`${waiting} analizde`} tone="warn" icon="hourglass-outline" /> : null}
                  {ready ? <Chip text={`${ready} hazır`} tone="success" icon="checkmark-circle-outline" /> : null}
                </View>
              ) : undefined
            }
          />
        </View>

        {sentCount ? <Notice tone="success" text={`${sentCount} test analize gönderildi. Sıradaki testin sayfalarını çekebilirsin.`} /> : null}

        <View style={[s.row, { gap: 12 }]}>
          <Button title="Sayfa Tara" kind="primary" icon="scan" onPress={scan} disabled={!canAdd} style={{ flex: 1 }} />
          <Button title="Kamera" kind="secondary" icon="camera-outline" onPress={() => pick(true)} disabled={!canAdd} />
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
                <Pressable onPress={() => removePage(i)} disabled={sending} hitSlop={8} style={{ position: 'absolute', top: 4, right: 4, width: 28, height: 28, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.9)', alignItems: 'center', justifyContent: 'center' }}>
                  <Ionicons name="close" size={16} color={colors.text} />
                </Pressable>
              </View>
            </View>
          ))}
          {canAdd ? (
            <Pressable onPress={scan} style={({ pressed }) => [{ width: '30%', aspectRatio: 3 / 4, borderRadius: 14, borderWidth: 1.5, borderStyle: 'dashed', borderColor: colors.accentBorder, backgroundColor: colors.accentSoft, alignItems: 'center', justifyContent: 'center', gap: 4 }, pressed && { opacity: 0.7 }]}>
              <Ionicons name="add" size={28} color={colors.accent} />
              <Text style={{ color: colors.accent, fontSize: 13, fontWeight: '700' }}>Sayfa ekle</Text>
            </Pressable>
          ) : null}
        </View>

        {error ? <Notice tone="error" text={error} /> : null}
      </ScrollView>
      <View style={s.bottomBar}>
        <Button
          title={pages.length ? `Analize Gönder · ${pages.length} sayfa` : 'Önce sayfa çek'}
          kind="primary"
          size="lg"
          icon="cloud-upload-outline"
          onPress={submit}
          loading={sending}
          disabled={!pages.length}
        />
      </View>
    </View>
  );
}
