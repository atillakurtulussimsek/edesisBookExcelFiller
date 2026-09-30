import React, { useState } from 'react';
import { Text, TextInput, View } from 'react-native';
import { api, saveBaseUrl } from '../api';
import { Button } from '../components/Button';
import { s } from '../theme';

type Props = { initialUrl: string; onConnected: () => void };

export function SettingsScreen({ initialUrl, onConnected }: Props) {
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
    <View style={s.container}>
      <View style={s.card}>
        <Text style={s.h2}>Sunucu Adresi</Text>
        <Text style={s.muted}>Bilgisayarda `npm start` çıktısındaki "Telefon için" adresini yaz. Telefon ve bilgisayar aynı Wi-Fi'da olmalı.</Text>
        <TextInput
          style={s.input}
          value={url}
          onChangeText={setUrl}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="url"
          placeholder="http://192.168.1.10:3000"
        />
        {error ? <Text style={s.error}>{error}</Text> : null}
        <Button title="Bağlan" kind="primary" onPress={connect} loading={busy} />
      </View>
    </View>
  );
}
