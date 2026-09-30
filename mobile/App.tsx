import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { loadBaseUrl } from './src/api';
import { NewTestScreen } from './src/screens/NewTestScreen';
import { ReviewScreen } from './src/screens/ReviewScreen';
import { SessionScreen } from './src/screens/SessionScreen';
import { SessionsScreen } from './src/screens/SessionsScreen';
import { SettingsScreen } from './src/screens/SettingsScreen';
import { colors, s } from './src/theme';
import type { Job, SessionDetail } from './src/types';

type Route =
  | { name: 'loading' }
  | { name: 'settings'; canBack: boolean }
  | { name: 'sessions' }
  | { name: 'session'; id: string; reloadKey: number }
  | { name: 'newTest'; id: string; detail: SessionDetail; reloadKey: number }
  | { name: 'review'; id: string; detail: SessionDetail; job: Job; reloadKey: number };

export default function App() {
  const [route, setRoute] = useState<Route>({ name: 'loading' });
  const [baseUrl, setBaseUrl] = useState('');

  useEffect(() => {
    loadBaseUrl().then((url) => {
      setBaseUrl(url);
      setRoute(url ? { name: 'sessions' } : { name: 'settings', canBack: false });
    });
  }, []);

  let screen: React.ReactNode;
  switch (route.name) {
    case 'loading':
      screen = <ActivityIndicator style={{ marginTop: 48 }} color={colors.accent} />;
      break;
    case 'settings':
      screen = (
        <SettingsScreen
          initialUrl={baseUrl}
          onConnected={() => setRoute({ name: 'sessions' })}
          onBack={route.canBack ? () => setRoute({ name: 'sessions' }) : undefined}
        />
      );
      break;
    case 'sessions':
      screen = (
        <SessionsScreen
          onOpen={(id) => setRoute({ name: 'session', id, reloadKey: 0 })}
          onSettings={() => setRoute({ name: 'settings', canBack: true })}
        />
      );
      break;
    case 'session':
      screen = (
        <SessionScreen
          id={route.id}
          reloadKey={route.reloadKey}
          onBack={() => setRoute({ name: 'sessions' })}
          onNewTest={(detail) => setRoute({ name: 'newTest', id: route.id, detail, reloadKey: route.reloadKey })}
          onReview={(detail, job) => setRoute({ name: 'review', id: route.id, detail, job, reloadKey: route.reloadKey })}
        />
      );
      break;
    case 'newTest':
      screen = (
        <NewTestScreen
          detail={route.detail}
          onBack={() => setRoute({ name: 'session', id: route.id, reloadKey: route.reloadKey + 1 })}
          onSubmitted={() => setRoute({ name: 'session', id: route.id, reloadKey: route.reloadKey + 1 })}
        />
      );
      break;
    case 'review':
      screen = (
        <ReviewScreen
          detail={route.detail}
          job={route.job}
          onDone={() => setRoute({ name: 'session', id: route.id, reloadKey: route.reloadKey + 1 })}
        />
      );
      break;
  }

  return (
    <SafeAreaProvider>
      <SafeAreaView style={s.screen} edges={['top', 'bottom']}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          {screen}
        </KeyboardAvoidingView>
        <StatusBar style="dark" />
      </SafeAreaView>
    </SafeAreaProvider>
  );
}
