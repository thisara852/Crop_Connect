import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Palette, Spacing, BorderRadius } from '../constants/theme';
import { useResponsive } from '../hooks/useResponsive';

export const SplashScreen: React.FC = () => {
  const { scaleSize, scaleFont } = useResponsive();
  const [fadeAnim] = useState(() => new Animated.Value(Platform.OS === 'web' ? 1 : 0));
  const [scaleAnim] = useState(() => new Animated.Value(Platform.OS === 'web' ? 1 : 0.85));

  useEffect(() => {
    if (Platform.OS === 'web') return;
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 900,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 6,
        useNativeDriver: true,
      }),
    ]).start();
  }, [fadeAnim, scaleAnim]);

  const handleProceed = () => {
    router.replace('/onboarding');
  };

  return (
    <View style={styles.container}>
      <Animated.View
        style={[
          styles.contentBox,
          {
            opacity: fadeAnim,
            transform: [{ scale: scaleAnim }],
          },
        ]}
      >
        {/* Animated Brand Emblem */}
        <View
          style={[
            styles.emblemWrapper,
            {
              width: scaleSize(100),
              height: scaleSize(100),
              borderRadius: scaleSize(50),
            },
          ]}
        >
          <View style={styles.innerEmblem}>
            <Ionicons name="leaf" size={scaleSize(48)} color={Palette.primary} />
            <View style={styles.accentSparkle}>
              <Ionicons name="sparkles" size={scaleSize(20)} color={Palette.accent} />
            </View>
          </View>
        </View>

        {/* Brand Typography */}
        <Text
          style={[
            styles.appName,
            {
              fontSize: scaleFont(34),
            },
          ]}
        >
          CropConnect
        </Text>

        <Text
          style={[
            styles.tagline,
            {
              fontSize: scaleFont(15),
            },
          ]}
        >
          AI-Powered Crop Rescue & Fair-Price Matcher
        </Text>

        <View style={styles.divider} />

        <Text
          style={[
            styles.subtext,
            {
              fontSize: scaleFont(12),
            },
          ]}
        >
          Empowering Sri Lankan Farmers • Zero Post-Harvest Waste
        </Text>

        {/* University Community Badge */}
        <View
          style={[
            styles.projectBadge,
            {
              paddingHorizontal: scaleSize(14),
              paddingVertical: scaleSize(6),
              borderRadius: BorderRadius.full,
              marginTop: scaleSize(Spacing.xl),
            },
          ]}
        >
          <Ionicons name="school-outline" size={scaleSize(15)} color={Palette.accent} />
          <Text
            style={[
              styles.badgeText,
              {
                fontSize: scaleFont(11),
              },
            ]}
          >
            University Community Software Project 🇱🇰
          </Text>
        </View>

        {/* Enter CTA */}
        <TouchableOpacity
          activeOpacity={0.88}
          onPress={handleProceed}
          style={[
            styles.enterBtn,
            {
              paddingHorizontal: scaleSize(32),
              paddingVertical: scaleSize(14),
              borderRadius: BorderRadius.full,
              marginTop: scaleSize(Spacing.xxl),
            },
          ]}
        >
          <Text
            style={[
              styles.enterBtnText,
              {
                fontSize: scaleFont(15),
              },
            ]}
          >
            Get Started
          </Text>
          <Ionicons name="arrow-forward" size={scaleSize(18)} color={Palette.primary} />
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Palette.primary,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  contentBox: {
    alignItems: 'center',
    width: '100%',
  },
  emblemWrapper: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    borderWidth: 2,
    borderColor: 'rgba(244, 201, 93, 0.4)',
  },
  innerEmblem: {
    width: '82%',
    height: '82%',
    borderRadius: 9999,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  accentSparkle: {
    position: 'absolute',
    top: 4,
    right: 4,
  },
  appName: {
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: -0.5,
    marginBottom: 6,
  },
  tagline: {
    color: Palette.accent,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 12,
  },
  divider: {
    width: 60,
    height: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 2,
    marginVertical: 10,
  },
  subtext: {
    color: '#E8F3EE',
    textAlign: 'center',
    lineHeight: 18,
    maxWidth: 280,
  },
  projectBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(244, 201, 93, 0.3)',
  },
  badgeText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  enterBtn: {
    backgroundColor: Palette.accent,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  enterBtnText: {
    color: Palette.primary,
    fontWeight: '800',
  },
});

export default SplashScreen;
