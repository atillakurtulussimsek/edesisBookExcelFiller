import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, SafeAreaView } from 'react-native';
import { loadBaseUrl } from './src/api';
import { ReviewScreen } from './src/screens/ReviewScreen';
import { SessionScreen } from './src/screens/SessionScreen';
import { SessionsScreen } from './src/screens/SessionsScreen';
import { SettingsScreen } from './src/screens/SettingsScreen';
import { s } from './src/theme';
import type { AnalyzedTest, SessionDetail } from './src/types';

type Route =
  | { name: 'loading' }
  | { name: 'settings' }
  | { name: 'sessions' }
  | { name: 'session'; id: string; reloadKey: number }
  | { name: 'review'; id: string; detail: SessionDetail; analyzed: AnalyzedTest[]; reloadKey: number };

export default function App() {
  const [route, setRoute] = useState<Route>({ name: 'loading' });
  const [baseUrl, setBaseUrl] = useState('');

  useEffect(() => {
    loadBaseUrl().then((url) => {
      setBaseUrl(url);
      setRoute(url ? { name: 'sessions' } : { name: 'settings' });
    });
  }, []);

  let screen: React.ReactNode;
  switch (route.name) {
    case 'loading':
      screen = <ActivityIndicator style={{ marginTop: 40 }} />;
      break;
    case 'settings':
      screen = <SettingsScreen initialUrl={baseUrl} onConnected={() => setRoute({ name: 'sessions' })} />;
      break;
    case 'sessions':
      screen = (
        <SessionsScreen
          onOpen={(id) => setRoute({ name: 'session', id, reloadKey: 0 })}
          onSettings={() => setRoute({ name: 'settings' })}
        />
      );
      break;
    case 'session':
      screen = (
        <SessionScreen
          id={route.id}
          reloadKey={route.reloadKey}
          onBack={() => setRoute({ name: 'sessions' })}
          onAnalyzed={(detail, analyzed) => setRoute({ name: 'review', id: route.id, detail, analyzed, reloadKey: route.reloadKey })}
        />
      );
      break;
    case 'review':
      screen = (
        <ReviewScreen
          detail={route.detail}
          analyzed={route.analyzed}
          onDone={() => setRoute({ name: 'session', id: route.id, reloadKey: route.reloadKey + 1 })}
        />
      );
      break;
  }

  return (
    <SafeAreaView style={s.screen}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        {screen}
      </KeyboardAvoidingView>
      <StatusBar style="dark" />
    </SafeAreaView>
  );
}
