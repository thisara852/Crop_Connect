/**
 * FairPricePredictionScreen
 *
 * AI-assisted fair price estimation for Sri Lankan agricultural crops.
 *
 * TRANSPARENCY NOTICE (displayed prominently in the UI):
 *  • Uses a demonstration dataset — not live government market data.
 *  • Predictions are ESTIMATES, not guaranteed selling prices.
 *  • Offline mode uses HARTI/DoA benchmark baselines.
 *  • Model evaluation metrics are shown to the user.
 *
 * ESLint compliance:
 *  - All setState calls inside useEffect are wrapped in async `run()` helpers
 *  - useCallback deps use full parent objects (not sub-properties)
 *  - No require() inside component body
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  FlatList,
  Alert,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Palette, Spacing, BorderRadius, Shadows } from '../constants/theme';
import { Button } from '../components/common/Button';
import { Input } from '../components/common/Input';
import { Badge } from '../components/common/Badge';
import { useResponsive } from '../hooks/useResponsive';
import { useAuth } from '../hooks/useAuth';
import { POPULAR_CROPS, SRI_LANKA_DISTRICTS } from '../constants/sriLanka';
import {
  predictFairPrice,
  fetchPriceHistory,
  fetchModelInfo,
  savePredictionToFirestore,
  getUserPredictions,
  ExtendedPricePrediction,
  PriceHistoryResult,
  ModelInfo,
} from '../services/aiService';
import { getAllBuyers } from '../services/firestoreService';
import { FirestoreBuyer } from '../types/database';

type Grade = 'A' | 'B' | 'C';
type PredictionStep = 'form' | 'predicting' | 'result';

const QUANTITY_PRESETS = [50, 100, 250, 500, 1000];

// ── Mini bar chart (pure RN — no charting lib needed) ─────────────────────────
interface MiniChartProps {
  history: PriceHistoryResult['history'];
  color: string;
  scaleSize: (n: number) => number;
  scaleFont: (n: number) => number;
}

const MiniBarChart: React.FC<MiniChartProps> = ({ history, color, scaleSize, scaleFont }) => {
  if (!history.length) return null;

  const prices = history.map((h) => h.price_avg_lkr);
  const minP = Math.min(...prices);
  const maxP = Math.max(...prices);
  const range = maxP - minP || 1;
  const barWidth = scaleSize(8);
  const maxBarH = scaleSize(60);

  return (
    <View>
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', height: maxBarH + scaleSize(4) }}>
        {prices.map((p, i) => {
          const h = Math.max(scaleSize(4), ((p - minP) / range) * maxBarH);
          return (
            <View
              key={i}
              style={{
                width: barWidth,
                height: h,
                backgroundColor: color,
                marginRight: 2,
                borderRadius: 2,
                opacity: 0.75 + (i / prices.length) * 0.25,
              }}
            />
          );
        })}
      </View>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 }}>
        <Text style={{ fontSize: scaleFont(9), color: Palette.slateMedium }}>
          Rs. {Math.round(minP)}
        </Text>
        <Text style={{ fontSize: scaleFont(9), color: Palette.slateMedium }}>
          Rs. {Math.round(maxP)}
        </Text>
      </View>
    </View>
  );
};

// ── Main screen ───────────────────────────────────────────────────────────────
export const FairPricePredictionScreen: React.FC = () => {
  const { scaleSize, scaleFont, contentPadding } = useResponsive();
  const { user } = useAuth();
  const searchParams = useLocalSearchParams<{
    cropName?: string;
    district?: string;
    quantityKg?: string;
  }>();

  const initialCrop = useMemo(() => {
    if (searchParams.cropName) {
      const paramName = searchParams.cropName.toLowerCase();
      const match = POPULAR_CROPS.find(
        (c) =>
          c.name.toLowerCase() === paramName ||
          c.sinhalaName.toLowerCase() === paramName ||
          paramName.includes(c.name.toLowerCase()) ||
          c.name.toLowerCase().includes(paramName)
      );
      if (match) return match;
    }
    return POPULAR_CROPS[2];
  }, [searchParams.cropName]);

  // ── Form state ────────────────────────────────────────────────────────────
  const [step, setStep] = useState<PredictionStep>('form');
  const [selectedCrop, setSelectedCrop] = useState(initialCrop);
  const [selectedDistrict, setSelectedDistrict] = useState(
    searchParams.district || SRI_LANKA_DISTRICTS[0].name
  );
  const [grade, setGrade] = useState<Grade>('A');
  const [quantityKg, setQuantityKg] = useState(searchParams.quantityKg || '100');
  const [isRescue, setIsRescue] = useState(false);
  const [showCropPicker, setShowCropPicker] = useState(false);
  const [showDistrictPicker, setShowDistrictPicker] = useState(false);

  // ── Result state ──────────────────────────────────────────────────────────
  const [prediction, setPrediction] = useState<ExtendedPricePrediction | null>(null);
  const [history, setHistory] = useState<PriceHistoryResult | null>(null);
  const [modelInfo, setModelInfo] = useState<ModelInfo | null>(null);
  const [relevantOffers, setRelevantOffers] = useState<FirestoreBuyer[]>([]);
  const [pastPredictions, setPastPredictions] = useState<Record<string, unknown>[]>([]);
  const [savingToFirestore, setSavingToFirestore] = useState(false);
  const [savedId, setSavedId] = useState<string | null>(null);
  const [showModelInfo, setShowModelInfo] = useState(false);
  const [showPastPredictions, setShowPastPredictions] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // ── Load past predictions on mount ────────────────────────────────────────
  useEffect(() => {
    if (!user?.id) return;
    let cancelled = false;
    const run = async () => {
      const preds = await getUserPredictions(user.id, 10);
      if (!cancelled) setPastPredictions(preds);
    };
    run();
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Load model info once ──────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      const info = await fetchModelInfo();
      if (!cancelled && info) setModelInfo(info);
    };
    run();
    return () => { cancelled = true; };
  }, []);

  // ── Run prediction ────────────────────────────────────────────────────────
  const runPrediction = useCallback(async () => {
    const qty = parseFloat(quantityKg);
    if (!qty || qty <= 0) {
      Alert.alert('Invalid Quantity', 'Please enter a valid quantity (kg).');
      return;
    }
    setStep('predicting');
    setErrorMsg(null);
    setSavedId(null);

    try {
      const [pred, hist] = await Promise.all([
        predictFairPrice({
          cropName: selectedCrop.name,
          district: selectedDistrict,
          grade,
          quantityKg: qty,
          isRescue,
        }),
        fetchPriceHistory(selectedCrop.name, selectedDistrict, 90),
      ]);

      // Load relevant registered buyers who want this crop
      let offers: FirestoreBuyer[] = [];
      try {
        const allBuyers = await getAllBuyers();
        offers = allBuyers
          .filter((b) =>
            b.purchasingRequirements.preferredCrops.some((c) =>
              c.toLowerCase().includes(selectedCrop.name.toLowerCase().split(' ')[0].toLowerCase())
            )
          )
          .slice(0, 5);
      } catch {
        offers = [];
      }

      setPrediction(pred);
      setHistory(hist);
      setRelevantOffers(offers);
      setStep('result');
    } catch (e) {
      setErrorMsg('Could not generate prediction. Please try again.');
      console.error('Prediction error:', e);
      setStep('form');
    }
  }, [selectedCrop, selectedDistrict, grade, quantityKg, isRescue]);

  // ── Save to Firestore ─────────────────────────────────────────────────────
  const saveToFirestore = useCallback(async () => {
    if (!prediction || !user?.id) return;
    setSavingToFirestore(true);
    const id = await savePredictionToFirestore(prediction, user.id, selectedCrop.id);
    setSavedId(id);
    setSavingToFirestore(false);
    if (id) {
      Alert.alert(
        'Saved ✓',
        'Prediction saved to your Firestore history.',
        [{ text: 'OK' }]
      );
    }
  }, [prediction, user, selectedCrop]);

  // ── Trend colour helper ───────────────────────────────────────────────────
  const trendColor = useMemo(() => {
    if (!prediction) return Palette.slateMedium;
    return prediction.marketTrend === 'rising'
      ? Palette.success
      : prediction.marketTrend === 'falling'
      ? Palette.rescueRed
      : Palette.warning;
  }, [prediction]);

  const trendIcon = useMemo((): 'trending-up' | 'trending-down' | 'remove' => {
    if (!prediction) return 'remove';
    return prediction.marketTrend === 'rising'
      ? 'trending-up'
      : prediction.marketTrend === 'falling'
      ? 'trending-down'
      : 'remove';
  }, [prediction]);

  // ── Render: crop picker modal ─────────────────────────────────────────────
  const renderCropPicker = () => (
    <Modal visible={showCropPicker} animationType="slide" transparent>
      <View style={styles.modalOverlay}>
        <View style={[styles.modalSheet, { borderRadius: BorderRadius.xl }]}>
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { fontSize: scaleFont(16) }]}>Select Crop</Text>
            <TouchableOpacity onPress={() => setShowCropPicker(false)}>
              <Ionicons name="close" size={scaleSize(22)} color={Palette.charcoal} />
            </TouchableOpacity>
          </View>
          <FlatList
            data={POPULAR_CROPS}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[
                  styles.pickerItem,
                  selectedCrop.id === item.id && styles.pickerItemActive,
                ]}
                onPress={() => { setSelectedCrop(item); setShowCropPicker(false); }}
              >
                <View>
                  <Text style={[styles.pickerItemText, { fontSize: scaleFont(14) }]}>{item.name}</Text>
                  <Text style={[styles.pickerItemSub, { fontSize: scaleFont(11) }]}>
                    {item.sinhalaName} · Rs. {item.benchmarkPriceLkrPerKg}/kg benchmark
                  </Text>
                </View>
                {selectedCrop.id === item.id && (
                  <Ionicons name="checkmark-circle" size={scaleSize(18)} color={Palette.primary} />
                )}
              </TouchableOpacity>
            )}
          />
        </View>
      </View>
    </Modal>
  );

  // ── Render: district picker modal ─────────────────────────────────────────
  const renderDistrictPicker = () => (
    <Modal visible={showDistrictPicker} animationType="slide" transparent>
      <View style={styles.modalOverlay}>
        <View style={[styles.modalSheet, { borderRadius: BorderRadius.xl }]}>
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { fontSize: scaleFont(16) }]}>Select District</Text>
            <TouchableOpacity onPress={() => setShowDistrictPicker(false)}>
              <Ionicons name="close" size={scaleSize(22)} color={Palette.charcoal} />
            </TouchableOpacity>
          </View>
          <FlatList
            data={SRI_LANKA_DISTRICTS}
            keyExtractor={(item) => item.name}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[
                  styles.pickerItem,
                  selectedDistrict === item.name && styles.pickerItemActive,
                ]}
                onPress={() => { setSelectedDistrict(item.name); setShowDistrictPicker(false); }}
              >
                <View>
                  <Text style={[styles.pickerItemText, { fontSize: scaleFont(14) }]}>{item.name}</Text>
                  <Text style={[styles.pickerItemSub, { fontSize: scaleFont(11) }]}>
                    {item.province} Province{item.majorHub ? ` · ${item.majorHub}` : ''}
                  </Text>
                </View>
                {selectedDistrict === item.name && (
                  <Ionicons name="checkmark-circle" size={scaleSize(18)} color={Palette.primary} />
                )}
              </TouchableOpacity>
            )}
          />
        </View>
      </View>
    </Modal>
  );

  // ── Render: form ──────────────────────────────────────────────────────────
  const renderForm = () => (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={{ padding: contentPadding, paddingBottom: 48 }}
      showsVerticalScrollIndicator={false}
    >
      {/* Transparency banner */}
      <View style={[styles.disclaimerBanner, { borderRadius: BorderRadius.md, marginBottom: scaleSize(16) }]}>
        <Ionicons name="information-circle" size={scaleSize(16)} color={Palette.info} />
        <Text style={[styles.disclaimerText, { fontSize: scaleFont(11) }]}>
          Prices are <Text style={{ fontWeight: '700' }}>estimates</Text> from a demonstration dataset seeded from HARTI / Dept. of Agriculture Sri Lanka benchmarks.{' '}
          <Text style={{ fontWeight: '700' }}>Not guaranteed market prices.</Text>
        </Text>
      </View>

      {/* Crop selection */}
      <Text style={[styles.sectionLabel, { fontSize: scaleFont(12) }]}>SELECT CROP</Text>
      <TouchableOpacity
        style={[styles.selectorBtn, { borderRadius: BorderRadius.md, marginBottom: scaleSize(14) }]}
        onPress={() => setShowCropPicker(true)}
      >
        <View>
          <Text style={[styles.selectorBtnLabel, { fontSize: scaleFont(15) }]}>{selectedCrop.name}</Text>
          <Text style={[styles.selectorBtnSub, { fontSize: scaleFont(11) }]}>
            {selectedCrop.sinhalaName} · {selectedCrop.category}
          </Text>
        </View>
        <Ionicons name="chevron-down" size={scaleSize(18)} color={Palette.slateMedium} />
      </TouchableOpacity>

      {/* District selection */}
      <Text style={[styles.sectionLabel, { fontSize: scaleFont(12) }]}>MARKET LOCATION (DISTRICT)</Text>
      <TouchableOpacity
        style={[styles.selectorBtn, { borderRadius: BorderRadius.md, marginBottom: scaleSize(14) }]}
        onPress={() => setShowDistrictPicker(true)}
      >
        <View>
          <Text style={[styles.selectorBtnLabel, { fontSize: scaleFont(15) }]}>{selectedDistrict}</Text>
          <Text style={[styles.selectorBtnSub, { fontSize: scaleFont(11) }]}>
            {SRI_LANKA_DISTRICTS.find((d) => d.name === selectedDistrict)?.province ?? ''} Province
          </Text>
        </View>
        <Ionicons name="chevron-down" size={scaleSize(18)} color={Palette.slateMedium} />
      </TouchableOpacity>

      {/* Grade */}
      <Text style={[styles.sectionLabel, { fontSize: scaleFont(12) }]}>CROP GRADE</Text>
      <View style={[styles.gradeRow, { marginBottom: scaleSize(14) }]}>
        {(['A', 'B', 'C'] as Grade[]).map((g) => (
          <TouchableOpacity
            key={g}
            style={[
              styles.gradeBtn,
              { borderRadius: BorderRadius.md },
              grade === g && styles.gradeBtnActive,
            ]}
            onPress={() => setGrade(g)}
          >
            <Text style={[styles.gradeBtnText, { fontSize: scaleFont(14) }, grade === g && styles.gradeBtnTextActive]}>
              Grade {g}
            </Text>
            <Text style={[styles.gradeBtnSub, { fontSize: scaleFont(10) }, grade === g && { color: Palette.white }]}>
              {g === 'A' ? 'Premium' : g === 'B' ? 'Standard' : 'Economy'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Quantity */}
      <Text style={[styles.sectionLabel, { fontSize: scaleFont(12) }]}>QUANTITY (KG)</Text>
      <Input
        value={quantityKg}
        onChangeText={setQuantityKg}
        placeholder="Enter quantity in kg"
        keyboardType="numeric"
      />
      <View style={[styles.presetRow, { marginBottom: scaleSize(16) }]}>
        {QUANTITY_PRESETS.map((q) => (
          <TouchableOpacity
            key={q}
            style={[
              styles.presetChip,
              { borderRadius: BorderRadius.full },
              quantityKg === String(q) && styles.presetChipActive,
            ]}
            onPress={() => setQuantityKg(String(q))}
          >
            <Text style={[styles.presetChipText, { fontSize: scaleFont(11) }, quantityKg === String(q) && { color: Palette.white }]}>
              {q} kg
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Rescue toggle */}
      <TouchableOpacity
        style={[styles.rescueToggle, { borderRadius: BorderRadius.md, marginBottom: scaleSize(24) }, isRescue && styles.rescueToggleActive]}
        onPress={() => setIsRescue(!isRescue)}
      >
        <Ionicons
          name={isRescue ? 'alert-circle' : 'alert-circle-outline'}
          size={scaleSize(20)}
          color={isRescue ? Palette.white : Palette.rescueRed}
        />
        <Text style={[styles.rescueToggleText, { fontSize: scaleFont(13) }, isRescue && { color: Palette.white }]}>
          Rescue Crop (urgent clearance)
        </Text>
      </TouchableOpacity>

      {errorMsg && (
        <Text style={[styles.errorText, { fontSize: scaleFont(12), marginBottom: scaleSize(12) }]}>
          {errorMsg}
        </Text>
      )}

      <Button title="Get Price Estimate" onPress={runPrediction} variant="primary" />

      {/* Past predictions */}
      {pastPredictions.length > 0 && (
        <TouchableOpacity
          style={[styles.pastBtn, { marginTop: scaleSize(16) }]}
          onPress={() => setShowPastPredictions(true)}
        >
          <Ionicons name="time-outline" size={scaleSize(14)} color={Palette.primary} />
          <Text style={[styles.pastBtnText, { fontSize: scaleFont(12) }]}>
            View {pastPredictions.length} past prediction{pastPredictions.length !== 1 ? 's' : ''}
          </Text>
        </TouchableOpacity>
      )}
    </ScrollView>
  );

  // ── Render: loading ───────────────────────────────────────────────────────
  const renderPredicting = () => (
    <View style={styles.centeredState}>
      <ActivityIndicator size="large" color={Palette.primary} />
      <Text style={[styles.loadingText, { fontSize: scaleFont(14), marginTop: scaleSize(16) }]}>
        Analysing market patterns…
      </Text>
      <Text style={[styles.loadingSubText, { fontSize: scaleFont(11), marginTop: scaleSize(6) }]}>
        Connecting to prediction API
      </Text>
    </View>
  );

  // ── Render: result ────────────────────────────────────────────────────────
  const renderResult = () => {
    if (!prediction) return null;
    const confidencePct = Math.round(prediction.confidenceScore * 100);
    const isOffline = prediction.source === 'offline_baseline';

    return (
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={{ padding: contentPadding, paddingBottom: 64 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Source badge */}
        <View style={[styles.sourceBadge, { borderRadius: BorderRadius.full, marginBottom: scaleSize(14) }]}>
          <Ionicons
            name={isOffline ? 'cloud-offline-outline' : 'cloud-done-outline'}
            size={scaleSize(13)}
            color={isOffline ? Palette.warning : Palette.success}
          />
          <Text style={[styles.sourceBadgeText, { fontSize: scaleFont(10) }]}>
            {isOffline ? 'Offline baseline (API unavailable)' : `Model: ${prediction.model_name ?? 'ML'} · R²=${prediction.model_r2?.toFixed(2)}`}
          </Text>
        </View>

        {/* Main price card */}
        <View style={[styles.priceCard, { borderRadius: BorderRadius.xl, ...Shadows.elevated, marginBottom: scaleSize(16) }]}>
          <Text style={[styles.priceCardLabel, { fontSize: scaleFont(11) }]}>
            ESTIMATED FAIR PRICE — {prediction.cropName.toUpperCase()}
          </Text>
          <View style={styles.priceCardMain}>
            <Text style={[styles.priceCardValue, { fontSize: scaleFont(42) }]}>
              Rs. {prediction.fairPricePerKg.toFixed(0)}
            </Text>
            <Text style={[styles.priceCardUnit, { fontSize: scaleFont(14) }]}>/kg</Text>
          </View>
          <View style={styles.priceRangeRow}>
            <View style={styles.priceRangeItem}>
              <Text style={[styles.priceRangeLabel, { fontSize: scaleFont(10) }]}>MIN</Text>
              <Text style={[styles.priceRangeValue, { fontSize: scaleFont(16) }]}>
                Rs. {prediction.minPricePerKg.toFixed(0)}
              </Text>
            </View>
            <View style={[styles.priceRangeDivider, { backgroundColor: Palette.warmBorder }]} />
            <View style={styles.priceRangeItem}>
              <Text style={[styles.priceRangeLabel, { fontSize: scaleFont(10) }]}>MAX</Text>
              <Text style={[styles.priceRangeValue, { fontSize: scaleFont(16) }]}>
                Rs. {prediction.maxPricePerKg.toFixed(0)}
              </Text>
            </View>
            <View style={[styles.priceRangeDivider, { backgroundColor: Palette.warmBorder }]} />
            <View style={styles.priceRangeItem}>
              <Text style={[styles.priceRangeLabel, { fontSize: scaleFont(10) }]}>RESCUE</Text>
              <Text style={[{ ...styles.priceRangeValue, color: Palette.rescueRed }, { fontSize: scaleFont(16) }]}>
                Rs. {prediction.recommendedRescuePrice.toFixed(0)}
              </Text>
            </View>
          </View>

          {/* Confidence + trend */}
          <View style={styles.metaRow}>
            <View style={styles.metaItem}>
              <Ionicons name="speedometer-outline" size={scaleSize(14)} color={Palette.primary} />
              <Text style={[styles.metaText, { fontSize: scaleFont(11) }]}>
                {confidencePct}% confidence
              </Text>
            </View>
            <View style={styles.metaItem}>
              <Ionicons name={trendIcon} size={scaleSize(14)} color={trendColor} />
              <Text style={[styles.metaText, { fontSize: scaleFont(11), color: trendColor }]}>
                {prediction.marketTrend} {prediction.marketTrendPercentage > 0 ? `+${prediction.marketTrendPercentage}%` : ''}
              </Text>
            </View>
            <Badge
              label={`Grade ${prediction.grade}`}
              variant={prediction.grade === 'A' ? 'aiFair' : 'grade'}
            />
          </View>
        </View>

        {/* Transparency notice */}
        <View style={[styles.disclaimerBanner, { borderRadius: BorderRadius.md, marginBottom: scaleSize(14) }]}>
          <Ionicons name="information-circle" size={scaleSize(14)} color={Palette.info} />
          <Text style={[styles.disclaimerText, { fontSize: scaleFont(10) }]}>
            {prediction.prediction_basis} · Source: {prediction.data_source}
          </Text>
        </View>

        {/* Insight card */}
        <View style={[styles.insightCard, { borderRadius: BorderRadius.lg, marginBottom: scaleSize(14) }]}>
          <Text style={[styles.insightTitle, { fontSize: scaleFont(12) }]}>MARKET INSIGHT</Text>
          <Text style={[styles.insightText, { fontSize: scaleFont(13) }]}>{prediction.insight}</Text>
          <View style={[styles.divider, { marginVertical: scaleSize(10) }]} />
          <Text style={[styles.insightTitle, { fontSize: scaleFont(12) }]}>RECOMMENDED ACTION</Text>
          <Text style={[styles.insightText, { fontSize: scaleFont(13) }]}>{prediction.recommendedAction}</Text>
        </View>

        {/* Historical price chart */}
        {history && history.history.length > 0 && (
          <View style={[styles.chartCard, { borderRadius: BorderRadius.lg, marginBottom: scaleSize(14) }]}>
            <Text style={[styles.chartTitle, { fontSize: scaleFont(13) }]}>
              PRICE TREND — LAST 90 DAYS
            </Text>
            <Text style={[styles.chartSubtitle, { fontSize: scaleFont(10), marginBottom: scaleSize(8) }]}>
              {history.data_source}
            </Text>
            <MiniBarChart
              history={history.history}
              color={Palette.primary}
              scaleSize={scaleSize}
              scaleFont={scaleFont}
            />
            {/* Line trend indicator */}
            <View style={[styles.trendRow, { marginTop: scaleSize(10) }]}>
              <Ionicons name={trendIcon} size={scaleSize(16)} color={trendColor} />
              <Text style={[styles.trendText, { fontSize: scaleFont(12), color: trendColor }]}>
                {prediction.marketTrend === 'rising'
                  ? 'Prices trending upward over the past 90 days'
                  : prediction.marketTrend === 'falling'
                  ? 'Prices trending downward over the past 90 days'
                  : 'Prices relatively stable over the past 90 days'}
              </Text>
            </View>
          </View>
        )}

        {/* Buyer offer comparison */}
        {relevantOffers.length > 0 && (
          <View style={[styles.offersCard, { borderRadius: BorderRadius.lg, marginBottom: scaleSize(14) }]}>
            <Text style={[styles.offersTitle, { fontSize: scaleFont(13) }]}>REGISTERED BUYERS INTERESTED</Text>
            <Text style={[styles.offersSubtitle, { fontSize: scaleFont(10), marginBottom: scaleSize(8) }]}>
              Registered buyers purchasing {selectedCrop.name.split(' ')[0]} in Sri Lanka
            </Text>
            {relevantOffers.map((buyer, i) => {
              const buyerBid = buyer.purchasingRequirements.weeklyTargetBudgetLkr
                ? Math.round(buyer.purchasingRequirements.weeklyTargetBudgetLkr / (buyer.purchasingRequirements.maxOrderQuantityKg || 1))
                : null;
              const diff = buyerBid ? buyerBid - prediction.fairPricePerKg : null;
              const diffColor = diff !== null && diff >= 0 ? Palette.success : Palette.rescueRed;
              return (
                <View key={buyer.id ?? i} style={[styles.offerRow, { borderRadius: BorderRadius.sm }]}>
                  <View style={styles.offerLeft}>
                    <Text style={[styles.offerBuyer, { fontSize: scaleFont(13) }]}>{buyer.businessName}</Text>
                    <Text style={[styles.offerDetail, { fontSize: scaleFont(10) }]}>
                      {buyer.purchasingRequirements.minOrderQuantityKg}–{buyer.purchasingRequirements.maxOrderQuantityKg} kg · {buyer.businessType}
                    </Text>
                  </View>
                  <View style={styles.offerRight}>
                    {buyerBid ? (
                      <>
                        <Text style={[styles.offerPrice, { fontSize: scaleFont(14) }]}>
                          ~Rs. {buyerBid}
                        </Text>
                        {diff !== null && (
                          <Text style={[styles.offerDiff, { fontSize: scaleFont(10), color: diffColor }]}>
                            {diff >= 0 ? '+' : ''}{diff.toFixed(0)} vs fair est.
                          </Text>
                        )}
                      </>
                    ) : (
                      <Text style={[styles.offerDetail, { fontSize: scaleFont(10) }]}>Negotiable</Text>
                    )}
                  </View>
                </View>
              );
            })}
            <TouchableOpacity
              style={[styles.viewOffersBtn, { marginTop: scaleSize(10) }]}
              onPress={() => router.push('/nearby-buyers')}
            >
              <Text style={[styles.viewOffersBtnText, { fontSize: scaleFont(12) }]}>
                Find more buyers →
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Model evaluation info */}
        {modelInfo && (
          <TouchableOpacity
            style={[styles.modelInfoBtn, { borderRadius: BorderRadius.md, marginBottom: scaleSize(14) }]}
            onPress={() => setShowModelInfo(!showModelInfo)}
          >
            <Ionicons name="analytics-outline" size={scaleSize(16)} color={Palette.primary} />
            <Text style={[styles.modelInfoBtnText, { fontSize: scaleFont(12) }]}>
              {showModelInfo ? 'Hide' : 'View'} model evaluation metrics
            </Text>
            <Ionicons
              name={showModelInfo ? 'chevron-up' : 'chevron-down'}
              size={scaleSize(14)}
              color={Palette.primary}
            />
          </TouchableOpacity>
        )}

        {showModelInfo && modelInfo && (
          <View style={[styles.modelInfoCard, { borderRadius: BorderRadius.lg, marginBottom: scaleSize(14) }]}>
            <Text style={[styles.modelInfoTitle, { fontSize: scaleFont(12) }]}>MODEL COMPARISON</Text>
            <Text style={[styles.modelInfoSub, { fontSize: scaleFont(10), marginBottom: scaleSize(10) }]}>
              Trained on {modelInfo.training_samples.toLocaleString()} samples · tested on {modelInfo.test_samples.toLocaleString()}
            </Text>
            {modelInfo.models_compared.map((m) => (
              <View key={m.model_name} style={[styles.modelRow, m.selected && styles.modelRowSelected, { borderRadius: BorderRadius.sm }]}>
                <View>
                  <Text style={[styles.modelName, { fontSize: scaleFont(12) }, m.selected && { color: Palette.white }]}>
                    {m.selected ? '★ ' : ''}{m.model_name}
                  </Text>
                  <Text style={[styles.modelMetrics, { fontSize: scaleFont(10) }, m.selected && { color: Palette.secondaryLight }]}>
                    R²={m.r2_score.toFixed(3)} · RMSE={m.rmse.toFixed(1)} LKR · MAE={m.mae.toFixed(1)} LKR
                  </Text>
                </View>
                {m.selected && (
                  <Badge label="Selected" variant="verified" />
                )}
              </View>
            ))}
            <Text style={[styles.modelDisclaimer, { fontSize: scaleFont(10), marginTop: scaleSize(8) }]}>
              {modelInfo.disclaimer}
            </Text>
          </View>
        )}

        {/* Next Step Connected Actions */}
        <View style={{ gap: scaleSize(8), marginBottom: scaleSize(16) }}>
          <Button
            title="Compare Buyer Offers with AI Rate"
            variant="outline"
            size="md"
            icon="stats-chart-outline"
            fullWidth
            onPress={() =>
              router.push({
                pathname: '/price-comparison',
                params: {
                  cropName: selectedCrop.name,
                  quantityKg,
                  aiReferencePrice: prediction.fairPricePerKg.toString(),
                },
              })
            }
          />

          <View style={{ flexDirection: 'row', gap: scaleSize(8) }}>
            <View style={{ flex: 1 }}>
              <Button
                title="Price History"
                variant="outline"
                size="sm"
                icon="time-outline"
                fullWidth
                onPress={() =>
                  router.push({
                    pathname: '/price-history',
                    params: { cropName: selectedCrop.name },
                  })
                }
              />
            </View>
            <View style={{ flex: 1 }}>
              <Button
                title="Publish at AI Price"
                variant="primary"
                size="sm"
                icon="add-circle-outline"
                fullWidth
                onPress={() =>
                  router.push({
                    pathname: '/(farmer)/add-crop',
                    params: {
                      cropName: selectedCrop.name,
                      askingPrice: prediction.fairPricePerKg.toString(),
                      quantity: quantityKg,
                      district: selectedDistrict,
                    },
                  })
                }
              />
            </View>
          </View>
        </View>

        {/* Actions */}
        <View style={styles.actionsRow}>
          <Button
            title={savingToFirestore ? 'Saving…' : savedId ? 'Saved ✓' : 'Save to History'}
            onPress={saveToFirestore}
            variant={savedId ? 'secondary' : 'primary'}
            disabled={savingToFirestore || !!savedId || !user?.id}
          />
          <TouchableOpacity
            style={[styles.newPredictionBtn, { borderRadius: BorderRadius.md }]}
            onPress={() => { setStep('form'); setPrediction(null); setHistory(null); setSavedId(null); }}
          >
            <Ionicons name="refresh" size={scaleSize(16)} color={Palette.primary} />
            <Text style={[styles.newPredictionText, { fontSize: scaleFont(13) }]}>New Estimate</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    );
  };

  // ── Past predictions modal ────────────────────────────────────────────────
  const renderPastPredictionsModal = () => (
    <Modal visible={showPastPredictions} animationType="slide" transparent>
      <View style={styles.modalOverlay}>
        <View style={[styles.modalSheet, { borderRadius: BorderRadius.xl }]}>
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { fontSize: scaleFont(16) }]}>Past Predictions</Text>
            <TouchableOpacity onPress={() => setShowPastPredictions(false)}>
              <Ionicons name="close" size={scaleSize(22)} color={Palette.charcoal} />
            </TouchableOpacity>
          </View>
          <FlatList
            data={pastPredictions}
            keyExtractor={(_, i) => String(i)}
            renderItem={({ item }) => (
              <View style={[styles.pastPredItem, { borderRadius: BorderRadius.sm }]}>
                <Text style={[styles.pastPredCrop, { fontSize: scaleFont(13) }]}>
                  {String(item.cropName ?? '—')}
                </Text>
                <Text style={[styles.pastPredDetail, { fontSize: scaleFont(11) }]}>
                  {String(item.district ?? '')} · Grade {String(item.grade ?? '')} · Rs. {String(item.predictedPricePerKg ?? '—')}/kg
                </Text>
                <Text style={[styles.pastPredBasis, { fontSize: scaleFont(10) }]}>
                  {String(item.predictionBasis ?? 'ESTIMATE')}
                </Text>
              </View>
            )}
            ListEmptyComponent={
              <Text style={[styles.emptyText, { fontSize: scaleFont(13) }]}>No saved predictions yet.</Text>
            }
          />
        </View>
      </View>
    </Modal>
  );

  // ── Root render ───────────────────────────────────────────────────────────
  return (
    <View style={styles.root}>
      {/* Custom back-button header (Header component does not support showBackButton) */}
      <View style={[styles.customHeader, { paddingHorizontal: contentPadding }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={scaleSize(22)} color={Palette.primary} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={[styles.headerTitle, { fontSize: scaleFont(16) }]}>Fair Price Estimate</Text>
          <Text style={[styles.headerSubtitle, { fontSize: scaleFont(11) }]}>
            AI-assisted crop price guidance
          </Text>
        </View>
        {step === 'result' ? (
          <TouchableOpacity onPress={() => { setStep('form'); setPrediction(null); }}>
            <Ionicons name="refresh-outline" size={scaleSize(22)} color={Palette.primary} />
          </TouchableOpacity>
        ) : <View style={{ width: scaleSize(22) }} />}
      </View>

      {step === 'form' && renderForm()}
      {step === 'predicting' && renderPredicting()}
      {step === 'result' && renderResult()}

      {renderCropPicker()}
      {renderDistrictPicker()}
      {renderPastPredictionsModal()}
    </View>
  );
};

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Palette.background },
  scroll: { flex: 1 },
  centeredState: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  disclaimerBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.xs,
    backgroundColor: Palette.infoLight,
    padding: Spacing.sm,
    borderWidth: 1,
    borderColor: Palette.info + '40',
  },
  disclaimerText: { flex: 1, color: Palette.info, lineHeight: 16 },

  sectionLabel: {
    color: Palette.slateMedium,
    fontWeight: '600',
    letterSpacing: 0.6,
    marginBottom: Spacing.xs,
  },

  selectorBtn: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: Palette.surface,
    padding: Spacing.base,
    borderWidth: 1,
    borderColor: Palette.warmBorder,
  },
  selectorBtnLabel: { color: Palette.charcoal, fontWeight: '600' },
  selectorBtnSub: { color: Palette.slateMedium, marginTop: 2 },

  gradeRow: { flexDirection: 'row', gap: Spacing.sm },
  gradeBtn: {
    flex: 1,
    padding: Spacing.sm,
    borderWidth: 1.5,
    borderColor: Palette.warmBorder,
    backgroundColor: Palette.surface,
    alignItems: 'center',
  },
  gradeBtnActive: { backgroundColor: Palette.primary, borderColor: Palette.primary },
  gradeBtnText: { color: Palette.charcoal, fontWeight: '600' },
  gradeBtnTextActive: { color: Palette.white },
  gradeBtnSub: { color: Palette.slateMedium, marginTop: 2 },

  presetRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.xs, marginTop: Spacing.xs },
  presetChip: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: Palette.warmBorder,
    backgroundColor: Palette.surface,
  },
  presetChipActive: { backgroundColor: Palette.primary, borderColor: Palette.primary },
  presetChipText: { color: Palette.charcoal },

  rescueToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    padding: Spacing.base,
    borderWidth: 1.5,
    borderColor: Palette.rescueBorder,
    backgroundColor: Palette.rescueLight,
  },
  rescueToggleActive: { backgroundColor: Palette.rescueRed, borderColor: Palette.rescueRed },
  rescueToggleText: { color: Palette.rescueRed, fontWeight: '600' },

  errorText: { color: Palette.rescueRed, textAlign: 'center' },
  loadingText: { color: Palette.charcoal, fontWeight: '600' },
  loadingSubText: { color: Palette.slateMedium },

  pastBtn: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs, justifyContent: 'center' },
  pastBtnText: { color: Palette.primary, fontWeight: '600' },

  // Result
  sourceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    alignSelf: 'flex-start',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    backgroundColor: Palette.surfaceAlt,
    borderWidth: 1,
    borderColor: Palette.warmBorder,
  },
  sourceBadgeText: { color: Palette.slateMedium },

  priceCard: {
    backgroundColor: Palette.primary,
    padding: Spacing.xl,
  },
  priceCardLabel: { color: Palette.secondaryLight, letterSpacing: 0.5, fontWeight: '600', marginBottom: Spacing.sm },
  priceCardMain: { flexDirection: 'row', alignItems: 'flex-end', marginBottom: Spacing.base },
  priceCardValue: { color: Palette.white, fontWeight: '800' },
  priceCardUnit: { color: Palette.secondaryLight, marginLeft: 4, marginBottom: 8 },
  priceRangeRow: { flexDirection: 'row', backgroundColor: Palette.primaryDark + '80', borderRadius: BorderRadius.sm, padding: Spacing.sm, marginBottom: Spacing.base },
  priceRangeItem: { flex: 1, alignItems: 'center' },
  priceRangeLabel: { color: Palette.secondaryLight, letterSpacing: 0.5, marginBottom: 2 },
  priceRangeValue: { color: Palette.white, fontWeight: '700' },
  priceRangeDivider: { width: 1, marginHorizontal: Spacing.xs },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, flexWrap: 'wrap' },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText: { color: Palette.secondaryLight },

  insightCard: { backgroundColor: Palette.surface, padding: Spacing.base, borderWidth: 1, borderColor: Palette.warmBorder },
  insightTitle: { color: Palette.slateMedium, fontWeight: '700', letterSpacing: 0.5, marginBottom: 4 },
  insightText: { color: Palette.charcoal, lineHeight: 20 },
  divider: { height: 1, backgroundColor: Palette.warmBorder },

  chartCard: { backgroundColor: Palette.surface, padding: Spacing.base, borderWidth: 1, borderColor: Palette.warmBorder },
  chartTitle: { color: Palette.charcoal, fontWeight: '700', letterSpacing: 0.5 },
  chartSubtitle: { color: Palette.slateMedium, marginBottom: Spacing.sm },
  trendRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs },
  trendText: { fontWeight: '600' },

  offersCard: { backgroundColor: Palette.surface, padding: Spacing.base, borderWidth: 1, borderColor: Palette.warmBorder },
  offersTitle: { color: Palette.charcoal, fontWeight: '700', letterSpacing: 0.5 },
  offersSubtitle: { color: Palette.slateMedium },
  offerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: Spacing.sm, backgroundColor: Palette.background, marginBottom: Spacing.xs },
  offerLeft: { flex: 1 },
  offerBuyer: { color: Palette.charcoal, fontWeight: '600' },
  offerDetail: { color: Palette.slateMedium, marginTop: 2 },
  offerRight: { alignItems: 'flex-end' },
  offerPrice: { color: Palette.primary, fontWeight: '700' },
  offerDiff: { marginTop: 2 },
  viewOffersBtn: { alignItems: 'center' },
  viewOffersBtnText: { color: Palette.primary, fontWeight: '600' },

  modelInfoBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    padding: Spacing.sm,
    borderWidth: 1,
    borderColor: Palette.primary + '40',
    backgroundColor: Palette.primaryTint,
  },
  modelInfoBtnText: { flex: 1, color: Palette.primary, fontWeight: '600' },
  modelInfoCard: { backgroundColor: Palette.surface, padding: Spacing.base, borderWidth: 1, borderColor: Palette.warmBorder },
  modelInfoTitle: { color: Palette.charcoal, fontWeight: '700', letterSpacing: 0.5 },
  modelInfoSub: { color: Palette.slateMedium },
  modelRow: { padding: Spacing.sm, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: Palette.background, marginBottom: Spacing.xs },
  modelRowSelected: { backgroundColor: Palette.primary },
  modelName: { color: Palette.charcoal, fontWeight: '600' },
  modelMetrics: { color: Palette.slateMedium, marginTop: 2 },
  modelDisclaimer: { color: Palette.slateMedium, fontStyle: 'italic', lineHeight: 15 },

  actionsRow: { flexDirection: 'row', gap: Spacing.sm, alignItems: 'center' },
  newPredictionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.sm,
    borderWidth: 1.5,
    borderColor: Palette.primary,
  },
  newPredictionText: { color: Palette.primary, fontWeight: '600' },

  // Modals
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalSheet: { backgroundColor: Palette.surface, maxHeight: '80%' },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.base,
    borderBottomWidth: 1,
    borderBottomColor: Palette.warmBorder,
  },
  modalTitle: { color: Palette.charcoal, fontWeight: '700' },
  pickerItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.base,
    borderBottomWidth: 1,
    borderBottomColor: Palette.warmBorder,
  },
  pickerItemActive: { backgroundColor: Palette.primaryTint },
  pickerItemText: { color: Palette.charcoal, fontWeight: '600' },
  pickerItemSub: { color: Palette.slateMedium, marginTop: 2 },

  pastPredItem: {
    padding: Spacing.sm,
    backgroundColor: Palette.background,
    marginHorizontal: Spacing.base,
    marginBottom: Spacing.xs,
  },
  pastPredCrop: { color: Palette.charcoal, fontWeight: '600' },
  pastPredDetail: { color: Palette.slateMedium, marginTop: 2 },
  pastPredBasis: { color: Palette.warning, marginTop: 2, fontStyle: 'italic' },
  emptyText: { color: Palette.slateMedium, textAlign: 'center', margin: Spacing.xl },

  // Custom header
  customHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.base,
    backgroundColor: Palette.surface,
    borderBottomWidth: 1,
    borderBottomColor: Palette.warmBorder,
    ...Shadows.soft,
  },
  backBtn: {
    padding: Spacing.xs,
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    color: Palette.charcoal,
    fontWeight: '700',
  },
  headerSubtitle: {
    color: Palette.slateMedium,
    marginTop: 2,
  },
});
