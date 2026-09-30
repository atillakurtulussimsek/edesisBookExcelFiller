import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useMemo, useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { api, loadLastTestTuru, saveLastTestTuru } from '../api';
import { Button } from '../components/Button';
import { PickerItem, SearchPicker } from '../components/SearchPicker';
import { AnswerGrid, Chip, Field, Notice, ScreenHeader, SelectField } from '../components/ui';
import { colors, s, type } from '../theme';
import type { Job, Konu, SessionDetail } from '../types';

type Draft = {
  konu: Konu | null;
  konuAdiKitap: string;
  testId: string;
  testTuru: string;
  cevaplar: string;
  not: string;
  suggestions: Konu[];
  status: 'pending' | 'saving' | 'done' | 'error';
  error: string;
};

type Props = { detail: SessionDetail; job: Job; onDone: () => void };

const konuItem = (k: Konu): PickerItem => ({ key: String(k.kod), title: `${k.kod} · ${k.ad}`, subtitle: `${k.sinif}. sınıf · ${k.ders}` });

export function ReviewScreen({ detail, job, onDone }: Props) {
  const analyzed = job.tests;
  const [drafts, setDrafts] = useState<Draft[]>(() =>
    analyzed.map((t) => ({
      konu: t.konuOnerileri[0] ?? null,
      konuAdiKitap: t.konuAdi,
      testId: t.testNo === '' ? '' : String(t.testNo),
      testTuru: '',
      cevaplar: t.cevaplar,
      not: t.not,
      suggestions: t.konuOnerileri,
      status: 'pending',
      error: '',
    })),
  );
  const [picker, setPicker] = useState<{ index: number; kind: 'konu' | 'tur' } | null>(null);

  useEffect(() => {
    loadLastTestTuru().then((tur) => {
      if (tur) setDrafts((ds) => ds.map((d) => (d.testTuru ? d : { ...d, testTuru: tur })));
    });
  }, []);

  function update(i: number, patch: Partial<Draft>) {
    setDrafts((ds) => ds.map((d, j) => (j === i ? { ...d, ...patch } : d)));
  }

  const [approving, setApproving] = useState(false);
  const [approveError, setApproveError] = useState('');

  async function approveAll() {
    let ok = true;
    setDrafts((ds) => ds.map((d) => {
      const err = !d.konu ? 'Konu seçilmeli' : !d.testTuru ? 'Test türü seçilmeli' : !d.cevaplar ? 'Cevap anahtarı boş' : '';
      if (err) ok = false;
      return { ...d, error: err };
    }));
    if (!ok) return;
    setApproving(true);
    setApproveError('');
    try {
      await api.approveJob(
        detail.session.id,
        job.id,
        drafts.map((d) => ({
          konuKodu: d.konu!.kod,
          konuAdiKitap: d.konuAdiKitap,
          testId: d.testId === '' ? '' : Number(d.testId),
          soruSayisi: d.cevaplar.length,
          testTuru: d.testTuru,
          cevaplar: d.cevaplar,
        })),
      );
      if (drafts[0]?.testTuru) await saveLastTestTuru(drafts[0].testTuru);
      setDrafts((ds) => ds.map((d) => ({ ...d, status: 'done' })));
      onDone();
    } catch (e: any) {
      setApproveError(e.message);
    } finally {
      setApproving(false);
    }
  }

  const konuItems = useMemo(() => detail.konular.map(konuItem), [detail.konular]);
  const turItems = useMemo(() => detail.testTurleri.map((t) => ({ key: t.ad, title: t.ad })), [detail.testTurleri]);
  const suggestionItems = useMemo(
    () => (picker?.kind === 'konu' ? (drafts[picker.index]?.suggestions ?? []).map(konuItem) : []),
    [picker, drafts],
  );

  return (
    <View style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={[s.content, { paddingTop: 0 }]} keyboardShouldPersistTaps="handled">
        <View style={{ marginHorizontal: -20 }}>
          <ScreenHeader
            title={`${job.order}. Gönderim`}
            subtitle={drafts.length === 1 ? 'Okunan testi kontrol et, gerekirse düzelt, onayla' : `${drafts.length} test okundu; kontrol et ve onayla`}
            onBack={onDone}
          />
        </View>

        {drafts.map((d, i) => {
          const done = d.status === 'done';
          return (
            <View key={i} style={[s.card, done && { opacity: 0.6 }]}>
              <View style={[s.row, { justifyContent: 'space-between' }]}>
                <Text style={type.heading}>{drafts.length > 1 ? `${i + 1}. Test` : 'Test bilgileri'}</Text>
                {done ? <Chip text="Eklendi" tone="success" icon="checkmark" /> : <Chip text={`${d.cevaplar.length} soru`} tone="accent" />}
              </View>
              {d.not ? <Notice tone="warn" text={d.not} /> : null}

              <SelectField
                label="Konu (edesis)"
                value={d.konu ? `${d.konu.kod} · ${d.konu.ad}` : ''}
                placeholder="Konu seç"
                onPress={() => setPicker({ index: i, kind: 'konu' })}
                disabled={done}
              />
              <Field label="Konu adı (kitapta)" value={d.konuAdiKitap} onChangeText={(v) => update(i, { konuAdiKitap: v })} editable={!done} placeholder="Kitaptaki bölüm adı" />
              <View style={[s.row, { alignItems: 'flex-start' }]}>
                <View style={{ flex: 1 }}>
                  <Field label="Test no" value={d.testId} keyboardType="number-pad" onChangeText={(v) => update(i, { testId: v.replace(/[^0-9]/g, '') })} editable={!done} placeholder="—" />
                </View>
                <View style={{ flex: 2 }}>
                  <SelectField label="Test türü" value={d.testTuru} placeholder="Seç" onPress={() => setPicker({ index: i, kind: 'tur' })} disabled={done} />
                </View>
              </View>

              <Field
                label="Cevap anahtarı"
                value={d.cevaplar}
                autoCapitalize="characters"
                autoCorrect={false}
                onChangeText={(v) => update(i, { cevaplar: v.toUpperCase().replace(/[^ABCDE]/g, '') })}
                editable={!done}
                placeholder="ABCDE…"
                style={type.mono}
              />
              {d.cevaplar ? <AnswerGrid answers={d.cevaplar} /> : null}

              {d.error ? <Notice tone="error" text={d.error} /> : null}
            </View>
          );
        })}
      </ScrollView>

      <View style={s.bottomBar}>
        {approveError ? <View style={{ marginBottom: 8 }}><Notice tone="error" text={approveError} /></View> : null}
        <Button
          title={drafts.length === 1 ? 'Onayla ve Kitaba Ekle' : `${drafts.length} Testi Onayla`}
          kind="primary"
          size="lg"
          icon="checkmark"
          onPress={approveAll}
          loading={approving}
        />
      </View>

      <SearchPicker
        visible={picker !== null}
        title={picker?.kind === 'konu' ? 'Konu Seç' : 'Test Türü Seç'}
        items={picker?.kind === 'konu' ? konuItems : turItems}
        suggestions={suggestionItems}
        onClose={() => setPicker(null)}
        onSelect={(item) => {
          if (!picker) return;
          if (picker.kind === 'konu') {
            const konu = detail.konular.find((k) => String(k.kod) === item.key) ?? null;
            update(picker.index, { konu });
          } else {
            update(picker.index, { testTuru: item.key });
          }
          setPicker(null);
        }}
      />
    </View>
  );
}
