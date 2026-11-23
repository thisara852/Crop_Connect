/**
 * translations.ts
 *
 * Trilingual localized dictionary (Sinhala, Tamil, English) for CropConnect.
 * Tailored for Sri Lankan agrarian terms, farmers, wholesale traders, and market centres.
 */

export type AppLanguage = 'en' | 'si' | 'ta';

export interface TranslationDictionary {
  // Navigation & General
  appName: string;
  tagline: string;
  farmer: string;
  buyer: string;
  admin: string;
  home: string;
  myListings: string;
  addListing: string;
  profile: string;
  settings: string;
  notifications: string;
  logout: string;
  save: string;
  cancel: string;
  search: string;
  loading: string;
  retry: string;
  back: string;
  viewDetails: string;
  call: string;
  verified: string;
  unverified: string;

  // Agricultural Units & Measures
  kgUnit: string;
  perKg: string;
  tonsUnit: string;
  acresUnit: string;

  // Features
  priceHistory: string;
  aiAdvisor: string;
  compareOffers: string;
  nearbyBuyers: string;
  urgentRescue: string;

  // Marketplace & Listings
  availableCrops: string;
  cropName: string;
  quantity: string;
  askingPrice: string;
  wholesaleRate: string;
  retailRate: string;
  harvestDate: string;
  district: string;
  marketCenter: string;
  noListingsFound: string;
  noListingsSub: string;
  noBuyersFound: string;
  noBuyersSub: string;

  // Buyer Matching & Offers
  compatibilityScore: string;
  topMatch: string;
  highestPrice: string;
  buyerOffer: string;
  paymentTerms: string;
  coldStorage: string;
  farmgatePickup: string;

  // Connection & Offline
  offlineNotice: string;
  offlineBanner: string;

  // Validation & Prompts
  phonePrompt: string;
  phoneInvalid: string;
  quantityInvalid: string;
  priceInvalid: string;
}

export const TRANSLATIONS: Record<AppLanguage, TranslationDictionary> = {
  en: {
    appName: 'CropConnect',
    tagline: 'Empowering Sri Lankan Farmers with Fair Trade',
    farmer: 'Farmer',
    buyer: 'Buyer',
    admin: 'Administrator',
    home: 'Home',
    myListings: 'My Crops',
    addListing: 'Add Crop',
    profile: 'Profile',
    settings: 'Settings',
    notifications: 'Alerts',
    logout: 'Sign Out',
    save: 'Save',
    cancel: 'Cancel',
    search: 'Search crops or buyers...',
    loading: 'Loading agrarian data...',
    retry: 'Retry Connection',
    back: 'Back',
    viewDetails: 'View Details',
    call: 'Call Directly',
    verified: 'Verified',
    unverified: 'Unverified',

    kgUnit: 'kg',
    perKg: '/kg',
    tonsUnit: 'Tons',
    acresUnit: 'Acres',

    priceHistory: 'Price History & Trends',
    aiAdvisor: 'AI Fair-Price Benchmark',
    compareOffers: 'Buyer Offer Comparison',
    nearbyBuyers: 'Nearby Buyer Matching',
    urgentRescue: 'Urgent Crop Rescue',

    availableCrops: 'Available Crop Listings',
    cropName: 'Crop Type',
    quantity: 'Quantity (kg)',
    askingPrice: 'Asking Price (Rs./kg)',
    wholesaleRate: 'Wholesale Rate',
    retailRate: 'Retail Rate',
    harvestDate: 'Harvest Date',
    district: 'District',
    marketCenter: 'Market Economic Centre',
    noListingsFound: 'No Active Crop Listings Available',
    noListingsSub: 'Listings from registered farmers in your selected area will appear here.',
    noBuyersFound: 'No Matching Registered Buyers Found',
    noBuyersSub: 'Try expanding your district preference or adjust your quantity range.',

    compatibilityScore: 'Compatibility Score',
    topMatch: 'Top Recommended Match',
    highestPrice: 'Highest Price Offer',
    buyerOffer: 'Buyer Price Offer',
    paymentTerms: 'Payment Terms',
    coldStorage: 'Cold Storage Available',
    farmgatePickup: 'Farm-Gate Collection',

    offlineNotice: 'Low-Bandwidth Mode Active',
    offlineBanner: 'Operating offline with cached market rates. Records will sync when connected.',

    phonePrompt: 'Enter Sri Lankan mobile number (+94 7X XXX XXXX)',
    phoneInvalid: 'Please enter a valid 10-digit Sri Lankan phone number (e.g. 077 123 4567 or +94 77 123 4567).',
    quantityInvalid: 'Please enter a valid harvest quantity in kg.',
    priceInvalid: 'Please enter a valid price in LKR.',
  },

  si: {
    appName: 'ක්‍රොප්කනෙක්ට්',
    tagline: 'ශ්‍රී ලාංකික ගොවි ප්‍රජාව සවිබල ගන්වන සාධාරණ වෙළඳපොළ',
    farmer: 'ගොවිමහතා',
    buyer: 'මිලදී ගන්නා වෙළෙන්දා',
    admin: 'පරිපාලක',
    home: 'මුල් පිටුව',
    myListings: 'මගේ අස්වැන්න',
    addListing: 'අස්වනු එක්කරන්න',
    profile: 'මගේ ගිණුම',
    settings: 'සැකසුම්',
    notifications: 'දැනුම්දීම්',
    logout: 'පිටවීම',
    save: 'සුරකින්න',
    cancel: 'අවලංගු කරන්න',
    search: 'බෝග හෝ වෙළඳුන් සොයන්න...',
    loading: 'දත්ත ලබාගනිමින් පවතී...',
    retry: 'නැවත උත්සාහ කරන්න',
    back: 'ආපසු',
    viewDetails: 'විස්තර බලන්න',
    call: 'දුරකථනයෙන් අමතන්න',
    verified: 'තහවුරු කළ',
    unverified: 'තහවුරු නොකළ',

    kgUnit: 'කි.ග්‍රෑ.',
    perKg: 'කි.ග්‍රෑමයකට',
    tonsUnit: 'ටොන්',
    acresUnit: 'අක්කර',

    priceHistory: 'මිල ඉතිහාසය සහ ප්‍රවණතා',
    aiAdvisor: 'AI සාධාරණ මිල පුරෝකථනය',
    compareOffers: 'මිලදී ගැනීමේ මිල ගණන් සැසඳීම',
    nearbyBuyers: 'ආසන්නතම ගැනුම්කරුවන්',
    urgentRescue: 'හදිසි අස්වනු බේරාගැනීම',

    availableCrops: 'විකිණීමට ඇති බෝග තොග',
    cropName: 'බෝග වර්ගය',
    quantity: 'ප්‍රමාණය (කිලෝග්‍රෑම්)',
    askingPrice: 'බලාපොරොත්තු මිල (රු./කි.ග්‍රෑ.)',
    wholesaleRate: 'තොග මිල',
    retailRate: 'සිල්ලර මිල',
    harvestDate: 'අස්වනු නෙලූ දිනය',
    district: 'දිස්ත්‍රික්කය',
    marketCenter: 'ආර්ථික මධ්‍යස්ථානය',
    noListingsFound: 'දැනට බෝග ලැයිස්තුගත කර නොමැත',
    noListingsSub: 'ඔබගේ ප්‍රදේශයේ ගොවීන් විසින් ලැයිස්තුගත කළ බෝග මෙහි පෙන්වනු ඇත.',
    noBuyersFound: 'ගැලපෙන ගැනුම්කරුවන් හමු නොවීය',
    noBuyersSub: 'කරුණාකර ඔබගේ දිස්ත්‍රික්කය වෙනස් කර නැවත සොයන්න.',

    compatibilityScore: 'ගැලපීමේ ලකුණු',
    topMatch: 'හොඳම ගැළපෙන ගැනුම්කරු',
    highestPrice: 'ඉහළම මිල පිරිනැමීම',
    buyerOffer: 'ගැනුම්කරුගේ මිල පිරිනැමීම',
    paymentTerms: 'මුදල් ගෙවීමේ ක්‍රමය',
    coldStorage: 'ශීතාගාර පහසුකම් ඇත',
    farmgatePickup: 'ගොවිපලෙන්ම රැගෙන යාම',

    offlineNotice: 'සීමිත අන්තර්ජාල සම්බන්ධතා ක්‍රමය',
    offlineBanner: 'නොබැඳිව ක්‍රියාත්මක වේ. අන්තර්ජාලය ලැබුණු පසු දත්ත ස්වයංක්‍රීයව යාවත්කාලීන වේ.',

    phonePrompt: 'ශ්‍රී ලංකා ජංගම දුරකථන අංකය ඇතුළත් කරන්න (+94 7X XXX XXXX)',
    phoneInvalid: 'කරුණාකර නිවැරදි ශ්‍රී ලාංකික දුරකථන අංකයක් ඇතුළත් කරන්න (උදා: 077 123 4567).',
    quantityInvalid: 'කරුණාකර කිලෝග්‍රෑම් වලින් නිවැරදි අස්වනු ප්‍රමාණය ඇතුළත් කරන්න.',
    priceInvalid: 'කරුණාකර රුපියල් වලින් නිවැරදි මිල ඇතුළත් කරන්න.',
  },

  ta: {
    appName: 'CropConnect',
    tagline: 'இலங்கை விவசாயிகளுக்கான நியாயமான வர்த்தக தளம்',
    farmer: 'விவசாயி',
    buyer: 'கொள்வனவாளர்',
    admin: 'நிர்வாகி',
    home: 'முகப்பு',
    myListings: 'என் பயிர்கள்',
    addListing: 'பயிர் சேர்க்க',
    profile: 'சுயவிவரம்',
    settings: 'அமைப்புகள்',
    notifications: 'அறிவிப்புகள்',
    logout: 'வெளியேறு',
    save: 'சேமி',
    cancel: 'ரத்துசெய்',
    search: 'பயிர்கள் அல்லது வியாபாரிகளைத் தேடுங்கள்...',
    loading: 'தரவு ஏற்றப்படுகிறது...',
    retry: 'மீண்டும் முயற்சிக்கவும்',
    back: 'பின்செல்க',
    viewDetails: 'விவரங்களைப் பார்க்க',
    call: 'நேரடியாக அழைக்க',
    verified: 'சரிபார்க்கப்பட்டது',
    unverified: 'சரிபார்க்கப்படாதது',

    kgUnit: 'கிலோ',
    perKg: '/கிலோ',
    tonsUnit: 'டன்கள்',
    acresUnit: 'ஏக்கர்',

    priceHistory: 'விலை வரலாறு & போக்குகள்',
    aiAdvisor: 'AI நியாய விலை முன்னறிவிப்பு',
    compareOffers: 'கொள்வனவு விலை ஒப்பீடு',
    nearbyBuyers: 'அருகிலுள்ள கொள்வனவாளர்கள்',
    urgentRescue: 'அவசர பயிர் மீட்பு',

    availableCrops: 'விற்பனைக்குரிய பயிர்கள்',
    cropName: 'பயிர் வகை',
    quantity: 'அளவு (கிலோ)',
    askingPrice: 'எதிர்பார்க்கும் விலை (ரூ./கிலோ)',
    wholesaleRate: 'மொத்த விலை',
    retailRate: 'சில்லறை விலை',
    harvestDate: 'அறுவடை தேதி',
    district: 'மாவட்டம்',
    marketCenter: 'பொருளாதார மையம்',
    noListingsFound: 'பயிர்கள் எதுவும் கிடைக்கவில்லை',
    noListingsSub: 'உங்கள் பகுதியில் விவசாயிகள் பட்டியலிடும் பயிர்கள் இங்கு தோன்றும்.',
    noBuyersFound: 'பொருத்தமான கொள்வனவாளர்கள் இல்லை',
    noBuyersSub: 'உங்கள் மாவட்டத்தை மாற்றி மீண்டும் தேடுங்கள்.',

    compatibilityScore: 'பொருந்தக்கூடிய புள்ளி',
    topMatch: 'சிறந்த பரிந்துரை',
    highestPrice: 'அதிகபட்ச விலை சலுகை',
    buyerOffer: 'வாங்குபவர் விலை சலுகை',
    paymentTerms: 'பணம் செலுத்தும் முறை',
    coldStorage: 'குளிரூட்டப்பட்ட கிடங்கு உள்ளது',
    farmgatePickup: 'பண்ணையிலேயே சேகரித்தல்',

    offlineNotice: 'குறைந்த இணைய இணைப்பு முறை',
    offlineBanner: 'இணையம் இல்லாமல் இயங்குகிறது. இணைப்பு கிடைத்ததும் தரவு புதுப்பிக்கப்படும்.',

    phonePrompt: 'இலங்கை கைபேசி எண்ணை உள்ளிடவும் (+94 7X XXX XXXX)',
    phoneInvalid: 'சரியான இலங்கை கைபேசி எண்ணை உள்ளிடவும் (உதா: 077 123 4567).',
    quantityInvalid: 'சரியான அளவை கிலோவில் உள்ளிடவும்.',
    priceInvalid: 'சரியான தொகையை ரூபாயில் உள்ளிடவும்.',
  },
};
