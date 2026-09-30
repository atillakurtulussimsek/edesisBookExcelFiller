import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useMemo, useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { api, loadLastTestTuru, saveLastTestTuru } from '../api';
import { Button } from '../components/Button';
import { PickerItem, SearchPicker } from '../components/SearchPicker';
import { AnswerGrid, Chip, Field, Notice, ScreenHeader, SelectField } from '../components/ui';
import { colors, s, type } from '../theme';
import type { AnalyzedTest, Konu, SessionDetail } from '../types';

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

type Props = { detail: SessionDetail; analyzed: AnalyzedTest[]; onDone: () => void };

const konuItem = (k: Konu): PickerItem => ({ key: String(k.kod), title: `${k.kod} · ${k.ad}`, subtitle: `${k.sinif}. sınıf · ${k.ders}` });

export function ReviewScreen({ detail, analyzed, onDone }: Props) {
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

  async function save(i: number) {
    const d = drafts[i];
    if (!d.konu) return update(i, { error: 'Konu seçilmeli' });
    if (!d.testTuru) return update(i, { error: 'Test türü seçilmeli' });
    if (!d.cevaplar) return update(i, { error: 'Cevap anahtarı boş' });
    update(i, { status: 'saving', error: '' });
    try {
      await api.addTest(detail.session.id, {
        konuKodu: d.konu.kod,
        konuAdiKitap: d.konuAdiKitap,
        testId: d.testId === '' ? '' : Number(d.testId),
        soruSayisi: d.cevaplar.length,
        testTuru: d.testTuru,
        cevaplar: d.cevaplar,
      });
      await saveLastTestTuru(d.testTuru);
      update(i, { status: 'done' });
    } catch (e: any) {
      update(i, { status: 'error', error: e.message });
    }
  }

  const doneCount = drafts.filter((d) => d.status === 'done').length;
  const allDone = doneCount === drafts.length;
  const pendingIndex = drafts.findIndex((d) => d.status !== 'done');
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
            title={drafts.length === 1 ? 'Okunan Test' : `${drafts.length} Test Okundu`}
            subtitle="Bilgileri kontrol et, gerekirse düzelt, sonra ekle"
          />
        </View>

        {allDone ? (
          <View style={[s.card, { alignItems: 'center', gap: 8, paddingVertical: 32, backgroundColor: colors.successSoft, shadowOpacity: 0 }]}>
            <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: colors.success, alignItems: 'center', justifyContent: 'center' }}>
              <Ionicons name="checkmark" size={36} color="#fff" />
            </View>
            <Text style={type.heading}>{doneCount === 1 ? 'Test eklendi' : `${doneCount} test eklendi`}</Text>
            <Text style={[type.body, { textAlign: 'center' }]}>Kitaba kaydedildi. Sıradaki testin sayfalarını çekebilirsin.</Text>
          </View>
        ) : null}

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
              {!done && drafts.length > 1 ? (
                <Button title="Bu testi ekle" kind="secondary" icon="add" onPress={() => save(i)} loading={d.status === 'saving'} />
              ) : null}
            </View>
          );
        })}
      </ScrollView>

      <View style={s.bottomBar}>
        {allDone ? (
          <Button title="Sıradaki Test" kind="primary" size="lg" icon="camera" onPress={onDone} />
        ) : drafts.length === 1 ? (
          <Button title="Kitaba Ekle" kind="primary" size="lg" icon="checkmark" onPress={() => save(0)} loading={drafts[0].status === 'saving'} />
        ) : (
          <View style={[s.row, { gap: 12 }]}>
            <Button title="Vazgeç" kind="ghost" size="lg" onPress={onDone} />
            <Button title={`Eksikleri Ekle (${drafts.length - doneCount})`} kind="primary" size="lg" icon="checkmark" onPress={() => pendingIndex >= 0 && save(pendingIndex)} style={{ flex: 1 }} />
          </View>
        )}
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
