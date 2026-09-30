import React, { useEffect, useMemo, useState } from 'react';
import { ScrollView, Text, TextInput, View } from 'react-native';
import { api, loadLastTestTuru, saveLastTestTuru } from '../api';
import { Button } from '../components/Button';
import { PickerItem, SearchPicker } from '../components/SearchPicker';
import { colors, s } from '../theme';
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

const konuItem = (k: Konu): PickerItem => ({ key: String(k.kod), title: `${k.kod} - ${k.ad}`, subtitle: `${k.sinif} · ${k.ders}` });

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
    if (!d.cevaplar) return update(i, { error: 'Cevaplar boş' });
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

  const allDone = drafts.every((d) => d.status === 'done');
  const konuItems = useMemo(() => detail.konular.map(konuItem), [detail.konular]);
  const turItems = useMemo(() => detail.testTurleri.map((t) => ({ key: t.ad, title: t.ad })), [detail.testTurleri]);
  const suggestionItems = useMemo(
    () => (picker?.kind === 'konu' ? (drafts[picker.index]?.suggestions ?? []).map(konuItem) : []),
    [picker, drafts],
  );

  return (
    <View style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={s.container} keyboardShouldPersistTaps="handled">
        <View style={s.row}>
          <Text style={[s.h1, { flex: 1 }]}>Okunan Testler ({drafts.length})</Text>
          <Button title={allDone ? 'Bitti' : 'Kapat'} kind={allDone ? 'primary' : 'default'} onPress={onDone} />
        </View>
        <Text style={s.muted}>Bilgileri kontrol et, gerekirse düzelt, sonra Ekle. Eklenme sırası bu sıradır.</Text>
        {drafts.map((d, i) => (
          <View key={i} style={[s.card, d.status === 'done' && { opacity: 0.55 }]}>
            <Text style={s.h2}>{i + 1}. Test {d.status === 'done' ? '✓ eklendi' : ''}</Text>
            {d.not ? <Text style={s.warn}>Not: {d.not}</Text> : null}

            <Text style={s.label}>Konu (edesis)</Text>
            <Button
              title={d.konu ? `${d.konu.kod} - ${d.konu.ad}` : 'Konu seç…'}
              onPress={() => setPicker({ index: i, kind: 'konu' })}
              disabled={d.status === 'done'}
              style={{ alignItems: 'flex-start' }}
            />

            <Text style={s.label}>Konu Adı (Kitap)</Text>
            <TextInput style={s.input} value={d.konuAdiKitap} onChangeText={(v) => update(i, { konuAdiKitap: v })} editable={d.status !== 'done'} />

            <View style={s.row}>
              <View style={{ flex: 1, gap: 6 }}>
                <Text style={s.label}>Test No</Text>
                <TextInput style={s.input} value={d.testId} keyboardType="number-pad" onChangeText={(v) => update(i, { testId: v.replace(/[^0-9]/g, '') })} editable={d.status !== 'done'} />
              </View>
              <View style={{ flex: 2, gap: 6 }}>
                <Text style={s.label}>Test Türü</Text>
                <Button title={d.testTuru || 'Seç…'} onPress={() => setPicker({ index: i, kind: 'tur' })} disabled={d.status === 'done'} style={{ alignItems: 'flex-start' }} />
              </View>
            </View>

            <Text style={s.label}>Cevaplar ({d.cevaplar.length} soru)</Text>
            <TextInput
              style={[s.input, s.mono]}
              value={d.cevaplar}
              autoCapitalize="characters"
              autoCorrect={false}
              onChangeText={(v) => update(i, { cevaplar: v.toUpperCase().replace(/[^ABCDE]/g, '') })}
              editable={d.status !== 'done'}
            />

            {d.error ? <Text style={s.error}>{d.error}</Text> : null}
            {d.status !== 'done' && (
              <Button title="Ekle" kind="primary" onPress={() => save(i)} loading={d.status === 'saving'} />
            )}
          </View>
        ))}
      </ScrollView>

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
