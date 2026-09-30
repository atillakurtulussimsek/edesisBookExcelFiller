import { StyleSheet } from 'react-native';

export const colors = {
  bg: '#f4f5f7',
  card: '#ffffff',
  text: '#1f2328',
  muted: '#6b7280',
  border: '#d9dee5',
  primary: '#1f6feb',
  danger: '#c62828',
  ok: '#2e7d32',
  warn: '#b26a00',
};

export const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  container: { padding: 16, gap: 12 },
  card: { backgroundColor: colors.card, borderRadius: 10, borderWidth: 1, borderColor: colors.border, padding: 14, gap: 8 },
  h1: { fontSize: 20, fontWeight: '700', color: colors.text },
  h2: { fontSize: 16, fontWeight: '700', color: colors.text },
  label: { fontSize: 13, fontWeight: '600', color: colors.text },
  muted: { color: colors.muted, fontSize: 13 },
  input: { borderWidth: 1, borderColor: colors.border, borderRadius: 8, padding: 10, fontSize: 16, backgroundColor: '#fff', color: colors.text },
  row: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  btn: { paddingVertical: 12, paddingHorizontal: 16, borderRadius: 8, borderWidth: 1, borderColor: colors.border, backgroundColor: '#fff', alignItems: 'center' },
  btnPrimary: { backgroundColor: colors.primary, borderColor: colors.primary },
  btnDanger: { borderColor: colors.danger },
  btnText: { fontSize: 15, fontWeight: '600', color: colors.text },
  btnTextPrimary: { color: '#fff' },
  btnTextDanger: { color: colors.danger },
  error: { color: colors.danger },
  ok: { color: colors.ok },
  warn: { color: colors.warn },
  mono: { fontFamily: 'Menlo', letterSpacing: 2 },
});
