/**
 * MapViewScreen — Buyer Map View with Firestore-backed buyer markers
 * Shows registered buyers on a Sri Lanka map using react-native-maps (native)
 * or a visual canvas fallback for web.
 *
 * ESLint compliance notes:
 * - Map modules resolved once at module level (outside component) to avoid
 *   setState-in-effect and no-require-imports violations
 * - useCallback deps use full `user` object to satisfy React Compiler
 */
import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  ScrollView,
  Linking,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Palette, BorderRadius, Shadows } from '../constants/theme';
import { Badge } from '../components/common/Badge';
import { Button } from '../components/common/Button';
import { useResponsive } from '../hooks/useResponsive';
import { useAuth } from '../hooks/useAuth';
import {
  FarmerLocation,
  formatDistance,
  checkFarmerLocationPermission,
  requestFarmerLocationPermission,
  getFarmerCurrentLocation,
  getFallbackFarmerLocation,
} from '../services/locationService';
import {
  BuyerMatchResult,
  matchBuyersForFarmer,
  getBuyerCoordinates,
} from '../services/buyerMatchingService';

// Resolve react-native-maps once at module level to avoid setState-in-effect
const nativeMaps: {
  MapView: React.ComponentType<any> | null;
  Marker: React.ComponentType<any> | null;
  Callout: React.ComponentType<any> | null;
} =
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

export const MapViewScreen: React.FC = () => {
  const { scaleSize, scaleFont, contentPadding } = useResponsive();
  const { user } = useAuth();

  const [farmerLocation, setFarmerLocation] = useState<FarmerLocation | null>(null);
  const [matches, setMatches] = useState<BuyerMatchResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMatch, setSelectedMatch] = useState<BuyerMatchResult | null>(null);
  const [maxDistanceKm, setMaxDistanceKm] = useState<number>(0);

  const { MapView, Marker, Callout } = nativeMaps;

  // Inline async logic in useEffect to satisfy react-hooks/set-state-in-effect
  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      setLoading(true);
      const fallbackDistrict = user?.location?.district || 'Nuwara Eliya';
      let loc: FarmerLocation;
      try {
        const hasPermission = await checkFarmerLocationPermission();
        if (hasPermission) {
          loc = await getFarmerCurrentLocation(fallbackDistrict);
        } else {
          const granted = await requestFarmerLocationPermission();
          loc = granted
            ? await getFarmerCurrentLocation(fallbackDistrict)
            : getFallbackFarmerLocation(fallbackDistrict, false);
        }
      } catch {
        loc = getFallbackFarmerLocation(fallbackDistrict, false);
      }
      if (!cancelled) setFarmerLocation(loc);

      try {
        const results = await matchBuyersForFarmer(loc, user?.id ?? undefined, {});
        if (!cancelled) {
          setMatches(results);
          if (results.length > 0) setSelectedMatch(results[0]);
        }
      } catch (e) {
        console.error('Map matching error:', e);
      }

      if (!cancelled) setLoading(false);
    };
    run();
    return () => { cancelled = true; };
  }, [user]);

  const displayedMatches = useMemo(
    () => (maxDistanceKm > 0 ? matches.filter((m) => m.distanceKm <= maxDistanceKm) : matches),
    [matches, maxDistanceKm]
  );

  const getScoreColor = (score: number) => {
    if (score >= 80) return Palette.primary;
    if (score >= 60) return Palette.secondary;
    if (score >= 40) return Palette.warning;
    return Palette.slateMedium;
  };

  const callBuyer = (phone: string) => {
    Linking.openURL(`tel:${phone.replace(/\s/g, '')}`);
  };

  // ── Loading fallback ────────────────────────────────────────────────────
  if (loading) {
    return (
      <View style={[styles.screen, styles.centeredState]}>
        <ActivityIndicator size="large" color={Palette.primary} />
        <Text style={{ color: Palette.slateMedium, marginTop: 10, fontSize: scaleFont(14) }}>
          Loading buyer map...
        </Text>
      </View>
    );
  }

  // ── Shared: radius chips ────────────────────────────────────────────────
  const radiusChips = (
    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
      <View style={styles.radiusRow}>
        {[0, 25, 50, 100, 200].map((km) => {
          const active = maxDistanceKm === km;
          const label = km === 0 ? 'All Island' : `< ${km} km`;
          return (
            <TouchableOpacity
              key={km}
              onPress={() => setMaxDistanceKm(km)}
              style={[
                styles.radiusChip,
                active && styles.radiusChipActive,
                { paddingHorizontal: scaleSize(10), paddingVertical: scaleSize(4) },
              ]}
            >
              <Text
                style={[
                  styles.radiusText,
                  active && styles.radiusTextActive,
                  { fontSize: scaleFont(11) },
                ]}
              >
                {label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </ScrollView>
  );

  // ── Shared: bottom callout card ──────────────────────────────────────────
  const bottomCard = selectedMatch ? (
    <View
      style={[
        styles.bottomCard,
        {
          marginHorizontal: scaleSize(contentPadding),
          padding: scaleSize(14),
          borderRadius: BorderRadius.xl,
          ...Shadows.elevated,
        },
      ]}
    >
      <View style={styles.bottomCardTop}>
        <View
          style={[
            styles.bottomScoreBadge,
            { backgroundColor: getScoreColor(selectedMatch.matchScore) },
          ]}
        >
          <Text style={[styles.bottomScoreText, { fontSize: scaleFont(16) }]}>
            {selectedMatch.matchScore}%
          </Text>
          <Text style={[styles.bottomScoreLabel, { fontSize: scaleFont(9) }]}>MATCH</Text>
        </View>

        <View style={{ flex: 1, marginLeft: 12 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Text
              style={[styles.bottomBizName, { fontSize: scaleFont(15) }]}
              numberOfLines={1}
            >
              {selectedMatch.buyer.businessName}
            </Text>
            {selectedMatch.buyer.isVerifiedBusiness && (
              <Badge label="Verified" variant="verified" size="sm" />
            )}
          </View>
          <Text style={[styles.bottomContact, { fontSize: scaleFont(12) }]}>
            {selectedMatch.buyer.contactPerson}
          </Text>
          <Text style={[styles.bottomDist, { fontSize: scaleFont(11) }]}>
            {selectedMatch.buyer.district} · {formatDistance(selectedMatch.distanceKm)}
          </Text>
          {selectedMatch.matchedCrops.length > 0 && (
            <Text
              style={[styles.bottomCrops, { fontSize: scaleFont(11) }]}
              numberOfLines={1}
            >
              Purchasing:{' '}
              {selectedMatch.matchedCrops
                .slice(0, 2)
                .map((c) => c.cropName)
                .join(', ')}
            </Text>
          )}
        </View>
      </View>

      <View style={styles.bottomActions}>
        <Button
          title="View Details"
          size="sm"
          variant="outline"
          icon="arrow-forward"
          iconPosition="right"
          onPress={() =>
            router.push({ pathname: '/buyer/[id]', params: { id: selectedMatch.buyer.id } })
          }
        />
        <Button
          title="Call Buyer"
          size="sm"
          variant="primary"
          icon="call-outline"
          onPress={() => callBuyer(selectedMatch.buyer.phone)}
        />
      </View>
    </View>
  ) : null;

  // ── Native map render ───────────────────────────────────────────────────
  if (Platform.OS !== 'web' && MapView && Marker && Callout) {
    const farmerLat = farmerLocation?.latitude ?? 7.2906;
    const farmerLon = farmerLocation?.longitude ?? 80.6337;

    return (
      <View style={styles.screen}>
        {/* Top Control Bar */}
        <View
          style={[
            styles.topControlCard,
            {
              marginHorizontal: scaleSize(contentPadding),
              padding: scaleSize(10),
              borderRadius: BorderRadius.lg,
              ...Shadows.medium,
            },
          ]}
        >
          <View style={styles.searchRow}>
            <TouchableOpacity onPress={() => router.back()} style={styles.iconBtn}>
              <Ionicons name="arrow-back" size={scaleSize(20)} color={Palette.charcoal} />
            </TouchableOpacity>
            <View style={{ flex: 1, marginHorizontal: 8 }}>
              <Text style={[styles.mapHeaderTitle, { fontSize: scaleFont(14) }]}>
                Buyer Map — Sri Lanka
              </Text>
              <Text style={[styles.mapHeaderSub, { fontSize: scaleFont(11) }]}>
                {displayedMatches.length} Registered Buyers · {farmerLocation?.district}
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => router.push('/nearby-buyers')}
              style={styles.iconBtn}
            >
              <Ionicons name="list" size={scaleSize(20)} color={Palette.primary} />
            </TouchableOpacity>
          </View>
          {radiusChips}
        </View>

        <MapView
          style={StyleSheet.absoluteFill}
          initialRegion={{
            latitude: farmerLat,
            longitude: farmerLon,
            latitudeDelta: 2.0,
            longitudeDelta: 2.0,
          }}
          showsUserLocation={farmerLocation?.permissionGranted ?? false}
          showsMyLocationButton={farmerLocation?.permissionGranted ?? false}
        >
          {farmerLocation && (
            <Marker
              coordinate={{ latitude: farmerLat, longitude: farmerLon }}
              title="Your Farm Location"
              description={farmerLocation.district}
            >
              <View style={styles.farmerPinOuter}>
                <View style={styles.farmerPinInner}>
                  <Ionicons name="person" size={scaleSize(14)} color="#fff" />
                </View>
              </View>
            </Marker>
          )}

          {displayedMatches.map((item) => {
            const coords = getBuyerCoordinates(item.buyer);
            const scoreColor = getScoreColor(item.matchScore);
            const isSelected = selectedMatch?.buyer.id === item.buyer.id;

            return (
              <Marker
                key={item.buyer.id}
                coordinate={coords}
                onPress={() => setSelectedMatch(item)}
                zIndex={isSelected ? 10 : 1}
              >
                <View
                  style={[
                    styles.buyerPin,
                    {
                      backgroundColor: scoreColor,
                      transform: [{ scale: isSelected ? 1.2 : 1 }],
                    },
                  ]}
                >
                  <Ionicons name="business" size={scaleSize(11)} color="#fff" />
                  <Text style={[styles.buyerPinScore, { fontSize: scaleFont(8) }]}>
                    {item.matchScore}%
                  </Text>
                </View>
                <View style={[styles.pinArrow, { borderTopColor: scoreColor }]} />

                <Callout
                  onPress={() =>
                    router.push({ pathname: '/buyer/[id]', params: { id: item.buyer.id } })
                  }
                >
                  <View style={styles.calloutBox}>
                    <Text style={styles.calloutTitle} numberOfLines={1}>
                      {item.buyer.businessName}
                    </Text>
                    <Text style={styles.calloutSub}>
                      {item.buyer.district} · {formatDistance(item.distanceKm)}
                    </Text>
                    {item.matchedCrops.length > 0 && (
                      <Text style={styles.calloutCrops} numberOfLines={1}>
                        Buys:{' '}
                        {item.matchedCrops
                          .slice(0, 2)
                          .map((c) => c.cropName)
                          .join(', ')}
                      </Text>
                    )}
                    <Text style={[styles.calloutAction, { color: Palette.primary }]}>
                      Tap to view details →
                    </Text>
                  </View>
                </Callout>
              </Marker>
            );
          })}
        </MapView>

        {bottomCard}
      </View>
    );
  }

  // ── Web / fallback canvas ──────────────────────────────────────────────
  return (
    <View style={styles.screen}>
      {/* Top Control Bar */}
      <View
        style={[
          styles.topControlCard,
          {
            marginHorizontal: scaleSize(contentPadding),
            padding: scaleSize(10),
            borderRadius: BorderRadius.lg,
            ...Shadows.medium,
          },
        ]}
      >
        <View style={styles.searchRow}>
          <TouchableOpacity onPress={() => router.back()} style={styles.iconBtn}>
            <Ionicons name="arrow-back" size={scaleSize(20)} color={Palette.charcoal} />
          </TouchableOpacity>
          <View style={{ flex: 1, marginHorizontal: 8 }}>
            <Text style={[styles.mapHeaderTitle, { fontSize: scaleFont(14) }]}>
              Sri Lanka Agricultural Buyer Map
            </Text>
            <Text style={[styles.mapHeaderSub, { fontSize: scaleFont(11) }]}>
              {displayedMatches.length} Registered Buyers · Web View
            </Text>
          </View>
          <TouchableOpacity
            onPress={() => router.push('/nearby-buyers')}
            style={styles.iconBtn}
          >
            <Ionicons name="list" size={scaleSize(20)} color={Palette.primary} />
          </TouchableOpacity>
        </View>
        {radiusChips}
      </View>

      {/* Visual canvas */}
      <View style={styles.mapCanvas}>
        <View style={styles.islandSilhouette}>
          <Text style={styles.islandWatermark}>SRI LANKA AGRARIAN BUYER MAP</Text>
          <View style={styles.watermarkCentroid}>
            <Ionicons
              name="navigate-circle-outline"
              size={scaleSize(180)}
              color="rgba(36, 92, 70, 0.06)"
            />
          </View>
        </View>

        {/* Market Hub Labels */}
        <View style={[styles.hubTag, { top: '42%', left: '42%' }]}>
          <Ionicons name="storefront" size={scaleSize(12)} color={Palette.warning} />
          <Text style={styles.hubText}>Dambulla DEC</Text>
        </View>
        <View style={[styles.hubTag, { top: '65%', left: '26%' }]}>
          <Ionicons name="storefront" size={scaleSize(12)} color={Palette.primary} />
          <Text style={styles.hubText}>Pettah Manning</Text>
        </View>
        <View style={[styles.hubTag, { top: '56%', left: '55%' }]}>
          <Ionicons name="storefront" size={scaleSize(12)} color={Palette.secondaryDark} />
          <Text style={styles.hubText}>Keppetipola Hub</Text>
        </View>

        {/* Buyer pins */}
        {displayedMatches.map((item, idx) => {
          const coords = getBuyerCoordinates(item.buyer);
          const xPct = ((coords.longitude - 79.6) / (81.9 - 79.6)) * 85 + 7;
          const yPct = ((9.8 - coords.latitude) / (9.8 - 5.9)) * 85 + 7;
          const scoreColor = getScoreColor(item.matchScore);
          const isSelected = selectedMatch?.buyer.id === item.buyer.id;

          return (
            <TouchableOpacity
              key={item.buyer.id}
              activeOpacity={0.88}
              onPress={() => setSelectedMatch(item)}
              style={[
                styles.mapPin,
                {
                  top: `${yPct}%` as any,
                  left: `${xPct}%` as any,
                  transform: [{ scale: isSelected ? 1.3 : 1 }],
                  zIndex: isSelected ? 10 : idx + 1,
                },
              ]}
            >
              <View
                style={[
                  styles.pinCallout,
                  { backgroundColor: scoreColor },
                  isSelected && styles.pinCalloutSelected,
                ]}
              >
                <Ionicons name="business" size={scaleSize(11)} color="#FFFFFF" />
                <Text style={styles.pinCropText} numberOfLines={1}>
                  {item.buyer.district}
                </Text>
              </View>
              <View style={[styles.pinArrowCanvas, { borderTopColor: scoreColor }]} />
            </TouchableOpacity>
          );
        })}

        {/* Farmer pin */}
        {farmerLocation && (() => {
          const lat = farmerLocation.latitude;
          const lon = farmerLocation.longitude;
          const xPct = ((lon - 79.6) / (81.9 - 79.6)) * 85 + 7;
          const yPct = ((9.8 - lat) / (9.8 - 5.9)) * 85 + 7;
          return (
            <View
              style={[
                styles.mapPin,
                {
                  top: `${yPct}%` as any,
                  left: `${xPct}%` as any,
                  zIndex: 20,
                },
              ]}
            >
              <View style={styles.farmerPinOuter}>
                <View style={styles.farmerPinInner}>
                  <Ionicons name="person" size={scaleSize(12)} color="#fff" />
                </View>
              </View>
            </View>
          );
        })()}
      </View>

      {bottomCard}
    </View>
  );
};

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#EAE6DC',
  },
  centeredState: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  topControlCard: {
    position: 'absolute',
    top: 14,
    left: 0,
    right: 0,
    zIndex: 10,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: Palette.warmBorder,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Palette.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mapHeaderTitle: {
    fontWeight: '800',
    color: Palette.charcoal,
  },
  mapHeaderSub: {
    color: Palette.slateMedium,
  },
  radiusRow: {
    flexDirection: 'row',
    gap: 6,
  },
  radiusChip: {
    backgroundColor: Palette.surfaceAlt,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    borderColor: Palette.warmBorder,
  },
  radiusChipActive: {
    backgroundColor: Palette.primary,
    borderColor: Palette.primary,
  },
  radiusText: {
    fontWeight: '600',
    color: Palette.charcoal,
  },
  radiusTextActive: {
    color: '#FFFFFF',
  },
  mapCanvas: {
    flex: 1,
    position: 'relative',
    backgroundColor: '#F0ECE1',
  },
  islandSilhouette: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  islandWatermark: {
    fontSize: 11,
    fontWeight: '900',
    color: 'rgba(36, 92, 70, 0.1)',
    letterSpacing: 2,
    position: 'absolute',
    top: 90,
  },
  watermarkCentroid: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  hubTag: {
    position: 'absolute',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: BorderRadius.xs,
    borderWidth: 1,
    borderColor: Palette.warmBorder,
  },
  hubText: {
    fontSize: 10,
    fontWeight: '700',
    color: Palette.charcoal,
  },
  mapPin: {
    position: 'absolute',
    alignItems: 'center',
    zIndex: 5,
  },
  pinCallout: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: BorderRadius.full,
    maxWidth: 100,
  },
  pinCalloutSelected: {
    borderWidth: 2,
    borderColor: '#fff',
  },
  pinCropText: {
    fontSize: 9,
    color: '#FFFFFF',
    fontWeight: '800',
  },
  pinArrowCanvas: {
    width: 0,
    height: 0,
    borderLeftWidth: 5,
    borderRightWidth: 5,
    borderTopWidth: 6,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    alignSelf: 'center',
  },
  farmerPinOuter: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Palette.accentDark,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  farmerPinInner: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  buyerPin: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 7,
    paddingVertical: 4,
    borderRadius: 10,
    gap: 2,
    minWidth: 42,
    borderWidth: 1.5,
    borderColor: '#fff',
  },
  buyerPinScore: {
    color: '#fff',
    fontWeight: '800',
  },
  pinArrow: {
    width: 0,
    height: 0,
    borderLeftWidth: 5,
    borderRightWidth: 5,
    borderTopWidth: 6,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    alignSelf: 'center',
  },
  calloutBox: {
    padding: 10,
    minWidth: 170,
    maxWidth: 240,
  },
  calloutTitle: {
    fontWeight: '800',
    color: Palette.charcoal,
    fontSize: 12,
  },
  calloutSub: {
    color: Palette.slateMedium,
    fontSize: 11,
    marginTop: 2,
  },
  calloutCrops: {
    color: Palette.primaryDark,
    fontWeight: '600',
    fontSize: 11,
    marginTop: 4,
  },
  calloutAction: {
    fontWeight: '700',
    fontSize: 11,
    marginTop: 6,
  },
  bottomCard: {
    position: 'absolute',
    bottom: 20,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: Palette.warmBorder,
  },
  bottomCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  bottomScoreBadge: {
    width: 54,
    height: 54,
    borderRadius: 27,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bottomScoreText: {
    color: '#fff',
    fontWeight: '900',
  },
  bottomScoreLabel: {
    color: 'rgba(255,255,255,0.8)',
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  bottomBizName: {
    fontWeight: '800',
    color: Palette.charcoal,
    flexShrink: 1,
    marginRight: 6,
  },
  bottomContact: {
    color: Palette.slateMedium,
    marginTop: 2,
  },
  bottomDist: {
    color: Palette.slateMedium,
    marginTop: 1,
    fontWeight: '600',
  },
  bottomCrops: {
    color: Palette.primaryDark,
    fontWeight: '600',
    marginTop: 2,
  },
  bottomActions: {
    flexDirection: 'row',
    gap: 10,
    borderTopWidth: 1,
    borderTopColor: Palette.subtleBorder,
    paddingTop: 10,
  },
});

export default MapViewScreen;
