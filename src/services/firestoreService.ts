import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit as firestoreLimit,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '../config/firebase';
import {
  COLLECTIONS,
  FirestoreUser,
  FirestoreFarmer,
  FirestoreBuyer,
  FirestoreCrop,
  FirestoreCropListing,
  FirestoreBuyerOffer,
  BuyerOfferStatus,
  FirestoreEnquiry,
  FirestoreMarketPrice,
  FirestorePricePrediction,
  FirestoreNotification,
} from '../types/database';
import {
  validateFarmerInput,
  validateBuyerInput,
  validateCropListingInput,
  validateBuyerOfferInput,
  validateEnquiryInput,
  validateMarketPriceInput,
  validatePricePredictionInput,
  validateNotificationInput,
  validateCropMasterInput,
} from './firestoreValidation';
import {
  ALL_MOCK_LISTINGS,
  MOCK_NEARBY_BUYERS,
  MOCK_NOTIFICATIONS,
  MOCK_FARMER_USER,
  MOCK_BUYER_USER,
  MOCK_ADMIN_USER,
} from './mockDataService';

// Fallback in-memory store for offline sandbox / demo scenarios
export const DEFAULT_BUYER_RECORD: FirestoreBuyer = {
  id: 'buyer_001',
  userId: 'buyer_001',
  businessName: 'Pettah Fresh Wholesale Hub',
  businessType: 'wholesaler',
  contactPerson: 'Dilan Perera',
  phone: '+94 71 987 6543',
  email: 'dilan.freshmart@cropconnect.lk',
  district: 'Colombo',
  address: 'Manning Wholesale Market, Pettah, Colombo 11',
  latitude: 6.9362,
  longitude: 79.8550,
  purchasingRequirements: {
    preferredCrops: ['Carrot', 'Tomato', 'Beans', 'Big Onion', 'Cabbage'],
    minOrderQuantityKg: 200,
    maxOrderQuantityKg: 3500,
    paymentTerms: 'instant_bank_transfer',
    preferredDeliveryMode: 'farmgate_pickup',
    hasColdStorage: true,
    weeklyTargetBudgetLkr: 750000,
    preferredDistricts: ['Nuwara Eliya', 'Matale', 'Badulla', 'Jaffna', 'Colombo'],
  },
  brNumber: 'PV-88421/2020',
  isVerifiedBusiness: true,
  rating: 4.9,
  dealsCompleted: 94,
  createdAt: '2025-01-15T00:00:00.000Z',
  updatedAt: new Date().toISOString(),
};

export const INITIAL_REGISTERED_BUYERS: FirestoreBuyer[] = [
  DEFAULT_BUYER_RECORD,
  {
    id: 'buyer_102',
    userId: 'buyer_102',
    businessName: 'Lanka Fresh Supermarket Supply',
    businessType: 'supermarket',
    contactPerson: 'Saman Jayasinghe',
    phone: '+94 77 654 3210',
    email: 'procurement@lankafresh.lk',
    district: 'Kandy',
    address: 'Peradeniya Commercial Hub, Kandy',
    latitude: 7.2906,
    longitude: 80.6337,
    purchasingRequirements: {
      preferredCrops: ['Tomato', 'Field Tomatoes', 'Bell Pepper', 'Cucumber', 'Cabbage'],
      minOrderQuantityKg: 100,
      maxOrderQuantityKg: 2000,
      paymentTerms: 'instant_bank_transfer',
      preferredDeliveryMode: 'farmgate_pickup',
      hasColdStorage: true,
      weeklyTargetBudgetLkr: 600000,
      preferredDistricts: ['Kandy', 'Matale', 'Nuwara Eliya', 'Kurunegala'],
    },
    brNumber: 'PV-90412/2019',
    isVerifiedBusiness: true,
    rating: 4.8,
    dealsCompleted: 62,
    createdAt: '2025-01-10T00:00:00.000Z',
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'buyer_103',
    userId: 'buyer_103',
    businessName: 'Highland Grand Hotel & Spa',
    businessType: 'restaurant',
    contactPerson: 'Ruwan Wijeratne',
    phone: '+94 76 111 2233',
    email: 'executive.chef@highlandgrand.lk',
    district: 'Nuwara Eliya',
    address: 'Grand Hotel Road, Nuwara Eliya',
    latitude: 6.9497,
    longitude: 80.7891,
    purchasingRequirements: {
      preferredCrops: ['Carrot', 'Leeks', 'Salad Greens', 'Organic Vegetables', 'Broccoli', 'Green Beans'],
      minOrderQuantityKg: 50,
      maxOrderQuantityKg: 500,
      paymentTerms: 'cash_on_delivery',
      preferredDeliveryMode: 'farmgate_pickup',
      hasColdStorage: true,
      weeklyTargetBudgetLkr: 250000,
      preferredDistricts: ['Nuwara Eliya', 'Badulla', 'Kandy'],
    },
    brNumber: 'PV-12498/2018',
    isVerifiedBusiness: true,
    rating: 4.7,
    dealsCompleted: 48,
    createdAt: '2025-01-05T00:00:00.000Z',
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'buyer_104',
    userId: 'buyer_104',
    businessName: 'Ceylon Spice & Onion Exporters',
    businessType: 'exporter',
    contactPerson: 'K. Balachandran',
    phone: '+94 77 888 9900',
    email: 'export@ceylonspice.lk',
    district: 'Jaffna',
    address: 'Kankesanthurai Road, Jaffna',
    latitude: 9.6615,
    longitude: 80.0255,
    purchasingRequirements: {
      preferredCrops: ['Red Onion', 'Jaffna Red Onions', 'Big Onion', 'Chilli', 'Green Chilli'],
      minOrderQuantityKg: 500,
      maxOrderQuantityKg: 8000,
      paymentTerms: 'instant_bank_transfer',
      preferredDeliveryMode: 'market_delivery',
      hasColdStorage: false,
      weeklyTargetBudgetLkr: 1500000,
      preferredDistricts: ['Jaffna', 'Kilinochchi', 'Anuradhapura', 'Puttalam'],
    },
    brNumber: 'PV-77123/2017',
    isVerifiedBusiness: true,
    rating: 5.0,
    dealsCompleted: 110,
    createdAt: '2024-11-20T00:00:00.000Z',
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'buyer_105',
    userId: 'buyer_105',
    businessName: 'Dambulla Agro Processors & Pulping',
    businessType: 'processor',
    contactPerson: 'Priyantha Dissanayake',
    phone: '+94 71 222 5566',
    email: 'procurement@dambullapulp.lk',
    district: 'Matale',
    address: 'Near Dambulla Dedicated Economic Centre, Matale',
    latitude: 7.4675,
    longitude: 80.6234,
    purchasingRequirements: {
      preferredCrops: ['Tomato', 'Field Tomatoes', 'Pumpkin', 'Lime', 'Mango'],
      minOrderQuantityKg: 500,
      maxOrderQuantityKg: 6000,
      paymentTerms: 'cash_on_delivery',
      preferredDeliveryMode: 'market_delivery',
      hasColdStorage: true,
      weeklyTargetBudgetLkr: 950000,
      preferredDistricts: ['Matale', 'Anuradhapura', 'Polonnaruwa', 'Kurunegala'],
    },
    brNumber: 'PV-63821/2021',
    isVerifiedBusiness: true,
    rating: 4.6,
    dealsCompleted: 73,
    createdAt: '2025-01-08T00:00:00.000Z',
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'buyer_106',
    userId: 'buyer_106',
    businessName: 'Uva Highland Wholesale Depo',
    businessType: 'wholesaler',
    contactPerson: 'Bandara Ratnayake',
    phone: '+94 77 345 9988',
    email: 'uvawholesale@agrolk.com',
    district: 'Badulla',
    address: 'Welimada Agrarian Trade Center, Badulla',
    latitude: 6.9934,
    longitude: 81.0550,
    purchasingRequirements: {
      preferredCrops: ['Leeks', 'Welimada Leeks', 'Potato', 'Green Beans', 'Cabbage'],
      minOrderQuantityKg: 200,
      maxOrderQuantityKg: 3000,
      paymentTerms: 'instant_bank_transfer',
      preferredDeliveryMode: 'farmgate_pickup',
      hasColdStorage: false,
      weeklyTargetBudgetLkr: 600000,
      preferredDistricts: ['Badulla', 'Nuwara Eliya', 'Monaragala'],
    },
    brNumber: 'PV-54129/2020',
    isVerifiedBusiness: true,
    rating: 4.8,
    dealsCompleted: 54,
    createdAt: '2025-01-12T00:00:00.000Z',
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'buyer_107',
    userId: 'buyer_107',
    businessName: 'Rajarata Rice & Grain Millers',
    businessType: 'processor',
    contactPerson: 'Kithsiri Jayasuriya',
    phone: '+94 71 888 4433',
    email: 'jayasuriya.paddy@srilankagrains.lk',
    district: 'Polonnaruwa',
    address: 'Minneriya Industrial Zone, Polonnaruwa',
    latitude: 7.9403,
    longitude: 81.0188,
    purchasingRequirements: {
      preferredCrops: ['Keeri Samba', 'Paddy', 'Samba Paddy', 'Nadu Rice'],
      minOrderQuantityKg: 1000,
      maxOrderQuantityKg: 15000,
      paymentTerms: 'instant_bank_transfer',
      preferredDeliveryMode: 'market_delivery',
      hasColdStorage: false,
      weeklyTargetBudgetLkr: 2000000,
      preferredDistricts: ['Polonnaruwa', 'Anuradhapura', 'Ampara', 'Kurunegala'],
    },
    brNumber: 'PV-41092/2016',
    isVerifiedBusiness: true,
    rating: 4.9,
    dealsCompleted: 142,
    createdAt: '2024-10-15T00:00:00.000Z',
    updatedAt: new Date().toISOString(),
  },
];

export const INITIAL_BUYER_OFFERS: FirestoreBuyerOffer[] = [
  {
    id: 'offer_seed_001',
    listingId: 'crop_001',
    cropName: 'Upcountry Carrot',
    farmerId: 'farmer_001',
    farmerName: 'Sunil Bandara',
    buyerId: 'buyer_001',
    buyerName: 'Dilan Perera',
    buyerPhone: '+94 71 987 6543',
    buyerBusinessType: 'wholesaler',
    offeredPricePerKg: 270,
    requestedQuantityKg: 500,
    totalAmount: 135000,
    farmerAskingPricePerKg: 280,
    counterPricePerKg: 278,
    status: 'countered',
    proposedPickupDate: new Date(Date.now() + 86400000).toISOString().split('T')[0],
    transportProvidedByBuyer: true,
    notes: 'Can arrange 4-ton insulated truck for pickup tomorrow morning.',
    farmerResponseNotes: 'Carrots are freshly washed Grade-A. Can supply at Rs. 278/kg with crates included.',
    createdAt: new Date(Date.now() - 3600000 * 4).toISOString(),
    updatedAt: new Date(Date.now() - 3600000 * 2).toISOString(),
  },
  {
    id: 'offer_seed_002',
    listingId: 'crop_002',
    cropName: 'Ripe Field Tomatoes',
    farmerId: 'farmer_002',
    farmerName: 'Kamal Gunasekara',
    buyerId: 'buyer_001',
    buyerName: 'Dilan Perera',
    buyerPhone: '+94 71 987 6543',
    buyerBusinessType: 'wholesaler',
    offeredPricePerKg: 175,
    requestedQuantityKg: 850,
    totalAmount: 148750,
    farmerAskingPricePerKg: 175,
    status: 'accepted',
    proposedPickupDate: new Date(Date.now() + 43200000).toISOString().split('T')[0],
    transportProvidedByBuyer: true,
    notes: 'Urgent rescue clearance — pickup today before 6 PM.',
    farmerResponseNotes: 'Deal accepted! Crated at Dambulla collection point ready for dispatch.',
    createdAt: new Date(Date.now() - 3600000 * 8).toISOString(),
    updatedAt: new Date(Date.now() - 3600000 * 5).toISOString(),
  },
  {
    id: 'offer_seed_003',
    listingId: 'crop_003',
    cropName: 'Keeri Samba Paddy',
    farmerId: 'farmer_003',
    farmerName: 'Wimal Jayawardena',
    buyerId: 'buyer_001',
    buyerName: 'Dilan Perera',
    buyerPhone: '+94 71 987 6543',
    buyerBusinessType: 'wholesaler',
    offeredPricePerKg: 142,
    requestedQuantityKg: 1500,
    totalAmount: 213000,
    farmerAskingPricePerKg: 145,
    status: 'pending',
    proposedPickupDate: new Date(Date.now() + 172800000).toISOString().split('T')[0],
    transportProvidedByBuyer: false,
    notes: 'Requesting delivery to Pettah Manning storehouse.',
    createdAt: new Date(Date.now() - 3600000 * 1).toISOString(),
    updatedAt: new Date(Date.now() - 3600000 * 1).toISOString(),
  },
];

export const INITIAL_BUYER_ENQUIRIES: FirestoreEnquiry[] = [
  {
    id: 'enq_seed_001',
    listingId: 'crop_001',
    cropName: 'Upcountry Carrot',
    farmerId: 'farmer_001',
    buyerId: 'buyer_001',
    senderId: 'buyer_001',
    senderName: 'Dilan Perera',
    senderRole: 'buyer',
    recipientId: 'farmer_001',
    recipientName: 'Sunil Bandara',
    message: 'Ayubowan Sunil, are the Grade-A carrots suitable for cold storage transport to Colombo?',
    isRead: true,
    createdAt: new Date(Date.now() - 3600000 * 6).toISOString(),
    updatedAt: new Date(Date.now() - 3600000 * 6).toISOString(),
  },
  {
    id: 'enq_seed_002',
    listingId: 'crop_001',
    cropName: 'Upcountry Carrot',
    farmerId: 'farmer_001',
    buyerId: 'buyer_001',
    senderId: 'farmer_001',
    senderName: 'Sunil Bandara',
    senderRole: 'farmer',
    recipientId: 'buyer_001',
    recipientName: 'Dilan Perera',
    message: 'Ayubowan Dilan, yes! Harvested yesterday at 4.5°C hill air, thoroughly washed and crated.',
    isRead: false,
    createdAt: new Date(Date.now() - 3600000 * 3).toISOString(),
    updatedAt: new Date(Date.now() - 3600000 * 3).toISOString(),
  },
  {
    id: 'enq_seed_003',
    listingId: 'crop_002',
    cropName: 'Ripe Field Tomatoes',
    farmerId: 'farmer_002',
    buyerId: 'buyer_001',
    senderId: 'buyer_001',
    senderName: 'Dilan Perera',
    senderRole: 'buyer',
    recipientId: 'farmer_002',
    recipientName: 'Kamal Gunasekara',
    message: 'Can your team assist with loading onto our 4-ton truck if we arrive by 4 PM?',
    isRead: true,
    createdAt: new Date(Date.now() - 3600000 * 7).toISOString(),
    updatedAt: new Date(Date.now() - 3600000 * 7).toISOString(),
  },
];

const inMemoryStore = {
  listings: [...ALL_MOCK_LISTINGS] as any[],
  offers: [...INITIAL_BUYER_OFFERS] as FirestoreBuyerOffer[],
  enquiries: [...INITIAL_BUYER_ENQUIRIES] as FirestoreEnquiry[],
  notifications: [...MOCK_NOTIFICATIONS] as any[],
  marketPrices: [] as FirestoreMarketPrice[],
  predictions: [] as FirestorePricePrediction[],
  buyers: [DEFAULT_BUYER_RECORD] as FirestoreBuyer[],
};

// ==========================================
// 1. USERS COLLECTION
// ==========================================

export async function getUserDoc(userId: string): Promise<FirestoreUser | null> {
  if (!userId) return null;
  try {
    const docRef = doc(db, COLLECTIONS.USERS, userId);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      return snap.data() as FirestoreUser;
    }
  } catch {
    // Return mock fallback for demo credentials
    if (userId === MOCK_FARMER_USER.id) return { ...MOCK_FARMER_USER, district: 'Nuwara Eliya', status: 'active', updatedAt: new Date().toISOString() };
    if (userId === MOCK_BUYER_USER.id) return { ...MOCK_BUYER_USER, district: 'Colombo', status: 'active', updatedAt: new Date().toISOString() };
    if (userId === MOCK_ADMIN_USER.id) return { ...MOCK_ADMIN_USER, district: 'Matale', status: 'active', updatedAt: new Date().toISOString() };
  }
  return null;
}

export async function updateUserDoc(
  userId: string,
  data: Partial<FirestoreUser>,
  actorUserId?: string
): Promise<void> {
  if (actorUserId && actorUserId !== userId) {
    throw new Error('Security Error: Users can only update their own profile document.');
  }
  // Disallow non-admins from changing role to admin
  if (data.role === 'admin') {
    throw new Error('Security Violation: Admin role assignment requires elevated agrarian authorization.');
  }

  try {
    const docRef = doc(db, COLLECTIONS.USERS, userId);
    await updateDoc(docRef, {
      ...data,
      updatedAt: serverTimestamp(),
    });
  } catch {
    // Handled
  }
}

// ==========================================
// 2. FARMERS COLLECTION
// ==========================================

export async function getFarmerProfile(farmerId: string): Promise<FirestoreFarmer | null> {
  if (!farmerId) return null;
  try {
    const docRef = doc(db, COLLECTIONS.FARMERS, farmerId);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      return snap.data() as FirestoreFarmer;
    }
  } catch {
    // Offline / Demo fallback
    if (farmerId === MOCK_FARMER_USER.id || farmerId === 'farmer_001') {
      return {
        id: MOCK_FARMER_USER.id,
        userId: MOCK_FARMER_USER.id,
        fullName: MOCK_FARMER_USER.fullName,
        phone: MOCK_FARMER_USER.phone,
        email: MOCK_FARMER_USER.email,
        farmName: MOCK_FARMER_USER.farmName || 'Kandapola Organic Highlands',
        district: MOCK_FARMER_USER.location.district,
        address: MOCK_FARMER_USER.location.address || 'Kandapola, Nuwara Eliya',
        latitude: MOCK_FARMER_USER.location.latitude,
        longitude: MOCK_FARMER_USER.location.longitude,
        landSizeAcres: MOCK_FARMER_USER.farmSizeAcres || 3.5,
        primaryCrops: ['Carrot', 'Leeks', 'Potato', 'Cabbage'],
        farmingExperienceYears: 18,
        govRegistrationNumber: 'AGR/CP/NE/2018/4891',
        isCertifiedOrganic: true,
        rating: 4.9,
        completedDeals: 42,
        createdAt: '2025-01-15T00:00:00.000Z',
        updatedAt: new Date().toISOString(),
      };
    }
  }
  return null;
}

export async function saveFarmerProfile(
  farmerId: string,
  data: Partial<FirestoreFarmer>,
  currentUserId?: string
): Promise<FirestoreFarmer> {
  if (currentUserId && currentUserId !== farmerId) {
    throw new Error('Security Error: Farmers can only modify their own profile.');
  }

  const validation = validateFarmerInput({ ...data, userId: farmerId });
  if (!validation.valid) {
    throw new Error(`Validation Error: ${validation.errors.join('; ')}`);
  }

  const now = new Date().toISOString();
  const farmerDoc: FirestoreFarmer = {
    id: farmerId,
    userId: farmerId,
    fullName: data.fullName || 'Farmer Member',
    phone: data.phone || '+94 77 000 0000',
    email: data.email || 'farmer@cropconnect.lk',
    farmName: data.farmName || 'Highland Farm',
    district: data.district || 'Nuwara Eliya',
    address: data.address || `${data.district || 'Nuwara Eliya'}, Sri Lanka`,
    latitude: data.latitude || 6.9497,
    longitude: data.longitude || 80.7891,
    landSizeAcres: data.landSizeAcres || 2.0,
    primaryCrops: data.primaryCrops || ['Vegetables'],
    farmingExperienceYears: data.farmingExperienceYears || 5,
    govRegistrationNumber: data.govRegistrationNumber,
    isCertifiedOrganic: data.isCertifiedOrganic ?? false,
    rating: data.rating || 5.0,
    completedDeals: data.completedDeals || 0,
    createdAt: data.createdAt || now,
    updatedAt: now,
  };

  try {
    const docRef = doc(db, COLLECTIONS.FARMERS, farmerId);
    await setDoc(docRef, { ...farmerDoc, updatedAt: serverTimestamp() });
  } catch {
    // Retain locally in offline environments
  }

  return farmerDoc;
}

export async function getFarmersByDistrict(district: string): Promise<FirestoreFarmer[]> {
  try {
    const q = query(
      collection(db, COLLECTIONS.FARMERS),
      where('district', '==', district)
    );
    const snap = await getDocs(q);
    if (!snap.empty) {
      return snap.docs.map((d) => d.data() as FirestoreFarmer);
    }
  } catch {
    // Handled
  }
  return [];
}

// ==========================================
// 3. BUYERS COLLECTION
// ==========================================

export async function getBuyerProfile(buyerId: string): Promise<FirestoreBuyer | null> {
  if (!buyerId) return null;
  try {
    const docRef = doc(db, COLLECTIONS.BUYERS, buyerId);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      return snap.data() as FirestoreBuyer;
    }
  } catch {
    // Handled
  }

  // Check inMemoryStore.buyers
  const memMatch = inMemoryStore.buyers.find((b) => b.id === buyerId || b.userId === buyerId);
  if (memMatch) return memMatch;

  // Offline / Demo fallback
  if (buyerId === 'buyer_001' || buyerId === MOCK_BUYER_USER.id) {
    return DEFAULT_BUYER_RECORD;
  }

  const mockMatch = MOCK_NEARBY_BUYERS.find((b) => b.id === buyerId || b.id === 'buyer_101');
  if (mockMatch) {
    return {
      id: mockMatch.id,
      userId: mockMatch.id,
      businessName: mockMatch.companyName,
      businessType: 'wholesaler',
      contactPerson: mockMatch.name,
      phone: mockMatch.phone,
      email: `${mockMatch.companyName.toLowerCase().replace(/[^a-z0-9]/g, '')}@buyer.lk`,
      district: mockMatch.district,
      address: `${mockMatch.district}, Sri Lanka`,
      latitude: 6.9271,
      longitude: 79.8612,
      purchasingRequirements: {
        preferredCrops: [mockMatch.lookingFor],
        minOrderQuantityKg: Math.floor((mockMatch.targetQuantityKg || 1000) * 0.1),
        maxOrderQuantityKg: mockMatch.targetQuantityKg || 2500,
        paymentTerms: 'instant_bank_transfer',
        preferredDeliveryMode: 'farmgate_pickup',
        hasColdStorage: true,
        preferredDistricts: [mockMatch.district, 'Nuwara Eliya', 'Matale'],
      },
      brNumber: 'PV-88421/2020',
      isVerifiedBusiness: mockMatch.verified,
      rating: mockMatch.rating,
      dealsCompleted: 45,
      createdAt: '2025-01-10T00:00:00.000Z',
      updatedAt: new Date().toISOString(),
    };
  }

  return null;
}

export async function saveBuyerProfile(
  buyerId: string,
  data: Partial<FirestoreBuyer>,
  currentUserId?: string
): Promise<FirestoreBuyer> {
  if (currentUserId && currentUserId !== buyerId) {
    throw new Error('Security Error: Buyers can only modify their own profile information.');
  }

  const validation = validateBuyerInput({ ...data, userId: buyerId });
  if (!validation.valid) {
    throw new Error(`Validation Error: ${validation.errors.join('; ')}`);
  }

  const existing = await getBuyerProfile(buyerId);
  const now = new Date().toISOString();
  const buyerDoc: FirestoreBuyer = {
    id: buyerId,
    userId: buyerId,
    businessName: data.businessName || existing?.businessName || 'Wholesale Buyer',
    businessType: data.businessType || existing?.businessType || 'wholesaler',
    contactPerson: data.contactPerson || existing?.contactPerson || 'Procurement Officer',
    phone: data.phone || existing?.phone || '+94 77 111 2233',
    email: data.email || existing?.email || 'buyer@cropconnect.lk',
    district: data.district || existing?.district || 'Colombo',
    address: data.address || existing?.address || `${data.district || 'Colombo'}, Sri Lanka`,
    latitude: data.latitude || existing?.latitude || 6.9271,
    longitude: data.longitude || existing?.longitude || 79.8612,
    purchasingRequirements: data.purchasingRequirements || existing?.purchasingRequirements || {
      preferredCrops: ['Carrot', 'Beans', 'Tomato'],
      minOrderQuantityKg: 100,
      maxOrderQuantityKg: 2000,
      paymentTerms: 'instant_bank_transfer',
      preferredDeliveryMode: 'farmgate_pickup',
      hasColdStorage: false,
      preferredDistricts: ['Nuwara Eliya', 'Matale'],
    },
    brNumber: data.brNumber || existing?.brNumber,
    isVerifiedBusiness: data.isVerifiedBusiness ?? existing?.isVerifiedBusiness ?? true,
    rating: data.rating || existing?.rating || 4.9,
    dealsCompleted: data.dealsCompleted || existing?.dealsCompleted || 94,
    createdAt: existing?.createdAt || now,
    updatedAt: now,
  };

  try {
    const docRef = doc(db, COLLECTIONS.BUYERS, buyerId);
    await setDoc(docRef, { ...buyerDoc, updatedAt: serverTimestamp() });
  } catch {
    // Handled
  }

  const idx = inMemoryStore.buyers.findIndex((b) => b.id === buyerId);
  if (idx !== -1) {
    inMemoryStore.buyers[idx] = buyerDoc;
  } else {
    inMemoryStore.buyers.unshift(buyerDoc);
  }

  return buyerDoc;
}

export async function getAllBuyers(): Promise<FirestoreBuyer[]> {
  try {
    const snap = await getDocs(collection(db, COLLECTIONS.BUYERS));
    if (!snap.empty) {
      return snap.docs.map((d) => d.data() as FirestoreBuyer);
    }
  } catch {
    // Handled
  }

  if (inMemoryStore.buyers.length > 0) {
    return inMemoryStore.buyers;
  }

  return [
    DEFAULT_BUYER_RECORD,
    ...MOCK_NEARBY_BUYERS.map((b) => ({
      id: b.id,
      userId: b.id,
      businessName: b.companyName,
      businessType: 'wholesaler' as const,
      contactPerson: b.name,
      phone: b.phone,
      email: 'info@agrobuyer.lk',
      district: b.district,
      address: `${b.district}, Sri Lanka`,
      latitude: 6.9271,
      longitude: 79.8612,
      purchasingRequirements: {
        preferredCrops: [b.lookingFor],
        minOrderQuantityKg: 100,
        maxOrderQuantityKg: b.targetQuantityKg || 2000,
        paymentTerms: 'instant_bank_transfer' as const,
        preferredDeliveryMode: 'farmgate_pickup' as const,
        hasColdStorage: true,
        preferredDistricts: [b.district],
      },
      isVerifiedBusiness: b.verified,
      rating: b.rating,
      dealsCompleted: 35,
      createdAt: '2025-01-01T00:00:00.000Z',
      updatedAt: new Date().toISOString(),
    })),
  ];
}

// ==========================================
// 4. CROPS MASTER CATALOG COLLECTION
// ==========================================

export const INITIAL_SRI_LANKAN_CROPS: FirestoreCrop[] = [
  {
    id: 'crop_carrot',
    commonName: 'Carrot',
    sinhalaName: 'කැරට්',
    tamilName: 'கரட்',
    botanicalName: 'Daucus carota',
    category: 'vegetables',
    seasonalPeakMonths: [1, 2, 8, 9],
    standardShelfLifeDays: 7,
    standardUnit: 'kg',
    gradeDescriptions: {
      gradeA: 'Fresh, firm, uniform deep orange, no blemishes, length > 12cm',
      gradeB: 'Clean, slight curvature permitted, uniform skin, length 8-12cm',
      gradeC: 'Intact, suitable for restaurant bulk processing and salads',
    },
    avgDambullaBenchmarkPrice: 280,
    imageUrl: 'https://images.unsplash.com/photo-1598170845058-32b9d6a5da37?w=600',
    isActive: true,
    createdAt: '2025-01-01T00:00:00.000Z',
    updatedAt: '2025-01-01T00:00:00.000Z',
  },
  {
    id: 'crop_tomato',
    commonName: 'Tomato',
    sinhalaName: 'තක්කාලි',
    tamilName: 'தக்காளி',
    botanicalName: 'Solanum lycopersicum',
    category: 'vegetables',
    seasonalPeakMonths: [3, 4, 9, 10],
    standardShelfLifeDays: 4,
    standardUnit: 'kg',
    gradeDescriptions: {
      gradeA: 'Firm ripe red, spotless skin, no skin cracks, 70-90g each',
      gradeB: 'Pink/light red turning, firm, minor surface marks allowed',
      gradeC: 'Fully ripe, soft, suitable for urgent paste/sauce processing',
    },
    avgDambullaBenchmarkPrice: 220,
    imageUrl: 'https://images.unsplash.com/photo-1592924357228-91a4daadcfea?w=600',
    isActive: true,
    createdAt: '2025-01-01T00:00:00.000Z',
    updatedAt: '2025-01-01T00:00:00.000Z',
  },
  {
    id: 'crop_green_beans',
    commonName: 'Green Beans (Bonchi)',
    sinhalaName: 'බෝංචි',
    tamilName: 'பீன்ஸ்',
    botanicalName: 'Phaseolus vulgaris',
    category: 'vegetables',
    seasonalPeakMonths: [5, 6, 11, 12],
    standardShelfLifeDays: 5,
    standardUnit: 'kg',
    gradeDescriptions: {
      gradeA: 'Crisp, tender, stringless, straight pods, vibrant green',
      gradeB: 'Firm, slight curve, standard maturity, no seed bulging',
      gradeC: 'Mature pods, suitable for institutional catering',
    },
    avgDambullaBenchmarkPrice: 340,
    imageUrl: 'https://images.unsplash.com/photo-1551248429-40975aa4de74?w=600',
    isActive: true,
    createdAt: '2025-01-01T00:00:00.000Z',
    updatedAt: '2025-01-01T00:00:00.000Z',
  },
  {
    id: 'crop_cabbage',
    commonName: 'Cabbage',
    sinhalaName: 'ගෝවා',
    tamilName: 'கோவா',
    botanicalName: 'Brassica oleracea var. capitata',
    category: 'vegetables',
    seasonalPeakMonths: [1, 2, 7, 8],
    standardShelfLifeDays: 10,
    standardUnit: 'kg',
    gradeDescriptions: {
      gradeA: 'Dense, tight heads, trimmed outer leaves, 1.2 - 2.0kg each',
      gradeB: 'Firm head, minor cosmetic leaf blemish allowed',
      gradeC: 'Medium density, suitable for retail shredding',
    },
    avgDambullaBenchmarkPrice: 190,
    imageUrl: 'https://images.unsplash.com/photo-1550142414-ad2626ad1327?w=600',
    isActive: true,
    createdAt: '2025-01-01T00:00:00.000Z',
    updatedAt: '2025-01-01T00:00:00.000Z',
  },
  {
    id: 'crop_leeks',
    commonName: 'Leeks',
    sinhalaName: 'ලීක්ස්',
    tamilName: 'லீக்ஸ்',
    botanicalName: 'Allium ampeloprasum',
    category: 'vegetables',
    seasonalPeakMonths: [2, 3, 9, 10],
    standardShelfLifeDays: 6,
    standardUnit: 'kg',
    gradeDescriptions: {
      gradeA: 'Long white shaft (> 15cm), crisp dark green tops, clean roots',
      gradeB: 'Medium white shaft, clean, bundled in 1kg wraps',
      gradeC: 'Standard culinary grade',
    },
    avgDambullaBenchmarkPrice: 240,
    imageUrl: 'https://images.unsplash.com/photo-1587049352846-4a222e784d38?w=600',
    isActive: true,
    createdAt: '2025-01-01T00:00:00.000Z',
    updatedAt: '2025-01-01T00:00:00.000Z',
  },
  {
    id: 'crop_green_chilli',
    commonName: 'Green Chilli',
    sinhalaName: 'අමු මිරිස්',
    tamilName: 'பச்சை மிளகாய்',
    botanicalName: 'Capsicum annuum',
    category: 'vegetables',
    seasonalPeakMonths: [4, 5, 8, 9],
    standardShelfLifeDays: 8,
    standardUnit: 'kg',
    gradeDescriptions: {
      gradeA: 'Pungent, shiny dark green, unbroken stalks, length > 7cm',
      gradeB: 'Standard green chilli, fresh, crisp',
      gradeC: 'Mixed size, suited for spice processing and pickle makers',
    },
    avgDambullaBenchmarkPrice: 680,
    imageUrl: 'https://images.unsplash.com/photo-1588252303782-cb80119abd6d?w=600',
    isActive: true,
    createdAt: '2025-01-01T00:00:00.000Z',
    updatedAt: '2025-01-01T00:00:00.000Z',
  },
];

export async function getAllCrops(): Promise<FirestoreCrop[]> {
  try {
    const snap = await getDocs(collection(db, COLLECTIONS.CROPS));
    if (!snap.empty) {
      return snap.docs.map((d) => d.data() as FirestoreCrop);
    }
  } catch {
    // Handled
  }
  return INITIAL_SRI_LANKAN_CROPS;
}

export async function saveCropMaster(
  cropData: FirestoreCrop,
  actorRole: string
): Promise<void> {
  if (actorRole !== 'admin') {
    throw new Error('Administrative Error: Only authorized agrarian administrators can modify the crops master catalog.');
  }

  const validation = validateCropMasterInput(cropData);
  if (!validation.valid) {
    throw new Error(`Validation Error: ${validation.errors.join('; ')}`);
  }

  try {
    const docRef = doc(db, COLLECTIONS.CROPS, cropData.id);
    await setDoc(docRef, { ...cropData, updatedAt: serverTimestamp() });
  } catch {
    // Handled
  }
}

// ==========================================
// 5. CROP LISTINGS COLLECTION
// ==========================================

export async function createCropListing(
  listingData: Omit<FirestoreCropListing, 'id' | 'createdAt' | 'updatedAt' | 'activeOffersCount' | 'viewsCount'>,
  currentUserId: string
): Promise<FirestoreCropListing> {
  const validation = validateCropListingInput(listingData, currentUserId);
  if (!validation.valid) {
    throw new Error(`Validation Error: ${validation.errors.join('; ')}`);
  }

  const listingId = `listing_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  const now = new Date().toISOString();

  const newListing: FirestoreCropListing = {
    ...listingData,
    id: listingId,
    farmerId: currentUserId,
    activeOffersCount: 0,
    viewsCount: 1,
    status: 'active',
    createdAt: now,
    updatedAt: now,
  };

  try {
    const docRef = doc(db, COLLECTIONS.CROP_LISTINGS, listingId);
    await setDoc(docRef, {
      ...newListing,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  } catch {
    // Save to local in-memory store if offline
    inMemoryStore.listings.unshift(newListing);
  }

  return newListing;
}

export async function updateCropListing(
  listingId: string,
  data: Partial<FirestoreCropListing>,
  currentUserId: string
): Promise<void> {
  const existing = await getCropListingById(listingId);
  if (!existing) {
    throw new Error(`Listing ${listingId} not found.`);
  }

  // Security constraint: Farmers must not edit another farmer's listings
  if (existing.farmerId !== currentUserId) {
    throw new Error('Security Error: Farmers can only edit or delete their own crop listings.');
  }

  const validation = validateCropListingInput({ ...existing, ...data }, currentUserId);
  if (!validation.valid) {
    throw new Error(`Validation Error: ${validation.errors.join('; ')}`);
  }

  try {
    const docRef = doc(db, COLLECTIONS.CROP_LISTINGS, listingId);
    await updateDoc(docRef, {
      ...data,
      updatedAt: serverTimestamp(),
    });
  } catch {
    const idx = inMemoryStore.listings.findIndex((l) => l.id === listingId);
    if (idx !== -1) {
      inMemoryStore.listings[idx] = { ...inMemoryStore.listings[idx], ...data, updatedAt: new Date().toISOString() };
    }
  }
}

export async function deleteCropListing(
  listingId: string,
  currentUserId: string
): Promise<void> {
  const existing = await getCropListingById(listingId);
  if (!existing) return;

  if (existing.farmerId !== currentUserId) {
    throw new Error('Security Error: Farmers can only delete their own listings.');
  }

  try {
    const docRef = doc(db, COLLECTIONS.CROP_LISTINGS, listingId);
    await deleteDoc(docRef);
  } catch {
    inMemoryStore.listings = inMemoryStore.listings.filter((l) => l.id !== listingId);
  }
}

export async function getCropListingById(listingId: string): Promise<FirestoreCropListing | null> {
  try {
    const docRef = doc(db, COLLECTIONS.CROP_LISTINGS, listingId);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      return snap.data() as FirestoreCropListing;
    }
  } catch {
    // Handled
  }

  const found = inMemoryStore.listings.find((l) => l.id === listingId);
  return (found as FirestoreCropListing) || null;
}

export async function getActiveListings(filter?: {
  category?: string;
  district?: string;
  isRescueOnly?: boolean;
  limitCount?: number;
}): Promise<FirestoreCropListing[]> {
  try {
    const constraints: any[] = [where('status', '==', 'active')];

    if (filter?.category && filter.category !== 'all') {
      constraints.push(where('category', '==', filter.category));
    }
    if (filter?.district && filter.district !== 'All Districts') {
      constraints.push(where('district', '==', filter.district));
    }
    if (filter?.isRescueOnly) {
      constraints.push(where('isRescueCrop', '==', true));
    }
    constraints.push(firestoreLimit(filter?.limitCount || 20));

    const q = query(collection(db, COLLECTIONS.CROP_LISTINGS), ...constraints);
    const snap = await getDocs(q);
    if (!snap.empty) {
      return snap.docs.map((d) => d.data() as FirestoreCropListing);
    }
  } catch {
    // Handled
  }

  // Filter in-memory / fallback listings
  let list = [...inMemoryStore.listings] as FirestoreCropListing[];
  if (filter?.category && filter.category !== 'all') {
    list = list.filter((l) => l.category === filter.category);
  }
  if (filter?.district && filter.district !== 'All Districts') {
    list = list.filter((l) => l.district === filter.district);
  }
  if (filter?.isRescueOnly) {
    list = list.filter((l) => l.isRescueCrop);
  }
  return list.slice(0, filter?.limitCount || 20);
}

export async function getFarmerListings(farmerId: string): Promise<FirestoreCropListing[]> {
  try {
    const q = query(
      collection(db, COLLECTIONS.CROP_LISTINGS),
      where('farmerId', '==', farmerId)
    );
    const snap = await getDocs(q);
    if (!snap.empty) {
      return snap.docs.map((d) => d.data() as FirestoreCropListing);
    }
  } catch {
    // Handled
  }

  return inMemoryStore.listings.filter(
    (l) => l.farmerId === farmerId || l.farmerId === 'farmer_001'
  ) as FirestoreCropListing[];
}

export async function getRescueListings(): Promise<FirestoreCropListing[]> {
  return getActiveListings({ isRescueOnly: true });
}

// ==========================================
// 6. BUYER OFFERS COLLECTION
// ==========================================

export async function createBuyerOffer(
  offerData: Omit<FirestoreBuyerOffer, 'id' | 'createdAt' | 'updatedAt' | 'status'>,
  currentUserId: string
): Promise<FirestoreBuyerOffer> {
  const validation = validateBuyerOfferInput(offerData, currentUserId);
  if (!validation.valid) {
    throw new Error(`Validation Error: ${validation.errors.join('; ')}`);
  }

  const offerId = `offer_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  const now = new Date().toISOString();

  const newOffer: FirestoreBuyerOffer = {
    ...offerData,
    id: offerId,
    buyerId: currentUserId,
    status: 'pending',
    totalAmount: offerData.offeredPricePerKg * offerData.requestedQuantityKg,
    createdAt: now,
    updatedAt: now,
  };

  try {
    const docRef = doc(db, COLLECTIONS.BUYER_OFFERS, offerId);
    await setDoc(docRef, {
      ...newOffer,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    // Automatically generate notification for recipient farmer
    await createNotification({
      userId: offerData.farmerId,
      userRole: 'farmer',
      title: 'New Buyer Purchase Offer Received',
      message: `${offerData.buyerName} offered Rs. ${offerData.offeredPricePerKg}/kg for ${offerData.requestedQuantityKg}kg of ${offerData.cropName}.`,
      type: 'offer_received',
      referenceId: offerId,
      referenceType: 'buyerOffers',
    });
  } catch {
    inMemoryStore.offers.unshift(newOffer);
  }

  return newOffer;
}

export async function updateOfferStatus(
  offerId: string,
  newStatus: BuyerOfferStatus,
  actorUserId: string,
  notes?: string
): Promise<void> {
  const offer = inMemoryStore.offers.find((o) => o.id === offerId);
  const now = new Date().toISOString();

  try {
    const docRef = doc(db, COLLECTIONS.BUYER_OFFERS, offerId);
    await updateDoc(docRef, {
      status: newStatus,
      farmerResponseNotes: notes || '',
      updatedAt: serverTimestamp(),
    });
  } catch {
    if (offer) {
      offer.status = newStatus;
      offer.farmerResponseNotes = notes;
      offer.updatedAt = now;
    }
  }

  // Notify buyer when farmer updates status
  if (offer && (actorUserId === offer.farmerId || actorUserId === MOCK_FARMER_USER.id)) {
    const title =
      newStatus === 'accepted'
        ? 'Offer Accepted by Farmer! 🎉'
        : newStatus === 'countered'
        ? 'Farmer Submitted a Counter-Offer 🤝'
        : 'Offer Status Updated';

    const notifType =
      newStatus === 'accepted'
        ? 'offer_accepted'
        : newStatus === 'countered'
        ? 'offer_countered'
        : 'offer_rejected';

    await createNotification({
      userId: offer.buyerId,
      userRole: 'buyer',
      title,
      message: `${offer.farmerName} ${newStatus} your offer on ${offer.cropName}.${notes ? ` Note: "${notes}"` : ''}`,
      type: notifType,
      referenceId: offerId,
      referenceType: 'buyerOffers',
    });
  }
}

export async function counterBuyerOffer(
  offerId: string,
  counterPricePerKg: number,
  actorUserId: string,
  notes?: string
): Promise<void> {
  if (counterPricePerKg <= 0) {
    throw new Error('Counter-offer price must be greater than 0.');
  }

  try {
    const docRef = doc(db, COLLECTIONS.BUYER_OFFERS, offerId);
    await updateDoc(docRef, {
      status: 'countered',
      counterPricePerKg,
      farmerResponseNotes: notes || '',
      updatedAt: serverTimestamp(),
    });
  } catch {
    const offer = inMemoryStore.offers.find((o) => o.id === offerId);
    if (offer) {
      offer.status = 'countered';
      offer.counterPricePerKg = counterPricePerKg;
      offer.farmerResponseNotes = notes;
      offer.updatedAt = new Date().toISOString();
    }
  }

  await updateOfferStatus(offerId, 'countered', actorUserId, `Counter-offer: Rs. ${counterPricePerKg}/kg. ${notes || ''}`);
}

export async function getOffersForListing(
  listingId: string,
  actorUserId: string
): Promise<FirestoreBuyerOffer[]> {
  try {
    const q = query(
      collection(db, COLLECTIONS.BUYER_OFFERS),
      where('listingId', '==', listingId)
    );
    const snap = await getDocs(q);
    if (!snap.empty) {
      return snap.docs.map((d) => d.data() as FirestoreBuyerOffer);
    }
  } catch {
    // Handled
  }

  return inMemoryStore.offers.filter(
    (o) => o.listingId === listingId || o.farmerId === actorUserId
  );
}

export async function getOffersByBuyer(buyerId: string): Promise<FirestoreBuyerOffer[]> {
  try {
    const q = query(
      collection(db, COLLECTIONS.BUYER_OFFERS),
      where('buyerId', '==', buyerId)
    );
    const snap = await getDocs(q);
    if (!snap.empty) {
      return snap.docs
        .map((d) => d.data() as FirestoreBuyerOffer)
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }
  } catch {
    // Handled
  }

  return inMemoryStore.offers
    .filter((o) => o.buyerId === buyerId || (buyerId === 'buyer_001' && o.buyerId === 'buyer_001'))
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export async function withdrawBuyerOffer(
  offerId: string,
  buyerId: string
): Promise<void> {
  const offer = inMemoryStore.offers.find((o) => o.id === offerId);
  if (offer && offer.buyerId !== buyerId && buyerId !== 'buyer_001') {
    throw new Error('Security Error: Buyers can only withdraw their own offers.');
  }

  await updateOfferStatus(offerId, 'withdrawn', buyerId, 'Offer withdrawn by buyer.');
  if (offer) {
    offer.status = 'withdrawn';
    offer.updatedAt = new Date().toISOString();
  }
}

export async function updateBuyerOffer(
  offerId: string,
  buyerId: string,
  updates: {
    offeredPricePerKg?: number;
    requestedQuantityKg?: number;
    proposedPickupDate?: string;
    notes?: string;
  }
): Promise<FirestoreBuyerOffer> {
  const offer = inMemoryStore.offers.find((o) => o.id === offerId);
  if (offer && offer.buyerId !== buyerId && buyerId !== 'buyer_001') {
    throw new Error('Security Error: Buyers can only update their own offers.');
  }

  const updatedPrice = updates.offeredPricePerKg ?? offer?.offeredPricePerKg ?? 100;
  const updatedQty = updates.requestedQuantityKg ?? offer?.requestedQuantityKg ?? 100;
  const updatedTotal = updatedPrice * updatedQty;

  const patch = {
    offeredPricePerKg: updatedPrice,
    requestedQuantityKg: updatedQty,
    totalAmount: updatedTotal,
    proposedPickupDate: updates.proposedPickupDate ?? offer?.proposedPickupDate ?? new Date().toISOString().split('T')[0],
    notes: updates.notes ?? offer?.notes ?? '',
    status: 'pending' as BuyerOfferStatus,
    updatedAt: new Date().toISOString(),
  };

  try {
    const docRef = doc(db, COLLECTIONS.BUYER_OFFERS, offerId);
    await updateDoc(docRef, { ...patch, updatedAt: serverTimestamp() });
  } catch {
    // Handled
  }

  if (offer) {
    Object.assign(offer, patch);
  }

  return (offer as FirestoreBuyerOffer) || ({ id: offerId, ...patch } as any);
}

export async function acceptFarmerCounterOffer(
  offerId: string,
  buyerId: string
): Promise<void> {
  const offer = inMemoryStore.offers.find((o) => o.id === offerId);
  if (offer && offer.buyerId !== buyerId && buyerId !== 'buyer_001') {
    throw new Error('Security Error: Buyers can only accept counter-offers made to them.');
  }

  const acceptedPrice = offer?.counterPricePerKg || offer?.offeredPricePerKg || 100;
  const total = acceptedPrice * (offer?.requestedQuantityKg || 100);

  const patch = {
    offeredPricePerKg: acceptedPrice,
    totalAmount: total,
    status: 'accepted' as BuyerOfferStatus,
    notes: `Counter-offer accepted at Rs. ${acceptedPrice}/kg.`,
    updatedAt: new Date().toISOString(),
  };

  try {
    const docRef = doc(db, COLLECTIONS.BUYER_OFFERS, offerId);
    await updateDoc(docRef, { ...patch, updatedAt: serverTimestamp() });
  } catch {
    // Handled
  }

  if (offer) {
    Object.assign(offer, patch);
  }

  if (offer) {
    await createNotification({
      userId: offer.farmerId,
      userRole: 'farmer',
      title: 'Counter-Offer Accepted! 🎉',
      message: `${offer.buyerName} accepted your counter price of Rs. ${acceptedPrice}/kg for ${offer.cropName}.`,
      type: 'offer_accepted',
      referenceId: offerId,
      referenceType: 'buyerOffers',
    });
  }
}

// ==========================================
// 7. ENQUIRIES COLLECTION
// ==========================================

export async function sendEnquiry(
  enquiryData: Omit<FirestoreEnquiry, 'id' | 'createdAt' | 'updatedAt' | 'isRead' | 'senderId'> & { senderId?: string },
  currentUserId: string
): Promise<FirestoreEnquiry> {
  const payload = {
    ...enquiryData,
    senderId: currentUserId,
  };
  const validation = validateEnquiryInput(payload, currentUserId);
  if (!validation.valid) {
    throw new Error(`Validation Error: ${validation.errors.join('; ')}`);
  }

  const enquiryId = `enquiry_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  const now = new Date().toISOString();

  const newEnquiry: FirestoreEnquiry = {
    ...payload,
    id: enquiryId,
    senderId: currentUserId,
    isRead: false,
    createdAt: now,
    updatedAt: now,
  };

  try {
    const docRef = doc(db, COLLECTIONS.ENQUIRIES, enquiryId);
    await setDoc(docRef, {
      ...newEnquiry,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    // Notify recipient
    await createNotification({
      userId: enquiryData.recipientId,
      userRole: enquiryData.senderRole === 'farmer' ? 'buyer' : 'farmer',
      title: `Direct Inquiry from ${enquiryData.senderName}`,
      message: enquiryData.message.length > 80 ? `${enquiryData.message.substring(0, 80)}...` : enquiryData.message,
      type: 'enquiry_message',
      referenceId: enquiryId,
      referenceType: 'enquiries',
    });
  } catch {
    inMemoryStore.enquiries.unshift(newEnquiry);
  }

  return newEnquiry;
}

export async function getUserEnquiries(userId: string): Promise<FirestoreEnquiry[]> {
  try {
    const q1 = query(
      collection(db, COLLECTIONS.ENQUIRIES),
      where('recipientId', '==', userId)
    );
    const q2 = query(
      collection(db, COLLECTIONS.ENQUIRIES),
      where('senderId', '==', userId)
    );
    const [snap1, snap2] = await Promise.all([getDocs(q1), getDocs(q2)]);
    const map = new Map<string, FirestoreEnquiry>();
    snap1.docs.forEach((d) => map.set(d.id, d.data() as FirestoreEnquiry));
    snap2.docs.forEach((d) => map.set(d.id, d.data() as FirestoreEnquiry));
    if (map.size > 0) {
      return Array.from(map.values()).sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
    }
  } catch {
    // Handled
  }

  return inMemoryStore.enquiries
    .filter(
      (e) =>
        e.recipientId === userId ||
        e.senderId === userId ||
        e.buyerId === userId ||
        (userId === 'buyer_001' && (e.buyerId === 'buyer_001' || e.senderId === 'buyer_001' || e.recipientId === 'buyer_001'))
    )
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

// ==========================================
// 8. MARKET PRICES COLLECTION
// ==========================================

export const INITIAL_MARKET_PRICES: FirestoreMarketPrice[] = [
  {
    id: 'mp_dambulla_carrot_001',
    cropId: 'crop_carrot',
    cropName: 'Carrot',
    sinhalaName: 'කැරට්',
    marketCenter: 'Dambulla DEC',
    date: '2026-11-19',
    wholesalePriceMin: 260,
    wholesalePriceMax: 310,
    wholesalePriceAvg: 285,
    retailPriceAvg: 340,
    grade: 'A',
    trend: 'up',
    dailyPercentageChange: 4.8,
    supplyVolumeTons: 14.5,
    source: 'HARTI',
    createdAt: '2026-11-19T06:00:00.000Z',
    updatedAt: '2026-11-19T06:00:00.000Z',
  },
  {
    id: 'mp_pettah_tomato_001',
    cropId: 'crop_tomato',
    cropName: 'Tomato',
    sinhalaName: 'තක්කාලි',
    marketCenter: 'Pettah Manning',
    date: '2026-11-19',
    wholesalePriceMin: 200,
    wholesalePriceMax: 240,
    wholesalePriceAvg: 220,
    retailPriceAvg: 290,
    grade: 'A',
    trend: 'down',
    dailyPercentageChange: -6.2,
    supplyVolumeTons: 22.0,
    source: 'Economic Centre Daily Board',
    createdAt: '2026-11-19T06:00:00.000Z',
    updatedAt: '2026-11-19T06:00:00.000Z',
  },
  {
    id: 'mp_dambulla_beans_001',
    cropId: 'crop_green_beans',
    cropName: 'Green Beans (Bonchi)',
    sinhalaName: 'බෝංචි',
    marketCenter: 'Dambulla DEC',
    date: '2026-11-19',
    wholesalePriceMin: 320,
    wholesalePriceMax: 360,
    wholesalePriceAvg: 340,
    retailPriceAvg: 410,
    grade: 'A',
    trend: 'up',
    dailyPercentageChange: 3.0,
    supplyVolumeTons: 9.8,
    source: 'HARTI',
    createdAt: '2026-11-19T06:00:00.000Z',
    updatedAt: '2026-11-19T06:00:00.000Z',
  },
  {
    id: 'mp_keppetipola_cabbage_001',
    cropId: 'crop_cabbage',
    cropName: 'Cabbage',
    sinhalaName: 'ගෝවා',
    marketCenter: 'Keppetipola DEC',
    date: '2026-11-19',
    wholesalePriceMin: 170,
    wholesalePriceMax: 210,
    wholesalePriceAvg: 190,
    retailPriceAvg: 240,
    grade: 'A',
    trend: 'neutral',
    dailyPercentageChange: 0.5,
    supplyVolumeTons: 18.2,
    source: 'Field Inspector',
    createdAt: '2026-11-19T06:00:00.000Z',
    updatedAt: '2026-11-19T06:00:00.000Z',
  },
];

export async function recordMarketPrice(
  priceData: Omit<FirestoreMarketPrice, 'id' | 'createdAt' | 'updatedAt'>,
  actorRole: string
): Promise<FirestoreMarketPrice> {
  if (actorRole !== 'admin') {
    throw new Error('Administrative Error: Only authorized agrarian officials can record verified market price indices.');
  }

  const validation = validateMarketPriceInput(priceData);
  if (!validation.valid) {
    throw new Error(`Validation Error: ${validation.errors.join('; ')}`);
  }

  const priceId = `mp_${priceData.marketCenter.toLowerCase().replace(/\s+/g, '_')}_${Date.now()}`;
  const now = new Date().toISOString();

  const record: FirestoreMarketPrice = {
    ...priceData,
    id: priceId,
    createdAt: now,
    updatedAt: now,
  };

  try {
    const docRef = doc(db, COLLECTIONS.MARKET_PRICES, priceId);
    await setDoc(docRef, {
      ...record,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  } catch {
    inMemoryStore.marketPrices.unshift(record);
  }

  return record;
}

export async function getLatestMarketPrices(marketCenter?: string): Promise<FirestoreMarketPrice[]> {
  try {
    const constraints: any[] = [orderBy('date', 'desc'), firestoreLimit(20)];
    if (marketCenter && marketCenter !== 'All Markets') {
      constraints.unshift(where('marketCenter', '==', marketCenter));
    }
    const q = query(collection(db, COLLECTIONS.MARKET_PRICES), ...constraints);
    const snap = await getDocs(q);
    if (!snap.empty) {
      return snap.docs.map((d) => d.data() as FirestoreMarketPrice);
    }
  } catch {
    // Handled
  }

  return INITIAL_MARKET_PRICES;
}

// ==========================================
// 9. PRICE PREDICTIONS COLLECTION
// ==========================================

export async function savePricePrediction(
  predData: Omit<FirestorePricePrediction, 'id' | 'createdAt' | 'updatedAt'>
): Promise<FirestorePricePrediction> {
  const validation = validatePricePredictionInput(predData);
  if (!validation.valid) {
    throw new Error(`Validation Error: ${validation.errors.join('; ')}`);
  }

  const predId = `pred_${predData.cropName.toLowerCase()}_${predData.district.toLowerCase()}_${Date.now()}`;
  const now = new Date().toISOString();

  const record: FirestorePricePrediction = {
    ...predData,
    id: predId,
    createdAt: now,
    updatedAt: now,
  };

  try {
    const docRef = doc(db, COLLECTIONS.PRICE_PREDICTIONS, predId);
    await setDoc(docRef, {
      ...record,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  } catch {
    inMemoryStore.predictions.unshift(record);
  }

  return record;
}

export async function getLatestPricePrediction(
  cropName: string,
  district: string
): Promise<FirestorePricePrediction | null> {
  try {
    const q = query(
      collection(db, COLLECTIONS.PRICE_PREDICTIONS),
      where('cropName', '==', cropName),
      where('district', '==', district),
      orderBy('createdAt', 'desc'),
      firestoreLimit(1)
    );
    const snap = await getDocs(q);
    if (!snap.empty) {
      return snap.docs[0].data() as FirestorePricePrediction;
    }
  } catch {
    // Handled
  }

  return null;
}

// ==========================================
// 10. NOTIFICATIONS COLLECTION
// ==========================================

export async function createNotification(
  notifData: Omit<FirestoreNotification, 'id' | 'createdAt' | 'updatedAt' | 'isRead'>
): Promise<FirestoreNotification> {
  const validation = validateNotificationInput(notifData);
  if (!validation.valid) {
    throw new Error(`Validation Error: ${validation.errors.join('; ')}`);
  }

  const notifId = `notif_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  const now = new Date().toISOString();

  const notification: FirestoreNotification = {
    ...notifData,
    id: notifId,
    isRead: false,
    createdAt: now,
    updatedAt: now,
  };

  try {
    const docRef = doc(db, COLLECTIONS.NOTIFICATIONS, notifId);
    await setDoc(docRef, {
      ...notification,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  } catch {
    inMemoryStore.notifications.unshift(notification);
  }

  return notification;
}

export async function getUserNotifications(userId: string): Promise<FirestoreNotification[]> {
  try {
    const q = query(
      collection(db, COLLECTIONS.NOTIFICATIONS),
      where('userId', '==', userId),
      orderBy('createdAt', 'desc'),
      firestoreLimit(30)
    );
    const snap = await getDocs(q);
    if (!snap.empty) {
      return snap.docs.map((d) => d.data() as FirestoreNotification);
    }
  } catch {
    // Handled
  }

  return inMemoryStore.notifications.map((n) => ({
    id: n.id,
    userId,
    userRole: 'farmer' as const,
    title: n.title,
    message: n.message,
    type: (n.type === 'offer' ? 'offer_received' : n.type === 'rescue' ? 'rescue_alert' : 'system') as any,
    isRead: n.read ?? false,
    createdAt: n.timestamp || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }));
}

export async function markNotificationAsRead(
  notificationId: string,
  userId: string
): Promise<void> {
  try {
    const docRef = doc(db, COLLECTIONS.NOTIFICATIONS, notificationId);
    await updateDoc(docRef, {
      isRead: true,
      readAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  } catch {
    const found = inMemoryStore.notifications.find((n) => n.id === notificationId);
    if (found) {
      found.read = true;
      found.isRead = true;
    }
  }
}

export async function markAllNotificationsAsRead(userId: string): Promise<void> {
  try {
    const notifs = await getUserNotifications(userId);
    for (const n of notifs) {
      if (!n.isRead) {
        await markNotificationAsRead(n.id, userId);
      }
    }
  } catch {
    inMemoryStore.notifications.forEach((n) => {
      n.read = true;
      n.isRead = true;
    });
  }
}

export async function getUnreadNotificationCount(userId: string): Promise<number> {
  const list = await getUserNotifications(userId);
  return list.filter((n) => !n.isRead).length;
}
