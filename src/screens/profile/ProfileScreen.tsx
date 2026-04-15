import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Alert, ScrollView,
} from 'react-native';
import { Ionicons }  from '@expo/vector-icons';
import { useAuth }   from '@/context/AuthContext';
import { useI18n, type Lang } from '@/i18n/I18nContext';
import { COLORS, SPACING, RADIUS } from '@/constants';

const LANGUAGES: { code: Lang; label: string; flag: string }[] = [
  { code: 'it', label: 'Italiano', flag: '🇮🇹' },
  { code: 'fr', label: 'Français', flag: '🇫🇷' },
  { code: 'de', label: 'Deutsch',  flag: '🇩🇪' },
  { code: 'en', label: 'English',  flag: '🇬🇧' },
];

type IoniconsName = keyof typeof Ionicons.glyphMap;
function InfoRow({ icon, label, value }: { icon: IoniconsName; label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <Ionicons name={icon} size={18} color={COLORS.accent} style={styles.infoIcon} />
      <View style={styles.infoTexts}>
        <Text style={styles.infoLabel}>{label}</Text>
        <Text style={styles.infoValue}>{value}</Text>
      </View>
    </View>
  );
}

export default function ProfileScreen() {
  const { user, logout } = useAuth();
  const { lang, setLang, t } = useI18n();
  const [loggingOut, setLoggingOut] = useState(false);

  function confirmLogout() {
    Alert.alert(
      t('mobile.profile.logoutConfirmTitle', "Esci dall'account"),
      t('mobile.profile.logoutConfirmMsg', 'Sei sicuro di voler uscire?'),
      [
        { text: t('mobile.profile.cancel', 'Annulla'), style: 'cancel' },
        {
          text: t('mobile.profile.confirmLogout', 'Esci'),
          style: 'destructive',
          onPress: async () => { setLoggingOut(true); await logout(); },
        },
      ]
    );
  }

  const initials = (user?.name ?? user?.email ?? 'U')
    .split(' ').map((w: string) => w[0]).join('').toUpperCase().slice(0, 2);

  const roleLabel = user?.role
    ? t(`mobile.profile.role.${user.role}`, user.role)
    : '';

  const AVAIL_LEGEND = [
    { color: '#22c55e', label: t('mobile.profile.available', 'Disponibile'),     sub: t('mobile.profile.availableSub', 'Pronta consegna') },
    { color: '#f59e0b', label: t('mobile.profile.coming', 'In Arrivo / Pre-ordine'), sub: t('mobile.profile.comingSub', 'Riassortimento o arrivo previsto') },
    { color: '#ef4444', label: t('mobile.profile.onOrder', 'Su Ordinazione'),    sub: t('mobile.profile.onOrderSub', "Tempi di attesa variabili") },
  ];

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>

      {/* ── Avatar ── */}
      <View style={styles.avatarSection}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{initials}</Text>
        </View>
        <Text style={styles.userName}>{user?.name ?? user?.email}</Text>
        <View style={styles.roleBadge}>
          <Text style={styles.roleText}>{roleLabel}</Text>
        </View>
      </View>

      {/* ── Account ── */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>{t('mobile.profile.account', 'Account')}</Text>
        <InfoRow icon="mail-outline"        label={t('mobile.profile.email', 'Email')}   value={user?.email ?? ''} />
        {user?.customerName && (
          <InfoRow icon="business-outline"  label={t('mobile.profile.company', 'Azienda')} value={user.customerName} />
        )}
        {user?.supplierSlug && (
          <InfoRow icon="storefront-outline" label={t('mobile.profile.shop', 'Shop')}     value={user.supplierSlug} />
        )}
      </View>

      {/* ── Lingua ── */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>{t('mobile.profile.language', 'Lingua')}</Text>
        <View style={styles.langGrid}>
          {LANGUAGES.map(l => (
            <TouchableOpacity
              key={l.code}
              style={[styles.langChip, lang === l.code && styles.langChipActive]}
              onPress={() => setLang(l.code)}
              activeOpacity={0.75}
            >
              <Text style={styles.langFlag}>{l.flag}</Text>
              <Text style={[styles.langLabel, lang === l.code && styles.langLabelActive]}>
                {l.label}
              </Text>
              {lang === l.code && (
                <Ionicons name="checkmark-circle" size={15} color={COLORS.accent} />
              )}
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* ── Legenda disponibilità ── */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>{t('mobile.profile.availabilityLegend', 'Legenda Disponibilità')}</Text>
        {AVAIL_LEGEND.map(item => (
          <View key={item.color} style={styles.legendRow}>
            <View style={[styles.legendDot, { backgroundColor: item.color }]} />
            <View style={styles.legendTexts}>
              <Text style={styles.legendLabel}>{item.label}</Text>
              <Text style={styles.legendSub}>{item.sub}</Text>
            </View>
          </View>
        ))}
      </View>

      {/* ── Informazioni app ── */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>{t('mobile.profile.info', 'Informazioni')}</Text>
        <InfoRow
          icon="information-circle-outline"
          label={t('mobile.profile.version', 'Versione app')}
          value="1.0.0"
        />
        <InfoRow
          icon="server-outline"
          label={t('mobile.profile.environment', 'Ambiente')}
          value={__DEV__ ? t('mobile.profile.dev', 'Sviluppo') : t('mobile.profile.prod', 'Produzione')}
        />
      </View>

      {/* ── Logout ── */}
      <TouchableOpacity
        style={[styles.logoutBtn, loggingOut && { opacity: 0.6 }]}
        onPress={confirmLogout}
        disabled={loggingOut}
        activeOpacity={0.8}
      >
        <Ionicons name="log-out-outline" size={20} color={COLORS.error} />
        <Text style={styles.logoutText}>{t('mobile.profile.logout', "Esci dall'account")}</Text>
      </TouchableOpacity>

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  content:   { padding: SPACING.lg, gap: SPACING.md, paddingBottom: 40 },

  avatarSection: { alignItems: 'center', paddingVertical: SPACING.xl },
  avatar: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: COLORS.primary,
    justifyContent: 'center', alignItems: 'center', marginBottom: SPACING.sm,
  },
  avatarText: { fontSize: 32, fontWeight: '900', color: '#fff' },
  userName:   { fontSize: 20, fontWeight: '800', color: COLORS.text, marginBottom: 6 },
  roleBadge:  { backgroundColor: `${COLORS.accent}22`, paddingHorizontal: 12, paddingVertical: 4, borderRadius: RADIUS.full },
  roleText:   { color: COLORS.accent, fontWeight: '700', fontSize: 13 },

  card:      { backgroundColor: COLORS.surface, borderRadius: RADIUS.lg, padding: SPACING.md, borderWidth: 1, borderColor: COLORS.border },
  cardTitle: { fontSize: 11, fontWeight: '700', color: COLORS.textSecondary, textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: SPACING.sm },

  infoRow:   { flexDirection: 'row', alignItems: 'center', paddingVertical: SPACING.sm, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  infoIcon:  { marginRight: SPACING.md },
  infoTexts: { flex: 1 },
  infoLabel: { fontSize: 12, color: COLORS.textSecondary },
  infoValue: { fontSize: 14, fontWeight: '600', color: COLORS.text },

  // Lingua
  langGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },
  langChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 12, paddingVertical: 8,
    borderRadius: 10, borderWidth: 1.5, borderColor: COLORS.border,
    backgroundColor: COLORS.background, flexBasis: '46%',
  },
  langChipActive: { borderColor: COLORS.accent, backgroundColor: `${COLORS.accent}11` },
  langFlag:  { fontSize: 18 },
  langLabel: { fontSize: 13, fontWeight: '500', color: COLORS.textSecondary, flex: 1 },
  langLabelActive: { color: COLORS.accent, fontWeight: '700' },

  // Legenda disponibilità
  legendRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  legendDot:    { width: 12, height: 12, borderRadius: 6, flexShrink: 0 },
  legendTexts:  { flex: 1 },
  legendLabel:  { fontSize: 13, fontWeight: '600', color: COLORS.text },
  legendSub:    { fontSize: 11, color: COLORS.textSecondary, marginTop: 1 },

  logoutBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: SPACING.sm, backgroundColor: '#fef2f2',
    borderRadius: RADIUS.md, padding: SPACING.md,
    borderWidth: 1, borderColor: '#fecaca',
  },
  logoutText: { color: COLORS.error, fontWeight: '700', fontSize: 15 },
});
