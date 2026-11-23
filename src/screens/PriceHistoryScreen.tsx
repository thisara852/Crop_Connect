import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  FlatList,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Palette, Spacing, BorderRadius, Shadows } from '../constants/theme';
import { Badge } from '../components/common/Badge';
import { useResponsive } from '../hooks/useResponsive';
import { POPULAR_CROPS } from '../constants/sriLanka';
import {
  fetchMarketPrices,
  toPriceSeriesPoints,
  computePriceSummary,
  formatLKR,
  MARKET_CENTERS,
  DATE_RANGE_DAYS,
  DATA_DISCLAIMER,
  PriceSeriesPoint,
  PriceSummary,
  PriceHistoryFilters,
} from '../services/priceHistoryService';

export const PriceHistoryScreen: React.FC = () => {
  const { scaleSize, scaleFont, contentPadding } = useResponsive();
  const searchParams = useLocalSearchParams<{ cropName?: string; market?: string }>();

  const initialCrop = searchParams.cropName
    ? POPULAR_CROPS.find(
        (c) =>
          c.name.toLowerCase().includes(searchParams.cropName?.toLowerCase() || '') ||
          (searchParams.cropName?.toLowerCase() || '').includes(c.name.toLowerCase())
      )?.name || searchParams.cropName
    : 'Carrot (Upcountry)';

  const [selectedCrop, setSelectedCrop] = useState<string>(initialCrop);
  const [selectedMarket, setSelectedMarket] = useState<string>(
    searchParams.market || 'All Markets'
  );
  const [dateRange, setDateRange] = useState<PriceHistoryFilters['dateRangeLabel']>('90d');

  const [pricePoints, setPricePoints] = useState<PriceSeriesPoint[]>([]);
  const [summary, setSummary] = useState<PriceSummary | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);

  // Picker Modals
  const [showCropPicker, setShowCropPicker] = useState<boolean>(false);
  const [showMarketPicker, setShowMarketPicker] = useState<boolean>(false);

  // Active bar tooltip
  const [selectedPoint, setSelectedPoint] = useState<PriceSeriesPoint | null>(null);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      setLoading(true);
      try {
        const records = await fetchMarketPrices(
          selectedCrop,
          selectedMarket,
          DATE_RANGE_DAYS[dateRange]
        );
        const points = toPriceSeriesPoints(records);
        if (!cancelled) {
          setPricePoints(points);
          setSummary(computePriceSummary(points));
          setSelectedPoint(points.length > 0 ? points[points.length - 1] : null);
        }
      } catch {
        if (!cancelled) {
          setPricePoints([]);
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
  }, [selectedCrop, selectedMarket, dateRange]);

  const onRefresh = () => {
    setRefreshing(true);
    const run = async () => {
      try {
        const records = await fetchMarketPrices(
          selectedCrop,
          selectedMarket,
          DATE_RANGE_DAYS[dateRange]
        );
        const points = toPriceSeriesPoints(records);
        setPricePoints(points);
        setSummary(computePriceSummary(points));
        setSelectedPoint(points.length > 0 ? points[points.length - 1] : null);
      } catch {
        // preserve current state on refresh error
      } finally {
        setRefreshing(false);
      }
    };
    void run();
  };

  const maxWholesale = pricePoints.length > 0
    ? Math.max(...pricePoints.map((p) => p.wholesaleMax || p.wholesaleAvg))
    : 1;

  const currentPoint = selectedPoint || (pricePoints.length > 0 ? pricePoints[pricePoints.length - 1] : null);

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
            Price History & Trends
          </Text>
          <Text style={[styles.headerSubtitle, { fontSize: scaleFont(11) }]}>
            Historical Market Intelligence
          </Text>
        </View>
        <TouchableOpacity
          onPress={() => router.push('/notifications')}
          style={styles.notificationBtn}
        >
          <Ionicons name="notifications-outline" size={scaleSize(20)} color={Palette.charcoal} />
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[Palette.primary]} />
        }
        contentContainerStyle={{
          paddingHorizontal: scaleSize(contentPadding),
          paddingBottom: scaleSize(90),
          paddingTop: scaleSize(10),
        }}
      >
        {/* Transparency / Source Disclaimer Banner */}
        <View style={styles.transparencyBanner}>
          <Ionicons name="information-circle" size={scaleSize(18)} color={Palette.warning} />
          <Text style={[styles.transparencyText, { fontSize: scaleFont(11) }]}>
            {DATA_DISCLAIMER}
          </Text>
        </View>

        {/* Filter Controls Bar */}
        <View style={styles.filterSection}>
          {/* Crop Selector Button */}
          <TouchableOpacity
            style={styles.filterButton}
            onPress={() => setShowCropPicker(true)}
          >
            <Ionicons name="nutrition-outline" size={scaleSize(16)} color={Palette.primary} />
            <Text style={[styles.filterButtonText, { fontSize: scaleFont(12) }]} numberOfLines={1}>
              {selectedCrop}
            </Text>
            <Ionicons name="chevron-down" size={scaleSize(14)} color={Palette.slateMedium} />
          </TouchableOpacity>

          {/* Market Center Selector Button */}
          <TouchableOpacity
            style={styles.filterButton}
            onPress={() => setShowMarketPicker(true)}
          >
            <Ionicons name="location-outline" size={scaleSize(16)} color={Palette.secondary} />
            <Text style={[styles.filterButtonText, { fontSize: scaleFont(12) }]} numberOfLines={1}>
              {selectedMarket}
            </Text>
            <Ionicons name="chevron-down" size={scaleSize(14)} color={Palette.slateMedium} />
          </TouchableOpacity>
        </View>

        {/* Date Range Chips */}
        <View style={styles.dateRangeRow}>
          {(['30d', '60d', '90d', '180d'] as const).map((r) => {
            const active = dateRange === r;
            return (
              <TouchableOpacity
                key={r}
                onPress={() => setDateRange(r)}
                style={[
                  styles.dateChip,
                  active && styles.dateChipActive,
                  { paddingVertical: scaleSize(6), paddingHorizontal: scaleSize(12) },
                ]}
              >
                <Text
                  style={[
                    styles.dateChipText,
                    active && styles.dateChipTextActive,
                    { fontSize: scaleFont(12) },
                  ]}
                >
                  {r === '30d' ? '30 Days' : r === '60d' ? '60 Days' : r === '90d' ? '90 Days' : '6 Months'}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={Palette.primary} />
            <Text style={[styles.loadingText, { fontSize: scaleFont(13) }]}>
              Retrieving historical market data...
            </Text>
          </View>
        ) : (
          <>
            {/* Summary Metrics Row */}
            {summary && (
              <View
                style={[
                  styles.summaryGrid,
                  {
                    padding: scaleSize(14),
                    borderRadius: BorderRadius.lg,
                    marginBottom: scaleSize(14),
                    ...Shadows.soft,
                  },
                ]}
              >
                <View style={styles.summaryItem}>
                  <Text style={[styles.summaryLbl, { fontSize: scaleFont(11) }]}>Period Avg</Text>
                  <Text style={[styles.summaryVal, { fontSize: scaleFont(15) }]}>
                    {formatLKR(summary.periodAvgWholesale)}
                  </Text>
                  <Text style={[styles.summarySub, { fontSize: scaleFont(10) }]}>Wholesale/kg</Text>
                </View>

                <View style={styles.summarySep} />

                <View style={styles.summaryItem}>
                  <Text style={[styles.summaryLbl, { fontSize: scaleFont(11) }]}>Range</Text>
                  <Text style={[styles.summaryVal, { fontSize: scaleFont(13), color: Palette.charcoal }]}>
                    {formatLKR(summary.periodMinWholesale)} - {formatLKR(summary.periodMaxWholesale)}
                  </Text>
                  <Text style={[styles.summarySub, { fontSize: scaleFont(10) }]}>Min - Max</Text>
                </View>

                <View style={styles.summarySep} />

                <View style={styles.summaryItem}>
                  <Text style={[styles.summaryLbl, { fontSize: scaleFont(11) }]}>Trajectory</Text>
                  <View style={styles.trendRow}>
                    <Ionicons
                      name={
                        summary.overallTrend === 'up'
                          ? 'arrow-up'
                          : summary.overallTrend === 'down'
                          ? 'arrow-down'
                          : 'remove'
                      }
                      size={scaleSize(14)}
                      color={
                        summary.overallTrend === 'up'
                          ? Palette.success
                          : summary.overallTrend === 'down'
                          ? Palette.rescueRed
                          : Palette.warning
                      }
                    />
                    <Text
                      style={[
                        styles.trendVal,
                        {
                          fontSize: scaleFont(14),
                          color:
                            summary.overallTrend === 'up'
                              ? Palette.success
                              : summary.overallTrend === 'down'
                              ? Palette.rescueRed
                              : Palette.warning,
                        },
                      ]}
                    >
                      {summary.overallChangePercent > 0 ? '+' : ''}
                      {summary.overallChangePercent}%
                    </Text>
                  </View>
                  <Text style={[styles.summarySub, { fontSize: scaleFont(10) }]}>Net Change</Text>
                </View>
              </View>
            )}

            {/* Interactive Pure RN Chart Card */}
            <View
              style={[
                styles.chartCard,
                {
                  padding: scaleSize(Spacing.md),
                  borderRadius: BorderRadius.xl,
                  marginBottom: scaleSize(14),
                  ...Shadows.soft,
                },
              ]}
            >
              <View style={styles.chartHeader}>
                <View>
                  <Text style={[styles.chartTitle, { fontSize: scaleFont(15) }]}>
                    Wholesale Price Trajectory (LKR/kg)
                  </Text>
                  <Text style={[styles.chartSubtitle, { fontSize: scaleFont(11) }]}>
                    Tap a bar to inspect that recorded date
                  </Text>
                </View>
                <Badge label={`${pricePoints.length} Points`} variant="aiFair" size="sm" />
              </View>

              {/* Chart Legend */}
              <View style={styles.legendRow}>
                <View style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: Palette.primary }]} />
                  <Text style={styles.legendText}>Up / Steady</Text>
                </View>
                <View style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: Palette.rescueRed }]} />
                  <Text style={styles.legendText}>Down Trend</Text>
                </View>
                <View style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: Palette.secondary }]} />
                  <Text style={styles.legendText}>Selected Date</Text>
                </View>
              </View>

              {/* Responsive Chart Bars */}
              {pricePoints.length === 0 ? (
                <View style={styles.emptyChart}>
                  <Ionicons name="stats-chart-outline" size={scaleSize(36)} color={Palette.slateLight} />
                  <Text style={[styles.emptyChartText, { fontSize: scaleFont(12) }]}>
                    No records found for the selected filters.
                  </Text>
                </View>
              ) : (
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <View style={styles.barsScrollArea}>
                    <View style={styles.chartYAxis}>
                      <Text style={styles.yLabel}>{formatLKR(maxWholesale)}</Text>
                      <Text style={styles.yLabel}>{formatLKR(Math.round(maxWholesale / 2))}</Text>
                      <Text style={styles.yLabel}>Rs. 0</Text>
                    </View>

                    <View style={styles.barsContainer}>
                      {pricePoints.map((p, index) => {
                        const isSelected = selectedPoint?.date === p.date;
                        const heightPct = Math.max(12, Math.round((p.wholesaleAvg / maxWholesale) * 100));
                        const barColor = isSelected
                          ? Palette.secondary
                          : p.trend === 'down'
                          ? Palette.rescueRed
                          : Palette.primary;

                        return (
                          <TouchableOpacity
                            key={`${p.date}-${index}`}
                            onPress={() => setSelectedPoint(p)}
                            style={styles.barTouchCol}
                            activeOpacity={0.8}
                          >
                            <View style={styles.barTrack}>
                              <View
                                style={[
                                  styles.barFill,
                                  {
                                    height: `${heightPct}%`,
                                    backgroundColor: barColor,
                                  },
                                ]}
                              />
                            </View>
                            <Text
                              style={[
                                styles.barLabel,
                                isSelected && styles.barLabelActive,
                                { fontSize: scaleFont(9) },
                              ]}
                              numberOfLines={1}
                            >
                              {p.label}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </View>
                </ScrollView>
              )}

              {/* Selected Point Inspection Tooltip Box */}
              {currentPoint && (
                <View style={styles.tooltipBox}>
                  <View style={styles.tooltipHeader}>
                    <View style={styles.tooltipDateRow}>
                      <Ionicons name="calendar-outline" size={scaleSize(13)} color={Palette.primary} />
                      <Text style={[styles.tooltipDate, { fontSize: scaleFont(12) }]}>
                        {currentPoint.date} ({currentPoint.marketCenter})
                      </Text>
                    </View>
                    <Badge
                      label={`Source: ${currentPoint.source}`}
                      variant="neutral"
                      size="sm"
                    />
                  </View>
                  <View style={styles.tooltipGrid}>
                    <View style={styles.tooltipMetric}>
                      <Text style={styles.tooltipMetricLbl}>Wholesale Avg</Text>
                      <Text style={styles.tooltipMetricVal}>
                        {formatLKR(currentPoint.wholesaleAvg)}/kg
                      </Text>
                    </View>
                    <View style={styles.tooltipMetric}>
                      <Text style={styles.tooltipMetricLbl}>Wholesale Range</Text>
                      <Text style={styles.tooltipMetricVal}>
                        {formatLKR(currentPoint.wholesaleMin)} - {formatLKR(currentPoint.wholesaleMax)}
                      </Text>
                    </View>
                    <View style={styles.tooltipMetric}>
                      <Text style={styles.tooltipMetricLbl}>Retail Benchmark</Text>
                      <Text style={styles.tooltipMetricVal}>
                        {formatLKR(currentPoint.retailAvg)}/kg
                      </Text>
                    </View>
                    <View style={styles.tooltipMetric}>
                      <Text style={styles.tooltipMetricLbl}>Supply Vol</Text>
                      <Text style={styles.tooltipMetricVal}>
                        {currentPoint.supplyVolumeTons} Tons
                      </Text>
                    </View>
                  </View>
                </View>
              )}
            </View>

            {/* Price Channel Spread (Farmer vs Wholesale vs Retail) */}
            {currentPoint && (
              <View
                style={[
                  styles.spreadCard,
                  {
                    padding: scaleSize(Spacing.md),
                    borderRadius: BorderRadius.xl,
                    marginBottom: scaleSize(14),
                    ...Shadows.soft,
                  },
                ]}
              >
                <Text style={[styles.spreadTitle, { fontSize: scaleFont(14) }]}>
                  Value Chain Price Spread
                </Text>
                <Text style={[styles.spreadSubtitle, { fontSize: scaleFont(11) }]}>
                  Comparing gate, economic centre wholesale and consumer retail
                </Text>

                <View style={styles.tierList}>
                  {/* Farm-Gate Estimate */}
                  <View style={styles.tierRow}>
                    <View style={styles.tierInfo}>
                      <Text style={[styles.tierName, { fontSize: scaleFont(12) }]}>
                        Estimated Farm-Gate
                      </Text>
                      <Text style={[styles.tierDetail, { fontSize: scaleFont(10) }]}>
                        Direct farmer collection
                      </Text>
                    </View>
                    <Text style={[styles.tierPrice, { fontSize: scaleFont(14), color: Palette.primary }]}>
                      {formatLKR(Math.round(currentPoint.wholesaleAvg * 0.82))}/kg
                    </Text>
                  </View>
                  <View style={styles.tierBarBg}>
                    <View
                      style={[
                        styles.tierBarFill,
                        {
                          width: `${Math.round(
                            ((currentPoint.wholesaleAvg * 0.82) / Math.max(currentPoint.retailAvg, 1)) * 100
                          )}%`,
                          backgroundColor: Palette.primary,
                        },
                      ]}
                    />
                  </View>

                  {/* Wholesale Benchmark */}
                  <View style={styles.tierRow}>
                    <View style={styles.tierInfo}>
                      <Text style={[styles.tierName, { fontSize: scaleFont(12) }]}>
                        Wholesale Economic Centre
                      </Text>
                      <Text style={[styles.tierDetail, { fontSize: scaleFont(10) }]}>
                        {currentPoint.marketCenter}
                      </Text>
                    </View>
                    <Text style={[styles.tierPrice, { fontSize: scaleFont(14), color: Palette.secondary }]}>
                      {formatLKR(currentPoint.wholesaleAvg)}/kg
                    </Text>
                  </View>
                  <View style={styles.tierBarBg}>
                    <View
                      style={[
                        styles.tierBarFill,
                        {
                          width: `${Math.round(
                            (currentPoint.wholesaleAvg / Math.max(currentPoint.retailAvg, 1)) * 100
                          )}%`,
                          backgroundColor: Palette.secondary,
                        },
                      ]}
                    />
                  </View>

                  {/* Retail Shelf Price */}
                  <View style={styles.tierRow}>
                    <View style={styles.tierInfo}>
                      <Text style={[styles.tierName, { fontSize: scaleFont(12) }]}>
                        Retail Supermarket Shelf
                      </Text>
                      <Text style={[styles.tierDetail, { fontSize: scaleFont(10) }]}>
                        Consumer retail rate
                      </Text>
                    </View>
                    <Text style={[styles.tierPrice, { fontSize: scaleFont(14), color: Palette.charcoal }]}>
                      {formatLKR(currentPoint.retailAvg)}/kg
                    </Text>
                  </View>
                  <View style={styles.tierBarBg}>
                    <View
                      style={[
                        styles.tierBarFill,
                        {
                          width: '100%',
                          backgroundColor: Palette.slateMedium,
                        },
                      ]}
                    />
                  </View>
                </View>
              </View>
            )}

            {/* Link to Fair-Price AI & Buyer Comparison */}
            <View style={styles.navigationRow}>
              <TouchableOpacity
                style={styles.navButtonPrimary}
                onPress={() =>
                  router.push({
                    pathname: '/price-prediction',
                    params: { cropName: selectedCrop },
                  })
                }
              >
                <Ionicons name="sparkles" size={scaleSize(16)} color={Palette.white} />
                <Text style={[styles.navButtonPrimaryText, { fontSize: scaleFont(13) }]}>
                  AI Fair-Price Prediction
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.navButtonSecondary}
                onPress={() =>
                  router.push({
                    pathname: '/price-comparison',
                    params: { cropName: selectedCrop },
                  })
                }
              >
                <Ionicons name="people-outline" size={scaleSize(16)} color={Palette.primary} />
                <Text style={[styles.navButtonSecondaryText, { fontSize: scaleFont(13) }]}>
                  Compare Buyer Offers
                </Text>
              </TouchableOpacity>
            </View>
          </>
        )}
      </ScrollView>

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
                const active = selectedCrop === item.name;
                return (
                  <TouchableOpacity
                    style={[styles.modalItem, active && styles.modalItemActive]}
                    onPress={() => {
                      setSelectedCrop(item.name);
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

      {/* Market Center Picker Modal */}
      <Modal visible={showMarketPicker} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Market Center</Text>
              <TouchableOpacity onPress={() => setShowMarketPicker(false)}>
                <Ionicons name="close" size={scaleSize(22)} color={Palette.charcoal} />
              </TouchableOpacity>
            </View>
            <FlatList
              data={MARKET_CENTERS}
              keyExtractor={(item) => item}
              renderItem={({ item }) => {
                const active = selectedMarket === item;
                return (
                  <TouchableOpacity
                    style={[styles.modalItem, active && styles.modalItemActive]}
                    onPress={() => {
                      setSelectedMarket(item);
                      setShowMarketPicker(false);
                    }}
                  >
                    <Text style={[styles.modalItemTitle, active && styles.modalItemTitleActive]}>
                      {item}
                    </Text>
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
  notificationBtn: {
    padding: 6,
  },
  transparencyBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: Palette.warningLight,
    padding: 10,
    borderRadius: BorderRadius.md,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  transparencyText: {
    flex: 1,
    color: '#92400E',
    lineHeight: 16,
    fontWeight: '500',
  },
  filterSection: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 10,
  },
  filterButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Palette.surface,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Palette.warmBorder,
    gap: 6,
  },
  filterButtonText: {
    flex: 1,
    fontWeight: '600',
    color: Palette.charcoal,
  },
  dateRangeRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14,
  },
  dateChip: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Palette.surface,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    borderColor: Palette.warmBorder,
  },
  dateChipActive: {
    backgroundColor: Palette.primary,
    borderColor: Palette.primary,
  },
  dateChipText: {
    fontWeight: '600',
    color: Palette.slateDark,
  },
  dateChipTextActive: {
    color: Palette.white,
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
  summaryGrid: {
    flexDirection: 'row',
    backgroundColor: Palette.surface,
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  summaryItem: {
    flex: 1,
    alignItems: 'center',
  },
  summaryLbl: {
    color: Palette.slateMedium,
    fontWeight: '600',
    marginBottom: 2,
  },
  summaryVal: {
    fontWeight: '800',
    color: Palette.primary,
  },
  summarySub: {
    color: Palette.slateLight,
    marginTop: 2,
  },
  summarySep: {
    width: 1,
    height: 36,
    backgroundColor: Palette.subtleBorder,
  },
  trendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  trendVal: {
    fontWeight: '800',
  },
  chartCard: {
    backgroundColor: Palette.surface,
  },
  chartHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  chartTitle: {
    fontWeight: '800',
    color: Palette.charcoal,
  },
  chartSubtitle: {
    color: Palette.slateMedium,
    marginTop: 1,
  },
  legendRow: {
    flexDirection: 'row',
    gap: 14,
    marginBottom: 12,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    fontSize: 11,
    color: Palette.slateMedium,
    fontWeight: '500',
  },
  emptyChart: {
    paddingVertical: 30,
    alignItems: 'center',
    gap: 8,
  },
  emptyChartText: {
    color: Palette.slateMedium,
  },
  barsScrollArea: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    minHeight: 180,
    paddingTop: 10,
  },
  chartYAxis: {
    justifyContent: 'space-between',
    height: 140,
    paddingRight: 6,
    borderRightWidth: 1,
    borderRightColor: Palette.subtleBorder,
  },
  yLabel: {
    fontSize: 9,
    color: Palette.slateLight,
    fontWeight: '600',
  },
  barsContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 10,
    paddingHorizontal: 8,
    height: 160,
  },
  barTouchCol: {
    alignItems: 'center',
    width: 32,
    height: '100%',
    justifyContent: 'flex-end',
  },
  barTrack: {
    width: 14,
    height: 130,
    backgroundColor: Palette.surfaceAlt,
    borderRadius: 4,
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  barFill: {
    width: '100%',
    borderRadius: 4,
  },
  barLabel: {
    color: Palette.slateMedium,
    marginTop: 4,
    fontWeight: '600',
  },
  barLabelActive: {
    color: Palette.secondary,
    fontWeight: '800',
  },
  tooltipBox: {
    marginTop: 14,
    backgroundColor: Palette.primaryTint,
    borderRadius: BorderRadius.lg,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(36, 92, 70, 0.2)',
  },
  tooltipHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  tooltipDateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  tooltipDate: {
    fontWeight: '700',
    color: Palette.primary,
  },
  tooltipGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tooltipMetric: {
    width: '47%',
  },
  tooltipMetricLbl: {
    fontSize: 10,
    color: Palette.slateDark,
    fontWeight: '500',
  },
  tooltipMetricVal: {
    fontSize: 12,
    fontWeight: '700',
    color: Palette.charcoal,
    marginTop: 1,
  },
  spreadCard: {
    backgroundColor: Palette.surface,
  },
  spreadTitle: {
    fontWeight: '800',
    color: Palette.charcoal,
  },
  spreadSubtitle: {
    color: Palette.slateMedium,
    marginBottom: 12,
    marginTop: 2,
  },
  tierList: {
    gap: 10,
  },
  tierRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  tierInfo: {
    flex: 1,
  },
  tierName: {
    fontWeight: '700',
    color: Palette.charcoal,
  },
  tierDetail: {
    color: Palette.slateMedium,
  },
  tierPrice: {
    fontWeight: '800',
  },
  tierBarBg: {
    height: 6,
    backgroundColor: Palette.surfaceAlt,
    borderRadius: 3,
    overflow: 'hidden',
  },
  tierBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  navigationRow: {
    flexDirection: 'column',
    gap: 10,
    marginTop: 4,
  },
  navButtonPrimary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Palette.primary,
    paddingVertical: 12,
    borderRadius: BorderRadius.lg,
  },
  navButtonPrimaryText: {
    color: Palette.white,
    fontWeight: '700',
  },
  navButtonSecondary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Palette.surface,
    paddingVertical: 12,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Palette.primary,
  },
  navButtonSecondaryText: {
    color: Palette.primary,
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
    maxHeight: '65%',
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

export default PriceHistoryScreen;
