/**
 * adminService.ts
 *
 * Comprehensive Firestore-backed administrative operations service.
 * Enforces role-based access security checks (only 'admin' role allowed).
 *
 * Covers:
 * 1. Overview analytics (total farmers, buyers, crop listings, active offers, top crops, recent registrations)
 * 2. Farmer account management (status, verification, certification)
 * 3. Buyer account management & verification (BR review, verify/reject status)
 * 4. Crop listings moderation (remove invalid/inappropriate, mark rescue)
 * 5. Master crop information management (create/update crop benchmarks)
 * 6. Historical market prices management (add/update market price records)
 * 7. Price predictions monitor
 * 8. User reports & enquiries management
 */

import {
  collection,
  doc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  limit as firestoreLimit,
} from 'firebase/firestore';
import { db } from '../config/firebase';
import {
  COLLECTIONS,
  FirestoreFarmer,
  FirestoreBuyer,
  FirestoreCrop,
  FirestoreCropListing,
  FirestoreBuyerOffer,
  FirestoreEnquiry,
  FirestoreMarketPrice,
  FirestorePricePrediction,
} from '../types/database';
import {
  getAllBuyers,
  getAllCrops,
  getActiveListings,
  INITIAL_REGISTERED_BUYERS,
  INITIAL_MARKET_PRICES,
  INITIAL_BUYER_OFFERS,
  INITIAL_BUYER_ENQUIRIES,
} from './firestoreService';
import { ALL_MOCK_LISTINGS } from './mockDataService';
import { UserRole } from '../types/user';

// ── Security Check ────────────────────────────────────────────────────────────

export function assertAdminAccess(userRole?: UserRole | string): void {
  if (userRole !== 'admin') {
    throw new Error('SECURITY VIOLATION: Unauthorized access. Administrative privileges required.');
  }
}

// ── Fallback Seed Farmers for demonstration / offline ─────────────────────────

export const INITIAL_REGISTERED_FARMERS: FirestoreFarmer[] = [
  {
    id: 'farmer_001',
    userId: 'farmer_001',
    fullName: 'Sunil Bandara',
    farmName: 'Bandara Highland Agro',
    phone: '+94 77 123 4567',
    email: 'sunil.bandara@cropconnect.lk',
    district: 'Nuwara Eliya',
    address: 'Kandapola Road, Nuwara Eliya',
    latitude: 6.9497,
    longitude: 80.7891,
    landSizeAcres: 3.5,
    primaryCrops: ['Carrot', 'Leeks', 'Potato', 'Cabbage'],
    farmingExperienceYears: 18,
    govRegistrationNumber: 'AGR/NE/2016/482',
    isCertifiedOrganic: true,
    rating: 4.8,
    completedDeals: 36,
    createdAt: '2024-03-12T00:00:00.000Z',
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'farmer_002',
    userId: 'farmer_002',
    fullName: 'Kamal Gunasekara',
    farmName: 'Dambulla Green Meadows',
    phone: '+94 71 234 5678',
    email: 'kamal.guna@cropconnect.lk',
    district: 'Matale',
    address: 'Galewela Agrarian Tract, Matale',
    latitude: 7.4675,
    longitude: 80.6234,
    landSizeAcres: 5.0,
    primaryCrops: ['Tomato', 'Pumpkin', 'Green Chilli', 'Brinjal'],
    farmingExperienceYears: 12,
    govRegistrationNumber: 'AGR/MT/2019/119',
    isCertifiedOrganic: false,
    rating: 4.6,
    completedDeals: 29,
    createdAt: '2024-05-18T00:00:00.000Z',
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'farmer_003',
    userId: 'farmer_003',
    fullName: 'Wimal Jayawardena',
    farmName: 'Rajarata Golden Fields',
    phone: '+94 76 345 6789',
    email: 'wimal.paddy@cropconnect.lk',
    district: 'Polonnaruwa',
    address: 'Hingurakgoda Track 4, Polonnaruwa',
    latitude: 7.9403,
    longitude: 81.0188,
    landSizeAcres: 8.5,
    primaryCrops: ['Keeri Samba Paddy', 'Nadu Rice', 'Maize'],
    farmingExperienceYears: 24,
    govRegistrationNumber: 'AGR/PL/2014/902',
    isCertifiedOrganic: false,
    rating: 4.9,
    completedDeals: 58,
    createdAt: '2023-11-05T00:00:00.000Z',
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'farmer_004',
    userId: 'farmer_004',
    fullName: 'S. Tharmalingam',
    farmName: 'Jaffna Red Onion Valley',
    phone: '+94 77 456 7890',
    email: 'tharma.jaffna@cropconnect.lk',
    district: 'Jaffna',
    address: 'Chunnakam Agrarian Division, Jaffna',
    latitude: 9.6615,
    longitude: 80.0255,
    landSizeAcres: 2.8,
    primaryCrops: ['Red Onion', 'Green Chilli', 'Banana'],
    farmingExperienceYears: 15,
    govRegistrationNumber: 'AGR/JF/2018/074',
    isCertifiedOrganic: true,
    rating: 4.7,
    completedDeals: 42,
    createdAt: '2024-01-20T00:00:00.000Z',
    updatedAt: new Date().toISOString(),
  },
];

// In-memory store for mutations in sandbox / offline environments
const adminStore = {
  farmers: [...INITIAL_REGISTERED_FARMERS],
  buyers: [...INITIAL_REGISTERED_BUYERS],
  listings: [...ALL_MOCK_LISTINGS] as any[],
  marketPrices: [...INITIAL_MARKET_PRICES],
  predictions: [] as FirestorePricePrediction[],
  enquiries: [...INITIAL_BUYER_ENQUIRIES],
  offers: [...INITIAL_BUYER_OFFERS],
};

// ── Types ─────────────────────────────────────────────────────────────────────

export interface AdminAnalyticsSummary {
  totalFarmers: number;
  totalBuyers: number;
  totalCropListings: number;
  totalActiveOffers: number;
  totalRescueListings: number;
  totalVolumeSurplusKg: number;
  mostListedCrops: { cropName: string; count: number; totalKg: number }[];
  recentRegistrations: {
    id: string;
    name: string;
    role: 'farmer' | 'buyer';
    district: string;
    date: string;
    verified: boolean;
  }[];
}

// ── 1. Dashboard Analytics ───────────────────────────────────────────────────

export async function getAdminAnalytics(adminRole?: UserRole | string): Promise<AdminAnalyticsSummary> {
  assertAdminAccess(adminRole);

  const [farmers, buyers, listings, offers] = await Promise.all([
    getAllFarmersAdmin(adminRole),
    getAllBuyersAdmin(adminRole),
    getAllListingsAdmin(adminRole),
    getAllBuyerOffersAdmin(adminRole),
  ]);

  // Aggregate most listed crops
  const cropCountMap: Record<string, { count: number; totalKg: number }> = {};
  for (const l of listings) {
    const key = l.cropName;
    if (!cropCountMap[key]) {
      cropCountMap[key] = { count: 0, totalKg: 0 };
    }
    cropCountMap[key].count += 1;
    cropCountMap[key].totalKg += l.quantityKg || 0;
  }

  const mostListedCrops = Object.entries(cropCountMap)
    .map(([cropName, data]) => ({ cropName, ...data }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  // Recent registrations combined
  const recentFarmers = farmers.map((f) => ({
    id: f.id,
    name: f.fullName,
    role: 'farmer' as const,
    district: f.district,
    date: f.createdAt ? f.createdAt.split('T')[0] : '2025-01-01',
    verified: Boolean(f.govRegistrationNumber),
  }));

  const recentBuyers = buyers.map((b) => ({
    id: b.id,
    name: b.businessName,
    role: 'buyer' as const,
    district: b.district,
    date: b.createdAt ? b.createdAt.split('T')[0] : '2025-01-01',
    verified: b.isVerifiedBusiness,
  }));

  const recentRegistrations = [...recentFarmers, ...recentBuyers]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 8);

  const totalVolumeSurplusKg = listings.reduce((acc, l) => acc + (l.quantityKg || 0), 0);
  const totalRescueListings = listings.filter((l) => l.isRescueCrop).length;

  return {
    totalFarmers: farmers.length,
    totalBuyers: buyers.length,
    totalCropListings: listings.length,
    totalActiveOffers: offers.length,
    totalRescueListings,
    totalVolumeSurplusKg,
    mostListedCrops,
    recentRegistrations,
  };
}

// ── 2. Farmer Management ──────────────────────────────────────────────────────

export async function getAllFarmersAdmin(adminRole?: UserRole | string): Promise<FirestoreFarmer[]> {
  assertAdminAccess(adminRole);
  try {
    const snap = await getDocs(collection(db, COLLECTIONS.FARMERS));
    if (!snap.empty) {
      return snap.docs.map((d) => d.data() as FirestoreFarmer);
    }
  } catch {
    // Offline fallback
  }
  return adminStore.farmers;
}

export async function updateFarmerVerificationAdmin(
  farmerId: string,
  isCertifiedOrganic: boolean,
  govRegistrationNumber?: string,
  adminRole?: UserRole | string
): Promise<void> {
  assertAdminAccess(adminRole);
  try {
    const ref = doc(db, COLLECTIONS.FARMERS, farmerId);
    await updateDoc(ref, {
      isCertifiedOrganic,
      govRegistrationNumber: govRegistrationNumber || null,
      updatedAt: new Date().toISOString(),
    });
  } catch {
    // In-memory update
    const idx = adminStore.farmers.findIndex((f) => f.id === farmerId);
    if (idx !== -1) {
      adminStore.farmers[idx] = {
        ...adminStore.farmers[idx],
        isCertifiedOrganic,
        govRegistrationNumber,
        updatedAt: new Date().toISOString(),
      };
    }
  }
}

// ── 3. Buyer Management & Verification ────────────────────────────────────────

export async function getAllBuyersAdmin(adminRole?: UserRole | string): Promise<FirestoreBuyer[]> {
  assertAdminAccess(adminRole);
  try {
    const snap = await getDocs(collection(db, COLLECTIONS.BUYERS));
    if (!snap.empty) {
      return snap.docs.map((d) => d.data() as FirestoreBuyer);
    }
  } catch {
    // Fallback
  }
  return adminStore.buyers.length ? adminStore.buyers : getAllBuyers();
}

export async function verifyBuyerRegistrationAdmin(
  buyerId: string,
  isVerified: boolean,
  adminRole?: UserRole | string
): Promise<void> {
  assertAdminAccess(adminRole);
  try {
    const ref = doc(db, COLLECTIONS.BUYERS, buyerId);
    await updateDoc(ref, {
      isVerifiedBusiness: isVerified,
      updatedAt: new Date().toISOString(),
    });
  } catch {
    const idx = adminStore.buyers.findIndex((b) => b.id === buyerId);
    if (idx !== -1) {
      adminStore.buyers[idx] = {
        ...adminStore.buyers[idx],
        isVerifiedBusiness: isVerified,
        updatedAt: new Date().toISOString(),
      };
    }
  }
}

// ── 4. Crop Listings Moderation ──────────────────────────────────────────────

export async function getAllListingsAdmin(adminRole?: UserRole | string): Promise<FirestoreCropListing[]> {
  assertAdminAccess(adminRole);
  try {
    const snap = await getDocs(collection(db, COLLECTIONS.CROP_LISTINGS));
    if (!snap.empty) {
      return snap.docs.map((d) => d.data() as FirestoreCropListing);
    }
  } catch {
    // Fallback
  }
  return adminStore.listings.length ? adminStore.listings : (getActiveListings() as any);
}

export async function moderateCropListingAdmin(
  listingId: string,
  action: 'approve' | 'flag_invalid' | 'delete' | 'mark_rescue',
  adminRole?: UserRole | string
): Promise<void> {
  assertAdminAccess(adminRole);
  try {
    const ref = doc(db, COLLECTIONS.CROP_LISTINGS, listingId);
    if (action === 'delete') {
      await deleteDoc(ref);
    } else if (action === 'mark_rescue') {
      await updateDoc(ref, { isRescueCrop: true, updatedAt: new Date().toISOString() });
    } else if (action === 'flag_invalid') {
      await updateDoc(ref, { status: 'expired', isRescueCrop: false, updatedAt: new Date().toISOString() });
    } else {
      await updateDoc(ref, { status: 'active', updatedAt: new Date().toISOString() });
    }
  } catch {
    // In-memory fallback
    if (action === 'delete') {
      adminStore.listings = adminStore.listings.filter((l) => l.id !== listingId);
    } else {
      const idx = adminStore.listings.findIndex((l) => l.id === listingId);
      if (idx !== -1) {
        if (action === 'mark_rescue') {
          adminStore.listings[idx].isRescueCrop = true;
        } else if (action === 'flag_invalid') {
          adminStore.listings[idx].status = 'expired';
        }
      }
    }
  }
}

// ── 5. Master Crop Information ───────────────────────────────────────────────

export async function getAllMasterCropsAdmin(adminRole?: UserRole | string): Promise<FirestoreCrop[]> {
  assertAdminAccess(adminRole);
  return getAllCrops();
}

export async function updateCropBenchmarkAdmin(
  cropId: string,
  avgDambullaBenchmarkPrice: number,
  adminRole?: UserRole | string
): Promise<void> {
  assertAdminAccess(adminRole);
  try {
    const ref = doc(db, COLLECTIONS.CROPS, cropId);
    await updateDoc(ref, {
      avgDambullaBenchmarkPrice,
      updatedAt: new Date().toISOString(),
    });
  } catch {
    // Handled
  }
}

// ── 6. Historical Market-Price Records ─────────────────────────────────────────

export async function getAllMarketPricesAdmin(adminRole?: UserRole | string): Promise<FirestoreMarketPrice[]> {
  assertAdminAccess(adminRole);
  try {
    const snap = await getDocs(query(collection(db, COLLECTIONS.MARKET_PRICES), orderBy('date', 'desc'), firestoreLimit(100)));
    if (!snap.empty) {
      return snap.docs.map((d) => d.data() as FirestoreMarketPrice);
    }
  } catch {
    // Handled
  }
  return adminStore.marketPrices;
}

export async function addMarketPriceRecordAdmin(
  recordData: Omit<FirestoreMarketPrice, 'id' | 'createdAt' | 'updatedAt'>,
  adminRole?: UserRole | string
): Promise<FirestoreMarketPrice> {
  assertAdminAccess(adminRole);
  const id = `mp_${recordData.marketCenter.toLowerCase().replace(/\s+/g, '_')}_${recordData.cropName.toLowerCase()}_${Date.now()}`;
  const now = new Date().toISOString();
  const newRecord: FirestoreMarketPrice = {
    ...recordData,
    id,
    createdAt: now,
    updatedAt: now,
  };

  try {
    await setDoc(doc(db, COLLECTIONS.MARKET_PRICES, id), newRecord);
  } catch {
    adminStore.marketPrices.unshift(newRecord);
  }
  return newRecord;
}

// ── 7. Price Predictions Monitoring ──────────────────────────────────────────

export async function getAllPredictionsAdmin(adminRole?: UserRole | string): Promise<FirestorePricePrediction[]> {
  assertAdminAccess(adminRole);
  try {
    const snap = await getDocs(query(collection(db, COLLECTIONS.PRICE_PREDICTIONS), orderBy('createdAt', 'desc'), firestoreLimit(50)));
    if (!snap.empty) {
      return snap.docs.map((d) => d.data() as FirestorePricePrediction);
    }
  } catch {
    // Handled
  }
  return adminStore.predictions;
}

// ── 8. Buyer Offers & Enquiries / Reports ─────────────────────────────────────

export async function getAllBuyerOffersAdmin(adminRole?: UserRole | string): Promise<FirestoreBuyerOffer[]> {
  assertAdminAccess(adminRole);
  try {
    const snap = await getDocs(collection(db, COLLECTIONS.BUYER_OFFERS));
    if (!snap.empty) {
      return snap.docs.map((d) => d.data() as FirestoreBuyerOffer);
    }
  } catch {
    // Handled
  }
  return adminStore.offers;
}

export async function getAllEnquiriesAdmin(adminRole?: UserRole | string): Promise<FirestoreEnquiry[]> {
  assertAdminAccess(adminRole);
  try {
    const snap = await getDocs(collection(db, COLLECTIONS.ENQUIRIES));
    if (!snap.empty) {
      return snap.docs.map((d) => d.data() as FirestoreEnquiry);
    }
  } catch {
    // Handled
  }
  return adminStore.enquiries;
}
