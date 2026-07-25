import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator,
  Image, Linking, NativeModules,
} from 'react-native';
import { Ionicons }            from '@expo/vector-icons';
import * as SecureStore        from 'expo-secure-store';
import { useAuth }             from '@/context/AuthContext';
import { useI18n }             from '@/i18n/I18nContext';
import { getErrorMessage }     from '@/api/client';
import { COLORS, SPACING, RADIUS } from '@/constants';

const REMEMBER_KEY = 'hompra_remember_credentials';

// Rileva la lingua del dispositivo e la mappa sui locale supportati dal sito (it/fr/de/en/es/pt)
function getDeviceLang(): 'it' | 'fr' | 'de' | 'en' | 'es' | 'pt' {
  try {
    const raw: string = Platform.OS === 'ios'
      ? (NativeModules.SettingsManager?.settings?.AppleLocale
        || NativeModules.SettingsManager?.settings?.AppleLanguages?.[0]
        || 'it')
      : (NativeModules.I18nManager?.localeIdentifier || 'it');
    const code = raw.toLowerCase().slice(0, 2);
    if (code === 'fr' || code === 'de' || code === 'en' || code === 'es' || code === 'pt') return code;
    return 'it';
  } catch {
    return 'it';
  }
}

const LANG = getDeviceLang();
const WEBSITE_URL        = `https://www.hompra.com/${LANG}`;
const PASSWORD_RESET_URL = `https://www.hompra.com/${LANG}/password-recovery`;

export default function LoginScreen() {
  const { login }     = useAuth();
  const { t }         = useI18n();
  const [email,     setEmail]     = useState('');
  const [password,  setPassword]  = useState('');
  const [remember,  setRemember]  = useState(false);
  const [error,     setError]     = useState('');
  const [loading,   setLoading]   = useState(false);

  // Carica credenziali salvate all'avvio
  useEffect(() => {
    (async () => {
      try {
        const saved = await SecureStore.getItemAsync(REMEMBER_KEY);
        if (saved) {
          const { email: e, password: p } = JSON.parse(saved);
          if (e) setEmail(e);
          if (p) setPassword(p);
          setRemember(true);
        }
      } catch {
        // ignore: nessuna credenziale salvata
      }
    })();
  }, []);

  async function handleLogin() {
    if (!email.trim() || !password.trim()) {
      setError(t('mobile.login.emptyFields', 'Inserisci email e password.'));
      return;
    }
    setError('');
    setLoading(true);
    try {
      await login(email.trim().toLowerCase(), password);
      // Se login ok, salva o rimuovi credenziali secondo la scelta utente
      if (remember) {
        await SecureStore.setItemAsync(
          REMEMBER_KEY,
          JSON.stringify({ email: email.trim().toLowerCase(), password }),
        );
      } else {
        await SecureStore.deleteItemAsync(REMEMBER_KEY);
      }
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  function openUrl(url: string) {
    Linking.openURL(url).catch(() => setError(t('mobile.login.linkError', 'Impossibile aprire il link.')));
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <View style={styles.header}>
          <Image
            source={require('../../../assets/logo-hompra.png')}
            style={styles.logo}
            resizeMode="contain"
          />
          <Text style={styles.tagline}>{t('mobile.tagline', 'Ordina in modo semplice')}</Text>
        </View>

        {/* Form */}
        <View style={styles.card}>
          <Text style={styles.title}>{t('mobile.login.title', 'Accedi')}</Text>

          {!!error && (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          <Text style={styles.label}>{t('mobile.login.email', 'Email')}</Text>
          <TextInput
            style={styles.input}
            placeholder={t('mobile.login.emailPh', 'nome@azienda.com')}
            placeholderTextColor={COLORS.textSecondary}
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="next"
            editable={!loading}
          />

          <Text style={styles.label}>{t('mobile.login.password', 'Password')}</Text>
          <TextInput
            style={styles.input}
            placeholder="••••••••"
            placeholderTextColor={COLORS.textSecondary}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            returnKeyType="done"
            onSubmitEditing={handleLogin}
            editable={!loading}
          />

          {/* Ricorda dati + Password dimenticata */}
          <View style={styles.rowBetween}>
            <TouchableOpacity
              style={styles.rememberRow}
              onPress={() => setRemember(!remember)}
              activeOpacity={0.7}
              disabled={loading}
            >
              <View style={[styles.checkbox, remember && styles.checkboxChecked]}>
                {remember && <Ionicons name="checkmark" size={14} color={COLORS.white} />}
              </View>
              <Text style={styles.rememberText}>{t('mobile.login.remember', 'Ricorda dati')}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => openUrl(PASSWORD_RESET_URL)}
              disabled={loading}
              activeOpacity={0.7}
            >
              <Text style={styles.linkText}>{t('mobile.login.forgotPassword', 'Password dimenticata?')}</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleLogin}
            disabled={loading}
            activeOpacity={0.8}
          >
            {loading
              ? <ActivityIndicator color={COLORS.white} />
              : <Text style={styles.buttonText}>{t('mobile.login.loginBtn', 'Accedi')}</Text>
            }
          </TouchableOpacity>
        </View>

        {/* Link sito web */}
        <TouchableOpacity
          style={styles.websiteLink}
          onPress={() => openUrl(WEBSITE_URL)}
          activeOpacity={0.7}
        >
          <Ionicons name="globe-outline" size={16} color={COLORS.accent} />
          <Text style={styles.websiteLinkText}>{t('mobile.login.websiteLink', 'Visualizza la pagina web')}</Text>
        </TouchableOpacity>

        <Text style={styles.footer}>
          Hompra © {new Date().getFullYear()}
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.white },
  scroll: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: SPACING.lg,
  },
  header: { alignItems: 'center', marginBottom: SPACING.xl },
  logo: {
    width: 260,
    height: 75,
    marginBottom: SPACING.sm,
  },
  tagline: { fontSize: 14, color: COLORS.textSecondary, marginTop: 4 },

  card: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 6,
  },
  title: {
    fontSize: 22, fontWeight: '700',
    color: COLORS.text,
    marginBottom: SPACING.md,
  },
  errorBox: {
    backgroundColor: '#fef2f2',
    borderRadius: RADIUS.sm,
    padding: SPACING.sm,
    marginBottom: SPACING.md,
    borderLeftWidth: 3,
    borderLeftColor: COLORS.error,
  },
  errorText: { color: COLORS.error, fontSize: 14 },

  label: {
    fontSize: 13, fontWeight: '600',
    color: COLORS.textSecondary,
    marginBottom: 6, marginTop: SPACING.sm,
    textTransform: 'uppercase', letterSpacing: 0.5,
  },
  input: {
    backgroundColor: COLORS.background,
    borderWidth: 1, borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: 12,
    fontSize: 16, color: COLORS.text,
  },

  // Riga ricorda + password dimenticata
  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: SPACING.md,
  },
  rememberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  checkbox: {
    width: 20, height: 20,
    borderRadius: 5,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.white,
  },
  checkboxChecked: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  rememberText: {
    fontSize: 13,
    color: COLORS.text,
    fontWeight: '600',
  },
  linkText: {
    fontSize: 13,
    color: COLORS.accent,
    fontWeight: '600',
  },

  button: {
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.md,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: SPACING.lg,
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: COLORS.white, fontSize: 16, fontWeight: '700' },

  // Link sito
  websiteLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: SPACING.lg,
    paddingVertical: SPACING.sm,
  },
  websiteLinkText: {
    fontSize: 14,
    color: COLORS.accent,
    fontWeight: '600',
  },

  footer: {
    textAlign: 'center',
    color: COLORS.textSecondary,
    fontSize: 12,
    marginTop: SPACING.md,
  },
});
