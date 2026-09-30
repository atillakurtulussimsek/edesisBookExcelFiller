import { Ionicons } from '@expo/vector-icons';
import React, { useCallback, useEffect, useState } from 'react';
import { Alert, FlatList, Pressable, Text, View } from 'react-native';
import { api } from '../api';
import { Button } from '../components/Button';
import { AnswerGrid, Chip, EmptyState, Notice, ScreenHeader } from '../components/ui';
import { colors, s, type } from '../theme';
import type { Job, SessionDetail } from '../types';

type Props = {
  id: string;
  onBack: () => void;
  onNewTest: (detail: SessionDetail) => void;
  onReview: (detail: SessionDetail, job: Job) => void;
  reloadKey: number;
};

export function SessionScreen({ id, onBack, onNewTest, onReview, reloadKey }: Props) {
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

  const jobs = [...(detail?.session.jobs ?? [])].sort((a, b) => a.order - b.order);
  const busy = jobs.some((j) => j.status === 'queued' || j.status === 'analyzing');

  useEffect(() => {
    if (!busy) return;
    const t = setInterval(load, 3000);
    return () => clearInterval(t);
  }, [busy, load]);

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

  async function removeJob(job: Job) {
    Alert.alert('Analizi sil', `${job.order}. gönderim silinsin mi?`, [
      { text: 'Vazgeç', style: 'cancel' },
      {
        text: 'Sil',
        style: 'destructive',
        onPress: async () => {
          try {
            const session = await api.deleteJob(id, job.id);
            setDetail((d) => (d ? { ...d, session } : d));
          } catch (e: any) {
            setError(e.message);
          }
        },
      },
    ]);
  }

  async function retryJob(job: Job) {
    try {
      const session = await api.retryJob(id, job.id);
      setDetail((d) => (d ? { ...d, session } : d));
    } catch (e: any) {
      setError(e.message);
    }
  }

  const all = detail?.session.tests ?? [];
  const tests = all.map((t, index) => ({ t, index })).reverse();
  const soruToplam = all.reduce((n, t) => n + t.soruSayisi, 0);
  const h = detail?.session.header;
  const nextJob = jobs[0];

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
              <Stat value={String(jobs.length)} label="Onay bekliyor" accent={jobs.length > 0} />
            </View>

            {jobs.length ? (
              <View style={{ gap: 12 }}>
                <Text style={type.captionBold}>Onay kuyruğu · gönderim sırasıyla</Text>
                {nextJob && detail ? (
                  nextJob.status === 'ready' ? (
                    <Button title={`${nextJob.order}. testi kontrol et ve onayla`} kind="primary" icon="checkmark-done-outline" onPress={() => onReview(detail, nextJob)} />
                  ) : nextJob.status === 'error' ? (
                    <Notice tone="error" text={`${nextJob.order}. gönderim okunamadı: ${nextJob.error}`} />
                  ) : (
                    <Notice tone="warn" text={`${nextJob.order}. gönderim analiz ediliyor, hazır olunca burada onaylayabilirsin.`} />
                  )
                ) : null}
                {jobs.map((j) => (
                  <View key={j.id} style={[s.card, { padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12 }]}>
                    <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: colors.surfaceAlt, alignItems: 'center', justifyContent: 'center' }}>
                      <Text style={{ fontWeight: '700', color: colors.text60 }}>{j.order}</Text>
                    </View>
                    <View style={{ flex: 1, gap: 4 }}>
                      <Text style={{ fontSize: 15, fontWeight: '700', color: colors.text }}>
                        {j.status === 'ready' && j.tests[0]?.testNo !== '' ? `Test ${j.tests[0]?.testNo}` : `${j.pageCount} sayfa`}
                        {j.status === 'ready' && j.tests[0]?.konuAdi ? ` · ${j.tests[0].konuAdi}` : ''}
                      </Text>
                      <JobStatus job={j} />
                    </View>
                    {j.status === 'error' ? (
                      <Button title="Tekrar" size="sm" kind="secondary" onPress={() => retryJob(j)} />
                    ) : null}
                    <Pressable onPress={() => removeJob(j)} hitSlop={8} style={{ width: 40, height: 40, alignItems: 'center', justifyContent: 'center' }}>
                      <Ionicons name="trash-outline" size={18} color={colors.text40} />
                    </Pressable>
                  </View>
                ))}
              </View>
            ) : null}

            <Text style={type.captionBold}>Eklenen testler · son eklenen üstte</Text>
          </View>
        }
        ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
        ListEmptyComponent={
          detail && !jobs.length ? (
            <EmptyState
              icon="camera-outline"
              title="İlk testi ekle"
              text="Testin sayfalarının fotoğrafını çek; test numarası, konu ve cevap anahtarı arka planda okunur."
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

function JobStatus({ job }: { job: Job }) {
  if (job.status === 'queued') return <Chip text="Sırada" icon="time-outline" />;
  if (job.status === 'analyzing') return <Chip text="Analiz ediliyor" tone="warn" icon="hourglass-outline" />;
  if (job.status === 'error') return <Chip text="Hata" tone="warn" icon="alert-circle-outline" />;
  return <Chip text={`Hazır · ${job.tests[0]?.cevaplar.length ?? 0} soru`} tone="success" icon="checkmark-circle-outline" />;
}

function Stat({ value, label, accent }: { value: string; label: string; accent?: boolean }) {
  return (
    <View style={[s.card, { flex: 1, padding: 14, gap: 2 }, accent && { backgroundColor: colors.accentSoft, shadowOpacity: 0 }]}>
      <Text style={{ fontSize: 26, fontWeight: '700', color: accent ? colors.accent : colors.text, fontVariant: ['tabular-nums'] }}>{value}</Text>
      <Text style={type.caption} numberOfLines={1}>{label}</Text>
    </View>
  );
}
