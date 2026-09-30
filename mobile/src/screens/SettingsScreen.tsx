import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { api, saveBaseUrl } from '../api';
import { Button } from '../components/Button';
import { Field, Notice, ScreenHeader } from '../components/ui';
import { colors, s, type } from '../theme';

type Props = { initialUrl: string; onConnected: () => void; onBack?: () => void };

export function SettingsScreen({ initialUrl, onConnected, onBack }: Props) {
  const [url, setUrl] = useState(initialUrl);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function connect() {
    setBusy(true);
    setError('');
    try {
      await saveBaseUrl(url.trim());
      await api.ping();
      onConnected();
    } catch (e: any) {
      setError(e.message || 'Bağlanılamadı');
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={s.content} keyboardShouldPersistTaps="handled">
        <ScreenHeader title="Sunucuya Bağlan" subtitle="Bilgisayardaki edesis Excel aracına bağlanır" onBack={onBack} />
        <View style={s.card}>
          <View style={[s.row, { gap: 12 }]}>
            <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: colors.accentSoft, alignItems: 'center', justifyContent: 'center' }}>
              <Ionicons name="laptop-outline" size={22} color={colors.accent} />
            </View>
            <Text style={[type.body, { flex: 1 }]}>Bilgisayarda çalışan sunucunun “Telefon için” adresini gir. Telefon ve bilgisayar aynı Wi‑Fi’da olmalı.</Text>
          </View>
          <Field
            label="Sunucu adresi"
            value={url}
            onChangeText={setUrl}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="url"
            placeholder="http://192.168.1.10:3000"
            onSubmitEditing={connect}
          />
          {error ? <Notice tone="error" text={error} /> : null}
        </View>
      </ScrollView>
      <View style={s.bottomBar}>
        <Button title="Bağlan" kind="primary" size="lg" icon="link-outline" onPress={connect} loading={busy} disabled={!url.trim()} />
      </View>
    </View>
  );
}
