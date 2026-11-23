import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Palette, Spacing, BorderRadius, Shadows } from '../constants/theme';
import { Header } from '../components/common/Header';
import { Button } from '../components/common/Button';
import { MarketTicker } from '../components/home/MarketTicker';
import { CropListingCard } from '../components/home/CropListingCard';
import { useResponsive } from '../hooks/useResponsive';
import { useAuth } from '../hooks/useAuth';
import { useTheme } from '../hooks/useTheme';
import { useLocalization } from '../contexts/LocalizationContext';
import { getMockMarketTickers } from '../services/aiService';
import {
  getFarmerListings,
  getAllBuyers,
  getLatestMarketPrices,
} from '../services/firestoreService';
import { FirestoreCropListing, FirestoreBuyer, FirestoreMarketPrice } from '../types/database';

export const FarmerDashboardScreen: React.FC = () => {
  const { scaleSize, scaleFont, contentPadding } = useResponsive();
  const { user } = useAuth();
  const { isDark } = useTheme();
  const { t, language } = useLocalization();

  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [farmerListings, setFarmerListings] = useState<FirestoreCropListing[]>([]);
  const [nearbyBuyers, setNearbyBuyers] = useState<FirestoreBuyer[]>([]);
  const [marketPrices, setMarketPrices] = useState<FirestoreMarketPrice[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const currentHour = new Date().getHours();
  const greeting =
    language === 'si'
      ? 'ආයුබෝවන්'
      : language === 'ta'
      ? 'வணக்கம்'
      : currentHour < 12
      ? 'Good Morning'
      : currentHour < 17
      ? 'Good Afternoon'
      : 'Good Evening';

  const [refreshTrigger, setRefreshTrigger] = useState(0);

  useEffect(() => {
    let isMounted = true;

    const load = async () => {
      try {
        const farmerId = user?.id || 'farmer_001';

        // Concurrent fetch from Cloud Firestore
        const [listingsData, buyersData, pricesData] = await Promise.all([
          getFarmerListings(farmerId),
          getAllBuyers(),
          getLatestMarketPrices(),
        ]);

        if (isMounted) {
          setFarmerListings(listingsData);
          setNearbyBuyers(buyersData.slice(0, 4));
          setMarketPrices(pricesData);
          setErrorMsg(null);
        }
      } catch {
        if (isMounted) {
          setErrorMsg('Unable to refresh latest market records. Displaying offline snapshot.');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    };

    load();
    return () => {
      isMounted = false;
    };
  }, [user, refreshTrigger]);

  const onRefresh = () => {
    setRefreshing(true);
    setRefreshTrigger((prev) => prev + 1);
  };

  const totalHarvestQuantity = farmerListings.reduce((sum, l) => sum + (l.quantityKg || 0), 0);
  const totalProjectedValueLkr = farmerListings.reduce(
    (sum, l) => sum + (l.quantityKg || 0) * (l.askingPricePerKg || 0),
    0
  );

  const tickers = getMockMarketTickers();

  return (
    <View style={[styles.screen, { backgroundColor: isDark ? '#121815' : Palette.background }]}>
      <Header
        title="CropConnect Farmer"
        subtitle={`Agri-Dashboard • ${user?.location?.district || 'Nuwara Eliya'}`}
        onNotificationPress={() => router.push('/notifications')}
      />

      {loading && !refreshing ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Palette.primary} />
          <Text style={[styles.loadingText, { fontSize: scaleFont(13) }]}>
            Connecting to Agrarian Cloud Network...
          </Text>
        </View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          contentContainerStyle={{ paddingBottom: scaleSize(90) }}
        >
          {errorMsg && (
            <View style={[styles.errorBanner, { marginHorizontal: scaleSize(contentPadding) }]}>
              <Ionicons name="information-circle" size={scaleSize(18)} color={Palette.warning} />
              <Text style={[styles.errorBannerText, { fontSize: scaleFont(12) }]}>{errorMsg}</Text>
            </View>
          )}

          {/* 1. Farmer Welcome & Profile Summary Card */}
          <View
            style={[
              styles.welcomeBox,
              {
                marginHorizontal: scaleSize(contentPadding),
                padding: scaleSize(Spacing.base),
                borderRadius: BorderRadius.xl,
                ...Shadows.soft,
              },
            ]}
          >
            <View style={styles.welcomeTop}>
              <View style={{ flex: 1 }}>
                <View style={styles.badgeRow}>
                  <Text style={[styles.greeting, { fontSize: scaleFont(12) }]}>
                    {greeting.toUpperCase()} · {t.farmer} 🌾
                  </Text>
                </View>
                <Text style={[styles.farmerName, { fontSize: scaleFont(20) }]}>
                  {user?.fullName || 'Sunil Bandara'}
                </Text>
                <Text style={[styles.farmMeta, { fontSize: scaleFont(12) }]}>
                  {user?.farmName || 'Green Mountain Hill Farm'} •{' '}
                  {user?.farmSizeAcres || 4.5} Acres ({user?.location?.district || 'Nuwara Eliya'})
                </Text>
              </View>

              {/* Verified Agrarian Member Seal */}
              <View style={styles.verifiedSeal}>
                <Ionicons name="shield-checkmark" size={scaleSize(20)} color={Palette.primary} />
                <Text style={[styles.verifiedText, { fontSize: scaleFont(10) }]}>Verified</Text>
              </View>
            </View>

            {/* Farmer Farm Profile Summary Metrics */}
            <View style={styles.metricGrid}>
              <View style={styles.metricCol}>
                <Text style={[styles.metricVal, { fontSize: scaleFont(16) }]}>
                  {totalHarvestQuantity > 0 ? `${totalHarvestQuantity.toLocaleString()} kg` : '0 kg'}
                </Text>
                <Text style={[styles.metricLbl, { fontSize: scaleFont(11) }]}>Listed Harvest</Text>
              </View>

              <View style={styles.metricDivider} />

              <View style={styles.metricCol}>
                <Text style={[styles.metricVal, { fontSize: scaleFont(16), color: Palette.primary }]}>
                  Rs. {totalProjectedValueLkr > 0 ? `${Math.round(totalProjectedValueLkr / 1000)}K` : '0'}
                </Text>
                <Text style={[styles.metricLbl, { fontSize: scaleFont(11) }]}>Inventory Value</Text>
              </View>

              <View style={styles.metricDivider} />

              <View style={styles.metricCol}>
                <Text style={[styles.metricVal, { fontSize: scaleFont(16), color: Palette.warning }]}>
                  {user?.rating ? `★ ${user.rating}` : '★ 4.9'}
                </Text>
                <Text style={[styles.metricLbl, { fontSize: scaleFont(11) }]}>
                  {user?.dealsCompleted ? `${user.dealsCompleted} Deals` : '48 Deals'}
                </Text>
              </View>
            </View>
          </View>

          {/* 2. Live Agrarian Market Price Ticker */}
          <MarketTicker
            items={tickers}
            onItemPress={() => router.push('/price-history')}
          />

          {/* 3. Farmer Quick Action Buttons */}
          <View
            style={[
              styles.actionsGrid,
              { marginHorizontal: scaleSize(contentPadding), gap: scaleSize(10) },
            ]}
          >
            {/* Action 1: Add New Crop Listing */}
            <TouchableOpacity
              activeOpacity={0.88}
              onPress={() => router.push('/(farmer)/add-crop')}
              style={[
                styles.actionTile,
                {
                  backgroundColor: Palette.primary,
                  padding: scaleSize(14),
                  borderRadius: BorderRadius.lg,
                  ...Shadows.soft,
                },
              ]}
            >
              <View style={[styles.actionIconBubble, { backgroundColor: 'rgba(255, 255, 255, 0.2)' }]}>
                <Ionicons name="add-circle" size={scaleSize(24)} color="#FFFFFF" />
              </View>
              <Text style={[styles.actionTileTitle, { fontSize: scaleFont(14), color: '#FFFFFF' }]}>
                + Add Crop Listing
              </Text>
              <Text style={[styles.actionTileSub, { fontSize: scaleFont(11), color: '#E8F3EE' }]}>
                Publish produce in kg & LKR
              </Text>
            </TouchableOpacity>

            {/* Action 2: My Crop Listings */}
            <TouchableOpacity
              activeOpacity={0.88}
              onPress={() => router.push('/(farmer)/my-crops')}
              style={[
                styles.actionTile,
                {
                  backgroundColor: '#FFFFFF',
                  padding: scaleSize(14),
                  borderRadius: BorderRadius.lg,
                  borderWidth: 1,
                  borderColor: Palette.warmBorder,
                  ...Shadows.soft,
                },
              ]}
            >
              <View style={[styles.actionIconBubble, { backgroundColor: Palette.primaryTint }]}>
                <Ionicons name="leaf" size={scaleSize(24)} color={Palette.primary} />
              </View>
              <Text style={[styles.actionTileTitle, { fontSize: scaleFont(14), color: Palette.charcoal }]}>
                My Crop Listings
              </Text>
              <Text style={[styles.actionTileSub, { fontSize: scaleFont(11), color: Palette.slateMedium }]}>
                {farmerListings.length} Active • Manage & Edit
              </Text>
            </TouchableOpacity>
          </View>

          {/* Second Quick Action Row */}
          <View
            style={[
              styles.actionsGrid,
              { marginHorizontal: scaleSize(contentPadding), gap: scaleSize(10), marginTop: scaleSize(10) },
            ]}
          >
            {/* Action 3: AI Price Advisor */}
            <TouchableOpacity
              activeOpacity={0.88}
              onPress={() => router.push('/(farmer)/advisor')}
              style={[
                styles.actionTile,
                {
                  backgroundColor: '#FFFFFF',
                  padding: scaleSize(14),
                  borderRadius: BorderRadius.lg,
                  borderWidth: 1,
                  borderColor: Palette.warmBorder,
                  ...Shadows.soft,
                },
              ]}
            >
              <View style={[styles.actionIconBubble, { backgroundColor: Palette.accentTint }]}>
                <Ionicons name="sparkles" size={scaleSize(24)} color={Palette.warning} />
              </View>
              <Text style={[styles.actionTileTitle, { fontSize: scaleFont(14), color: Palette.charcoal }]}>
                AI Price Advisor
              </Text>
              <Text style={[styles.actionTileSub, { fontSize: scaleFont(11), color: Palette.slateMedium }]}>
                Predict fair market price
              </Text>
            </TouchableOpacity>

            {/* Action 4: Nearby Buyers Map */}
            <TouchableOpacity
              activeOpacity={0.88}
              onPress={() => router.push('/map-view')}
              style={[
                styles.actionTile,
                {
                  backgroundColor: '#FFFFFF',
                  padding: scaleSize(14),
                  borderRadius: BorderRadius.lg,
                  borderWidth: 1,
                  borderColor: Palette.warmBorder,
                  ...Shadows.soft,
                },
              ]}
            >
              <View style={[styles.actionIconBubble, { backgroundColor: Palette.secondaryTint }]}>
                <Ionicons name="map" size={scaleSize(24)} color={Palette.secondary} />
              </View>
              <Text style={[styles.actionTileTitle, { fontSize: scaleFont(14), color: Palette.charcoal }]}>
                Nearby Buyers Map
              </Text>
              <Text style={[styles.actionTileSub, { fontSize: scaleFont(11), color: Palette.slateMedium }]}>
                Explore buyer locations
              </Text>
            </TouchableOpacity>
          </View>

          {/* 4. Current Wholesale Price Information from Major DEC Centers */}
          <View
            style={[
              styles.priceBenchmarkCard,
              {
                marginHorizontal: scaleSize(contentPadding),
                padding: scaleSize(Spacing.md),
                borderRadius: BorderRadius.lg,
                marginTop: scaleSize(14),
                ...Shadows.soft,
              },
            ]}
          >
            <View style={styles.priceBenchmarkHeader}>
              <View style={styles.benchmarkTitleRow}>
                <Ionicons name="trending-up" size={scaleSize(18)} color={Palette.primary} />
                <Text style={[styles.priceBenchmarkTitle, { fontSize: scaleFont(14) }]}>
                  Sri Lanka Wholesale Price Intelligence
                </Text>
              </View>
              <TouchableOpacity onPress={() => router.push('/price-comparison')}>
                <Text style={[styles.seeMoreLink, { fontSize: scaleFont(12) }]}>Compare ➔</Text>
              </TouchableOpacity>
            </View>

            <Text style={[styles.benchmarkSub, { fontSize: scaleFont(11) }]}>
              Official rates from Dambulla DEC & Pettah Manning Market (LKR per kg)
            </Text>

            <View style={styles.priceItemsRow}>
              {marketPrices.slice(0, 3).map((mp) => (
                <View key={mp.id} style={styles.priceChip}>
                  <Text style={[styles.priceChipName, { fontSize: scaleFont(12) }]}>
                    {mp.cropName}
                  </Text>
                  <Text style={[styles.priceChipVal, { fontSize: scaleFont(13) }]}>
                    Rs. {mp.wholesalePriceAvg}/kg
                  </Text>
                  <Text
                    style={[
                      styles.priceChipTrend,
                      {
                        fontSize: scaleFont(10),
                        color: mp.trend === 'up' ? Palette.primary : Palette.rescueRed,
                      },
                    ]}
                  >
                    {mp.trend === 'up' ? '▲' : '▼'} {Math.abs(mp.dailyPercentageChange)}%
                  </Text>
                </View>
              ))}
            </View>
          </View>

          {/* 5. Recommended Nearby Buyers */}
          <View
            style={[
              styles.sectionHeader,
              { paddingHorizontal: scaleSize(contentPadding), marginTop: scaleSize(18), marginBottom: scaleSize(8) },
            ]}
          >
            <View>
              <Text style={[styles.sectionTitle, { fontSize: scaleFont(16) }]}>
                Nearby Wholesale Buyers
              </Text>
              <Text style={[styles.sectionSubtitle, { fontSize: scaleFont(11) }]}>
                Verified commercial buyers actively purchasing in your region
              </Text>
            </View>
            <TouchableOpacity onPress={() => router.push('/nearby-buyers')}>
              <Text style={[styles.seeAllText, { fontSize: scaleFont(13) }]}>View All</Text>
            </TouchableOpacity>
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{
              paddingHorizontal: scaleSize(contentPadding),
              gap: scaleSize(10),
              paddingVertical: 4,
            }}
          >
            {nearbyBuyers.map((buyer) => (
              <View
                key={buyer.id}
                style={[
                  styles.buyerRecommendationCard,
                  {
                    width: scaleSize(240),
                    padding: scaleSize(14),
                    borderRadius: BorderRadius.lg,
                    ...Shadows.soft,
                  },
                ]}
              >
                <View style={styles.buyerCardTop}>
                  <View style={styles.buyerAvatar}>
                    <Ionicons name="business" size={scaleSize(18)} color={Palette.primary} />
                  </View>
                  <View style={{ flex: 1, marginLeft: 8 }}>
                    <Text
                      numberOfLines={1}
                      style={[styles.buyerBusinessName, { fontSize: scaleFont(13) }]}
                    >
                      {buyer.businessName}
                    </Text>
                    <Text style={[styles.buyerDistrict, { fontSize: scaleFont(11) }]}>
                      📍 {buyer.district} • {buyer.businessType}
                    </Text>
                  </View>
                </View>

                <View style={styles.buyerRequirementsBox}>
                  <Text style={[styles.buyerReqLabel, { fontSize: scaleFont(10) }]}>
                    PURCHASING DEMAND:
                  </Text>
                  <Text
                    numberOfLines={1}
                    style={[styles.buyerReqText, { fontSize: scaleFont(11) }]}
                  >
                    {buyer.purchasingRequirements?.preferredCrops?.join(', ') || 'Vegetables & Produce'}
                  </Text>
                  <Text style={[styles.buyerCapacity, { fontSize: scaleFont(11) }]}>
                    Capacity: Up to {buyer.purchasingRequirements?.maxOrderQuantityKg || 2500} kg
                  </Text>
                </View>

                <Button
                  title="Contact Buyer"
                  size="sm"
                  variant="outline"
                  icon="chatbubble-ellipses-outline"
                  fullWidth
                  onPress={() => router.push({ pathname: '/buyer/[id]', params: { id: buyer.id } })}
                  style={{ marginTop: 8 }}
                />
              </View>
            ))}
          </ScrollView>

          {/* 6. Active Crop Listings Section */}
          <View
            style={[
              styles.sectionHeader,
              { paddingHorizontal: scaleSize(contentPadding), marginTop: scaleSize(20), marginBottom: scaleSize(8) },
            ]}
          >
            <View>
              <Text style={[styles.sectionTitle, { fontSize: scaleFont(16) }]}>
                My Active Crop Listings
              </Text>
              <Text style={[styles.sectionSubtitle, { fontSize: scaleFont(11) }]}>
                Direct from Cloud Firestore • {farmerListings.length} Produce Batches
              </Text>
            </View>
            <TouchableOpacity onPress={() => router.push('/(farmer)/my-crops')}>
              <Text style={[styles.seeAllText, { fontSize: scaleFont(13) }]}>
                Manage ({farmerListings.length})
              </Text>
            </TouchableOpacity>
          </View>

          {farmerListings.length === 0 ? (
            <View
              style={[
                styles.emptyListingsBox,
                {
                  marginHorizontal: scaleSize(contentPadding),
                  padding: scaleSize(Spacing.lg),
                  borderRadius: BorderRadius.lg,
                  ...Shadows.soft,
                },
              ]}
            >
              <Ionicons name="leaf-outline" size={scaleSize(42)} color={Palette.slateMedium} />
              <Text style={[styles.emptyTitle, { fontSize: scaleFont(16) }]}>
                No Active Crop Listings Yet
              </Text>
              <Text style={[styles.emptySub, { fontSize: scaleFont(12) }]}>
                List your ready harvest in kg with expected LKR prices to connect immediately with wholesale buyers across Sri Lanka.
              </Text>
              <Button
                title="+ Create Your First Crop Listing"
                variant="primary"
                size="md"
                icon="add-circle"
                onPress={() => router.push('/(farmer)/add-crop')}
                style={{ marginTop: 12 }}
              />
            </View>
          ) : (
            farmerListings.map((listing) => (
              <CropListingCard
                key={listing.id}
                listing={{
                  ...listing,
                  farmerRating: listing.farmerRating || 4.9,
                  minOrderKg: listing.minOrderKg || 100,
                  location: {
                    latitude: listing.latitude,
                    longitude: listing.longitude,
                    district: listing.district,
                    address: listing.address,
                  },
                }}
                onPress={() => router.push({ pathname: '/crop/[id]', params: { id: listing.id } })}
              />
            ))
          )}
        </ScrollView>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 30,
  },
  loadingText: {
    color: Palette.slateMedium,
    fontWeight: '600',
    marginTop: 12,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#F59E0B',
    padding: 10,
    borderRadius: BorderRadius.md,
    marginTop: 8,
    marginBottom: 4,
  },
  errorBannerText: {
    color: '#92400E',
    flex: 1,
    fontWeight: '600',
  },
  welcomeBox: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: Palette.warmBorder,
    marginTop: 10,
    marginBottom: 8,
  },
  welcomeTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  greeting: {
    fontWeight: '800',
    color: Palette.primary,
    letterSpacing: 0.5,
  },
  farmerName: {
    fontWeight: '900',
    color: Palette.charcoal,
    marginTop: 2,
  },
  farmMeta: {
    color: Palette.slateMedium,
    fontWeight: '600',
    marginTop: 2,
  },
  verifiedSeal: {
    backgroundColor: Palette.primaryTint,
    borderRadius: BorderRadius.md,
    paddingHorizontal: 8,
    paddingVertical: 4,
    alignItems: 'center',
  },
  verifiedText: {
    color: Palette.primary,
    fontWeight: '800',
    marginTop: 2,
  },
  metricGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: Palette.subtleBorder,
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
    marginTop: 2,
    fontWeight: '600',
  },
  metricDivider: {
    width: 1,
    height: 24,
    backgroundColor: Palette.subtleBorder,
  },
  actionsGrid: {
    flexDirection: 'row',
  },
  actionTile: {
    flex: 1,
  },
  actionIconBubble: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  actionTileTitle: {
    fontWeight: '800',
    marginBottom: 2,
  },
  actionTileSub: {
    fontWeight: '500',
  },
  priceBenchmarkCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: Palette.warmBorder,
  },
  priceBenchmarkHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  benchmarkTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  priceBenchmarkTitle: {
    fontWeight: '800',
    color: Palette.charcoal,
  },
  seeMoreLink: {
    color: Palette.primary,
    fontWeight: '700',
  },
  benchmarkSub: {
    color: Palette.slateMedium,
    marginTop: 4,
    marginBottom: 10,
  },
  priceItemsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  priceChip: {
    flex: 1,
    backgroundColor: Palette.background,
    borderRadius: BorderRadius.md,
    padding: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Palette.warmBorder,
  },
  priceChipName: {
    fontWeight: '700',
    color: Palette.charcoal,
  },
  priceChipVal: {
    fontWeight: '800',
    color: Palette.primary,
    marginTop: 2,
  },
  priceChipTrend: {
    fontWeight: '700',
    marginTop: 2,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionTitle: {
    fontWeight: '800',
    color: Palette.charcoal,
  },
  sectionSubtitle: {
    color: Palette.slateMedium,
    marginTop: 1,
  },
  seeAllText: {
    color: Palette.primary,
    fontWeight: '700',
  },
  buyerRecommendationCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: Palette.warmBorder,
  },
  buyerCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  buyerAvatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: Palette.primaryTint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buyerBusinessName: {
    fontWeight: '800',
    color: Palette.charcoal,
  },
  buyerDistrict: {
    color: Palette.slateMedium,
    fontWeight: '600',
    marginTop: 1,
  },
  buyerRequirementsBox: {
    backgroundColor: Palette.background,
    borderRadius: BorderRadius.sm,
    padding: 8,
    marginTop: 8,
  },
  buyerReqLabel: {
    color: Palette.slateMedium,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  buyerReqText: {
    color: Palette.charcoal,
    fontWeight: '700',
    marginTop: 2,
  },
  buyerCapacity: {
    color: Palette.primary,
    fontWeight: '700',
    marginTop: 2,
  },
  emptyListingsBox: {
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    textAlign: 'center',
    borderWidth: 1,
    borderColor: Palette.warmBorder,
  },
  emptyTitle: {
    fontWeight: '800',
    color: Palette.charcoal,
    marginTop: 10,
  },
  emptySub: {
    color: Palette.slateMedium,
    textAlign: 'center',
    marginTop: 4,
    lineHeight: 18,
  },
});
