/**
 * Nearby Buyer Matching Module
 * Matches Sri Lankan farmers with registered agricultural buyers in Firebase Firestore
 * based on location, crop type compatibility, quantities, and purchasing districts.
 */

import { FirestoreBuyer, FirestoreCropListing } from '../types/database';
import { getAllBuyers, getFarmerListings, getActiveListings } from './firestoreService';
import {
  FarmerLocation,
  calculateDistanceKm,
  SRI_LANKA_DISTRICT_COORDINATES,
} from './locationService';

export interface MatchedCropInfo {
  listingId: string;
  cropName: string;
  category: string;
  farmerQuantityKg: number;
  farmerAskingPrice: number;
  buyerMinQtyKg: number;
  buyerMaxQtyKg: number;
  quantityMatch: boolean;
  isRescueCrop: boolean;
}

export interface BuyerMatchResult {
  buyer: FirestoreBuyer;
  distanceKm: number;
  matchScore: number; // 0 - 100%
  matchedCrops: MatchedCropInfo[];
  matchReasons: string[];
  districtMatch: boolean;
  cropCompatibility: boolean;
  quantityCompatibility: boolean;
  urgentNeeds: boolean;
  preferredDeliveryMode: 'farmgate_pickup' | 'market_delivery';
  hasColdStorage: boolean;
}

export interface MatchFilterOptions {
  cropName?: string;
  maxDistanceKm?: number;
  district?: string;
  onlyVerified?: boolean;
  minRating?: number;
  searchQuery?: string;
}

/**
 * Normalizes crop names for robust comparison across language and descriptive variants.
 * e.g., "Upcountry Carrot" -> "carrot", "Ripe Field Tomatoes" -> "tomato"
 */
function normalizeCropText(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]/g, ' ')
    .trim();
}

/**
 * Determines whether a farmer's crop listing matches a buyer's preferred crop keyword.
 */
function checkCropCompatibility(listingCropName: string, buyerPreferredCrop: string): boolean {
  const normListing = normalizeCropText(listingCropName);
  const normPref = normalizeCropText(buyerPreferredCrop);

  if (normListing.includes(normPref) || normPref.includes(normListing)) {
    return true;
  }

  // Token-level check (e.g. "carrots" matches "carrot", "beans" matches "green beans")
  const listingTokens = normListing.split(/\s+/);
  const prefTokens = normPref.split(/\s+/);

  return listingTokens.some((t) =>
    prefTokens.some(
      (p) =>
        (t.length > 3 && p.length > 3 && (t.startsWith(p) || p.startsWith(t))) ||
        t === p
    )
  );
}

/**
 * Calculate approximate distance in km between a farmer's location and a registered buyer.
 * Resolves buyer coordinates from document or district centroid.
 */
export function getBuyerCoordinates(buyer: FirestoreBuyer): { latitude: number; longitude: number } {
  if (
    typeof buyer.latitude === 'number' &&
    typeof buyer.longitude === 'number' &&
    buyer.latitude !== 0 &&
    buyer.longitude !== 0
  ) {
    return { latitude: buyer.latitude, longitude: buyer.longitude };
  }

  // Centroid fallback for buyer's registered district
  const districtPoint = SRI_LANKA_DISTRICT_COORDINATES[buyer.district];
  if (districtPoint) {
    return { latitude: districtPoint.latitude, longitude: districtPoint.longitude };
  }

  return { latitude: 6.9271, longitude: 79.8612 }; // Default Colombo hub
}

/**
 * Core matching and ranking engine for Nearby Buyer Matching Module
 */
export async function matchBuyersForFarmer(
  farmerLocation: FarmerLocation,
  farmerId?: string,
  options?: MatchFilterOptions
): Promise<BuyerMatchResult[]> {
  // 1. Retrieve registered buyers from Firebase Firestore
  const allBuyers = await getAllBuyers();

  // Strict requirement: Only registered buyers with active business records
  const registeredBuyers = allBuyers.filter((b) => Boolean(b.id && b.businessName));

  // 2. Retrieve farmer's crop listings from Firebase Firestore
  let listings: FirestoreCropListing[] = [];
  if (farmerId) {
    listings = await getFarmerListings(farmerId);
  }

  // If farmer has no active listings yet, fall back to current active marketplace listings
  // so the farmer can see potential buyers for typical regional crops
  if (listings.length === 0) {
    listings = await getActiveListings({ limitCount: 20 });
  }

  // 3. Process each registered buyer and compute matching scores
  const results: BuyerMatchResult[] = [];

  for (const buyer of registeredBuyers) {
    const buyerCoords = getBuyerCoordinates(buyer);
    const distanceKm = calculateDistanceKm(
      farmerLocation.latitude,
      farmerLocation.longitude,
      buyerCoords.latitude,
      buyerCoords.longitude
    );

    const buyerPrefs = buyer.purchasingRequirements || {
      preferredCrops: [],
      minOrderQuantityKg: 50,
      maxOrderQuantityKg: 2000,
      paymentTerms: 'instant_bank_transfer',
      preferredDeliveryMode: 'farmgate_pickup',
      hasColdStorage: false,
      preferredDistricts: [],
    };

    const preferredCrops = buyerPrefs.preferredCrops || [];
    const preferredDistricts = buyerPrefs.preferredDistricts || [];

    // Evaluate matching crops
    const matchedCrops: MatchedCropInfo[] = [];

    for (const listing of listings) {
      const isCompat = preferredCrops.some((pc) =>
        checkCropCompatibility(listing.cropName, pc)
      );

      if (isCompat) {
        const isQtyFit =
          listing.quantityKg >= (buyerPrefs.minOrderQuantityKg || 0) &&
          listing.quantityKg <= (buyerPrefs.maxOrderQuantityKg || 100000) * 1.5;

        matchedCrops.push({
          listingId: listing.id,
          cropName: listing.cropName,
          category: listing.category,
          farmerQuantityKg: listing.quantityKg,
          farmerAskingPrice: listing.askingPricePerKg,
          buyerMinQtyKg: buyerPrefs.minOrderQuantityKg,
          buyerMaxQtyKg: buyerPrefs.maxOrderQuantityKg,
          quantityMatch: isQtyFit,
          isRescueCrop: listing.isRescueCrop,
        });
      }
    }

    const cropCompatibility = matchedCrops.length > 0;
    const quantityCompatibility = matchedCrops.some((mc) => mc.quantityMatch);

    // Location / District match
    const districtMatch: boolean =
      buyer.district.toLowerCase() === farmerLocation.district.toLowerCase() ||
      preferredDistricts.some(
        (d) => d.toLowerCase() === farmerLocation.district.toLowerCase()
      ) ||
      !!(
        farmerLocation.province &&
        buyer.district &&
        SRI_LANKA_DISTRICT_COORDINATES[buyer.district]?.province === farmerLocation.province
      );

    // Calculate composite rank score (0 - 100)
    let score = 0;
    const reasons: string[] = [];

    // 1. Crop type match (up to 40 pts)
    if (cropCompatibility) {
      score += 40;
      const cropNames = Array.from(new Set(matchedCrops.map((c) => c.cropName))).join(', ');
      reasons.push(`Actively purchasing ${cropNames}`);
    } else {
      // Base score for general produce buyer
      score += 10;
    }

    // 2. Quantity compatibility (up to 25 pts)
    if (quantityCompatibility) {
      score += 25;
      reasons.push(
        `Quantity compatible (${buyerPrefs.minOrderQuantityKg.toLocaleString()} - ${buyerPrefs.maxOrderQuantityKg.toLocaleString()} kg)`
      );
    } else if (cropCompatibility) {
      score += 15;
      reasons.push(
        `Quotas negotiable (min order ${buyerPrefs.minOrderQuantityKg.toLocaleString()} kg)`
      );
    } else {
      score += 8;
    }

    // 3. Purchasing location match (up to 20 pts)
    if (districtMatch) {
      score += 20;
      reasons.push(`Prefers sourcing from ${farmerLocation.district} district`);
    } else if (distanceKm <= 50) {
      score += 12;
      reasons.push(`Close regional proximity (${distanceKm.toFixed(1)} km)`);
    } else {
      score += 5;
    }

    // 4. Proximity distance points (up to 15 pts)
    if (distanceKm <= 15) {
      score += 15;
      reasons.push('Immediate local pickup area (< 15 km)');
    } else if (distanceKm <= 40) {
      score += 12;
    } else if (distanceKm <= 80) {
      score += 8;
    } else if (distanceKm <= 150) {
      score += 5;
    } else {
      score += 2;
    }

    // 5. Verification & Rating bonus
    if (buyer.isVerifiedBusiness) {
      score += 3;
    }
    if (buyer.rating >= 4.8) {
      score += 2;
    }

    // Final score clamped to 15 - 99%
    const finalScore = Math.min(99, Math.max(15, Math.round(score)));

    results.push({
      buyer,
      distanceKm,
      matchScore: finalScore,
      matchedCrops,
      matchReasons: reasons,
      districtMatch,
      cropCompatibility,
      quantityCompatibility,
      urgentNeeds: matchedCrops.some((m) => m.isRescueCrop) || Boolean(buyer.purchasingRequirements?.hasColdStorage),
      preferredDeliveryMode: buyerPrefs.preferredDeliveryMode || 'farmgate_pickup',
      hasColdStorage: Boolean(buyerPrefs.hasColdStorage),
    });
  }

  // 4. Apply optional filters
  let filtered = results;

  if (options?.onlyVerified) {
    filtered = filtered.filter((r) => r.buyer.isVerifiedBusiness);
  }

  if (options?.minRating) {
    filtered = filtered.filter((r) => r.buyer.rating >= (options.minRating || 0));
  }

  if (options?.district && options.district !== 'All Districts') {
    filtered = filtered.filter(
      (r) =>
        r.buyer.district.toLowerCase() === options.district?.toLowerCase() ||
        r.buyer.purchasingRequirements.preferredDistricts?.some(
          (d) => d.toLowerCase() === options.district?.toLowerCase()
        )
    );
  }

  if (options?.maxDistanceKm && options.maxDistanceKm > 0) {
    filtered = filtered.filter((r) => r.distanceKm <= options.maxDistanceKm!);
  }

  if (options?.cropName && options.cropName.trim().length > 0) {
    const q = options.cropName.toLowerCase();
    filtered = filtered.filter(
      (r) =>
        r.matchedCrops.some((c) => c.cropName.toLowerCase().includes(q)) ||
        r.buyer.purchasingRequirements.preferredCrops.some((pc) =>
          pc.toLowerCase().includes(q)
        )
    );
  }

  if (options?.searchQuery && options.searchQuery.trim().length > 0) {
    const s = options.searchQuery.toLowerCase();
    filtered = filtered.filter(
      (r) =>
        r.buyer.businessName.toLowerCase().includes(s) ||
        r.buyer.contactPerson.toLowerCase().includes(s) ||
        r.buyer.district.toLowerCase().includes(s) ||
        r.matchedCrops.some((c) => c.cropName.toLowerCase().includes(s)) ||
        r.buyer.purchasingRequirements.preferredCrops.some((pc) =>
          pc.toLowerCase().includes(s)
        )
    );
  }

  // 5. Rank suitable buyers:
  // Primary: matchScore (descending)
  // Secondary: distanceKm (ascending)
  // Tertiary: rating (descending)
  return filtered.sort((a, b) => {
    if (b.matchScore !== a.matchScore) {
      return b.matchScore - a.matchScore;
    }
    if (a.distanceKm !== b.distanceKm) {
      return a.distanceKm - b.distanceKm;
    }
    return b.buyer.rating - a.buyer.rating;
  });
}
