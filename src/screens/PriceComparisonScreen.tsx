import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  Linking,
  Alert,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Palette, BorderRadius, Shadows } from '../constants/theme';
import { Badge } from '../components/common/Badge';
import { useResponsive } from '../hooks/useResponsive';
import { useAuth } from '../hooks/useAuth';
import { POPULAR_CROPS } from '../constants/sriLanka';
import {
  buildBuyerOfferCards,
  BuyerOfferCard,
  ComparisonSummary,
  COMPARISON_DISCLAIMER,
} from '../services/buyerOfferComparisonService';
import { formatLKR } from '../services/priceHistoryService';
import {
  checkFarmerLocationPermission,
  getFarmerCurrentLocation,
  getFallbackFarmerLocation,
  FarmerLocation,
} from '../services/locationService';

export const PriceComparisonScreen: React.FC = () => {
  const { scaleSize, scaleFont, contentPadding } = useResponsive();
  const { user } = useAuth();
  const searchParams = useLocalSearchParams<{
    cropName?: string;
    quantityKg?: string;
    aiReferencePrice?: string;
  }>();

  // Inputs
  const [cropName, setCropName] = useState<string>(
    searchParams.cropName || 'Carrot (Upcountry)'
  );
  const [quantityKgInput, setQuantityKgInput] = useState<string>(
    searchParams.quantityKg || '150'
  );
  const [farmerAskingPriceInput, setFarmerAskingPriceInput] = useState<string>('');

  // Results
  const [cards, setCards] = useState<BuyerOfferCard[]>([]);
  const [summary, setSummary] = useState<ComparisonSummary | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [farmerLocation, setFarmerLocation] = useState<FarmerLocation | null>(null);

  // Modals & expansions
  const [selectedCard, setSelectedCard] = useState<BuyerOfferCard | null>(null);
  const [showCropPicker, setShowCropPicker] = useState<boolean>(false);
  const [showScoreInfo, setShowScoreInfo] = useState<boolean>(false);

  // Parse numeric values
  const farmerQuantityKg = parseFloat(quantityKgInput) || 100;
  const aiRefPrice = searchParams.aiReferencePrice
    ? parseFloat(searchParams.aiReferencePrice)
    : null;
  const farmerAskingPrice = farmerAskingPriceInput ? parseFloat(farmerAskingPriceInput) : null;

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      setLoading(true);
      try {
        let loc: FarmerLocation;
        const hasPermission = await checkFarmerLocationPermission();
        if (hasPermission) {
          loc = await getFarmerCurrentLocation(user?.location?.district || 'Nuwara Eliya');
        } else {
          loc = getFallbackFarmerLocation(user?.location?.district || 'Nuwara Eliya', false);
        }

        const result = await buildBuyerOfferCards({
          cropName,
          farmerQuantityKg,
          farmerLat: loc.latitude,
          farmerLon: loc.longitude,
          farmerDistrict: loc.district,
          aiReferencePrice: aiRefPrice,
          farmerAskingPrice,
        });

        if (!cancelled) {
          setFarmerLocation(loc);
          setCards(result.cards);
          setSummary(result.summary);
        }
      } catch {
        if (!cancelled) {
          setCards([]);
          setSummary(null);
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
  }, [cropName, farmerQuantityKg, aiRefPrice, farmerAskingPrice, user]);

  const onRefresh = () => {
    setRefreshing(true);
    let cancelled = false;
    const run = async () => {
      try {
        const district = user?.location?.district || 'Nuwara Eliya';
        const loc = farmerLocation || getFallbackFarmerLocation(district, false);
        const result = await buildBuyerOfferCards({
          cropName,
          farmerQuantityKg,
          farmerLat: loc.latitude,
          farmerLon: loc.longitude,
          farmerDistrict: loc.district,
          aiReferencePrice: aiRefPrice,
          farmerAskingPrice,
        });
        if (!cancelled) {
          setCards(result.cards);
          setSummary(result.summary);
        }
      } catch {
        // preserve existing cards on error
      } finally {
        if (!cancelled) {
          setRefreshing(false);
        }
      }
    };
    void run();
  };

  const handleCallBuyer = (phone: string, name: string) => {
    if (!phone) {
      Alert.alert('Phone Not Available', `Contact phone is not listed for ${name}.`);
      return;
    }
    const cleanPhone = phone.replace(/\s+/g, '');
    Linking.openURL(`tel:${cleanPhone}`).catch(() => {
      Alert.alert('Unable to Call', `Could not initiate call to ${cleanPhone}.`);
    });
  };

  return (
    <View style={styles.screen}>
      {/* Custom Header with Back Button */}
      <View style={styles.customHeader}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backBtn}
          accessibilityLabel="Go back"
        >
          <Ionicons name="arrow-back" size={scaleSize(22)} color={Palette.primary} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={[styles.headerTitle, { fontSize: scaleFont(16) }]}>
            Buyer Offer Comparison
          </Text>
          <Text style={[styles.headerSubtitle, { fontSize: scaleFont(11) }]}>
            Multi-factor Matching & Market Fair-Rate
          </Text>
        </View>
        <TouchableOpacity
          onPress={() => setShowScoreInfo(true)}
          style={styles.infoBtn}
          accessibilityLabel="Scoring methodology"
        >
          <Ionicons name="help-circle-outline" size={scaleSize(22)} color={Palette.primary} />
        </TouchableOpacity>
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
        {/* Anti-Price-Bias Mandatory Notice */}
        <View style={styles.disclaimerBanner}>
          <Ionicons name="shield-checkmark" size={scaleSize(18)} color={Palette.primary} />
          <Text style={[styles.disclaimerText, { fontSize: scaleFont(11) }]}>
            {COMPARISON_DISCLAIMER}
          </Text>
        </View>

        {/* Input Configuration Card */}
        <View
          style={[
            styles.configCard,
            {
              padding: scaleSize(14),
              borderRadius: BorderRadius.lg,
              marginBottom: scaleSize(14),
              ...Shadows.soft,
            },
          ]}
        >
          <Text style={[styles.configCardTitle, { fontSize: scaleFont(13) }]}>
            Your Crop Parameters
          </Text>

          {/* Crop Selector */}
          <TouchableOpacity
            style={styles.cropSelector}
            onPress={() => setShowCropPicker(true)}
          >
            <View style={styles.cropSelectorLeft}>
              <Ionicons name="leaf-outline" size={scaleSize(16)} color={Palette.primary} />
              <Text style={[styles.cropSelectorText, { fontSize: scaleFont(13) }]}>
                {cropName}
              </Text>
            </View>
            <Ionicons name="chevron-down" size={scaleSize(16)} color={Palette.slateMedium} />
          </TouchableOpacity>

          {/* Numeric Inputs Row: Quantity & Asking Price */}
          <View style={styles.inputsRow}>
            <View style={styles.inputCol}>
              <Text style={[styles.inputLabel, { fontSize: scaleFont(11) }]}>
                Available Qty (kg)
              </Text>
              <TextInput
                style={[styles.textInput, { fontSize: scaleFont(13) }]}
                keyboardType="numeric"
                value={quantityKgInput}
                onChangeText={setQuantityKgInput}
                placeholder="100"
                placeholderTextColor={Palette.slateLight}
              />
            </View>
            <View style={styles.inputCol}>
              <Text style={[styles.inputLabel, { fontSize: scaleFont(11) }]}>
                Your Asking (LKR/kg)
              </Text>
              <TextInput
                style={[styles.textInput, { fontSize: scaleFont(13) }]}
                keyboardType="numeric"
                value={farmerAskingPriceInput}
                onChangeText={setFarmerAskingPriceInput}
                placeholder="Optional"
                placeholderTextColor={Palette.slateLight}
              />
            </View>
          </View>

          {/* Connected Inter-Feature Quick Links */}
          <View style={{ flexDirection: 'row', gap: scaleSize(8), marginTop: scaleSize(12) }}>
            <TouchableOpacity
              onPress={() =>
                router.push({
                  pathname: '/price-prediction',
                  params: {
                    cropName,
                    quantityKg: quantityKgInput,
                  },
                })
              }
              style={{
                flex: 1,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: Palette.primaryTint,
                paddingVertical: scaleSize(8),
                borderRadius: BorderRadius.sm,
                gap: 4,
              }}
            >
              <Ionicons name="sparkles" size={scaleSize(13)} color={Palette.primary} />
              <Text style={{ fontSize: scaleFont(11), color: Palette.primary, fontWeight: '700' }}>
                AI Predictor
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() =>
                router.push({
                  pathname: '/price-history',
                  params: {
                    cropName,
                  },
                })
              }
              style={{
                flex: 1,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: Palette.primaryTint,
                paddingVertical: scaleSize(8),
                borderRadius: BorderRadius.sm,
                gap: 4,
              }}
            >
              <Ionicons name="time" size={scaleSize(13)} color={Palette.secondary} />
              <Text style={{ fontSize: scaleFont(11), color: Palette.secondary, fontWeight: '700' }}>
                Price History
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() =>
                router.push({
                  pathname: '/(farmer)/add-crop',
                  params: {
                    cropName,
                    quantity: quantityKgInput,
                    askingPrice: farmerAskingPriceInput || summary?.aiReferencePrice?.toString(),
                  },
                })
              }
              style={{
                flex: 1,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: Palette.primary,
                paddingVertical: scaleSize(8),
                borderRadius: BorderRadius.sm,
                gap: 4,
              }}
            >
              <Ionicons name="add-circle" size={scaleSize(13)} color={Palette.white} />
              <Text style={{ fontSize: scaleFont(11), color: Palette.white, fontWeight: '700' }}>
                List Crop
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Reference Benchmarks Strip */}
        {summary && (
          <View
            style={[
              styles.benchmarkStrip,
              {
                padding: scaleSize(12),
                borderRadius: BorderRadius.lg,
                marginBottom: scaleSize(14),
                ...Shadows.soft,
              },
            ]}
          >
            <View style={styles.benchmarkItem}>
              <Text style={[styles.benchmarkLbl, { fontSize: scaleFont(10) }]}>
                AI Reference Price
              </Text>
              <Text style={[styles.benchmarkVal, { fontSize: scaleFont(13), color: Palette.primary }]}>
                {summary.aiReferencePrice ? formatLKR(summary.aiReferencePrice) + '/kg' : 'Market Standard'}
              </Text>
              <Text style={[styles.benchmarkSub, { fontSize: scaleFont(9) }]}>
                ML baseline
              </Text>
            </View>

            <View style={styles.benchmarkSep} />

            <View style={styles.benchmarkItem}>
              <Text style={[styles.benchmarkLbl, { fontSize: scaleFont(10) }]}>
                Your Asking Price
              </Text>
              <Text style={[styles.benchmarkVal, { fontSize: scaleFont(13), color: Palette.charcoal }]}>
                {farmerAskingPrice ? formatLKR(farmerAskingPrice) + '/kg' : 'Negotiable'}
              </Text>
              <Text style={[styles.benchmarkSub, { fontSize: scaleFont(9) }]}>
                Farmer benchmark
              </Text>
            </View>

            <View style={styles.benchmarkSep} />

            <View style={styles.benchmarkItem}>
              <Text style={[styles.benchmarkLbl, { fontSize: scaleFont(10) }]}>
                Top Multi-Factor Match
              </Text>
              <Text style={[styles.benchmarkVal, { fontSize: scaleFont(13), color: Palette.success }]}>
                {summary.topBuyerScore}% Match
              </Text>
              <Text style={[styles.benchmarkSub, { fontSize: scaleFont(9) }]} numberOfLines={1}>
                {summary.topBuyerName || 'Verified'}
              </Text>
            </View>
          </View>
        )}

        {/* Section Header */}
        <View style={styles.resultsHeader}>
          <Text style={[styles.resultsTitle, { fontSize: scaleFont(14) }]}>
            Registered Buyer Offers ({cards.length})
          </Text>
          <TouchableOpacity onPress={() => setShowScoreInfo(true)}>
            <Text style={[styles.scoreGuideLink, { fontSize: scaleFont(11) }]}>
              How we rank ⓘ
            </Text>
          </TouchableOpacity>
        </View>

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={Palette.primary} />
            <Text style={[styles.loadingText, { fontSize: scaleFont(13) }]}>
              Matching registered buyers & analyzing offers...
            </Text>
          </View>
        ) : cards.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="search-outline" size={scaleSize(40)} color={Palette.slateLight} />
            <Text style={[styles.emptyTitle, { fontSize: scaleFont(14) }]}>
              No Registered Buyers Found
            </Text>
            <Text style={[styles.emptySubtitle, { fontSize: scaleFont(12) }]}>
              Try selecting a different crop or check back later as new buyers register.
            </Text>
          </View>
        ) : (
          <View style={styles.cardsList}>
            {cards.map((card) => {
              const diffVsAi =
                card.estimatedOfferPerKg && summary?.aiReferencePrice
                  ? card.estimatedOfferPerKg - summary.aiReferencePrice
                  : null;

              return (
                <View
                  key={card.buyer.id}
                  style={[
                    styles.buyerCard,
                    card.isTopPick && styles.buyerCardTopPick,
                    {
                      padding: scaleSize(14),
                      borderRadius: BorderRadius.xl,
                      marginBottom: scaleSize(12),
                      ...Shadows.soft,
                    },
                  ]}
                >
                  {/* Card Header: Business Name & Key Badges */}
                  <View style={styles.cardTopRow}>
                    <View style={styles.businessHeaderLeft}>
                      <Text style={[styles.businessName, { fontSize: scaleFont(15) }]}>
                        {card.buyer.businessName}
                      </Text>
                      <View style={styles.businessSubRow}>
                        <Ionicons name="location-outline" size={scaleSize(12)} color={Palette.slateMedium} />
                        <Text style={[styles.businessLocationText, { fontSize: scaleFont(11) }]}>
                          {card.buyer.district} · {card.distanceLabel}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.badgesCol}>
                      {card.isTopPick && (
                        <Badge label="★ Top Match" variant="verified" size="sm" />
                      )}
                      {card.isHighestPrice && !card.isTopPick && (
                        <Badge label="Highest Price" variant="aiFair" size="sm" />
                      )}
                      <Badge
                        label={card.buyer.businessType.toUpperCase()}
                        variant="category"
                        size="sm"
                      />
                    </View>
                  </View>

                  {/* Compatibility Score Bar */}
                  <View style={styles.scoreRow}>
                    <View style={styles.scoreBarTrack}>
                      <View
                        style={[
                          styles.scoreBarFill,
                          {
                            width: `${card.score}%`,
                            backgroundColor:
                              card.score >= 80
                                ? Palette.success
                                : card.score >= 60
                                ? Palette.primary
                                : Palette.warning,
                          },
                        ]}
                      />
                    </View>
                    <Text style={[styles.scoreValue, { fontSize: scaleFont(11) }]}>
                      {card.score}/100 · {card.scoreLabel}
                    </Text>
                  </View>

                  {/* Pricing Details Block */}
                  <View style={styles.priceOfferRow}>
                    <View style={styles.offerCol}>
                      <Text style={[styles.offerLabel, { fontSize: scaleFont(11) }]}>
                        Offered Rate (Est.)
                      </Text>
                      <Text style={[styles.offerVal, { fontSize: scaleFont(16) }]}>
                        {card.estimatedOfferLabel}
                      </Text>
                    </View>

                    {diffVsAi !== null && (
                      <View style={styles.aiDiffCol}>
                        <View
                          style={[
                            styles.diffPill,
                            diffVsAi >= 0 ? styles.diffPillPositive : styles.diffPillNegative,
                          ]}
                        >
                          <Ionicons
                            name={diffVsAi >= 0 ? 'arrow-up' : 'arrow-down'}
                            size={scaleSize(11)}
                            color={diffVsAi >= 0 ? Palette.success : Palette.rescueRed}
                          />
                          <Text
                            style={[
                              styles.diffPillText,
                              {
                                fontSize: scaleFont(10),
                                color: diffVsAi >= 0 ? Palette.success : Palette.rescueRed,
                              },
                            ]}
                          >
                            {diffVsAi >= 0 ? '+' : ''}
                            {formatLKR(diffVsAi)}/kg vs AI
                          </Text>
                        </View>
                      </View>
                    )}
                  </View>

                  {/* Order Range & Compatibility Tags */}
                  <View style={styles.compatibilityRow}>
                    <View style={styles.compatTag}>
                      <Ionicons
                        name={card.cropCompatible ? 'checkmark-circle' : 'close-circle'}
                        size={scaleSize(13)}
                        color={card.cropCompatible ? Palette.success : Palette.rescueRed}
                      />
                      <Text style={[styles.compatTagText, { fontSize: scaleFont(10) }]}>
                        {card.cropCompatible ? 'Crop Wanted' : 'Not Primary'}
                      </Text>
                    </View>

                    <View style={styles.compatTag}>
                      <Ionicons
                        name={card.quantityCompatible ? 'checkmark-circle' : 'alert-circle'}
                        size={scaleSize(13)}
                        color={card.quantityCompatible ? Palette.success : Palette.warning}
                      />
                      <Text style={[styles.compatTagText, { fontSize: scaleFont(10) }]}>
                        Range: {card.buyer.purchasingRequirements.minOrderQuantityKg}–{card.buyer.purchasingRequirements.maxOrderQuantityKg} kg
                      </Text>
                    </View>

                    {card.buyer.purchasingRequirements.hasColdStorage && (
                      <View style={styles.compatTag}>
                        <Ionicons name="snow" size={scaleSize(12)} color={Palette.info} />
                        <Text style={[styles.compatTagText, { fontSize: scaleFont(10) }]}>
                          Cold Storage
                        </Text>
                      </View>
                    )}
                  </View>

                  {/* Match Highlights / Caveats */}
                  {card.matchReasons.length > 0 && (
                    <View style={styles.reasonsList}>
                      {card.matchReasons.slice(0, 2).map((reason, idx) => (
                        <View key={idx} style={styles.reasonItem}>
                          <Ionicons name="checkmark" size={scaleSize(12)} color={Palette.success} />
                          <Text style={[styles.reasonText, { fontSize: scaleFont(10) }]}>
                            {reason}
                          </Text>
                        </View>
                      ))}
                    </View>
                  )}

                  {/* Caveats if any */}
                  {card.caveats.length > 0 && (
                    <View style={styles.caveatsList}>
                      {card.caveats.slice(0, 1).map((caveat, idx) => (
                        <View key={idx} style={styles.caveatItem}>
                          <Ionicons name="warning-outline" size={scaleSize(11)} color={Palette.warning} />
                          <Text style={[styles.caveatText, { fontSize: scaleFont(10) }]}>
                            {caveat}
                          </Text>
                        </View>
                      ))}
                    </View>
                  )}

                  {/* Action Buttons Row: View Details & Call */}
                  <View style={styles.cardActionsRow}>
                    <TouchableOpacity
                      style={styles.detailBtn}
                      onPress={() => setSelectedCard(card)}
                    >
                      <Ionicons name="information-circle-outline" size={scaleSize(15)} color={Palette.primary} />
                      <Text style={[styles.detailBtnText, { fontSize: scaleFont(12) }]}>
                        View Details
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.callBtn}
                      onPress={() => handleCallBuyer(card.buyer.phone, card.buyer.businessName)}
                    >
                      <Ionicons name="call" size={scaleSize(14)} color={Palette.white} />
                      <Text style={[styles.callBtnText, { fontSize: scaleFont(12) }]}>
                        Contact Buyer
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>

      {/* Buyer Detail Modal */}
      {selectedCard && (
        <Modal visible transparent animationType="slide">
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <View>
                  <Text style={styles.modalTitle}>{selectedCard.buyer.businessName}</Text>
                  <Text style={styles.modalSub}>
                    {selectedCard.buyer.contactPerson} · {selectedCard.buyer.district}
                  </Text>
                </View>
                <TouchableOpacity onPress={() => setSelectedCard(null)}>
                  <Ionicons name="close" size={scaleSize(22)} color={Palette.charcoal} />
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
                {/* Score & Verdict Banner */}
                <View style={styles.detailScoreBanner}>
                  <Text style={styles.detailScoreText}>
                    Overall Compatibility Score: {selectedCard.score}/100 ({selectedCard.scoreLabel})
                  </Text>
                </View>

                {/* Full Details List */}
                <View style={styles.detailSection}>
                  <Text style={styles.detailSectionTitle}>Purchasing Requirements</Text>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLbl}>Wanted Crops:</Text>
                    <Text style={styles.detailVal}>
                      {selectedCard.buyer.purchasingRequirements.preferredCrops.join(', ')}
                    </Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLbl}>Order Capacity:</Text>
                    <Text style={styles.detailVal}>
                      {selectedCard.buyer.purchasingRequirements.minOrderQuantityKg} kg –{' '}
                      {selectedCard.buyer.purchasingRequirements.maxOrderQuantityKg} kg
                    </Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLbl}>Payment Terms:</Text>
                    <Text style={styles.detailVal}>
                      {selectedCard.buyer.purchasingRequirements.paymentTerms.replace(/_/g, ' ')}
                    </Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLbl}>Delivery Mode:</Text>
                    <Text style={styles.detailVal}>
                      {selectedCard.buyer.purchasingRequirements.preferredDeliveryMode === 'farmgate_pickup'
                        ? 'Farm-Gate Collection'
                        : 'Farmer Market Delivery'}
                    </Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLbl}>Cold Storage:</Text>
                    <Text style={styles.detailVal}>
                      {selectedCard.buyer.purchasingRequirements.hasColdStorage ? 'Yes' : 'No'}
                    </Text>
                  </View>
                </View>

                {/* Business Verification & Credibility */}
                <View style={styles.detailSection}>
                  <Text style={styles.detailSectionTitle}>Business Credibility</Text>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLbl}>Verification:</Text>
                    <Text style={styles.detailVal}>
                      {selectedCard.buyer.isVerifiedBusiness ? '✓ Verified Registered Business' : 'Unverified'}
                    </Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLbl}>Deals Completed:</Text>
                    <Text style={styles.detailVal}>
                      {selectedCard.buyer.dealsCompleted} successful transactions
                    </Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLbl}>Rating:</Text>
                    <Text style={styles.detailVal}>
                      ★ {selectedCard.buyer.rating} / 5.0
                    </Text>
                  </View>
                </View>

                {/* Direct Action in Modal */}
                <TouchableOpacity
                  style={styles.modalCallButton}
                  onPress={() => {
                    const phone = selectedCard.buyer.phone;
                    const name = selectedCard.buyer.businessName;
                    setSelectedCard(null);
                    handleCallBuyer(phone, name);
                  }}
                >
                  <Ionicons name="call" size={scaleSize(16)} color={Palette.white} />
                  <Text style={styles.modalCallButtonText}>
                    Call {selectedCard.buyer.phone}
                  </Text>
                </TouchableOpacity>
              </ScrollView>
            </View>
          </View>
        </Modal>
      )}

      {/* Score Methodology Info Modal */}
      <Modal visible={showScoreInfo} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Multi-Factor Ranking Formula</Text>
              <TouchableOpacity onPress={() => setShowScoreInfo(false)}>
                <Ionicons name="close" size={scaleSize(22)} color={Palette.charcoal} />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
              <Text style={styles.infoP}>
                CropConnect does <Text style={{ fontWeight: '800' }}>not</Text> recommend buyers solely based on the highest price. Highest price offers often have strict volume minimums or high transport expenses.
              </Text>
              <View style={styles.weightList}>
                <View style={styles.weightItem}>
                  <Text style={styles.weightVal}>35%</Text>
                  <Text style={styles.weightDesc}>
                    <Text style={{ fontWeight: '700' }}>Price Realism:</Text> Competitive offer relative to AI Fair-Price benchmark.
                  </Text>
                </View>
                <View style={styles.weightItem}>
                  <Text style={styles.weightVal}>25%</Text>
                  <Text style={styles.weightDesc}>
                    <Text style={{ fontWeight: '700' }}>Crop Match:</Text> Buyer explicitly purchases your crop species.
                  </Text>
                </View>
                <View style={styles.weightItem}>
                  <Text style={styles.weightVal}>20%</Text>
                  <Text style={styles.weightDesc}>
                    <Text style={{ fontWeight: '700' }}>Quantity Alignment:</Text> Your harvest matches buyer order range without excess or deficit.
                  </Text>
                </View>
                <View style={styles.weightItem}>
                  <Text style={styles.weightVal}>15%</Text>
                  <Text style={styles.weightDesc}>
                    <Text style={{ fontWeight: '700' }}>Proximity:</Text> Shorter travel distance reduces post-harvest spoilage and fuel cost.
                  </Text>
                </View>
                <View style={styles.weightItem}>
                  <Text style={styles.weightVal}>5%</Text>
                  <Text style={styles.weightDesc}>
                    <Text style={{ fontWeight: '700' }}>Verification:</Text> Verified business registration on CropConnect.
                  </Text>
                </View>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Crop Picker Modal */}
      <Modal visible={showCropPicker} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Crop</Text>
              <TouchableOpacity onPress={() => setShowCropPicker(false)}>
                <Ionicons name="close" size={scaleSize(22)} color={Palette.charcoal} />
              </TouchableOpacity>
            </View>
            <FlatList
              data={POPULAR_CROPS}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => {
                const active = cropName === item.name;
                return (
                  <TouchableOpacity
                    style={[styles.modalItem, active && styles.modalItemActive]}
                    onPress={() => {
                      setCropName(item.name);
                      setShowCropPicker(false);
                    }}
                  >
                    <View>
                      <Text style={[styles.modalItemTitle, active && styles.modalItemTitleActive]}>
                        {item.name}
                      </Text>
                      <Text style={styles.modalItemSub}>
                        {item.sinhalaName} · Bench: {formatLKR(item.benchmarkPriceLkrPerKg)}/kg
                      </Text>
                    </View>
                    {active && (
                      <Ionicons name="checkmark-circle" size={scaleSize(18)} color={Palette.primary} />
                    )}
                  </TouchableOpacity>
                );
              }}
            />
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Palette.background,
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
  backBtn: {
    padding: 6,
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontWeight: '800',
    color: Palette.charcoal,
  },
  headerSubtitle: {
    color: Palette.slateMedium,
    marginTop: 2,
  },
  infoBtn: {
    padding: 6,
  },
  disclaimerBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: Palette.primaryTint,
    padding: 10,
    borderRadius: BorderRadius.md,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(36, 92, 70, 0.25)',
  },
  disclaimerText: {
    flex: 1,
    color: Palette.primary,
    lineHeight: 16,
    fontWeight: '600',
  },
  configCard: {
    backgroundColor: Palette.surface,
  },
  configCardTitle: {
    fontWeight: '800',
    color: Palette.charcoal,
    marginBottom: 10,
  },
  cropSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Palette.surfaceAlt,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: BorderRadius.md,
    marginBottom: 10,
  },
  cropSelectorLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  cropSelectorText: {
    fontWeight: '700',
    color: Palette.charcoal,
  },
  inputsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  inputCol: {
    flex: 1,
  },
  inputLabel: {
    color: Palette.slateMedium,
    fontWeight: '600',
    marginBottom: 4,
  },
  textInput: {
    backgroundColor: Palette.surfaceAlt,
    borderRadius: BorderRadius.md,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontWeight: '700',
    color: Palette.charcoal,
  },
  benchmarkStrip: {
    flexDirection: 'row',
    backgroundColor: Palette.surface,
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  benchmarkItem: {
    flex: 1,
    alignItems: 'center',
  },
  benchmarkLbl: {
    color: Palette.slateMedium,
    fontWeight: '600',
    marginBottom: 2,
  },
  benchmarkVal: {
    fontWeight: '800',
  },
  benchmarkSub: {
    color: Palette.slateLight,
    marginTop: 2,
  },
  benchmarkSep: {
    width: 1,
    height: 36,
    backgroundColor: Palette.subtleBorder,
  },
  resultsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  resultsTitle: {
    fontWeight: '800',
    color: Palette.charcoal,
  },
  scoreGuideLink: {
    color: Palette.primary,
    fontWeight: '700',
  },
  loadingContainer: {
    paddingVertical: 40,
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    color: Palette.slateMedium,
    fontWeight: '500',
  },
  emptyContainer: {
    paddingVertical: 40,
    alignItems: 'center',
    gap: 10,
  },
  emptyTitle: {
    fontWeight: '800',
    color: Palette.charcoal,
  },
  emptySubtitle: {
    color: Palette.slateMedium,
    textAlign: 'center',
    paddingHorizontal: 24,
  },
  cardsList: {
    gap: 4,
  },
  buyerCard: {
    backgroundColor: Palette.surface,
    borderWidth: 1,
    borderColor: Palette.warmBorder,
  },
  buyerCardTopPick: {
    borderColor: Palette.primary,
    borderWidth: 1.5,
  },
  cardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  businessHeaderLeft: {
    flex: 1,
  },
  businessName: {
    fontWeight: '800',
    color: Palette.charcoal,
  },
  businessSubRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  businessLocationText: {
    color: Palette.slateMedium,
  },
  badgesCol: {
    alignItems: 'flex-end',
    gap: 4,
  },
  scoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  scoreBarTrack: {
    flex: 1,
    height: 6,
    backgroundColor: Palette.surfaceAlt,
    borderRadius: 3,
    overflow: 'hidden',
  },
  scoreBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  scoreValue: {
    fontWeight: '700',
    color: Palette.slateDark,
  },
  priceOfferRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: Palette.surfaceAlt,
    padding: 10,
    borderRadius: BorderRadius.md,
    marginBottom: 10,
  },
  offerCol: {},
  offerLabel: {
    color: Palette.slateMedium,
    fontWeight: '600',
  },
  offerVal: {
    fontWeight: '800',
    color: Palette.primary,
    marginTop: 2,
  },
  aiDiffCol: {
    alignItems: 'flex-end',
  },
  diffPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
  },
  diffPillPositive: {
    backgroundColor: Palette.successLight,
  },
  diffPillNegative: {
    backgroundColor: Palette.rescueLight,
  },
  diffPillText: {
    fontWeight: '700',
  },
  compatibilityRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 10,
  },
  compatTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Palette.surfaceAlt,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: BorderRadius.sm,
  },
  compatTagText: {
    color: Palette.slateDark,
    fontWeight: '600',
  },
  reasonsList: {
    gap: 3,
    marginBottom: 8,
  },
  reasonItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  reasonText: {
    color: Palette.success,
    fontWeight: '600',
  },
  caveatsList: {
    gap: 3,
    marginBottom: 8,
  },
  caveatItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  caveatText: {
    color: Palette.warning,
    fontWeight: '500',
  },
  cardActionsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  detailBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: Palette.primaryTint,
    paddingVertical: 10,
    borderRadius: BorderRadius.md,
  },
  detailBtnText: {
    color: Palette.primary,
    fontWeight: '700',
  },
  callBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: Palette.primary,
    paddingVertical: 10,
    borderRadius: BorderRadius.md,
  },
  callBtnText: {
    color: Palette.white,
    fontWeight: '700',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
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
  modalBody: {
    paddingTop: 12,
  },
  detailScoreBanner: {
    backgroundColor: Palette.primaryTint,
    padding: 10,
    borderRadius: BorderRadius.md,
    marginBottom: 12,
  },
  detailScoreText: {
    color: Palette.primary,
    fontWeight: '700',
    fontSize: 13,
  },
  detailSection: {
    marginBottom: 14,
    backgroundColor: Palette.surfaceAlt,
    padding: 12,
    borderRadius: BorderRadius.md,
  },
  detailSectionTitle: {
    fontWeight: '800',
    color: Palette.charcoal,
    fontSize: 13,
    marginBottom: 8,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  detailLbl: {
    fontSize: 12,
    color: Palette.slateMedium,
    fontWeight: '500',
  },
  detailVal: {
    fontSize: 12,
    fontWeight: '700',
    color: Palette.charcoal,
    flex: 1,
    textAlign: 'right',
  },
  modalCallButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Palette.primary,
    paddingVertical: 14,
    borderRadius: BorderRadius.lg,
    marginTop: 8,
    marginBottom: 20,
  },
  modalCallButtonText: {
    color: Palette.white,
    fontWeight: '800',
    fontSize: 14,
  },
  infoP: {
    color: Palette.charcoal,
    lineHeight: 20,
    fontSize: 13,
    marginBottom: 12,
  },
  weightList: {
    gap: 10,
    marginBottom: 20,
  },
  weightItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    backgroundColor: Palette.surfaceAlt,
    padding: 10,
    borderRadius: BorderRadius.md,
  },
  weightVal: {
    fontSize: 16,
    fontWeight: '800',
    color: Palette.primary,
    width: 44,
  },
  weightDesc: {
    flex: 1,
    fontSize: 12,
    color: Palette.slateDark,
    lineHeight: 18,
  },
  modalItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Palette.subtleBorder,
  },
  modalItemActive: {
    backgroundColor: Palette.primaryTint,
    marginHorizontal: -8,
    paddingHorizontal: 8,
    borderRadius: BorderRadius.md,
  },
  modalItemTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Palette.charcoal,
  },
  modalItemTitleActive: {
    color: Palette.primary,
    fontWeight: '800',
  },
  modalItemSub: {
    fontSize: 11,
    color: Palette.slateMedium,
    marginTop: 2,
  },
});

export default PriceComparisonScreen;
