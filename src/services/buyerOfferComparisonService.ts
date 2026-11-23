/**
 * buyerOfferComparisonService.ts
 *
 * Fetches registered buyers from Firestore, scores and ranks them against a
 * farmer's crop listing, and returns a rich comparison model for the
 * BuyerOfferComparisonScreen.
 *
 * IMPORTANT — ranking philosophy:
 *  • The highest offered price alone does NOT determine the recommended buyer.
 *  • Score = price fit (35%) + crop compatibility (25%) + quantity fit (20%)
 *            + proximity (15%) + verification bonus (5%)
 *  • The UI highlights the top-ranked buyer AND shows all factors clearly so
 *    the farmer can make an informed decision.
 */

import { FirestoreBuyer } from '../types/database';
import { getAllBuyers } from './firestoreService';
import {
  getBuyerCoordinates,
} from './buyerMatchingService';
import { calculateDistanceKm, formatDistance } from './locationService';
import { formatLKR } from './priceHistoryService';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface BuyerOfferCard {
  buyer: FirestoreBuyer;
  /** Distance from farmer location, km */
  distanceKm: number;
  distanceLabel: string;
  /** Estimated offered price per kg (LKR) derived from buyer's budget / maxQty */
  estimatedOfferPerKg: number | null;
  estimatedOfferLabel: string;
  /** True when buyer's preferred crops include the farmer's crop */
  cropCompatible: boolean;
  /** True when farmer quantity falls within buyer min-max order range */
  quantityCompatible: boolean;
  /** True when buyer's district matches or buyer accepts all */
  districtMatch: boolean;
  /** 0-100 composite score */
  score: number;
  scoreLabel: string;
  /** Whether this card is the top overall recommendation */
  isTopPick: boolean;
  /** Whether price is highest among all cards */
  isHighestPrice: boolean;
  matchReasons: string[];
  caveats: string[];
}

export interface ComparisonSummary {
  aiReferencePrice: number | null;
  aiReferencePriceLabel: string;
  farmerAskingPrice: number | null;
  farmerAskingPriceLabel: string;
  topBuyerName: string | null;
  topBuyerScore: number;
  disclaimer: string;
}

export const COMPARISON_DISCLAIMER =
  'The recommended buyer is based on crop compatibility, required quantity and proximity — ' +
  'not solely on the highest price. Always verify buyer details before agreeing to a deal.';

// ── Main function ─────────────────────────────────────────────────────────────

export async function buildBuyerOfferCards(params: {
  cropName: string;
  farmerQuantityKg: number;
  farmerLat: number;
  farmerLon: number;
  farmerDistrict: string;
  aiReferencePrice: number | null;
  farmerAskingPrice: number | null;
}): Promise<{ cards: BuyerOfferCard[]; summary: ComparisonSummary }> {
  const buyers = await getAllBuyers();

  const rawCards: BuyerOfferCard[] = buyers.map((buyer) =>
    _scoreBuyer(buyer, params)
  );

  // Determine highest price & top pick
  const validPrices = rawCards
    .map((c) => c.estimatedOfferPerKg)
    .filter((p): p is number => p !== null);
  const maxPrice = validPrices.length ? Math.max(...validPrices) : null;

  const sorted = [...rawCards].sort((a, b) => b.score - a.score);
  const topScore = sorted[0]?.score ?? 0;

  const cards: BuyerOfferCard[] = sorted.map((c) => ({
    ...c,
    isTopPick: c.score === topScore && topScore > 0,
    isHighestPrice:
      c.estimatedOfferPerKg !== null &&
      maxPrice !== null &&
      c.estimatedOfferPerKg === maxPrice,
  }));

  const summary: ComparisonSummary = {
    aiReferencePrice: params.aiReferencePrice,
    aiReferencePriceLabel: params.aiReferencePrice
      ? formatLKR(params.aiReferencePrice) + '/kg'
      : 'Not available',
    farmerAskingPrice: params.farmerAskingPrice,
    farmerAskingPriceLabel: params.farmerAskingPrice
      ? formatLKR(params.farmerAskingPrice) + '/kg'
      : 'Not set',
    topBuyerName: cards[0]?.buyer.businessName ?? null,
    topBuyerScore: topScore,
    disclaimer: COMPARISON_DISCLAIMER,
  };

  return { cards, summary };
}

// ── Private scoring ───────────────────────────────────────────────────────────

function _scoreBuyer(
  buyer: FirestoreBuyer,
  params: {
    cropName: string;
    farmerQuantityKg: number;
    farmerLat: number;
    farmerLon: number;
    farmerDistrict: string;
    aiReferencePrice: number | null;
  }
): BuyerOfferCard {
  const req = buyer.purchasingRequirements;
  const coords = getBuyerCoordinates(buyer);
  const distanceKm = calculateDistanceKm(
    params.farmerLat, params.farmerLon,
    coords.latitude, coords.longitude
  );

  // ── Crop compatibility ────────────────────────────────────────────────────
  const cropKey = params.cropName.toLowerCase().split(' ')[0];
  const cropCompatible = req.preferredCrops.some((c) =>
    c.toLowerCase().includes(cropKey) ||
    cropKey.includes(c.toLowerCase().split(' ')[0])
  );

  // ── Quantity fit ──────────────────────────────────────────────────────────
  const quantityCompatible =
    params.farmerQuantityKg >= req.minOrderQuantityKg &&
    params.farmerQuantityKg <= req.maxOrderQuantityKg;
  const quantityPartial =
    !quantityCompatible &&
    params.farmerQuantityKg >= req.minOrderQuantityKg * 0.5;

  // ── District match ────────────────────────────────────────────────────────
  const districtMatch =
    !req.preferredDistricts?.length ||
    (req.preferredDistricts ?? []).some(
      (d) => d.toLowerCase() === params.farmerDistrict.toLowerCase()
    );

  // ── Estimated offer per kg ────────────────────────────────────────────────
  let estimatedOfferPerKg: number | null = null;
  if (req.weeklyTargetBudgetLkr && req.maxOrderQuantityKg > 0) {
    estimatedOfferPerKg = Math.round(
      req.weeklyTargetBudgetLkr / req.maxOrderQuantityKg
    );
  } else if (params.aiReferencePrice) {
    // Buyers typically offer 85-95% of wholesale reference
    const factor = buyer.isVerifiedBusiness ? 0.93 : 0.87;
    estimatedOfferPerKg = Math.round(params.aiReferencePrice * factor);
  }

  // ── Scoring (0-100) ───────────────────────────────────────────────────────
  let score = 0;

  // Price fit (35 pts): how close to / above AI reference price
  if (estimatedOfferPerKg !== null && params.aiReferencePrice) {
    const ratio = estimatedOfferPerKg / params.aiReferencePrice;
    score += Math.min(35, Math.round(35 * Math.min(ratio, 1.2)));
  } else {
    score += 15; // neutral when no price info
  }

  // Crop compatibility (25 pts)
  if (cropCompatible) score += 25;

  // Quantity fit (20 pts)
  if (quantityCompatible) score += 20;
  else if (quantityPartial) score += 10;

  // Proximity (15 pts)
  if (distanceKm <= 20) score += 15;
  else if (distanceKm <= 50) score += 12;
  else if (distanceKm <= 100) score += 8;
  else if (distanceKm <= 200) score += 4;

  // Verification bonus (5 pts)
  if (buyer.isVerifiedBusiness) score += 5;

  // ── Match reasons & caveats ───────────────────────────────────────────────
  const matchReasons: string[] = [];
  const caveats: string[] = [];

  if (cropCompatible)   matchReasons.push(`Purchases ${params.cropName.split(' ')[0]}`);
  if (quantityCompatible) matchReasons.push('Your quantity fits their order range');
  if (districtMatch)    matchReasons.push('Operates in your district');
  if (distanceKm <= 50) matchReasons.push(`Only ${Math.round(distanceKm)} km away`);
  if (buyer.isVerifiedBusiness) matchReasons.push('Verified registered business');
  if (req.hasColdStorage) matchReasons.push('Cold storage available');
  if (req.preferredDeliveryMode === 'farmgate_pickup')
    matchReasons.push('Offers farm-gate pickup');

  if (!cropCompatible)  caveats.push('May not regularly purchase this crop type');
  if (!quantityCompatible && !quantityPartial)
    caveats.push(`Order range: ${req.minOrderQuantityKg}–${req.maxOrderQuantityKg} kg (your qty: ${params.farmerQuantityKg} kg)`);
  if (!districtMatch)   caveats.push('Preferred districts may not include yours');
  if (distanceKm > 100) caveats.push('Long transport distance — confirm logistics');

  return {
    buyer,
    distanceKm,
    distanceLabel: formatDistance(distanceKm),
    estimatedOfferPerKg,
    estimatedOfferLabel: estimatedOfferPerKg
      ? formatLKR(estimatedOfferPerKg) + '/kg (est.)'
      : 'Price negotiable',
    cropCompatible,
    quantityCompatible,
    districtMatch,
    score: Math.min(100, score),
    scoreLabel: _scoreLabel(score),
    isTopPick: false,
    isHighestPrice: false,
    matchReasons,
    caveats,
  };
}

function _scoreLabel(score: number): string {
  if (score >= 80) return 'Excellent match';
  if (score >= 65) return 'Good match';
  if (score >= 50) return 'Moderate match';
  if (score >= 35) return 'Partial match';
  return 'Low compatibility';
}
