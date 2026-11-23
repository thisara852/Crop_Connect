/**
 * CropConnect — AI Fair-Price Prediction Service
 *
 * Connects to the Python FastAPI microservice when available.
 * Falls back automatically to an offline HARTI-benchmark baseline.
 *
 * TRANSPARENCY:
 *  • API responses are labelled "data_source: DEMONSTRATION DATA"
 *  • The offline fallback is clearly marked as an estimate
 *  • All prices are displayed as estimates, never guaranteed prices
 */

import { AIPricePredictionRequest, AIPricePredictionResponse, MarketTickerItem } from '../types/ai';
import { POPULAR_CROPS } from '../constants/sriLanka';
import { savePricePrediction, getLatestPricePrediction } from './firestoreService';
import { FirestorePricePrediction } from '../types/database';

// ── API configuration ─────────────────────────────────────────────────────────
// Android emulator → 10.0.2.2  |  iOS sim → localhost  |  device → LAN IP
const AI_API_BASE_URL = 'http://10.0.2.2:8000/api/v1';
const REQUEST_TIMEOUT_MS = 5000;

export const DATA_SOURCE_LABEL =
  'DEMONSTRATION DATA — synthetic patterns from HARTI / Dept. of Agriculture Sri Lanka benchmarks';
export const PREDICTION_BASIS = 'ESTIMATE — not a guaranteed market price';

// ── Types augmenting the base AIPricePredictionResponse ──────────────────────
export interface ExtendedPricePrediction extends AIPricePredictionResponse {
  model_name?: string;
  model_r2?: number;
  model_rmse?: number;
  data_source: string;
  prediction_basis: string;
  source: 'api' | 'offline_baseline';
}

export interface ApiPriceHistoryPoint {
  date: string;
  price_avg_lkr: number;
  price_min_lkr: number;
  price_max_lkr: number;
  market_center: string;
  supply_volume_kg: number;
}

export interface PriceHistoryResult {
  crop_name: string;
  district: string;
  records_found: number;
  data_source: string;
  history: ApiPriceHistoryPoint[];
}

export interface ModelInfo {
  selected_model: string;
  training_samples: number;
  test_samples: number;
  features_used: string[];
  models_compared: {
    model_name: string;
    r2_score: number;
    rmse: number;
    mae: number;
    selected: boolean;
  }[];
  data_source: string;
  disclaimer: string;
}

// ── Main prediction function ───────────────────────────────────────────────────
/**
 * Request a fair price prediction.
 * 1. Tries the FastAPI microservice (5 s timeout).
 * 2. Falls back to offline HARTI-benchmark baseline on failure.
 */
export async function predictFairPrice(
  request: AIPricePredictionRequest
): Promise<ExtendedPricePrediction> {
  // ── 1. Try the API ──────────────────────────────────────────────────────────
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    const apiBody = {
      crop_name: request.cropName,
      district: request.district,
      grade: request.grade,
      quantity_kg: request.quantityKg,
      harvest_date: request.harvestDate,
      is_rescue: request.isRescue ?? false,
    };

    const response = await fetch(`${AI_API_BASE_URL}/predict-price`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(apiBody),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (response.ok) {
      const data = await response.json();
      return {
        cropName: data.crop_name,
        district: data.district,
        grade: data.grade,
        fairPricePerKg: data.fair_price_per_kg,
        minPricePerKg: data.min_price_per_kg,
        maxPricePerKg: data.max_price_per_kg,
        recommendedRescuePrice: data.recommended_rescue_price,
        currency: 'LKR',
        confidenceScore: data.confidence_score,
        marketTrend: data.market_trend,
        marketTrendPercentage: data.market_trend_percentage,
        wholesaleBaseline: data.wholesale_baseline,
        insight: data.insight,
        recommendedAction: data.recommended_action,
        model_name: data.model_name,
        model_r2: data.model_r2,
        model_rmse: data.model_rmse,
        data_source: data.data_source ?? DATA_SOURCE_LABEL,
        prediction_basis: data.prediction_basis ?? PREDICTION_BASIS,
        source: 'api',
      };
    }
  } catch {
    // Network error or timeout — fall through to offline baseline
  }

  // ── 2. Offline HARTI-benchmark baseline ────────────────────────────────────
  return _offlineBaseline(request);
}

function _offlineBaseline(request: AIPricePredictionRequest): ExtendedPricePrediction {
  const matchedCrop =
    POPULAR_CROPS.find(
      (c) =>
        c.name.toLowerCase().includes(request.cropName.toLowerCase()) ||
        c.id.toLowerCase() === request.cropName.toLowerCase()
    ) ?? POPULAR_CROPS[0];

  const basePrice = matchedCrop.benchmarkPriceLkrPerKg;
  const gradeMultiplier = request.grade === 'A' ? 1.15 : request.grade === 'B' ? 1.0 : 0.85;
  const volumeDiscount =
    request.quantityKg > 1000 ? 0.92 : request.quantityKg > 500 ? 0.95 : 1.0;
  const highTransportDistricts = ['Colombo', 'Gampaha', 'Kalutara', 'Jaffna', 'Mannar'];
  const districtMultiplier = highTransportDistricts.includes(request.district) ? 1.12 : 1.0;

  const estimated = Math.round(basePrice * gradeMultiplier * volumeDiscount * districtMultiplier);
  const minPrice = Math.round(estimated * 0.85);
  const maxPrice = Math.round(estimated * 1.15);
  const rescuePrice = Math.round(estimated * 0.72);

  return {
    cropName: matchedCrop.name,
    district: request.district || 'Sri Lanka',
    grade: request.grade,
    fairPricePerKg: estimated,
    minPricePerKg: minPrice,
    maxPricePerKg: maxPrice,
    recommendedRescuePrice: rescuePrice,
    currency: 'LKR',
    confidenceScore: 0.62,          // lower — offline baseline
    marketTrend: 'stable',
    marketTrendPercentage: 0,
    wholesaleBaseline: basePrice,
    insight:
      'Price estimated from HARTI agrarian research benchmarks (offline mode). ' +
      'Connect the FastAPI service for a data-driven ML prediction.',
    recommendedAction: request.isRescue
      ? `Rescue Alert: Rs. ${rescuePrice}/kg for fast clearance.`
      : `Estimated range: Rs. ${minPrice} – Rs. ${maxPrice}/kg.`,
    data_source: DATA_SOURCE_LABEL + ' (offline baseline)',
    prediction_basis: PREDICTION_BASIS,
    source: 'offline_baseline',
  };
}

// ── Price history ──────────────────────────────────────────────────────────────
export async function fetchPriceHistory(
  cropName: string,
  district: string,
  days: number = 90
): Promise<PriceHistoryResult> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    const url = `${AI_API_BASE_URL}/price-history?crop_name=${encodeURIComponent(cropName)}&district=${encodeURIComponent(district)}&days=${days}`;
    const response = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);
    if (response.ok) {
      const data = await response.json();
      return {
        crop_name: data.crop_name,
        district: data.district,
        records_found: data.records_found,
        data_source: data.data_source ?? DATA_SOURCE_LABEL,
        history: (data.history ?? []).map((h: Record<string, unknown>) => ({
          date: h.date,
          price_avg_lkr: h.price_avg_lkr,
          price_min_lkr: h.price_min_lkr,
          price_max_lkr: h.price_max_lkr,
          market_center: h.market_center,
          supply_volume_kg: h.supply_volume_kg,
        })),
      };
    }
  } catch {
    // offline
  }
  return _syntheticHistory(cropName, district, days);
}

function _syntheticHistory(
  cropName: string,
  district: string,
  days: number
): PriceHistoryResult {
  const matchedCrop =
    POPULAR_CROPS.find((c) => c.name.toLowerCase().includes(cropName.toLowerCase())) ??
    POPULAR_CROPS[0];
  const base = matchedCrop.benchmarkPriceLkrPerKg;
  const history: ApiPriceHistoryPoint[] = [];
  const today = new Date();

  for (let i = days; i >= 0; i -= Math.ceil(days / 30)) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const noise = (Math.random() - 0.5) * base * 0.2;
    const avg = Math.round(base + noise);
    history.push({
      date: d.toISOString().split('T')[0],
      price_avg_lkr: avg,
      price_min_lkr: Math.round(avg * 0.90),
      price_max_lkr: Math.round(avg * 1.10),
      market_center: 'Dambulla DEC',
      supply_volume_kg: Math.round(500 + Math.random() * 1500),
    });
  }

  return {
    crop_name: cropName,
    district,
    records_found: history.length,
    data_source: DATA_SOURCE_LABEL + ' (offline synthetic)',
    history,
  };
}

// ── Model info ────────────────────────────────────────────────────────────────
export async function fetchModelInfo(): Promise<ModelInfo | null> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    const response = await fetch(`${AI_API_BASE_URL}/model-info`, { signal: controller.signal });
    clearTimeout(timeoutId);
    if (response.ok) return await response.json();
  } catch {
    // offline
  }
  return null;
}

// ── Save prediction to Firestore ───────────────────────────────────────────────
export async function savePredictionToFirestore(
  prediction: ExtendedPricePrediction,
  userId: string,
  cropId: string = ''
): Promise<string | null> {
  try {
    const predData: Omit<FirestorePricePrediction, 'id' | 'createdAt' | 'updatedAt'> = {
      cropId: cropId || `crop_${prediction.cropName.toLowerCase().replace(/\s+/g, '_')}`,
      cropName: prediction.cropName,
      district: prediction.district,
      season: _currentSeason(),
      grade: prediction.grade as 'A' | 'B' | 'C',
      predictedPricePerKg: prediction.fairPricePerKg,
      fairPriceRange: {
        min: prediction.minPricePerKg,
        max: prediction.maxPricePerKg,
      },
      recommendedRescuePrice: prediction.recommendedRescuePrice,
      confidenceScore: prediction.confidenceScore,
      marketTrend:
        prediction.marketTrend === 'rising'
          ? 'rising'
          : prediction.marketTrend === 'falling'
          ? 'falling'
          : 'stable',
      marketTrendPercentage: prediction.marketTrendPercentage,
      wholesaleBenchmark: prediction.wholesaleBaseline,
      demandIndex: 'moderate',
      recommendedAction: prediction.recommendedAction,
      modelVersion: prediction.model_name ?? 'offline_baseline',
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    };
    const saved = await savePricePrediction(predData);
    return saved.id;
  } catch (e) {
    console.warn('Could not save prediction to Firestore:', e);
    return null;
  }
}

/** Retrieve past predictions the user has saved. */
export async function getUserPredictions(
  userId: string,
  limitCount: number = 20
): Promise<Record<string, unknown>[]> {
  try {
    // Use the existing getLatestPricePrediction or query directly from cache
    // We fall back to empty if Firestore is unavailable
    const result = await getLatestPricePrediction('', '');
    void result; // just testing connectivity
  } catch {
    // offline
  }
  // Return empty array — full history needs a compound index on requestedByUserId+createdAt
  // which is added when the Firebase project is properly configured.
  return [];
}

function _currentSeason(): 'Yala' | 'Maha' | 'Inter-monsoon' {
  const month = new Date().getMonth() + 1;
  if (month >= 5 && month <= 9) return 'Yala';
  if (month >= 10 || month <= 2) return 'Maha';
  return 'Inter-monsoon';
}

// ── Market ticker (unchanged) ─────────────────────────────────────────────────
export function getMockMarketTickers(): MarketTickerItem[] {
  return [
    { cropName: 'Carrot', sinhalaName: 'කැරට්', currentAvgLkr: 285, change24h: 3.2, volumeAvailableKg: 4200, trend: 'up' },
    { cropName: 'Leeks', sinhalaName: 'ලීක්ස්', currentAvgLkr: 210, change24h: -5.4, volumeAvailableKg: 6800, trend: 'down' },
    { cropName: 'Tomato', sinhalaName: 'තක්කාලි', currentAvgLkr: 240, change24h: 8.1, volumeAvailableKg: 1950, trend: 'up' },
    { cropName: 'Green Chilli', sinhalaName: 'අමු මිරිස්', currentAvgLkr: 460, change24h: -1.8, volumeAvailableKg: 1200, trend: 'down' },
    { cropName: 'Big Onion', sinhalaName: 'ලොකු ළුණු', currentAvgLkr: 325, change24h: 0.0, volumeAvailableKg: 15400, trend: 'neutral' },
    { cropName: 'Potato', sinhalaName: 'අල', currentAvgLkr: 345, change24h: 2.1, volumeAvailableKg: 8900, trend: 'up' },
  ];
}
