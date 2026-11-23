import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
} from 'react-native';
import { Palette, Spacing, BorderRadius, Shadows } from '../constants/theme';
import { Header } from '../components/common/Header';
import { useResponsive } from '../hooks/useResponsive';
import { useTheme } from '../hooks/useTheme';
import { useLocalization } from '../contexts/LocalizationContext';

export const SettingsScreen: React.FC = () => {
  const { scaleSize, scaleFont, contentPadding } = useResponsive();
  const { isDark, setMode } = useTheme();
  const { language, setLanguage } = useLocalization();

  const [rescueAlerts, setRescueAlerts] = useState(true);
  const [priceAlerts, setPriceAlerts] = useState(true);
  const [offlineSync, setOfflineSync] = useState(true);

  return (
    <View style={styles.screen}>
      <Header
        title="Settings & Preferences"
        subtitle="Language, Notifications & Offline"
        showRoleBadge={false}
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingHorizontal: scaleSize(contentPadding),
          paddingBottom: scaleSize(90),
          paddingTop: scaleSize(10),
        }}
      >
        {/* Language Selection */}
        <View
          style={[
            styles.card,
            {
              padding: scaleSize(Spacing.base),
              borderRadius: BorderRadius.xl,
              marginBottom: scaleSize(12),
              ...Shadows.soft,
            },
          ]}
        >
          <Text style={[styles.sectionTitle, { fontSize: scaleFont(15) }]}>
            Application Language (භාෂාව / மொழி)
          </Text>
          <Text style={[styles.sectionSub, { fontSize: scaleFont(12) }]}>
            Choose your preferred language for market tickers and crop listings.
          </Text>

          <View style={styles.langGrid}>
            {[
              { id: 'en' as const, label: 'English', sub: 'Standard' },
              { id: 'si' as const, label: 'සිංහල', sub: 'Sinhala' },
              { id: 'ta' as const, label: 'தமிழ்', sub: 'Tamil' },
            ].map((item) => {
              const active = language === item.id;
              return (
                <TouchableOpacity
                  key={item.id}
                  onPress={() => setLanguage(item.id)}
                  style={[
                    styles.langBtn,
                    active && styles.langBtnActive,
                    { padding: scaleSize(10), borderRadius: BorderRadius.md },
                  ]}
                >
                  <Text
                    style={[
                      styles.langLabel,
                      active && styles.langLabelActive,
                      { fontSize: scaleFont(14) },
                    ]}
                  >
                    {item.label}
                  </Text>
                  <Text style={[styles.langSub, active && { color: '#FFFFFF' }, { fontSize: scaleFont(11) }]}>
                    {item.sub}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Notifications & Rescue Alerts */}
        <View
          style={[
            styles.card,
            {
              padding: scaleSize(Spacing.base),
              borderRadius: BorderRadius.xl,
              marginBottom: scaleSize(12),
              ...Shadows.soft,
            },
          ]}
        >
          <Text style={[styles.sectionTitle, { fontSize: scaleFont(15) }]}>
            Notifications & Warnings
          </Text>

          <View style={styles.toggleRow}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.toggleTitle, { fontSize: scaleFont(13) }]}>
                Urgent Crop Rescue Alerts
              </Text>
              <Text style={[styles.toggleSub, { fontSize: scaleFont(11) }]}>
                Notify when emergency surplus produce is available in your district
              </Text>
            </View>
            <Switch
              value={rescueAlerts}
              onValueChange={setRescueAlerts}
              trackColor={{ false: Palette.slateBorder, true: Palette.primary }}
            />
          </View>

          <View style={[styles.toggleRow, { borderTopWidth: 1, borderTopColor: Palette.subtleBorder, paddingTop: 10 }]}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.toggleTitle, { fontSize: scaleFont(13) }]}>
                Daily Dambulla Price Shifts
              </Text>
              <Text style={[styles.toggleSub, { fontSize: scaleFont(11) }]}>
                Alert if wholesale prices jump or fall by more than 5%
              </Text>
            </View>
            <Switch
              value={priceAlerts}
              onValueChange={setPriceAlerts}
              trackColor={{ false: Palette.slateBorder, true: Palette.primary }}
            />
          </View>
        </View>

        {/* Theme Mode & Connectivity */}
        <View
          style={[
            styles.card,
            {
              padding: scaleSize(Spacing.base),
              borderRadius: BorderRadius.xl,
              marginBottom: scaleSize(12),
              ...Shadows.soft,
            },
          ]}
        >
          <Text style={[styles.sectionTitle, { fontSize: scaleFont(15) }]}>
            Display & Rural Connectivity
          </Text>

          <View style={styles.toggleRow}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.toggleTitle, { fontSize: scaleFont(13) }]}>
                Dark Mode
              </Text>
              <Text style={[styles.toggleSub, { fontSize: scaleFont(11) }]}>
                High-contrast low-light display mode
              </Text>
            </View>
            <Switch
              value={isDark}
              onValueChange={(val) => setMode(val ? 'dark' : 'light')}
              trackColor={{ false: Palette.slateBorder, true: Palette.primary }}
            />
          </View>

          <View style={[styles.toggleRow, { borderTopWidth: 1, borderTopColor: Palette.subtleBorder, paddingTop: 10 }]}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.toggleTitle, { fontSize: scaleFont(13) }]}>
                Offline Agrarian Price Caching
              </Text>
              <Text style={[styles.toggleSub, { fontSize: scaleFont(11) }]}>
                Keep AI price predictor functional even with low 3G farm reception
              </Text>
            </View>
            <Switch
              value={offlineSync}
              onValueChange={setOfflineSync}
              trackColor={{ false: Palette.slateBorder, true: Palette.primary }}
            />
          </View>
        </View>

        {/* Project Info */}
        <View style={styles.aboutCard}>
          <Text style={[styles.aboutText, { fontSize: scaleFont(12) }]}>
            CropConnect Mobile App v1.0.0
          </Text>
          <Text style={[styles.aboutSub, { fontSize: scaleFont(11) }]}>
            AI-Powered Crop Rescue & Fair-Price Matcher • Sri Lankan Agrarian Project
          </Text>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Palette.background,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: Palette.warmBorder,
  },
  sectionTitle: {
    fontWeight: '800',
    color: Palette.charcoal,
    marginBottom: 4,
  },
  sectionSub: {
    color: Palette.slateMedium,
    marginBottom: 12,
  },
  langGrid: {
    flexDirection: 'row',
    gap: 8,
  },
  langBtn: {
    flex: 1,
    backgroundColor: Palette.surfaceAlt,
    borderWidth: 1,
    borderColor: Palette.warmBorder,
    alignItems: 'center',
  },
  langBtnActive: {
    backgroundColor: Palette.primary,
    borderColor: Palette.primary,
  },
  langLabel: {
    fontWeight: '800',
    color: Palette.charcoal,
  },
  langLabelActive: {
    color: '#FFFFFF',
  },
  langSub: {
    color: Palette.slateMedium,
    marginTop: 2,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
  toggleTitle: {
    fontWeight: '700',
    color: Palette.charcoal,
  },
  toggleSub: {
    color: Palette.slateMedium,
    marginTop: 2,
    lineHeight: 15,
  },
  aboutCard: {
    alignItems: 'center',
    marginVertical: 14,
  },
  aboutText: {
    fontWeight: '700',
    color: Palette.slateDark,
  },
  aboutSub: {
    color: Palette.slateMedium,
    marginTop: 2,
    textAlign: 'center',
  },
});

export default SettingsScreen;
