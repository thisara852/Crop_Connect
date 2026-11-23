import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  TextInput,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Palette, BorderRadius, Shadows } from '../constants/theme';
import { Badge } from '../components/common/Badge';
import { Button } from '../components/common/Button';
import { useResponsive } from '../hooks/useResponsive';
import { useAuth } from '../hooks/useAuth';
import {
  getAdminAnalytics,
  getAllFarmersAdmin,
  getAllBuyersAdmin,
  getAllListingsAdmin,
  getAllMarketPricesAdmin,
  getAllPredictionsAdmin,
  getAllEnquiriesAdmin,
  updateFarmerVerificationAdmin,
  verifyBuyerRegistrationAdmin,
  moderateCropListingAdmin,
  addMarketPriceRecordAdmin,
  AdminAnalyticsSummary,
} from '../services/adminService';
import { formatLKR } from '../services/priceHistoryService';
import {
  FirestoreFarmer,
  FirestoreBuyer,
  FirestoreCropListing,
  FirestoreMarketPrice,
  FirestorePricePrediction,
  FirestoreEnquiry,
  MarketCenterName,
} from '../types/database';

type AdminTab =
  | 'overview'
  | 'farmers'
  | 'buyers'
  | 'listings'
  | 'market_prices'
  | 'predictions'
  | 'enquiries';

export const AdminDashboardScreen: React.FC = () => {
  const { scaleSize, scaleFont, contentPadding } = useResponsive();
  const { user, role, logout } = useAuth();

  const [activeTab, setActiveTab] = useState<AdminTab>('overview');
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);

  // Data states
  const [analytics, setAnalytics] = useState<AdminAnalyticsSummary | null>(null);
  const [farmers, setFarmers] = useState<FirestoreFarmer[]>([]);
  const [buyers, setBuyers] = useState<FirestoreBuyer[]>([]);
  const [listings, setListings] = useState<FirestoreCropListing[]>([]);
  const [marketPrices, setMarketPrices] = useState<FirestoreMarketPrice[]>([]);
  const [predictions, setPredictions] = useState<FirestorePricePrediction[]>([]);
  const [enquiries, setEnquiries] = useState<FirestoreEnquiry[]>([]);

  // Action modals
  const [showAddPriceModal, setShowAddPriceModal] = useState<boolean>(false);
  const [newPriceCrop, setNewPriceCrop] = useState<string>('Carrot');
  const [newPriceMarket] = useState<MarketCenterName>('Dambulla DEC');
  const [newPriceAvg, setNewPriceAvg] = useState<string>('');
  const [newPriceMin, setNewPriceMin] = useState<string>('');
  const [newPriceMax, setNewPriceMax] = useState<string>('');
  const [newPriceRetail, setNewPriceRetail] = useState<string>('');

  // Buyer verification modal
  const [selectedBuyer, setSelectedBuyer] = useState<FirestoreBuyer | null>(null);

  // Security enforcement: verify user has admin role
  const isAdmin = role === 'admin' || user?.role === 'admin';

  useEffect(() => {
    if (!isAdmin) return;

    let cancelled = false;
    const run = async () => {
      setLoading(true);
      try {
        const [a, f, b, l, mp, p, enq] = await Promise.all([
          getAdminAnalytics(role),
          getAllFarmersAdmin(role),
          getAllBuyersAdmin(role),
          getAllListingsAdmin(role),
          getAllMarketPricesAdmin(role),
          getAllPredictionsAdmin(role),
          getAllEnquiriesAdmin(role),
        ]);
        if (!cancelled) {
          setAnalytics(a);
          setFarmers(f);
          setBuyers(b);
          setListings(l);
          setMarketPrices(mp);
          setPredictions(p);
          setEnquiries(enq);
        }
      } catch (err: any) {
        if (!cancelled) {
          Alert.alert('Admin Access Error', err?.message || 'Failed to load administrative data.');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    };
    run();
    return () => {
      cancelled = true;
    };
  }, [role, isAdmin]);

  const onRefresh = () => {
    if (!isAdmin) return;
    setRefreshing(true);
    const run = async () => {
      try {
        const [a, f, b, l, mp, p, enq] = await Promise.all([
          getAdminAnalytics(role),
          getAllFarmersAdmin(role),
          getAllBuyersAdmin(role),
          getAllListingsAdmin(role),
          getAllMarketPricesAdmin(role),
          getAllPredictionsAdmin(role),
          getAllEnquiriesAdmin(role),
        ]);
        setAnalytics(a);
        setFarmers(f);
        setBuyers(b);
        setListings(l);
        setMarketPrices(mp);
        setPredictions(p);
        setEnquiries(enq);
      } catch {
        // preserve current state on error
      } finally {
        setRefreshing(false);
      }
    };
    void run();
  };

  const handleToggleFarmerCertification = async (farmer: FirestoreFarmer) => {
    try {
      const nextOrganic = !farmer.isCertifiedOrganic;
      await updateFarmerVerificationAdmin(farmer.id, nextOrganic, farmer.govRegistrationNumber, role);
      setFarmers((prev) =>
        prev.map((f) => (f.id === farmer.id ? { ...f, isCertifiedOrganic: nextOrganic } : f))
      );
      Alert.alert('Farmer Status Updated', `Organic certification set to ${nextOrganic ? 'Verified' : 'Uncertified'}.`);
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Operation failed.');
    }
  };

  const handleVerifyBuyer = async (buyer: FirestoreBuyer, verifyStatus: boolean) => {
    try {
      await verifyBuyerRegistrationAdmin(buyer.id, verifyStatus, role);
      setBuyers((prev) =>
        prev.map((b) => (b.id === buyer.id ? { ...b, isVerifiedBusiness: verifyStatus } : b))
      );
      setSelectedBuyer(null);
      Alert.alert(
        'Buyer Verification Updated',
        `${buyer.businessName} registration is now marked as ${verifyStatus ? 'Verified' : 'Unverified'}.`
      );
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Operation failed.');
    }
  };

  const handleModerateListing = async (
    listingId: string,
    action: 'approve' | 'flag_invalid' | 'delete' | 'mark_rescue'
  ) => {
    try {
      await moderateCropListingAdmin(listingId, action, role);
      if (action === 'delete') {
        setListings((prev) => prev.filter((l) => l.id !== listingId));
      } else {
        setListings((prev) =>
          prev.map((l) => {
            if (l.id === listingId) {
              if (action === 'mark_rescue') return { ...l, isRescueCrop: true };
              if (action === 'flag_invalid') return { ...l, status: 'expired' as const };
              return { ...l, status: 'active' };
            }
            return l;
          })
        );
      }
      Alert.alert('Listing Action Complete', `Action '${action}' applied to listing.`);
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Action failed.');
    }
  };

  const handleAddMarketPrice = async () => {
    const avg = parseFloat(newPriceAvg);
    const min = parseFloat(newPriceMin) || Math.round(avg * 0.9);
    const max = parseFloat(newPriceMax) || Math.round(avg * 1.1);
    const ret = parseFloat(newPriceRetail) || Math.round(avg * 1.35);

    if (isNaN(avg) || avg <= 0) {
      Alert.alert('Invalid Price', 'Please enter a valid wholesale average price.');
      return;
    }

    try {
      const record = await addMarketPriceRecordAdmin(
        {
          cropId: `crop_${newPriceCrop.toLowerCase()}`,
          cropName: newPriceCrop,
          marketCenter: newPriceMarket,
          date: new Date().toISOString().split('T')[0],
          wholesalePriceMin: min,
          wholesalePriceMax: max,
          wholesalePriceAvg: avg,
          retailPriceAvg: ret,
          grade: 'A',
          trend: 'up',
          dailyPercentageChange: 2.5,
          supplyVolumeTons: 12,
          source: 'Field Inspector',
        },
        role
      );
      setMarketPrices((prev) => [record, ...prev]);
      setShowAddPriceModal(false);
      setNewPriceAvg('');
      setNewPriceMin('');
      setNewPriceMax('');
      setNewPriceRetail('');
      Alert.alert('Record Saved', `Market price entry added for ${newPriceCrop} at ${newPriceMarket}.`);
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Failed to add market price record.');
    }
  };

  const handleLogout = async () => {
    await logout();
    router.replace('/welcome');
  };

  // Security Lockout Screen for Non-Admins
  if (!isAdmin) {
    return (
      <View style={styles.lockoutScreen}>
        <View style={styles.lockoutCard}>
          <Ionicons name="lock-closed" size={scaleSize(48)} color={Palette.rescueRed} />
          <Text style={[styles.lockoutTitle, { fontSize: scaleFont(18) }]}>
            Administrator Access Required
          </Text>
          <Text style={[styles.lockoutMessage, { fontSize: scaleFont(13) }]}>
            This control center is restricted to authorized officers from the Department of Agrarian Development.
            Your current account role is &quot;{role}&quot;.
          </Text>
          <Button
            title="Switch to Admin Sandbox Role"
            variant="primary"
            onPress={() => router.push('/role-selection')}
            style={{ width: '100%', marginTop: 12 }}
          />
          <Button
            title="Return to Home"
            variant="outline"
            onPress={() => router.replace('/welcome')}
            style={{ width: '100%', marginTop: 8 }}
          />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      {/* Admin Custom Header */}
      <View style={styles.customHeader}>
        <View style={styles.headerLeft}>
          <View style={styles.adminBadge}>
            <Ionicons name="shield-checkmark" size={scaleSize(15)} color={Palette.white} />
            <Text style={[styles.adminBadgeText, { fontSize: scaleFont(10) }]}>SECURE ADMIN</Text>
          </View>
          <Text style={[styles.headerTitle, { fontSize: scaleFont(17) }]}>
            Agrarian Administration Hub
          </Text>
        </View>
        <TouchableOpacity
          onPress={handleLogout}
          style={styles.logoutBtn}
          accessibilityLabel="Sign out"
        >
          <Ionicons name="log-out-outline" size={scaleSize(20)} color={Palette.rescueRed} />
        </TouchableOpacity>
      </View>

      {/* Navigation Sub-Tabs */}
      <View style={styles.tabBarScroll}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabsContainer}>
          {[
            { id: 'overview', label: 'Overview', icon: 'stats-chart' },
            { id: 'farmers', label: `Farmers (${farmers.length})`, icon: 'leaf' },
            { id: 'buyers', label: `Buyers (${buyers.length})`, icon: 'business' },
            { id: 'listings', label: `Listings (${listings.length})`, icon: 'basket' },
            { id: 'market_prices', label: 'Price Records', icon: 'trending-up' },
            { id: 'predictions', label: 'AI Predictions', icon: 'hardware-chip' },
            { id: 'enquiries', label: `Reports (${enquiries.length})`, icon: 'chatbubbles' },
          ].map((t) => {
            const active = activeTab === t.id;
            return (
              <TouchableOpacity
                key={t.id}
                onPress={() => setActiveTab(t.id as AdminTab)}
                style={[styles.tabButton, active && styles.tabButtonActive]}
              >
                <Ionicons
                  name={t.icon as any}
                  size={scaleSize(14)}
                  color={active ? Palette.primary : Palette.slateMedium}
                />
                <Text style={[styles.tabText, active && styles.tabTextActive, { fontSize: scaleFont(12) }]}>
                  {t.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[Palette.primary]} />
        }
        contentContainerStyle={{
          paddingHorizontal: scaleSize(contentPadding),
          paddingBottom: scaleSize(100),
          paddingTop: scaleSize(10),
        }}
      >
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={Palette.primary} />
            <Text style={[styles.loadingText, { fontSize: scaleFont(13) }]}>
              Syncing administrative collections...
            </Text>
          </View>
        ) : (
          <>
            {/* 1. OVERVIEW TAB */}
            {activeTab === 'overview' && analytics && (
              <View style={styles.tabContent}>
                {/* Metric Summary Grid */}
                <View style={styles.analyticsGrid}>
                  <View style={[styles.analyticCard, { ...Shadows.soft }]}>
                    <Ionicons name="leaf-outline" size={scaleSize(20)} color={Palette.primary} />
                    <Text style={[styles.analyticVal, { fontSize: scaleFont(22) }]}>
                      {analytics.totalFarmers}
                    </Text>
                    <Text style={[styles.analyticLbl, { fontSize: scaleFont(11) }]}>Registered Farmers</Text>
                  </View>

                  <View style={[styles.analyticCard, { ...Shadows.soft }]}>
                    <Ionicons name="business-outline" size={scaleSize(20)} color={Palette.secondary} />
                    <Text style={[styles.analyticVal, { fontSize: scaleFont(22) }]}>
                      {analytics.totalBuyers}
                    </Text>
                    <Text style={[styles.analyticLbl, { fontSize: scaleFont(11) }]}>Registered Buyers</Text>
                  </View>

                  <View style={[styles.analyticCard, { ...Shadows.soft }]}>
                    <Ionicons name="basket-outline" size={scaleSize(20)} color={Palette.warning} />
                    <Text style={[styles.analyticVal, { fontSize: scaleFont(22) }]}>
                      {analytics.totalCropListings}
                    </Text>
                    <Text style={[styles.analyticLbl, { fontSize: scaleFont(11) }]}>Total Crop Listings</Text>
                  </View>

                  <View style={[styles.analyticCard, { ...Shadows.soft }]}>
                    <Ionicons name="hand-left-outline" size={scaleSize(20)} color={Palette.info} />
                    <Text style={[styles.analyticVal, { fontSize: scaleFont(22) }]}>
                      {analytics.totalActiveOffers}
                    </Text>
                    <Text style={[styles.analyticLbl, { fontSize: scaleFont(11) }]}>Active Buyer Offers</Text>
                  </View>
                </View>

                {/* Rescue & Surplus Banner */}
                <View style={[styles.surplusBanner, { ...Shadows.soft }]}>
                  <View style={styles.surplusLeft}>
                    <Ionicons name="warning" size={scaleSize(24)} color={Palette.rescueRed} />
                    <View>
                      <Text style={[styles.surplusTitle, { fontSize: scaleFont(13) }]}>
                        Urgent Harvest Rescue Watch
                      </Text>
                      <Text style={[styles.surplusDesc, { fontSize: scaleFont(11) }]}>
                        {analytics.totalRescueListings} listings marked for immediate salvage clearance. Total listed supply: {(analytics.totalVolumeSurplusKg / 1000).toFixed(1)} tons.
                      </Text>
                    </View>
                  </View>
                  <Button
                    title="Review"
                    size="sm"
                    variant="primary"
                    onPress={() => setActiveTab('listings')}
                  />
                </View>

                {/* Most Frequently Listed Crops */}
                <View style={[styles.sectionCard, { ...Shadows.soft }]}>
                  <Text style={[styles.sectionCardTitle, { fontSize: scaleFont(14) }]}>
                    Most Frequently Listed Crops
                  </Text>
                  {analytics.mostListedCrops.map((c, i) => (
                    <View key={c.cropName} style={styles.cropRankRow}>
                      <Text style={[styles.rankNum, { fontSize: scaleFont(12) }]}>#{i + 1}</Text>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.cropRankName, { fontSize: scaleFont(13) }]}>{c.cropName}</Text>
                        <Text style={[styles.cropRankSub, { fontSize: scaleFont(10) }]}>
                          {c.totalKg.toLocaleString()} kg aggregated supply
                        </Text>
                      </View>
                      <Badge label={`${c.count} listings`} variant="category" size="sm" />
                    </View>
                  ))}
                </View>

                {/* Recent Registrations Timeline */}
                <View style={[styles.sectionCard, { ...Shadows.soft }]}>
                  <Text style={[styles.sectionCardTitle, { fontSize: scaleFont(14) }]}>
                    Recent User Registrations
                  </Text>
                  {analytics.recentRegistrations.map((r) => (
                    <View key={`${r.role}-${r.id}`} style={styles.regItem}>
                      <Ionicons
                        name={r.role === 'farmer' ? 'leaf' : 'business'}
                        size={scaleSize(16)}
                        color={r.role === 'farmer' ? Palette.primary : Palette.secondary}
                      />
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.regName, { fontSize: scaleFont(12) }]}>{r.name}</Text>
                        <Text style={[styles.regSub, { fontSize: scaleFont(10) }]}>
                          {r.role.toUpperCase()} · {r.district} · {r.date}
                        </Text>
                      </View>
                      <Badge
                        label={r.verified ? 'Verified' : 'Pending Review'}
                        variant={r.verified ? 'verified' : 'neutral'}
                        size="sm"
                      />
                    </View>
                  ))}
                </View>
              </View>
            )}

            {/* 2. FARMERS TAB */}
            {activeTab === 'farmers' && (
              <View style={styles.tabContent}>
                <Text style={[styles.tabIntro, { fontSize: scaleFont(12) }]}>
                  Manage registered farmer accounts, verify land ownership and certify organic operations.
                </Text>
                {farmers.map((farmer) => (
                  <View key={farmer.id} style={[styles.recordCard, { ...Shadows.soft }]}>
                    <View style={styles.recordHeader}>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.recordTitle, { fontSize: scaleFont(14) }]}>
                          {farmer.fullName}
                        </Text>
                        <Text style={[styles.recordSubtitle, { fontSize: scaleFont(11) }]}>
                          {farmer.farmName} · {farmer.district}
                        </Text>
                      </View>
                      <Badge
                        label={farmer.isCertifiedOrganic ? 'Organic' : 'Standard'}
                        variant={farmer.isCertifiedOrganic ? 'verified' : 'neutral'}
                        size="sm"
                      />
                    </View>

                    <View style={styles.recordDetailGrid}>
                      <Text style={styles.detailItemText}>Land: {farmer.landSizeAcres} Acres</Text>
                      <Text style={styles.detailItemText}>Exp: {farmer.farmingExperienceYears} Yrs</Text>
                      <Text style={styles.detailItemText}>Deals: {farmer.completedDeals}</Text>
                      <Text style={styles.detailItemText}>Gov Reg: {farmer.govRegistrationNumber || 'None'}</Text>
                    </View>

                    <View style={styles.recordActions}>
                      <TouchableOpacity
                        style={[
                          styles.toggleActionBtn,
                          farmer.isCertifiedOrganic && styles.toggleActionBtnActive,
                        ]}
                        onPress={() => handleToggleFarmerCertification(farmer)}
                      >
                        <Ionicons
                          name={farmer.isCertifiedOrganic ? 'checkmark-circle' : 'add-circle-outline'}
                          size={scaleSize(14)}
                          color={farmer.isCertifiedOrganic ? Palette.success : Palette.slateDark}
                        />
                        <Text style={[styles.toggleActionText, { fontSize: scaleFont(11) }]}>
                          {farmer.isCertifiedOrganic ? 'Certified Organic ✓' : 'Certify Organic'}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ))}
              </View>
            )}

            {/* 3. BUYERS TAB */}
            {activeTab === 'buyers' && (
              <View style={styles.tabContent}>
                <Text style={[styles.tabIntro, { fontSize: scaleFont(12) }]}>
                  Review commercial buyer business registrations and verify legitimate wholesale operators.
                </Text>
                {buyers.map((buyer) => (
                  <View key={buyer.id} style={[styles.recordCard, { ...Shadows.soft }]}>
                    <View style={styles.recordHeader}>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.recordTitle, { fontSize: scaleFont(14) }]}>
                          {buyer.businessName}
                        </Text>
                        <Text style={[styles.recordSubtitle, { fontSize: scaleFont(11) }]}>
                          {buyer.contactPerson} · {buyer.district}
                        </Text>
                      </View>
                      <Badge
                        label={buyer.isVerifiedBusiness ? 'Verified BR' : 'Unverified'}
                        variant={buyer.isVerifiedBusiness ? 'verified' : 'neutral'}
                        size="sm"
                      />
                    </View>

                    <View style={styles.recordDetailGrid}>
                      <Text style={styles.detailItemText}>Type: {buyer.businessType}</Text>
                      <Text style={styles.detailItemText}>BR: {buyer.brNumber || 'Pending Upload'}</Text>
                      <Text style={styles.detailItemText}>Rating: ★ {buyer.rating}</Text>
                      <Text style={styles.detailItemText}>Deals: {buyer.dealsCompleted}</Text>
                    </View>

                    <View style={styles.recordActions}>
                      <Button
                        title={buyer.isVerifiedBusiness ? 'Revoke Verification' : 'Verify Business'}
                        size="sm"
                        variant={buyer.isVerifiedBusiness ? 'outline' : 'primary'}
                        onPress={() => handleVerifyBuyer(buyer, !buyer.isVerifiedBusiness)}
                      />
                      <Button
                        title="Inspect Requirements"
                        size="sm"
                        variant="ghost"
                        onPress={() => setSelectedBuyer(buyer)}
                      />
                    </View>
                  </View>
                ))}
              </View>
            )}

            {/* 4. LISTINGS TAB */}
            {activeTab === 'listings' && (
              <View style={styles.tabContent}>
                <Text style={[styles.tabIntro, { fontSize: scaleFont(12) }]}>
                  Moderate farmer listings, eliminate inappropriate or misleading submissions, and flag rescue crops.
                </Text>
                {listings.map((l) => (
                  <View key={l.id} style={[styles.recordCard, { ...Shadows.soft }]}>
                    <View style={styles.recordHeader}>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.recordTitle, { fontSize: scaleFont(14) }]}>
                          {l.cropName} ({l.quantityKg} kg)
                        </Text>
                        <Text style={[styles.recordSubtitle, { fontSize: scaleFont(11) }]}>
                          Farmer: {l.farmerName} · Asking: {formatLKR(l.askingPricePerKg)}/kg
                        </Text>
                      </View>
                      <Badge
                        label={l.isRescueCrop ? 'Rescue Crop' : (l.status || 'Active').toUpperCase()}
                        variant={l.isRescueCrop ? 'rescue' : 'category'}
                        size="sm"
                      />
                    </View>

                    <View style={styles.recordActions}>
                      {!l.isRescueCrop && (
                        <Button
                          title="Mark Rescue"
                          size="sm"
                          variant="outline"
                          onPress={() => handleModerateListing(l.id, 'mark_rescue')}
                        />
                      )}
                      <Button
                        title="Flag Invalid"
                        size="sm"
                        variant="ghost"
                        textStyle={{ color: Palette.warning }}
                        onPress={() => handleModerateListing(l.id, 'flag_invalid')}
                      />
                      <Button
                        title="Delete"
                        size="sm"
                        variant="ghost"
                        textStyle={{ color: Palette.rescueRed }}
                        onPress={() => handleModerateListing(l.id, 'delete')}
                      />
                    </View>
                  </View>
                ))}
              </View>
            )}

            {/* 5. MARKET PRICES TAB */}
            {activeTab === 'market_prices' && (
              <View style={styles.tabContent}>
                <View style={styles.tabActionHeader}>
                  <Text style={[styles.tabIntro, { fontSize: scaleFont(12), flex: 1 }]}>
                    Historical market price entries from Economic Centres and field inspectors.
                  </Text>
                  <Button
                    title="+ New Price Entry"
                    size="sm"
                    variant="primary"
                    onPress={() => setShowAddPriceModal(true)}
                  />
                </View>

                {marketPrices.map((mp) => (
                  <View key={mp.id} style={[styles.recordCard, { ...Shadows.soft }]}>
                    <View style={styles.recordHeader}>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.recordTitle, { fontSize: scaleFont(14) }]}>
                          {mp.cropName} · {formatLKR(mp.wholesalePriceAvg)}/kg
                        </Text>
                        <Text style={[styles.recordSubtitle, { fontSize: scaleFont(11) }]}>
                          {mp.marketCenter} · {mp.date} · Source: {mp.source}
                        </Text>
                      </View>
                      <Badge label={`Retail: ${formatLKR(mp.retailPriceAvg)}`} variant="aiFair" size="sm" />
                    </View>
                    <View style={styles.recordDetailGrid}>
                      <Text style={styles.detailItemText}>Wholesale Min: {formatLKR(mp.wholesalePriceMin)}</Text>
                      <Text style={styles.detailItemText}>Wholesale Max: {formatLKR(mp.wholesalePriceMax)}</Text>
                      <Text style={styles.detailItemText}>Trend: {mp.trend.toUpperCase()}</Text>
                      <Text style={styles.detailItemText}>Supply Vol: {mp.supplyVolumeTons} Tons</Text>
                    </View>
                  </View>
                ))}
              </View>
            )}

            {/* 6. PREDICTIONS TAB */}
            {activeTab === 'predictions' && (
              <View style={styles.tabContent}>
                <Text style={[styles.tabIntro, { fontSize: scaleFont(12) }]}>
                  Log of ML Fair-Price regression inferences saved across farmer queries.
                </Text>
                {predictions.length === 0 ? (
                  <View style={styles.emptyCard}>
                    <Ionicons name="hardware-chip-outline" size={scaleSize(36)} color={Palette.slateLight} />
                    <Text style={styles.emptyCardText}>No inference predictions logged yet.</Text>
                  </View>
                ) : (
                  predictions.map((p) => (
                    <View key={p.id} style={[styles.recordCard, { ...Shadows.soft }]}>
                      <View style={styles.recordHeader}>
                        <View style={{ flex: 1 }}>
                          <Text style={[styles.recordTitle, { fontSize: scaleFont(14) }]}>
                            {p.cropName} ({p.district})
                          </Text>
                          <Text style={[styles.recordSubtitle, { fontSize: scaleFont(11) }]}>
                            Model: {p.modelVersion} · Season: {p.season}
                          </Text>
                        </View>
                        <Badge
                          label={`${formatLKR(p.predictedPricePerKg)}/kg`}
                          variant="aiFair"
                          size="sm"
                        />
                      </View>
                      <View style={styles.recordDetailGrid}>
                        <Text style={styles.detailItemText}>
                          Fair Range: {formatLKR(p.fairPriceRange.min)} - {formatLKR(p.fairPriceRange.max)}
                        </Text>
                        <Text style={styles.detailItemText}>Confidence: {(p.confidenceScore * 100).toFixed(0)}%</Text>
                        <Text style={styles.detailItemText}>Trend: {p.marketTrend}</Text>
                        <Text style={styles.detailItemText}>Demand: {p.demandIndex.toUpperCase()}</Text>
                      </View>
                    </View>
                  ))
                )}
              </View>
            )}

            {/* 7. ENQUIRIES TAB */}
            {activeTab === 'enquiries' && (
              <View style={styles.tabContent}>
                <Text style={[styles.tabIntro, { fontSize: scaleFont(12) }]}>
                  User communications, enquiry reports and agrarian dispute audit trail.
                </Text>
                {enquiries.map((enq) => (
                  <View key={enq.id} style={[styles.recordCard, { ...Shadows.soft }]}>
                    <View style={styles.recordHeader}>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.recordTitle, { fontSize: scaleFont(13) }]}>
                          {enq.senderName} ({enq.senderRole.toUpperCase()}) → {enq.recipientName}
                        </Text>
                        <Text style={[styles.recordSubtitle, { fontSize: scaleFont(11) }]}>
                          Listing: {enq.cropName || 'Direct Message'} · {enq.createdAt ? enq.createdAt.split('T')[0] : 'Today'}
                        </Text>
                      </View>
                      <Badge label={enq.isRead ? 'Read' : 'Unread'} variant="neutral" size="sm" />
                    </View>
                    <Text style={[styles.enquiryBody, { fontSize: scaleFont(12) }]}>
                      &ldquo;{enq.message}&rdquo;
                    </Text>
                  </View>
                ))}
              </View>
            )}

            {/* Administrator Role Switch Sandbox Button */}
            <View style={{ marginTop: scaleSize(16), gap: scaleSize(8) }}>
              <Button
                title="Switch Role Sandbox (Farmer / Buyer)"
                variant="outline"
                icon="swap-horizontal"
                onPress={() => router.push('/role-selection')}
              />
            </View>
          </>
        )}
      </ScrollView>

      {/* Add Market Price Modal */}
      <Modal visible={showAddPriceModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Record Daily Market Price</Text>
              <TouchableOpacity onPress={() => setShowAddPriceModal(false)}>
                <Ionicons name="close" size={scaleSize(22)} color={Palette.charcoal} />
              </TouchableOpacity>
            </View>
            <ScrollView style={{ paddingTop: 10 }}>
              <Text style={styles.inputLabel}>Crop Name</Text>
              <TextInput
                style={styles.modalInput}
                value={newPriceCrop}
                onChangeText={setNewPriceCrop}
                placeholder="Carrot, Tomato, etc."
              />

              <Text style={styles.inputLabel}>Wholesale Average Price (LKR/kg)</Text>
              <TextInput
                style={styles.modalInput}
                value={newPriceAvg}
                onChangeText={setNewPriceAvg}
                keyboardType="numeric"
                placeholder="285"
              />

              <Text style={styles.inputLabel}>Retail Price (LKR/kg)</Text>
              <TextInput
                style={styles.modalInput}
                value={newPriceRetail}
                onChangeText={setNewPriceRetail}
                keyboardType="numeric"
                placeholder="340"
              />

              <Button
                title="Save Market Price Entry"
                variant="primary"
                onPress={handleAddMarketPrice}
                style={{ marginTop: 14, marginBottom: 20 }}
              />
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Buyer Details Modal */}
      {selectedBuyer && (
        <Modal visible transparent animationType="slide">
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <View>
                  <Text style={styles.modalTitle}>{selectedBuyer.businessName}</Text>
                  <Text style={styles.modalSub}>{selectedBuyer.contactPerson} · {selectedBuyer.phone}</Text>
                </View>
                <TouchableOpacity onPress={() => setSelectedBuyer(null)}>
                  <Ionicons name="close" size={scaleSize(22)} color={Palette.charcoal} />
                </TouchableOpacity>
              </View>
              <ScrollView style={{ paddingTop: 10 }}>
                <View style={styles.modalDetailBlock}>
                  <Text style={styles.modalBlockTitle}>Purchasing Profile</Text>
                  <Text style={styles.modalBlockText}>Preferred Crops: {selectedBuyer.purchasingRequirements.preferredCrops.join(', ')}</Text>
                  <Text style={styles.modalBlockText}>
                    Order Range: {selectedBuyer.purchasingRequirements.minOrderQuantityKg} – {selectedBuyer.purchasingRequirements.maxOrderQuantityKg} kg
                  </Text>
                  <Text style={styles.modalBlockText}>Cold Storage: {selectedBuyer.purchasingRequirements.hasColdStorage ? 'Yes' : 'No'}</Text>
                  <Text style={styles.modalBlockText}>Weekly Budget: {formatLKR(selectedBuyer.purchasingRequirements.weeklyTargetBudgetLkr || 0)}</Text>
                </View>
                <Button
                  title="Close"
                  variant="outline"
                  onPress={() => setSelectedBuyer(null)}
                  style={{ marginTop: 14, marginBottom: 20 }}
                />
              </ScrollView>
            </View>
          </View>
        </Modal>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Palette.background,
  },
  lockoutScreen: {
    flex: 1,
    backgroundColor: Palette.background,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  lockoutCard: {
    backgroundColor: Palette.surface,
    padding: 24,
    borderRadius: BorderRadius.xl,
    alignItems: 'center',
    width: '100%',
    ...Shadows.soft,
  },
  lockoutTitle: {
    fontWeight: '800',
    color: Palette.charcoal,
    marginTop: 14,
    textAlign: 'center',
  },
  lockoutMessage: {
    color: Palette.slateMedium,
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 18,
  },
  customHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 48,
    paddingBottom: 12,
    backgroundColor: Palette.surface,
    borderBottomWidth: 1,
    borderBottomColor: Palette.warmBorder,
  },
  headerLeft: {
    flex: 1,
  },
  adminBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Palette.primary,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: BorderRadius.full,
    alignSelf: 'flex-start',
    marginBottom: 4,
  },
  adminBadgeText: {
    color: Palette.white,
    fontWeight: '800',
  },
  headerTitle: {
    fontWeight: '800',
    color: Palette.charcoal,
  },
  logoutBtn: {
    padding: 6,
  },
  tabBarScroll: {
    backgroundColor: Palette.surface,
    borderBottomWidth: 1,
    borderBottomColor: Palette.warmBorder,
  },
  tabsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 6,
  },
  tabButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: BorderRadius.full,
    backgroundColor: Palette.surfaceAlt,
  },
  tabButtonActive: {
    backgroundColor: Palette.primaryTint,
  },
  tabText: {
    fontWeight: '600',
    color: Palette.slateMedium,
  },
  tabTextActive: {
    color: Palette.primary,
    fontWeight: '800',
  },
  loadingContainer: {
    paddingVertical: 50,
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    color: Palette.slateMedium,
    fontWeight: '500',
  },
  tabContent: {
    gap: 12,
  },
  tabIntro: {
    color: Palette.slateMedium,
    lineHeight: 16,
    marginBottom: 4,
  },
  tabActionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
    gap: 8,
  },
  analyticsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  analyticCard: {
    width: '48%',
    backgroundColor: Palette.surface,
    padding: 14,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Palette.warmBorder,
  },
  analyticVal: {
    fontWeight: '900',
    color: Palette.charcoal,
    marginTop: 6,
  },
  analyticLbl: {
    color: Palette.slateMedium,
    fontWeight: '600',
    marginTop: 2,
  },
  surplusBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Palette.rescueLight,
    padding: 12,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Palette.rescueBorder,
  },
  surplusLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
    marginRight: 8,
  },
  surplusTitle: {
    fontWeight: '800',
    color: Palette.rescueDark,
  },
  surplusDesc: {
    color: Palette.slateDark,
    lineHeight: 15,
    marginTop: 2,
  },
  sectionCard: {
    backgroundColor: Palette.surface,
    borderRadius: BorderRadius.lg,
    padding: 14,
    borderWidth: 1,
    borderColor: Palette.warmBorder,
  },
  sectionCardTitle: {
    fontWeight: '800',
    color: Palette.charcoal,
    marginBottom: 10,
  },
  cropRankRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: Palette.subtleBorder,
  },
  rankNum: {
    fontWeight: '800',
    color: Palette.primary,
    width: 24,
  },
  cropRankName: {
    fontWeight: '700',
    color: Palette.charcoal,
  },
  cropRankSub: {
    color: Palette.slateMedium,
  },
  regItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: Palette.subtleBorder,
  },
  regName: {
    fontWeight: '700',
    color: Palette.charcoal,
  },
  regSub: {
    color: Palette.slateMedium,
  },
  recordCard: {
    backgroundColor: Palette.surface,
    borderRadius: BorderRadius.lg,
    padding: 14,
    borderWidth: 1,
    borderColor: Palette.warmBorder,
  },
  recordHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  recordTitle: {
    fontWeight: '800',
    color: Palette.charcoal,
  },
  recordSubtitle: {
    color: Palette.slateMedium,
    marginTop: 1,
  },
  recordDetailGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    backgroundColor: Palette.surfaceAlt,
    padding: 8,
    borderRadius: BorderRadius.md,
    marginVertical: 8,
  },
  detailItemText: {
    fontSize: 11,
    color: Palette.slateDark,
    fontWeight: '600',
    width: '47%',
  },
  recordActions: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
    marginTop: 6,
  },
  toggleActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: BorderRadius.md,
    backgroundColor: Palette.surfaceAlt,
  },
  toggleActionBtnActive: {
    backgroundColor: Palette.successLight,
  },
  toggleActionText: {
    fontWeight: '700',
    color: Palette.charcoal,
  },
  enquiryBody: {
    color: Palette.slateDark,
    fontStyle: 'italic',
    lineHeight: 18,
    marginTop: 4,
  },
  emptyCard: {
    backgroundColor: Palette.surface,
    padding: 30,
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
    gap: 8,
  },
  emptyCardText: {
    color: Palette.slateMedium,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: Palette.surface,
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    maxHeight: '75%',
    padding: 16,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: Palette.warmBorder,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: Palette.charcoal,
  },
  modalSub: {
    fontSize: 12,
    color: Palette.slateMedium,
    marginTop: 2,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: Palette.charcoal,
    marginTop: 10,
    marginBottom: 4,
  },
  modalInput: {
    backgroundColor: Palette.surfaceAlt,
    borderRadius: BorderRadius.md,
    paddingHorizontal: 12,
    paddingVertical: 8,
    color: Palette.charcoal,
    fontWeight: '600',
  },
  modalDetailBlock: {
    backgroundColor: Palette.surfaceAlt,
    padding: 12,
    borderRadius: BorderRadius.md,
    gap: 6,
  },
  modalBlockTitle: {
    fontWeight: '800',
    color: Palette.charcoal,
    marginBottom: 4,
  },
  modalBlockText: {
    color: Palette.slateDark,
    fontSize: 12,
    lineHeight: 16,
  },
});

export default AdminDashboardScreen;
