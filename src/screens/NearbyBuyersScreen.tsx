/**
 * NearbyBuyersScreen — Nearby Buyer Matching Module
 * Finds registered buyers from Firebase, matches them with the farmer's crop listings
 * and ranks results by compatibility, quantity, district and distance.
 *
 * ESLint compliance notes:
 * - `useState(() => new Animated.Value(...))` avoids useRef.current during render
 * - `useMemo` for filteredMatches avoids setState in useEffect
 * - `useMemo` for map modules avoids setState in useEffect + no-require-imports
 * - `useCallback` deps use full `user` object to satisfy react-compiler
 */
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Linking,
  Platform,
  Animated,
  RefreshControl,
  Modal,
  FlatList,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Palette, Spacing, BorderRadius, Shadows } from '../constants/theme';
import { Header } from '../components/common/Header';
import { Badge } from '../components/common/Badge';
import { Input } from '../components/common/Input';
import { Button } from '../components/common/Button';
import { useResponsive } from '../hooks/useResponsive';
import { useAuth } from '../hooks/useAuth';
import {
  FarmerLocation,
  SRI_LANKA_DISTRICT_LIST,
  SRI_LANKA_DISTRICT_COORDINATES,
  requestFarmerLocationPermission,
  checkFarmerLocationPermission,
  getFarmerCurrentLocation,
  getFallbackFarmerLocation,
  formatDistance,
} from '../services/locationService';
import {
  BuyerMatchResult,
  matchBuyersForFarmer,
} from '../services/buyerMatchingService';

type ViewMode = 'list' | 'map';
type PermissionStatus = 'checking' | 'granted' | 'denied' | 'manual';

// Resolve react-native-maps at module level on native; null on web.
// useMemo inside the component caused no-require-imports + set-state-in-effect,
// so we resolve once here, outside of any component lifecycle.
const nativeMaps: { MapView: React.ComponentType<any> | null; Marker: React.ComponentType<any> | null; Callout: React.ComponentType<any> | null } =
  Platform.OS !== 'web'
    ? (() => {
        try {
          // eslint-disable-next-line @typescript-eslint/no-require-imports
          const m = require('react-native-maps');
          return { MapView: m.default ?? m.MapView, Marker: m.Marker, Callout: m.Callout };
        } catch {
          return { MapView: null, Marker: null, Callout: null };
        }
      })()
    : { MapView: null, Marker: null, Callout: null };

export const NearbyBuyersScreen: React.FC = () => {
  const { scaleSize, scaleFont, contentPadding } = useResponsive();
  const { user } = useAuth();

  // ── State ──────────────────────────────────────────────────────────────
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [permissionStatus, setPermissionStatus] = useState<PermissionStatus>('checking');
  const [farmerLocation, setFarmerLocation] = useState<FarmerLocation | null>(null);
  const [matches, setMatches] = useState<BuyerMatchResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDistrict, setSelectedDistrict] = useState('All Districts');
  const [maxDistance, setMaxDistance] = useState<number>(0); // 0 = All
  const [onlyVerified, setOnlyVerified] = useState(false);
  const [showDistrictPicker, setShowDistrictPicker] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Safe animated value: useState initializer avoids useRef.current in render
  const [pulseAnim] = useState(() => new Animated.Value(0.95));

  const { MapView, Marker, Callout } = nativeMaps;

  // ── Pulse animation ────────────────────────────────────────────────────
  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.05, duration: 800, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 0.95, duration: 800, useNativeDriver: true }),
      ])
    );
    anim.start();
    return () => anim.stop();
  }, [pulseAnim]);

  // ── Location init ──────────────────────────────────────────────────────
  // Defined as a plain async function used by both the effect and onRefresh.
  // The effect wraps it in a local `run()` to satisfy react-hooks/set-state-in-effect.
  const initLocation = useCallback(async () => {
    setPermissionStatus('checking');
    setErrorMsg(null);
    const fallbackDistrict = user?.location?.district || 'Nuwara Eliya';

    try {
      const already = await checkFarmerLocationPermission();
      if (already) {
        const loc = await getFarmerCurrentLocation(fallbackDistrict);
        setFarmerLocation(loc);
        setPermissionStatus('granted');
      } else {
        const granted = await requestFarmerLocationPermission();
        if (granted) {
          const loc = await getFarmerCurrentLocation(fallbackDistrict);
          setFarmerLocation(loc);
          setPermissionStatus('granted');
        } else {
          setFarmerLocation(getFallbackFarmerLocation(fallbackDistrict, false));
          setPermissionStatus('denied');
        }
      }
    } catch (err) {
      setFarmerLocation(getFallbackFarmerLocation(fallbackDistrict, false));
      setPermissionStatus('denied');
      console.warn('Location init error:', err);
    }
  }, [user]);

  // ── Kick off location init on mount ───────────────────────────────────
  // Wrapping in a local async `run` satisfies react-hooks/set-state-in-effect
  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      if (!cancelled) await initLocation();
    };
    run();
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Run matching once location is known ───────────────────────────────
  // Defined in an effect body, not via useCallback, to avoid set-state-in-effect rule
  useEffect(() => {
    if (!farmerLocation) return;

    let cancelled = false;
    const run = async () => {
      setLoading(true);
      setErrorMsg(null);
      try {
        const userId = user?.id ?? undefined;
        const results = await matchBuyersForFarmer(farmerLocation, userId, {});
        if (!cancelled) setMatches(results);
      } catch (err) {
        if (!cancelled) {
          setErrorMsg('Could not load buyer matching results. Please try again.');
          console.error('Matching error:', err);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    run();
    return () => { cancelled = true; };
  }, [farmerLocation, user]);

  // ── Refresh ────────────────────────────────────────────────────────────
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await initLocation();
    setRefreshing(false);
  }, [initLocation]);

  // ── Derived: filtered matches via useMemo (no setState in effect) ─────
  const filteredMatches = useMemo(() => {
    if (!farmerLocation) return matches;

    let result = [...matches];

    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      result = result.filter(
        (r) =>
          r.buyer.businessName.toLowerCase().includes(q) ||
          r.buyer.contactPerson.toLowerCase().includes(q) ||
          r.buyer.district.toLowerCase().includes(q) ||
          r.buyer.purchasingRequirements.preferredCrops.some((pc) =>
            pc.toLowerCase().includes(q)
          ) ||
          r.matchedCrops.some((mc) => mc.cropName.toLowerCase().includes(q))
      );
    }

    if (selectedDistrict !== 'All Districts') {
      const d = selectedDistrict.toLowerCase();
      result = result.filter(
        (r) =>
          r.buyer.district.toLowerCase() === d ||
          (r.buyer.purchasingRequirements.preferredDistricts || []).some(
            (pd) => pd.toLowerCase() === d
          )
      );
    }

    if (maxDistance > 0) {
      result = result.filter((r) => r.distanceKm <= maxDistance);
    }

    if (onlyVerified) {
      result = result.filter((r) => r.buyer.isVerifiedBusiness);
    }

    return result;
  }, [matches, searchQuery, selectedDistrict, maxDistance, onlyVerified, farmerLocation]);

  // ── Handle manual district selection ─────────────────────────────────
  const selectManualDistrict = (district: string) => {
    const loc = getFallbackFarmerLocation(district, false);
    setFarmerLocation({ ...loc, isManualFallback: true });
    setPermissionStatus('manual');
    setShowDistrictPicker(false);
  };

  // ── Call buyer ────────────────────────────────────────────────────────
  const callBuyer = (phone: string) => {
    const cleaned = phone.replace(/\s/g, '');
    Linking.openURL(`tel:${cleaned}`).catch(() => {
      console.warn('Could not open phone dialler.');
    });
  };

  // ── Score badge color ─────────────────────────────────────────────────
  const getScoreColor = (score: number) => {
    if (score >= 80) return Palette.primary;
    if (score >= 60) return Palette.secondary;
    if (score >= 40) return Palette.warning;
    return Palette.slateMedium;
  };

  // ── Delivery mode label ───────────────────────────────────────────────
  const deliveryLabel = (mode: string) =>
    mode === 'farmgate_pickup' ? 'Farmgate Pickup' : 'Market Delivery';

  // ── Render permission banner ──────────────────────────────────────────
  const renderPermissionBanner = () => {
    if (permissionStatus === 'granted') {
      return (
        <View style={[styles.permBanner, styles.permBannerGranted]}>
          <Ionicons name="location" size={scaleSize(14)} color={Palette.primary} />
          <Text style={[styles.permText, { fontSize: scaleFont(12), color: Palette.primary }]}>
            GPS active — distances calculated from your location
          </Text>
        </View>
      );
    }

    if (permissionStatus === 'denied' || permissionStatus === 'manual') {
      return (
        <View style={[styles.permBanner, styles.permBannerWarning]}>
          <Ionicons name="warning-outline" size={scaleSize(14)} color={Palette.warning} />
          <Text style={[styles.permText, { fontSize: scaleFont(12), color: Palette.slateDark }]}>
            {permissionStatus === 'manual'
              ? `Manual location: ${farmerLocation?.district || 'Unknown'}`
              : `Location permission denied — using ${farmerLocation?.district || 'Unknown'} district`}
          </Text>
          <TouchableOpacity
            onPress={() => setShowDistrictPicker(true)}
            style={styles.changeBtn}
          >
            <Text style={[styles.changeBtnText, { fontSize: scaleFont(11) }]}>Change</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return (
      <View style={[styles.permBanner, styles.permBannerInfo]}>
        <ActivityIndicator size="small" color={Palette.primary} />
        <Text style={[styles.permText, { fontSize: scaleFont(12), color: Palette.slateMedium }]}>
          Requesting location permission...
        </Text>
      </View>
    );
  };

  // ── Render filter row ─────────────────────────────────────────────────
  const renderFilterRow = () => (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ paddingHorizontal: scaleSize(contentPadding), gap: scaleSize(8), paddingVertical: 4 }}
    >
      {[0, 25, 50, 100, 200].map((km) => {
        const active = maxDistance === km;
        const label = km === 0 ? 'All Distances' : `< ${km} km`;
        return (
          <TouchableOpacity
            key={km}
            onPress={() => setMaxDistance(km)}
            style={[
              styles.filterChip,
              active && styles.filterChipActive,
              { paddingHorizontal: scaleSize(10), paddingVertical: scaleSize(5) },
            ]}
          >
            <Text
              style={[
                styles.filterChipText,
                active && styles.filterChipTextActive,
                { fontSize: scaleFont(11) },
              ]}
            >
              {label}
            </Text>
          </TouchableOpacity>
        );
      })}

      <TouchableOpacity
        onPress={() => setOnlyVerified((p) => !p)}
        style={[
          styles.filterChip,
          onlyVerified && styles.filterChipActive,
          { paddingHorizontal: scaleSize(10), paddingVertical: scaleSize(5) },
        ]}
      >
        <Ionicons
          name="shield-checkmark-outline"
          size={scaleSize(12)}
          color={onlyVerified ? '#fff' : Palette.slateMedium}
        />
        <Text
          style={[
            styles.filterChipText,
            onlyVerified && styles.filterChipTextActive,
            { fontSize: scaleFont(11), marginLeft: 3 },
          ]}
        >
          Verified
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        onPress={() => setShowDistrictPicker(true)}
        style={[
          styles.filterChip,
          selectedDistrict !== 'All Districts' && styles.filterChipActive,
          { paddingHorizontal: scaleSize(10), paddingVertical: scaleSize(5) },
        ]}
      >
        <Ionicons
          name="map-outline"
          size={scaleSize(12)}
          color={selectedDistrict !== 'All Districts' ? '#fff' : Palette.slateMedium}
        />
        <Text
          style={[
            styles.filterChipText,
            selectedDistrict !== 'All Districts' && styles.filterChipTextActive,
            { fontSize: scaleFont(11), marginLeft: 3 },
          ]}
        >
          {selectedDistrict === 'All Districts' ? 'District' : selectedDistrict}
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );

  // ── Match card JSX (returned inline to avoid react-hooks/refs false positive) ──
  const matchCards = useMemo(
    () =>
      filteredMatches.map((item) => {
        const { buyer, matchScore, distanceKm, matchedCrops, matchReasons } = item;
        const scoreColor = getScoreColor(matchScore);
        const topCrops = matchedCrops.slice(0, 3).map((c) => c.cropName);
        const hasUrgent = matchedCrops.some((c) => c.isRescueCrop);

        return (
          <TouchableOpacity
            key={buyer.id}
            activeOpacity={0.9}
            onPress={() =>
              router.push({ pathname: '/buyer/[id]', params: { id: buyer.id } })
            }
            style={[
              styles.matchCard,
              {
                padding: scaleSize(Spacing.md),
                borderRadius: BorderRadius.lg,
                marginBottom: scaleSize(10),
                ...Shadows.soft,
              },
            ]}
          >
            {/* Card header */}
            <View style={styles.cardHeader}>
              <Animated.View
                style={[
                  styles.scoreBadge,
                  {
                    backgroundColor: scoreColor,
                    width: scaleSize(50),
                    height: scaleSize(50),
                    borderRadius: scaleSize(25),
                    transform: matchScore >= 70 ? [{ scale: pulseAnim }] : [],
                  },
                ]}
              >
                <Text style={[styles.scoreText, { fontSize: scaleFont(14) }]}>{matchScore}%</Text>
                <Text style={[styles.scoreLabel, { fontSize: scaleFont(8) }]}>MATCH</Text>
              </Animated.View>

              <View style={{ flex: 1, marginLeft: scaleSize(10) }}>
                <View style={styles.nameRow}>
                  <Text
                    style={[styles.businessName, { fontSize: scaleFont(15) }]}
                    numberOfLines={1}
                  >
                    {buyer.businessName}
                  </Text>
                  {buyer.isVerifiedBusiness && (
                    <Ionicons
                      name="shield-checkmark"
                      size={scaleSize(15)}
                      color={Palette.primary}
                      style={{ marginLeft: 4 }}
                    />
                  )}
                </View>
                <Text style={[styles.contactPerson, { fontSize: scaleFont(12) }]}>
                  {buyer.contactPerson} ·{' '}
                  <Text style={{ color: Palette.warning }}>
                    {'★'.repeat(Math.round(buyer.rating))}
                  </Text>{' '}
                  {buyer.rating.toFixed(1)}
                </Text>
                <Text style={[styles.businessType, { fontSize: scaleFont(11) }]}>
                  {buyer.businessType.replace('_', ' ').toUpperCase()}
                </Text>
              </View>
            </View>

            {/* Matched crops */}
            {topCrops.length > 0 && (
              <View
                style={[styles.cropBox, { borderRadius: BorderRadius.md, padding: scaleSize(10) }]}
              >
                <View style={styles.cropBoxHeader}>
                  <Text style={[styles.cropBoxLabel, { fontSize: scaleFont(11) }]}>
                    MATCHING CROPS
                  </Text>
                  {hasUrgent && <Badge label="RESCUE WANTED" variant="rescue" size="sm" />}
                </View>
                <View style={styles.cropChipRow}>
                  {topCrops.map((name) => (
                    <View key={name} style={styles.cropChip}>
                      <Ionicons name="leaf" size={scaleSize(10)} color={Palette.primary} />
                      <Text style={[styles.cropChipText, { fontSize: scaleFont(11) }]}>
                        {name}
                      </Text>
                    </View>
                  ))}
                  {matchedCrops.length > 3 && (
                    <View style={[styles.cropChip, styles.cropChipMore]}>
                      <Text
                        style={[
                          styles.cropChipText,
                          { fontSize: scaleFont(11), color: Palette.slateMedium },
                        ]}
                      >
                        +{matchedCrops.length - 3} more
                      </Text>
                    </View>
                  )}
                </View>

                <View style={styles.qtyRow}>
                  <Ionicons name="scale-outline" size={scaleSize(12)} color={Palette.slateMedium} />
                  <Text style={[styles.qtyText, { fontSize: scaleFont(11) }]}>
                    Requires{' '}
                    <Text style={{ fontWeight: '800', color: Palette.primaryDark }}>
                      {buyer.purchasingRequirements.minOrderQuantityKg.toLocaleString()} –{' '}
                      {buyer.purchasingRequirements.maxOrderQuantityKg.toLocaleString()} kg
                    </Text>
                  </Text>
                </View>
              </View>
            )}

            {/* Match reasons */}
            {matchReasons.length > 0 && (
              <View style={styles.reasonsRow}>
                {matchReasons.slice(0, 2).map((r, i) => (
                  <View key={i} style={styles.reasonBadge}>
                    <Ionicons
                      name="checkmark-circle"
                      size={scaleSize(11)}
                      color={Palette.secondary}
                    />
                    <Text style={[styles.reasonText, { fontSize: scaleFont(10) }]}>{r}</Text>
                  </View>
                ))}
              </View>
            )}

            {/* Footer */}
            <View style={[styles.cardFooter, { paddingTop: scaleSize(8) }]}>
              <View style={styles.footerLeft}>
                <View style={styles.distRow}>
                  <Ionicons name="location" size={scaleSize(13)} color={Palette.primary} />
                  <Text style={[styles.distText, { fontSize: scaleFont(11) }]}>
                    {buyer.district} · {formatDistance(distanceKm)}
                  </Text>
                </View>
                <View style={styles.distRow}>
                  <Ionicons
                    name={
                      buyer.purchasingRequirements.preferredDeliveryMode === 'farmgate_pickup'
                        ? 'car-outline'
                        : 'storefront-outline'
                    }
                    size={scaleSize(12)}
                    color={Palette.slateMedium}
                  />
                  <Text style={[styles.modeText, { fontSize: scaleFont(10) }]}>
                    {deliveryLabel(buyer.purchasingRequirements.preferredDeliveryMode)}
                  </Text>
                </View>
                {buyer.purchasingRequirements.hasColdStorage && (
                  <View style={styles.distRow}>
                    <Ionicons name="snow-outline" size={scaleSize(12)} color={Palette.info} />
                    <Text
                      style={[
                        styles.modeText,
                        { fontSize: scaleFont(10), color: Palette.info },
                      ]}
                    >
                      Cold Storage Available
                    </Text>
                  </View>
                )}
              </View>

              <TouchableOpacity
                style={[
                  styles.callBtn,
                  {
                    backgroundColor: Palette.primary,
                    borderRadius: BorderRadius.md,
                    padding: scaleSize(8),
                  },
                ]}
                onPress={() => callBuyer(buyer.phone)}
              >
                <Ionicons name="call" size={scaleSize(14)} color="#fff" />
                <Text style={[styles.callBtnText, { fontSize: scaleFont(11) }]}>Call</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        );
      }),
    [filteredMatches, pulseAnim, scaleSize, scaleFont]
  );

  // ── Map View ──────────────────────────────────────────────────────────
  const renderMapView = () => {
    if (Platform.OS === 'web') {
      return (
        <View style={styles.webMapFallback}>
          <Ionicons name="map-outline" size={scaleSize(48)} color={Palette.slateMedium} />
          <Text style={[styles.webMapText, { fontSize: scaleFont(14) }]}>
            Interactive Map is available on the mobile app.
          </Text>
          <Text style={[styles.webMapSub, { fontSize: scaleFont(12) }]}>
            {filteredMatches.length} buyers found — switch to List View above.
          </Text>
        </View>
      );
    }

    if (!MapView || !Marker || !Callout) {
      return (
        <View style={styles.webMapFallback}>
          <ActivityIndicator size="large" color={Palette.primary} />
          <Text style={[styles.webMapText, { fontSize: scaleFont(13) }]}>Loading map...</Text>
        </View>
      );
    }

    const farmerLat = farmerLocation?.latitude ?? 7.0;
    const farmerLon = farmerLocation?.longitude ?? 80.6;

    return (
      <MapView
        style={styles.nativeMap}
        initialRegion={{
          latitude: farmerLat,
          longitude: farmerLon,
          latitudeDelta: 1.5,
          longitudeDelta: 1.5,
        }}
        showsUserLocation={permissionStatus === 'granted'}
        showsMyLocationButton={permissionStatus === 'granted'}
      >
        {farmerLocation && (
          <Marker
            coordinate={{ latitude: farmerLat, longitude: farmerLon }}
            title="Your Location"
            description={farmerLocation.district}
          >
            <View style={styles.farmerPin}>
              <Ionicons name="person" size={scaleSize(14)} color="#fff" />
            </View>
          </Marker>
        )}

        {filteredMatches.map((item) => {
          const lat =
            item.buyer.latitude !== 0
              ? item.buyer.latitude
              : (SRI_LANKA_DISTRICT_COORDINATES[item.buyer.district]?.latitude ?? 7.0);
          const lon =
            item.buyer.longitude !== 0
              ? item.buyer.longitude
              : (SRI_LANKA_DISTRICT_COORDINATES[item.buyer.district]?.longitude ?? 80.6);
          const scoreColor = getScoreColor(item.matchScore);

          return (
            <Marker
              key={item.buyer.id}
              coordinate={{ latitude: lat, longitude: lon }}
              title={item.buyer.businessName}
              description={`${item.matchScore}% match · ${formatDistance(item.distanceKm)}`}
            >
              <View style={[styles.buyerPin, { backgroundColor: scoreColor }]}>
                <Ionicons name="business" size={scaleSize(12)} color="#fff" />
                <Text style={[styles.buyerPinScore, { fontSize: scaleFont(8) }]}>
                  {item.matchScore}%
                </Text>
              </View>

              <Callout
                onPress={() =>
                  router.push({ pathname: '/buyer/[id]', params: { id: item.buyer.id } })
                }
              >
                <View style={styles.calloutBox}>
                  <Text style={styles.calloutTitle}>{item.buyer.businessName}</Text>
                  <Text style={styles.calloutSub}>
                    {item.buyer.district} · {formatDistance(item.distanceKm)}
                  </Text>
                  {item.matchedCrops.length > 0 && (
                    <Text style={styles.calloutCrop}>
                      Buys:{' '}
                      {item.matchedCrops
                        .slice(0, 2)
                        .map((c) => c.cropName)
                        .join(', ')}
                    </Text>
                  )}
                  <Text style={[styles.calloutTap, { color: Palette.primary }]}>
                    Tap to view details →
                  </Text>
                </View>
              </Callout>
            </Marker>
          );
        })}
      </MapView>
    );
  };

  // ── District picker modal ─────────────────────────────────────────────
  const renderDistrictPicker = () => (
    <Modal
      visible={showDistrictPicker}
      transparent
      animationType="slide"
      onRequestClose={() => setShowDistrictPicker(false)}
    >
      <View style={styles.modalOverlay}>
        <View
          style={[
            styles.modalSheet,
            { borderRadius: BorderRadius.xl, padding: scaleSize(Spacing.lg) },
          ]}
        >
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { fontSize: scaleFont(16) }]}>
              Select Your District
            </Text>
            <TouchableOpacity onPress={() => setShowDistrictPicker(false)}>
              <Ionicons name="close" size={scaleSize(22)} color={Palette.charcoal} />
            </TouchableOpacity>
          </View>

          <Text style={[styles.modalSub, { fontSize: scaleFont(12) }]}>
            {permissionStatus === 'denied'
              ? 'GPS permission was denied. Select your district to find nearby buyers.'
              : 'Filter buyers by their sourcing district.'}
          </Text>

          <FlatList
            data={
              permissionStatus === 'denied'
                ? SRI_LANKA_DISTRICT_LIST
                : ['All Districts', ...SRI_LANKA_DISTRICT_LIST]
            }
            keyExtractor={(item) => item}
            showsVerticalScrollIndicator={false}
            style={{ maxHeight: scaleSize(360) }}
            renderItem={({ item }) => {
              const isSelected =
                permissionStatus === 'denied'
                  ? farmerLocation?.district === item
                  : selectedDistrict === item;

              return (
                <TouchableOpacity
                  style={[
                    styles.districtRow,
                    isSelected && styles.districtRowActive,
                    {
                      paddingVertical: scaleSize(10),
                      paddingHorizontal: scaleSize(12),
                      borderRadius: BorderRadius.sm,
                    },
                  ]}
                  onPress={() => {
                    if (permissionStatus === 'denied') {
                      selectManualDistrict(item);
                    } else {
                      setSelectedDistrict(item);
                      setShowDistrictPicker(false);
                    }
                  }}
                >
                  <Ionicons
                    name="location-outline"
                    size={scaleSize(14)}
                    color={isSelected ? '#fff' : Palette.slateMedium}
                  />
                  <Text
                    style={[
                      styles.districtText,
                      isSelected && styles.districtTextActive,
                      { fontSize: scaleFont(14), marginLeft: 8 },
                    ]}
                  >
                    {item}
                  </Text>
                  {isSelected && (
                    <Ionicons
                      name="checkmark"
                      size={scaleSize(16)}
                      color="#fff"
                      style={{ marginLeft: 'auto' }}
                    />
                  )}
                </TouchableOpacity>
              );
            }}
          />
        </View>
      </View>
    </Modal>
  );

  // ── Main render ───────────────────────────────────────────────────────
  return (
    <View style={styles.screen}>
      <Header
        title="Nearby Buyers"
        subtitle="Registered buyers seeking your crops"
        onNotificationPress={() => router.push('/notifications')}
      />

      <View style={{ paddingHorizontal: scaleSize(contentPadding), paddingTop: scaleSize(8) }}>
        {renderPermissionBanner()}
      </View>

      <View style={{ paddingHorizontal: scaleSize(contentPadding), marginTop: scaleSize(10) }}>
        <Input
          placeholder="Search by crop, company, district..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          leftIcon="search-outline"
        />
      </View>

      <View style={{ marginTop: scaleSize(6), marginBottom: scaleSize(6) }}>
        {renderFilterRow()}
      </View>

      {/* Summary bar + toggle */}
      <View
        style={[
          styles.summaryBar,
          { paddingHorizontal: scaleSize(contentPadding), marginBottom: scaleSize(6) },
        ]}
      >
        {loading ? (
          <Text style={[styles.summaryText, { fontSize: scaleFont(13) }]}>
            Matching buyers...
          </Text>
        ) : (
          <Text style={[styles.summaryText, { fontSize: scaleFont(13) }]}>
            {filteredMatches.length} Registered{' '}
            {filteredMatches.length === 1 ? 'Buyer' : 'Buyers'} Found
          </Text>
        )}

        <View style={styles.toggleRow}>
          <TouchableOpacity
            onPress={() => setViewMode('list')}
            style={[styles.toggleBtn, viewMode === 'list' && styles.toggleBtnActive]}
          >
            <Ionicons
              name="list"
              size={scaleSize(14)}
              color={viewMode === 'list' ? '#fff' : Palette.slateMedium}
            />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setViewMode('map')}
            style={[styles.toggleBtn, viewMode === 'map' && styles.toggleBtnActive]}
          >
            <Ionicons
              name="map"
              size={scaleSize(14)}
              color={viewMode === 'map' ? '#fff' : Palette.slateMedium}
            />
          </TouchableOpacity>
        </View>
      </View>

      {/* Loading */}
      {loading && !refreshing && (
        <View style={styles.centeredState}>
          <ActivityIndicator size="large" color={Palette.primary} />
          <Text style={[styles.loadingText, { fontSize: scaleFont(14), marginTop: 12 }]}>
            Matching buyers with your crops...
          </Text>
        </View>
      )}

      {/* Error */}
      {!loading && errorMsg && (
        <View style={styles.centeredState}>
          <Ionicons name="warning-outline" size={scaleSize(40)} color={Palette.warning} />
          <Text style={[styles.loadingText, { fontSize: scaleFont(14), marginTop: 8 }]}>
            {errorMsg}
          </Text>
          <Button
            title="Retry"
            variant="outline"
            size="sm"
            icon="refresh"
            onPress={() => farmerLocation && initLocation()}
          />
        </View>
      )}

      {/* Map View */}
      {!loading && !errorMsg && viewMode === 'map' && (
        <View style={{ flex: 1 }}>{renderMapView()}</View>
      )}

      {/* List View */}
      {!loading && !errorMsg && viewMode === 'list' && (
        <ScrollView
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={Palette.primary}
            />
          }
          contentContainerStyle={{
            paddingHorizontal: scaleSize(contentPadding),
            paddingBottom: scaleSize(90),
            paddingTop: scaleSize(4),
          }}
        >
          {filteredMatches.length === 0 ? (
            <View style={[styles.emptyState, { borderRadius: BorderRadius.xl }]}>
              <Ionicons
                name="business-outline"
                size={scaleSize(48)}
                color={Palette.slateBorder}
              />
              <Text style={[styles.emptyTitle, { fontSize: scaleFont(16) }]}>
                No Matching Buyers Found
              </Text>
              <Text style={[styles.emptySub, { fontSize: scaleFont(13) }]}>
                Try expanding your search area or removing filters. Add crop listings to get
                better matches.
              </Text>
              <Button
                title="Clear Filters"
                variant="outline"
                size="sm"
                icon="refresh"
                onPress={() => {
                  setSearchQuery('');
                  setSelectedDistrict('All Districts');
                  setMaxDistance(0);
                  setOnlyVerified(false);
                }}
              />
            </View>
          ) : (
            matchCards
          )}
        </ScrollView>
      )}

      {renderDistrictPicker()}
    </View>
  );
};

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Palette.background,
  },
  permBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    borderRadius: BorderRadius.sm,
    gap: 6,
  },
  permBannerGranted: {
    backgroundColor: Palette.primaryTint,
    borderWidth: 1,
    borderColor: '#C5DECD',
  },
  permBannerWarning: {
    backgroundColor: Palette.warningLight,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  permBannerInfo: {
    backgroundColor: Palette.infoLight,
    borderWidth: 1,
    borderColor: '#BAE6FD',
  },
  permText: {
    flex: 1,
    color: Palette.slateDark,
    fontWeight: '500',
  },
  changeBtn: {
    backgroundColor: Palette.warning,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: BorderRadius.sm,
  },
  changeBtnText: {
    color: '#fff',
    fontWeight: '700',
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Palette.surfaceAlt,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    borderColor: Palette.warmBorder,
  },
  filterChipActive: {
    backgroundColor: Palette.primary,
    borderColor: Palette.primary,
  },
  filterChipText: {
    fontWeight: '600',
    color: Palette.slateMedium,
  },
  filterChipTextActive: {
    color: '#FFFFFF',
  },
  summaryBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  summaryText: {
    fontWeight: '700',
    color: Palette.charcoal,
  },
  toggleRow: {
    flexDirection: 'row',
    backgroundColor: Palette.surfaceAlt,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    borderColor: Palette.warmBorder,
    overflow: 'hidden',
  },
  toggleBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  toggleBtnActive: {
    backgroundColor: Palette.primary,
  },
  matchCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: Palette.warmBorder,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  scoreBadge: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  scoreText: {
    color: '#FFFFFF',
    fontWeight: '900',
  },
  scoreLabel: {
    color: 'rgba(255,255,255,0.8)',
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  businessName: {
    fontWeight: '800',
    color: Palette.charcoal,
    flexShrink: 1,
  },
  contactPerson: {
    color: Palette.slateMedium,
    marginTop: 2,
  },
  businessType: {
    color: Palette.slateMedium,
    fontWeight: '600',
    letterSpacing: 0.5,
    marginTop: 1,
  },
  cropBox: {
    backgroundColor: Palette.surfaceAlt,
    marginBottom: 10,
  },
  cropBoxHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  cropBoxLabel: {
    fontWeight: '700',
    color: Palette.slateMedium,
    letterSpacing: 0.5,
  },
  cropChipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 6,
  },
  cropChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Palette.primaryTint,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    borderColor: '#C5DECD',
  },
  cropChipMore: {
    backgroundColor: Palette.surfaceAlt,
    borderColor: Palette.warmBorder,
  },
  cropChipText: {
    fontWeight: '600',
    color: Palette.primaryDark,
  },
  qtyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  qtyText: {
    color: Palette.slateDark,
  },
  reasonsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 8,
  },
  reasonBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F0F7F2',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    borderColor: '#C5DECD',
  },
  reasonText: {
    color: Palette.slateDark,
    fontWeight: '500',
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    borderTopWidth: 1,
    borderTopColor: Palette.subtleBorder,
  },
  footerLeft: {
    flex: 1,
    gap: 3,
  },
  distRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  distText: {
    color: Palette.slateDark,
    fontWeight: '600',
  },
  modeText: {
    color: Palette.slateMedium,
    fontWeight: '500',
  },
  callBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginLeft: 10,
  },
  callBtnText: {
    color: '#fff',
    fontWeight: '700',
  },
  nativeMap: {
    flex: 1,
  },
  webMapFallback: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    gap: 12,
  },
  webMapText: {
    fontWeight: '700',
    color: Palette.charcoal,
    textAlign: 'center',
  },
  webMapSub: {
    color: Palette.slateMedium,
    textAlign: 'center',
  },
  farmerPin: {
    backgroundColor: Palette.primaryDark,
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  buyerPin: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    minWidth: 44,
    flexDirection: 'row',
    borderWidth: 1.5,
    borderColor: '#fff',
  },
  buyerPinScore: {
    color: '#fff',
    fontWeight: '800',
  },
  calloutBox: {
    padding: 10,
    minWidth: 180,
    maxWidth: 240,
  },
  calloutTitle: {
    fontWeight: '800',
    color: Palette.charcoal,
    fontSize: 13,
  },
  calloutSub: {
    color: Palette.slateMedium,
    fontSize: 11,
    marginTop: 2,
  },
  calloutCrop: {
    color: Palette.primaryDark,
    fontWeight: '600',
    fontSize: 11,
    marginTop: 4,
  },
  calloutTap: {
    fontWeight: '700',
    fontSize: 11,
    marginTop: 6,
  },
  centeredState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    gap: 12,
  },
  loadingText: {
    color: Palette.slateMedium,
    textAlign: 'center',
    fontWeight: '500',
  },
  emptyState: {
    alignItems: 'center',
    padding: 32,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: Palette.warmBorder,
    marginTop: 20,
    gap: 10,
  },
  emptyTitle: {
    fontWeight: '800',
    color: Palette.charcoal,
    textAlign: 'center',
  },
  emptySub: {
    color: Palette.slateMedium,
    textAlign: 'center',
    lineHeight: 20,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: '#FFFFFF',
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  modalTitle: {
    fontWeight: '800',
    color: Palette.charcoal,
  },
  modalSub: {
    color: Palette.slateMedium,
    marginBottom: 12,
  },
  districtRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  districtRowActive: {
    backgroundColor: Palette.primary,
  },
  districtText: {
    color: Palette.charcoal,
  },
  districtTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
});

export default NearbyBuyersScreen;
