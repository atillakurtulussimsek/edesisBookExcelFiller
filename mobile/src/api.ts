import AsyncStorage from '@react-native-async-storage/async-storage';
import type { AnalyzedTest, Session, SessionDetail, SessionSummary, TestPayload } from './types';

const BASE_URL_KEY = 'serverBaseUrl';
const LAST_TUR_KEY = 'lastTestTuru';

let baseUrl = '';

export async function loadBaseUrl(): Promise<string> {
  baseUrl = (await AsyncStorage.getItem(BASE_URL_KEY)) || '';
  return baseUrl;
}

export async function saveBaseUrl(url: string): Promise<void> {
  baseUrl = url.replace(/\/+$/, '');
  await AsyncStorage.setItem(BASE_URL_KEY, baseUrl);
}

export async function loadLastTestTuru(): Promise<string> {
  return (await AsyncStorage.getItem(LAST_TUR_KEY)) || '';
}

export async function saveLastTestTuru(ad: string): Promise<void> {
  await AsyncStorage.setItem(LAST_TUR_KEY, ad);
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  if (!baseUrl) throw new Error('Sunucu adresi ayarlanmamış');
  const res = await fetch(`${baseUrl}${path}`, init);
  const text = await res.text();
  let body: any = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = null;
  }
  if (!res.ok) throw new Error((body && body.error) || `Sunucu hatası: ${res.status}`);
  return body as T;
}

function json(method: string, data: unknown): RequestInit {
  return { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) };
}

export const api = {
  ping: () => request<SessionSummary[]>('/api/sessions'),
  listSessions: () => request<SessionSummary[]>('/api/sessions'),
  getSession: (id: string) => request<SessionDetail>(`/api/sessions/${id}`),
  addTest: (id: string, payload: TestPayload) => request<Session>(`/api/sessions/${id}/tests`, json('POST', payload)),
  deleteTest: (id: string, index: number) => request<Session>(`/api/sessions/${id}/tests/${index}`, { method: 'DELETE' }),
  analyze: async (id: string, uri: string, mimeType: string): Promise<{ tests: AnalyzedTest[] }> => {
    const form = new FormData();
    form.append('image', { uri, name: 'sayfa.jpg', type: mimeType || 'image/jpeg' } as any);
    return request(`/api/sessions/${id}/analyze`, { method: 'POST', body: form });
  },
};
