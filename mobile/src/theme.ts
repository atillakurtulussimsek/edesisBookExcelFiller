import { Platform, StyleSheet } from 'react-native';

// 60/30/10: nötr zemin, koyu metin, tek vurgu rengi
export const colors = {
  bg: '#F5F6F8',
  surface: '#FFFFFF',
  surfaceAlt: '#EEF1F5',
  text: '#111827',
  text80: 'rgba(17,24,39,0.8)',
  text60: 'rgba(17,24,39,0.6)',
  text40: 'rgba(17,24,39,0.4)',
  border: '#E5E8EE',
  accent: '#2F6BFF',
  accentSoft: 'rgba(47,107,255,0.08)',
  accentBorder: 'rgba(47,107,255,0.2)',
  success: '#18A058',
  successSoft: 'rgba(24,160,88,0.1)',
  warn: '#C77700',
  warnSoft: 'rgba(199,119,0,0.1)',
  danger: '#D93025',
  dangerSoft: 'rgba(217,48,37,0.08)',
};

// 4 boyut, 2 ağırlık
export const type = StyleSheet.create({
  title: { fontSize: 28, fontWeight: '700', color: colors.text, letterSpacing: -0.5 },
  heading: { fontSize: 18, fontWeight: '700', color: colors.text },
  body: { fontSize: 16, fontWeight: '400', color: colors.text80, lineHeight: 22 },
  caption: { fontSize: 13, fontWeight: '400', color: colors.text60 },
  captionBold: { fontSize: 13, fontWeight: '700', color: colors.text60, textTransform: 'uppercase', letterSpacing: 0.6 },
  mono: { fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace', fontSize: 16, color: colors.text, letterSpacing: 3 },
});

export const shadow = {
  card: {
    shadowColor: '#3B4A6B',
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  cta: {
    shadowColor: colors.accent,
    shadowOpacity: 0.3,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },
};

export const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 120, gap: 16 },
  card: { backgroundColor: colors.surface, borderRadius: 20, padding: 20, gap: 12, ...shadow.card },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    paddingHorizontal: 16,
    height: 52,
    fontSize: 16,
    backgroundColor: colors.surface,
    color: colors.text,
  },
  bottomBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 12,
    backgroundColor: colors.bg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  error: { color: colors.danger, fontSize: 13 },
});
