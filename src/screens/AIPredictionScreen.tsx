import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Palette, Spacing, BorderRadius, Shadows } from '../constants/theme';
import { POPULAR_CROPS, SRI_LANKA_DISTRICTS } from '../constants/sriLanka';
import { Header } from '../components/common/Header';
import { Button } from '../components/common/Button';
import { Input } from '../components/common/Input';
import { Badge } from '../components/common/Badge';
import { useResponsive } from '../hooks/useResponsive';
import { predictFairPrice } from '../services/aiService';
import { CropQualityGrade, AIPricePredictionResponse } from '../types/ai';

export const AIPredictionScreen: React.FC = () => {
  const { scaleSize, scaleFont, contentPadding } = useResponsive();
  const searchParams = useLocalSearchParams<{
    cropName?: string;
    district?: string;
    quantityKg?: string;
  }>();

  const [selectedCrop, setSelectedCrop] = useState(
    searchParams.cropName || POPULAR_CROPS[0].name
  );
  const [selectedDistrict, setSelectedDistrict] = useState(
    searchParams.district || SRI_LANKA_DISTRICTS[0].name
  );
  const [selectedGrade, setSelectedGrade] = useState<CropQualityGrade>('A');
  const [quantity, setQuantity] = useState(searchParams.quantityKg || '1000');
  const [isRescue, setIsRescue] = useState(false);
  const [loading, setLoading] = useState(false);
  const [prediction, setPrediction] = useState<AIPricePredictionResponse | null>(null);

  useEffect(() => {
    let isMounted = true;
    const timer = setTimeout(() => {
      if (!isMounted) return;
      setLoading(true);
      predictFairPrice({
        cropName: selectedCrop,
        district: selectedDistrict,
        grade: selectedGrade,
        quantityKg: parseFloat(quantity) || 1000,
        isRescue,
      })
        .then((result) => {
          if (isMounted) {
            setPrediction(result);
          }
        })
        .finally(() => {
          if (isMounted) {
            setLoading(false);
          }
        });
    }, 150);

    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [selectedCrop, selectedDistrict, selectedGrade, quantity, isRescue]);

  const grades: CropQualityGrade[] = ['A', 'B', 'C'];

  return (
    <View style={styles.screen}>
      <Header
        title="AI Fair-Price Engine"
        subtitle="Scikit-Learn Sri Lankan Price Model"
        onNotificationPress={() => router.push('/notifications')}
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingHorizontal: scaleSize(contentPadding),
          paddingBottom: scaleSize(100),
          paddingTop: scaleSize(10),
        }}
      >
        {/* Banner Explainer */}
        <View
          style={[
            styles.bannerCard,
            {
              padding: scaleSize(Spacing.md),
              borderRadius: BorderRadius.lg,
              marginBottom: scaleSize(12),
            },
          ]}
        >
          <View style={styles.bannerHeader}>
            <View style={styles.bannerSparkle}>
              <Ionicons name="sparkles" size={scaleSize(18)} color={Palette.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.bannerTitle, { fontSize: scaleFont(14) }]}>
                Equitable Agricultural Valuation
              </Text>
              <Text style={[styles.bannerSub, { fontSize: scaleFont(12) }]}>
                Trained on historical price movements from Dambulla, Keppetipola & Pettah markets. Eliminates broker price suppression.
              </Text>
            </View>
          </View>
        </View>

        {/* Input Parameters */}
        <View
          style={[
            styles.formCard,
            {
              padding: scaleSize(Spacing.base),
              borderRadius: BorderRadius.lg,
              marginBottom: scaleSize(14),
              ...Shadows.soft,
            },
          ]}
        >
          <Text style={[styles.formTitle, { fontSize: scaleFont(15) }]}>Input Crop Features</Text>

          {/* Select Crop */}
          <Text style={[styles.fieldLabel, { fontSize: scaleFont(12) }]}>CROP VARIETY</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: scaleSize(6), marginBottom: scaleSize(12) }}
          >
            {POPULAR_CROPS.map((crop) => {
              const active = selectedCrop === crop.name;
              return (
                <TouchableOpacity
                  key={crop.id}
                  onPress={() => setSelectedCrop(crop.name)}
                  style={[
                    styles.cropChip,
                    active && styles.cropChipActive,
                    { paddingHorizontal: scaleSize(12), paddingVertical: scaleSize(6) },
                  ]}
                >
                  <Text
                    style={[
                      styles.cropChipText,
                      active && styles.cropChipTextActive,
                      { fontSize: scaleFont(12) },
                    ]}
                  >
                    {crop.name}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* Select District */}
          <Text style={[styles.fieldLabel, { fontSize: scaleFont(12) }]}>PRODUCING DISTRICT</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: scaleSize(6), marginBottom: scaleSize(12) }}
          >
            {SRI_LANKA_DISTRICTS.map((d) => {
              const active = selectedDistrict === d.name;
              return (
                <TouchableOpacity
                  key={d.name}
                  onPress={() => setSelectedDistrict(d.name)}
                  style={[
                    styles.cropChip,
                    active && styles.cropChipActive,
                    { paddingHorizontal: scaleSize(12), paddingVertical: scaleSize(6) },
                  ]}
                >
                  <Text
                    style={[
                      styles.cropChipText,
                      active && styles.cropChipTextActive,
                      { fontSize: scaleFont(12) },
                    ]}
                  >
                    {d.name}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* Grade & Volume */}
          <View style={styles.twoCol}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.fieldLabel, { fontSize: scaleFont(12) }]}>QUALITY GRADE</Text>
              <View style={styles.gradeRow}>
                {grades.map((g) => (
                  <TouchableOpacity
                    key={g}
                    onPress={() => setSelectedGrade(g)}
                    style={[
                      styles.gradeBtn,
                      selectedGrade === g && styles.gradeBtnActive,
                      { paddingVertical: scaleSize(8) },
                    ]}
                  >
                    <Text
                      style={[
                        styles.gradeBtnText,
                        selectedGrade === g && styles.gradeBtnTextActive,
                        { fontSize: scaleFont(13) },
                      ]}
                    >
                      Grade {g}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={{ flex: 1, marginLeft: scaleSize(10) }}>
              <Input
                label="VOLUME (KG)"
                value={quantity}
                onChangeText={setQuantity}
                keyboardType="numeric"
                leftIcon="scale-outline"
              />
            </View>
          </View>

          {/* Urgent Rescue Toggle */}
          <TouchableOpacity
            activeOpacity={0.88}
            onPress={() => setIsRescue(!isRescue)}
            style={[
              styles.rescueToggleRow,
              isRescue && styles.rescueToggleRowActive,
              { padding: scaleSize(10), borderRadius: BorderRadius.md, marginTop: scaleSize(4) },
            ]}
          >
            <View style={styles.rescueToggleLeft}>
              <Ionicons
                name={isRescue ? 'alert-circle' : 'alert-circle-outline'}
                size={scaleSize(18)}
                color={isRescue ? Palette.rescueRed : Palette.slateMedium}
              />
              <View style={{ marginLeft: 8 }}>
                <Text
                  style={[
                    styles.rescueToggleTitle,
                    { fontSize: scaleFont(12), color: isRescue ? Palette.rescueRed : Palette.charcoal },
                  ]}
                >
                  Urgent Surplus / Crop Rescue Mode
                </Text>
                <Text style={[styles.rescueToggleSub, { fontSize: scaleFont(11) }]}>
                  Recommends optimal clearance price before perishability window closes
                </Text>
              </View>
            </View>
            <Ionicons
              name={isRescue ? 'checkbox' : 'square-outline'}
              size={scaleSize(20)}
              color={isRescue ? Palette.rescueRed : Palette.slateMedium}
            />
          </TouchableOpacity>
        </View>

        {/* AI Output Card */}
        {loading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color={Palette.primary} />
            <Text style={[styles.loadingText, { fontSize: scaleFont(13) }]}>
              Running Agrarian Regression Model...
            </Text>
          </View>
        ) : prediction ? (
          <View
            style={[
              styles.resultCard,
              {
                padding: scaleSize(Spacing.lg),
                borderRadius: BorderRadius.xl,
                ...Shadows.elevated,
              },
            ]}
          >
            <View style={styles.resultHeader}>
              <Badge label="AI FAIR PRICE PREDICTION" variant="aiFair" />
              <Badge
                label={`${Math.round(prediction.confidenceScore * 100)}% Confidence`}
                variant="verified"
              />
            </View>

            <View style={styles.heroPriceBox}>
              <Text style={[styles.heroPriceLbl, { fontSize: scaleFont(11) }]}>
                RECOMMENDED FAIR WHOLESALE PRICE
              </Text>
              <View style={styles.heroPriceRow}>
                <Text style={[styles.heroPriceNum, { fontSize: scaleFont(38) }]}>
                  Rs. {prediction.fairPricePerKg}
                </Text>
                <Text style={[styles.heroPriceUnit, { fontSize: scaleFont(16) }]}>/ kg</Text>
              </View>
            </View>

            {/* Bracket Range */}
            <View style={styles.bracketRow}>
              <View style={styles.bracketCol}>
                <Text style={[styles.bracketLbl, { fontSize: scaleFont(11) }]}>Fair Min</Text>
                <Text style={[styles.bracketVal, { fontSize: scaleFont(16) }]}>
                  Rs. {prediction.minPricePerKg}
                </Text>
              </View>

              <View style={styles.bracketBar}>
                <View style={styles.bracketFill} />
                <Text style={[styles.bracketText, { fontSize: scaleFont(10) }]}>
                  Optimal Range
                </Text>
              </View>

              <View style={styles.bracketCol}>
                <Text style={[styles.bracketLbl, { fontSize: scaleFont(11) }]}>Fair Max</Text>
                <Text style={[styles.bracketVal, { fontSize: scaleFont(16) }]}>
                  Rs. {prediction.maxPricePerKg}
                </Text>
              </View>
            </View>

            {/* Rescue Clearance Advice */}
            <View
              style={[
                styles.rescueAdviseBox,
                { padding: scaleSize(10), borderRadius: BorderRadius.md },
              ]}
            >
              <Ionicons name="flash" size={scaleSize(16)} color={Palette.rescueRed} />
              <View style={{ flex: 1, marginLeft: 8 }}>
                <Text style={[styles.rescueAdviseTitle, { fontSize: scaleFont(12) }]}>
                  Rescue Clearance Target: Rs. {prediction.recommendedRescuePrice} / kg
                </Text>
                <Text style={[styles.rescueAdviseSub, { fontSize: scaleFont(11) }]}>
                  {prediction.recommendedAction}
                </Text>
              </View>
            </View>

            {/* AI Insights */}
            <View style={styles.insightBox}>
              <Ionicons name="bulb-outline" size={scaleSize(16)} color={Palette.warning} />
              <Text style={[styles.insightText, { fontSize: scaleFont(12) }]}>
                {prediction.insight}
              </Text>
            </View>

            <View style={{ gap: scaleSize(8), marginTop: scaleSize(14) }}>
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
                      cropName: selectedCrop,
                      quantityKg: quantity,
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
                        params: { cropName: selectedCrop },
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
                          cropName: selectedCrop,
                          askingPrice: prediction.fairPricePerKg.toString(),
                          quantity,
                          district: selectedDistrict,
                        },
                      })
                    }
                  />
                </View>
              </View>
            </View>
          </View>
        ) : null}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Palette.background,
  },
  bannerCard: {
    backgroundColor: Palette.primaryTint,
    borderWidth: 1,
    borderColor: 'rgba(36, 92, 70, 0.25)',
  },
  bannerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  bannerSparkle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bannerTitle: {
    fontWeight: '800',
    color: Palette.primary,
  },
  bannerSub: {
    color: Palette.slateDark,
    marginTop: 2,
    lineHeight: 16,
  },
  formCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: Palette.warmBorder,
  },
  formTitle: {
    fontWeight: '800',
    color: Palette.charcoal,
    marginBottom: 10,
  },
  fieldLabel: {
    fontWeight: '700',
    color: Palette.slateMedium,
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  cropChip: {
    backgroundColor: '#FFFFFF',
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    borderColor: Palette.warmBorder,
  },
  cropChipActive: {
    backgroundColor: Palette.primary,
    borderColor: Palette.primary,
  },
  cropChipText: {
    color: Palette.charcoal,
    fontWeight: '500',
  },
  cropChipTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  twoCol: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  gradeRow: {
    flexDirection: 'row',
    gap: 6,
    height: 48,
  },
  gradeBtn: {
    flex: 1,
    backgroundColor: Palette.surfaceAlt,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Palette.warmBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gradeBtnActive: {
    backgroundColor: Palette.primary,
    borderColor: Palette.primary,
  },
  gradeBtnText: {
    fontWeight: '700',
    color: Palette.charcoal,
  },
  gradeBtnTextActive: {
    color: '#FFFFFF',
  },
  rescueToggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Palette.surfaceAlt,
    borderWidth: 1,
    borderColor: Palette.warmBorder,
  },
  rescueToggleRowActive: {
    backgroundColor: Palette.rescueLight,
    borderColor: Palette.rescueBorder,
  },
  rescueToggleLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  rescueToggleTitle: {
    fontWeight: '700',
  },
  rescueToggleSub: {
    color: Palette.slateMedium,
    marginTop: 2,
    lineHeight: 14,
  },
  loadingBox: {
    padding: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    color: Palette.slateMedium,
    marginTop: 8,
    fontWeight: '600',
  },
  resultCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: Palette.primary,
  },
  resultHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  heroPriceBox: {
    alignItems: 'center',
    marginVertical: 10,
  },
  heroPriceLbl: {
    fontWeight: '700',
    color: Palette.slateMedium,
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  heroPriceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  heroPriceNum: {
    fontWeight: '900',
    color: Palette.primary,
  },
  heroPriceUnit: {
    fontWeight: '600',
    color: Palette.slateMedium,
    marginLeft: 6,
  },
  bracketRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: Palette.subtleBorder,
    marginVertical: 8,
  },
  bracketCol: {
    alignItems: 'center',
  },
  bracketLbl: {
    color: Palette.slateMedium,
    fontWeight: '600',
  },
  bracketVal: {
    fontWeight: '800',
    color: Palette.charcoal,
    marginTop: 2,
  },
  bracketBar: {
    flex: 1,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  bracketFill: {
    width: '100%',
    height: 6,
    backgroundColor: Palette.secondary,
    borderRadius: 3,
    marginBottom: 4,
  },
  bracketText: {
    color: Palette.slateMedium,
    fontWeight: '600',
  },
  rescueAdviseBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Palette.rescueLight,
    borderWidth: 1,
    borderColor: Palette.rescueBorder,
    marginVertical: 6,
  },
  rescueAdviseTitle: {
    fontWeight: '800',
    color: Palette.rescueRed,
  },
  rescueAdviseSub: {
    color: Palette.charcoal,
    marginTop: 2,
    lineHeight: 15,
  },
  insightBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginTop: 6,
  },
  insightText: {
    flex: 1,
    color: Palette.slateDark,
    lineHeight: 18,
  },
});

export default AIPredictionScreen;
