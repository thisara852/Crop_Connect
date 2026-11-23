import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Linking,
  Alert,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Palette, Spacing, BorderRadius, Shadows } from '../constants/theme';
import { Badge } from '../components/common/Badge';
import { Button } from '../components/common/Button';
import { useResponsive } from '../hooks/useResponsive';
import { getBuyerProfile } from '../services/firestoreService';
import { FirestoreBuyer } from '../types/database';

export const BuyerDetailsScreen: React.FC = () => {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { scaleSize, scaleFont, contentPadding } = useResponsive();

  const [buyer, setBuyer] = useState<FirestoreBuyer | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    async function loadBuyer() {
      try {
        const found = id ? await getBuyerProfile(id) : null;
        if (isMounted) {
          setBuyer(found);
        }
      } catch {
        // Handled
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadBuyer();
    return () => {
      isMounted = false;
    };
  }, [id]);

  if (loading) {
    return (
      <View style={[styles.screen, styles.center]}>
        <ActivityIndicator size="large" color={Palette.primary} />
        <Text style={[styles.loadingText, { fontSize: scaleFont(13) }]}>
          Loading Buyer Profile from Cloud Firestore...
        </Text>
      </View>
    );
  }

  const preferredCrops = buyer?.purchasingRequirements?.preferredCrops || ['Carrot', 'Tomato', 'Beans'];
  const preferredDistricts = buyer?.purchasingRequirements?.preferredDistricts || ['Colombo', 'Nuwara Eliya', 'Matale'];

  const handleCallBuyer = () => {
    const phone = buyer?.phone || '+94 71 987 6543';
    Linking.openURL(`tel:${phone}`);
  };

  const handleSendQuote = () => {
    Alert.alert(
      'Quote Sent',
      `Farmer contact details and produce quote request sent to ${buyer?.businessName || 'the buyer'}.`
    );
  };

  return (
    <View style={styles.screen}>
      {/* Top Header */}
      <View
        style={[
          styles.topBar,
          {
            paddingHorizontal: scaleSize(contentPadding),
          },
        ]}
      >
        <TouchableOpacity
          onPress={() => router.back()}
          style={[
            styles.backBtn,
            {
              width: scaleSize(38),
              height: scaleSize(38),
              borderRadius: scaleSize(19),
            },
          ]}
        >
          <Ionicons name="arrow-back" size={scaleSize(20)} color={Palette.charcoal} />
        </TouchableOpacity>

        <Text style={[styles.topTitle, { fontSize: scaleFont(16) }]}>
          Buyer Profile & Requirements
        </Text>

        <View style={{ width: 38 }} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingHorizontal: scaleSize(contentPadding),
          paddingVertical: scaleSize(Spacing.base),
          paddingBottom: scaleSize(100),
        }}
      >
        {/* Buyer Business Card */}
        <View
          style={[
            styles.businessCard,
            {
              padding: scaleSize(Spacing.lg),
              borderRadius: BorderRadius.xl,
              ...Shadows.soft,
            },
          ]}
        >
          <View style={styles.cardHeader}>
            <View
              style={[
                styles.companyBubble,
                {
                  width: scaleSize(56),
                  height: scaleSize(56),
                  borderRadius: scaleSize(28),
                },
              ]}
            >
              <Ionicons name="business" size={scaleSize(28)} color={Palette.primary} />
            </View>

            <View style={{ flex: 1, marginLeft: 12 }}>
              <View style={styles.nameRow}>
                <Text style={[styles.companyName, { fontSize: scaleFont(18) }]}>
                  {buyer?.businessName || 'Pettah Fresh Wholesale Hub'}
                </Text>
              </View>
              <Text style={[styles.repName, { fontSize: scaleFont(13) }]}>
                Representative: {buyer?.contactPerson || 'Dilan Perera'}
              </Text>
              <Text style={[styles.locationLine, { fontSize: scaleFont(12) }]}>
                📍 {buyer?.address || 'Manning Wholesale Market, Pettah, Colombo 11'}
              </Text>
              <View style={styles.badgeRow}>
                <Badge label="Verified Buyer" variant="verified" size="sm" />
                <Badge label={(buyer?.businessType || 'wholesaler').toUpperCase()} variant="category" size="sm" />
              </View>
            </View>
          </View>

          <View style={styles.metricsBar}>
            <View style={styles.metricCol}>
              <Text style={[styles.metricVal, { fontSize: scaleFont(16) }]}>
                ★ {buyer?.rating || 4.9}
              </Text>
              <Text style={[styles.metricLbl, { fontSize: scaleFont(11) }]}>Payment Rating</Text>
            </View>
            <View style={styles.metricDiv} />
            <View style={styles.metricCol}>
              <Text style={[styles.metricVal, { fontSize: scaleFont(16) }]}>
                {buyer?.dealsCompleted || 94}
              </Text>
              <Text style={[styles.metricLbl, { fontSize: scaleFont(11) }]}>Completed Deals</Text>
            </View>
            <View style={styles.metricDiv} />
            <View style={styles.metricCol}>
              <Text style={[styles.metricVal, { fontSize: scaleFont(16), color: Palette.primary }]}>
                {buyer?.purchasingRequirements?.preferredDeliveryMode === 'farmgate_pickup' ? 'Farm Pickup' : 'Market Delivery'}
              </Text>
              <Text style={[styles.metricLbl, { fontSize: scaleFont(11) }]}>Logistics Mode</Text>
            </View>
          </View>
        </View>

        {/* Current Sourcing Requirements */}
        <View
          style={[
            styles.demandCard,
            {
              padding: scaleSize(Spacing.md),
              borderRadius: BorderRadius.lg,
              marginVertical: scaleSize(12),
              ...Shadows.soft,
            },
          ]}
        >
          <View style={styles.demandHeader}>
            <Ionicons name="cart" size={scaleSize(18)} color={Palette.primary} />
            <Text style={[styles.demandTitle, { fontSize: scaleFont(14) }]}>
              Purchasing Requirements & Capacity
            </Text>
          </View>

          {/* Preferred Crop Types */}
          <Text style={[styles.sectionSubLbl, { fontSize: scaleFont(11) }]}>PREFERRED CROP TYPES:</Text>
          <View style={styles.chipsRow}>
            {preferredCrops.map((crop) => (
              <View key={crop} style={styles.cropBadge}>
                <Ionicons name="leaf" size={11} color={Palette.primary} />
                <Text style={styles.cropBadgeText}>{crop}</Text>
              </View>
            ))}
          </View>

          <View style={styles.quotaRow}>
            <View style={styles.quotaItem}>
              <Text style={styles.quotaLbl}>Order Capacity Range:</Text>
              <Text style={styles.quotaVal}>
                {(buyer?.purchasingRequirements?.minOrderQuantityKg || 100).toLocaleString()} - {(buyer?.purchasingRequirements?.maxOrderQuantityKg || 3000).toLocaleString()} kg
              </Text>
            </View>
            <View style={styles.quotaItem}>
              <Text style={styles.quotaLbl}>Estimated Weekly Budget:</Text>
              <Text style={[styles.quotaVal, { color: Palette.primary }]}>
                Rs. {((buyer?.purchasingRequirements?.weeklyTargetBudgetLkr || 750000) / 1000).toFixed(0)}k LKR
              </Text>
            </View>
          </View>

          {/* Preferred Purchasing Locations */}
          <Text style={[styles.sectionSubLbl, { fontSize: scaleFont(11), marginTop: 10 }]}>
            PREFERRED SOURCING LOCATIONS:
          </Text>
          <View style={styles.chipsRow}>
            {preferredDistricts.map((dist) => (
              <View key={dist} style={styles.distBadge}>
                <Ionicons name="location" size={11} color={Palette.secondaryDark} />
                <Text style={styles.distBadgeText}>{dist}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Commercial & Transport Terms */}
        <View
          style={[
            styles.termsCard,
            {
              padding: scaleSize(Spacing.md),
              borderRadius: BorderRadius.lg,
              marginBottom: scaleSize(12),
              ...Shadows.soft,
            },
          ]}
        >
          <Text style={[styles.termsTitle, { fontSize: scaleFont(14) }]}>
            Trading & Logistics Terms
          </Text>

          <View style={styles.termItem}>
            <Ionicons name="car-outline" size={scaleSize(16)} color={Palette.primary} />
            <Text style={[styles.termText, { fontSize: scaleFont(12) }]}>
              Transport: {buyer?.purchasingRequirements?.preferredDeliveryMode === 'farmgate_pickup' ? 'Buyer provides enclosed truck for direct farm-gate collection.' : 'Delivery arranged to regional collection centre.'}
            </Text>
          </View>

          <View style={styles.termItem}>
            <Ionicons name="cash-outline" size={scaleSize(16)} color={Palette.primary} />
            <Text style={[styles.termText, { fontSize: scaleFont(12) }]}>
              Payment: Direct LankaPay bank transfer or cash upon loading at farm.
            </Text>
          </View>

          <View style={styles.termItem}>
            <Ionicons name="snow-outline" size={scaleSize(16)} color={Palette.primary} />
            <Text style={[styles.termText, { fontSize: scaleFont(12) }]}>
              Storage: {buyer?.purchasingRequirements?.hasColdStorage ? 'Refrigerated cold storage hub available for delicate vegetables.' : 'Standard ventilated ambient storehouse.'}
            </Text>
          </View>
        </View>

        {/* Connected Market & AI Analysis Actions */}
        <View
          style={{
            marginHorizontal: scaleSize(contentPadding),
            marginBottom: scaleSize(16),
            gap: scaleSize(8),
          }}
        >
          <Button
            title={`Compare Offers for ${preferredCrops[0] || 'Carrot'}`}
            variant="outline"
            size="md"
            icon="stats-chart-outline"
            fullWidth
            onPress={() =>
              router.push({
                pathname: '/price-comparison',
                params: { cropName: preferredCrops[0] || 'Carrot' },
              })
            }
          />

          <View style={{ flexDirection: 'row', gap: scaleSize(8) }}>
            <View style={{ flex: 1 }}>
              <Button
                title="AI Price Advisor"
                variant="outline"
                size="sm"
                icon="sparkles-outline"
                fullWidth
                onPress={() =>
                  router.push({
                    pathname: '/price-prediction',
                    params: { cropName: preferredCrops[0] || 'Carrot' },
                  })
                }
              />
            </View>
            <View style={{ flex: 1 }}>
              <Button
                title="Market Price History"
                variant="outline"
                size="sm"
                icon="time-outline"
                fullWidth
                onPress={() =>
                  router.push({
                    pathname: '/price-history',
                    params: { cropName: preferredCrops[0] || 'Carrot' },
                  })
                }
              />
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Bottom Action */}
      <View
        style={[
          styles.bottomBar,
          {
            paddingHorizontal: scaleSize(contentPadding),
            paddingVertical: scaleSize(12),
          },
        ]}
      >
        <View style={styles.bottomButtonsRow}>
          <TouchableOpacity
            activeOpacity={0.88}
            onPress={handleCallBuyer}
            style={styles.callBuyerBtn}
          >
            <Ionicons name="call" size={16} color="#FFFFFF" />
            <Text style={styles.callBuyerBtnText}>
              Call ({buyer?.phone || '+94 71 987 6543'})
            </Text>
          </TouchableOpacity>

          <View style={{ flex: 1 }}>
            <Button
              title="Send Direct Quote"
              variant="outline"
              size="lg"
              icon="paper-plane-outline"
              fullWidth
              onPress={handleSendQuote}
            />
          </View>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Palette.background,
  },
  center: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 30,
  },
  loadingText: {
    marginTop: 10,
    color: Palette.slateMedium,
    fontWeight: '600',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Palette.warmBorder,
    backgroundColor: '#FFFFFF',
  },
  backBtn: {
    backgroundColor: Palette.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topTitle: {
    fontWeight: '800',
    color: Palette.charcoal,
  },
  businessCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: Palette.warmBorder,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  companyBubble: {
    backgroundColor: Palette.primaryTint,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: Palette.primary,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  companyName: {
    fontWeight: '900',
    color: Palette.charcoal,
    flex: 1,
  },
  repName: {
    color: Palette.secondaryDark,
    fontWeight: '700',
    marginTop: 1,
  },
  locationLine: {
    color: Palette.slateDark,
    marginTop: 2,
  },
  badgeRow: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 6,
  },
  metricsBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Palette.background,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: BorderRadius.md,
    marginTop: 6,
  },
  metricCol: {
    alignItems: 'center',
  },
  metricVal: {
    fontWeight: '900',
    color: Palette.charcoal,
  },
  metricLbl: {
    color: Palette.slateMedium,
    marginTop: 1,
  },
  metricDiv: {
    width: 1,
    height: 22,
    backgroundColor: Palette.subtleBorder,
  },
  demandCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: Palette.warmBorder,
  },
  demandHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderBottomWidth: 1,
    borderBottomColor: Palette.subtleBorder,
    paddingBottom: 8,
    marginBottom: 8,
  },
  demandTitle: {
    fontWeight: '800',
    color: Palette.charcoal,
  },
  sectionSubLbl: {
    fontWeight: '700',
    color: Palette.slateMedium,
    marginBottom: 4,
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 8,
  },
  cropBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Palette.primaryTint,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
  },
  cropBadgeText: {
    fontSize: 11,
    color: Palette.primary,
    fontWeight: '700',
  },
  distBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Palette.secondaryTint,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
  },
  distBadgeText: {
    fontSize: 11,
    color: Palette.secondaryDark,
    fontWeight: '700',
  },
  quotaRow: {
    backgroundColor: Palette.background,
    padding: 10,
    borderRadius: BorderRadius.md,
    gap: 6,
    marginVertical: 4,
  },
  quotaItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  quotaLbl: {
    fontSize: 11,
    color: Palette.slateMedium,
  },
  quotaVal: {
    fontSize: 12,
    fontWeight: '800',
    color: Palette.charcoal,
  },
  termsCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: Palette.warmBorder,
  },
  termsTitle: {
    fontWeight: '800',
    color: Palette.charcoal,
    marginBottom: 10,
  },
  termItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginBottom: 8,
  },
  termText: {
    flex: 1,
    color: Palette.slateDark,
    lineHeight: 18,
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: Palette.warmBorder,
  },
  bottomButtonsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  callBuyerBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: Palette.primary,
    paddingVertical: 14,
    borderRadius: BorderRadius.lg,
  },
  callBuyerBtnText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 13,
  },
});

export default BuyerDetailsScreen;
