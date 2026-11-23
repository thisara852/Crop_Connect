import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Modal,
  Alert,
  TextInput,
  Switch,
  Platform,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Palette, Spacing, BorderRadius, Shadows } from '../constants/theme';
import { CROP_CATEGORIES, SRI_LANKA_DISTRICTS, POPULAR_CROPS } from '../constants/sriLanka';
import { Header } from '../components/common/Header';
import { Input } from '../components/common/Input';
import { Badge } from '../components/common/Badge';
import { Button } from '../components/common/Button';
import { MarketTicker } from '../components/home/MarketTicker';
import { CropRescueBanner } from '../components/home/CropRescueBanner';
import { CropListingCard } from '../components/home/CropListingCard';
import { useResponsive } from '../hooks/useResponsive';
import { useAuth } from '../hooks/useAuth';
import { useTheme } from '../hooks/useTheme';
import { getMockMarketTickers } from '../services/aiService';
import {
  getActiveListings,
  getOffersByBuyer,
  getUserEnquiries,
  getBuyerProfile,
  saveBuyerProfile,
  createBuyerOffer,
  updateBuyerOffer,
  withdrawBuyerOffer,
  acceptFarmerCounterOffer,
  sendEnquiry,
} from '../services/firestoreService';
import {
  FirestoreCropListing,
  FirestoreBuyer,
  FirestoreBuyerOffer,
  FirestoreEnquiry,
  BuyerPaymentTerms,
} from '../types/database';

const getDefaultPickupDate = (): string => {
  const d = new Date();
  d.setDate(d.getDate() + 2);
  return d.toISOString().split('T')[0];
};

export const BuyerDashboardScreen: React.FC = () => {
  const { scaleSize, scaleFont, contentPadding } = useResponsive();
  const { isDark } = useTheme();
  const { user } = useAuth();

  const buyerId = user?.id || 'buyer_001';

  // State
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedDistrict, setSelectedDistrict] = useState('All Districts');
  const [offerTab, setOfferTab] = useState<'all' | 'pending' | 'countered' | 'accepted'>('all');

  // Firestore Data State
  const [listings, setListings] = useState<FirestoreCropListing[]>([]);
  const [buyerProfile, setBuyerProfile] = useState<FirestoreBuyer | null>(null);
  const [myOffers, setMyOffers] = useState<FirestoreBuyerOffer[]>([]);
  const [enquiries, setEnquiries] = useState<FirestoreEnquiry[]>([]);

  // Modals State
  const [reqModalVisible, setReqModalVisible] = useState(false);
  const [offerModalVisible, setOfferModalVisible] = useState(false);
  const [enquiryModalVisible, setEnquiryModalVisible] = useState(false);
  const [threadModalVisible, setThreadModalVisible] = useState(false);
  const [allEnquiriesModalVisible, setAllEnquiriesModalVisible] = useState(false);

  // Selected entities for modals
  const [selectedListingForOffer, setSelectedListingForOffer] = useState<FirestoreCropListing | null>(null);
  const [selectedOfferToEdit, setSelectedOfferToEdit] = useState<FirestoreBuyerOffer | null>(null);
  const [selectedListingForEnquiry, setSelectedListingForEnquiry] = useState<FirestoreCropListing | null>(null);
  const [activeEnquiryThread, setActiveEnquiryThread] = useState<FirestoreEnquiry | null>(null);

  // Form states - Requirements Modal
  const [businessNameInput, setBusinessNameInput] = useState('');
  const [preferredCropsInput, setPreferredCropsInput] = useState<string[]>([]);
  const [minOrderKgInput, setMinOrderKgInput] = useState('100');
  const [maxOrderKgInput, setMaxOrderKgInput] = useState('3000');
  const [budgetLkrInput, setBudgetLkrInput] = useState('500000');
  const [deliveryModeInput, setDeliveryModeInput] = useState<'farmgate_pickup' | 'market_delivery'>('farmgate_pickup');
  const [paymentTermsInput, setPaymentTermsInput] = useState<BuyerPaymentTerms>('instant_bank_transfer');
  const [coldStorageInput, setColdStorageInput] = useState(true);
  const [preferredDistrictsInput, setPreferredDistrictsInput] = useState<string[]>([]);
  const [savingReq, setSavingReq] = useState(false);

  // Form states - Offer Modal
  const [offerPriceInput, setOfferPriceInput] = useState('');
  const [offerQuantityInput, setOfferQuantityInput] = useState('');
  const [offerPickupDateInput, setOfferPickupDateInput] = useState(() => getDefaultPickupDate());
  const [offerTransportBuyerInput, setOfferTransportBuyerInput] = useState(true);
  const [offerNotesInput, setOfferNotesInput] = useState('');
  const [submittingOffer, setSubmittingOffer] = useState(false);

  // Form states - Enquiry Modal
  const [enquiryMsgInput, setEnquiryMsgInput] = useState('');
  const [sendingEnq, setSendingEnq] = useState(false);

  // Reply state in thread modal
  const [replyMsgInput, setReplyMsgInput] = useState('');
  const [sendingReply, setSendingReply] = useState(false);

  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Load Firestore Data
  useEffect(() => {
    let isMounted = true;
    async function loadData() {
      try {
        const [activeCrops, profile, offers, userEnqs] = await Promise.all([
          getActiveListings(),
          getBuyerProfile(buyerId),
          getOffersByBuyer(buyerId),
          getUserEnquiries(buyerId),
        ]);

        if (isMounted) {
          setListings(activeCrops);
          setBuyerProfile(profile);
          setMyOffers(offers);
          setEnquiries(userEnqs);

          if (profile) {
            setBusinessNameInput(profile.businessName);
            setPreferredCropsInput(profile.purchasingRequirements?.preferredCrops || ['Carrot', 'Tomato']);
            setMinOrderKgInput(profile.purchasingRequirements?.minOrderQuantityKg?.toString() || '100');
            setMaxOrderKgInput(profile.purchasingRequirements?.maxOrderQuantityKg?.toString() || '3000');
            setBudgetLkrInput(profile.purchasingRequirements?.weeklyTargetBudgetLkr?.toString() || '600000');
            setDeliveryModeInput(profile.purchasingRequirements?.preferredDeliveryMode || 'farmgate_pickup');
            setPaymentTermsInput(profile.purchasingRequirements?.paymentTerms || 'instant_bank_transfer');
            setColdStorageInput(profile.purchasingRequirements?.hasColdStorage ?? true);
            setPreferredDistrictsInput(profile.purchasingRequirements?.preferredDistricts || ['Nuwara Eliya', 'Matale']);
          }
        }
      } catch {
        // Handled
      } finally {
        if (isMounted) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    }

    loadData();
    return () => {
      isMounted = false;
    };
  }, [buyerId, refreshTrigger]);

  const onRefresh = () => {
    setRefreshing(true);
    setRefreshTrigger((prev) => prev + 1);
  };

  const tickers = getMockMarketTickers();
  const rescueCrops = listings.filter((l) => l.isRescueCrop);
  const totalKgAtRisk = rescueCrops.reduce((sum, l) => sum + l.quantityKg, 0);

  // Recently added crops (top 5 sorted by date)
  const recentCrops = [...listings]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 5);

  // Filtered available crops
  const filteredCrops = listings.filter((l) => {
    const matchesCat = selectedCategory === 'all' || l.category === selectedCategory;
    const matchesDist = selectedDistrict === 'All Districts' || l.district === selectedDistrict;
    const matchesQuery =
      l.cropName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      l.district.toLowerCase().includes(searchQuery.toLowerCase()) ||
      l.farmerName.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCat && matchesDist && matchesQuery;
  });

  // Filtered offers
  const filteredOffers = myOffers.filter((o) => {
    if (offerTab === 'all') return true;
    return o.status === offerTab;
  });

  // --- Handlers: Purchasing Requirements Modal ---
  const handleOpenReqModal = () => {
    if (buyerProfile) {
      setBusinessNameInput(buyerProfile.businessName);
      setPreferredCropsInput(buyerProfile.purchasingRequirements?.preferredCrops || ['Carrot', 'Tomato']);
      setMinOrderKgInput(buyerProfile.purchasingRequirements?.minOrderQuantityKg?.toString() || '100');
      setMaxOrderKgInput(buyerProfile.purchasingRequirements?.maxOrderQuantityKg?.toString() || '3000');
      setBudgetLkrInput(buyerProfile.purchasingRequirements?.weeklyTargetBudgetLkr?.toString() || '600000');
      setDeliveryModeInput(buyerProfile.purchasingRequirements?.preferredDeliveryMode || 'farmgate_pickup');
      setPaymentTermsInput(buyerProfile.purchasingRequirements?.paymentTerms || 'instant_bank_transfer');
      setColdStorageInput(buyerProfile.purchasingRequirements?.hasColdStorage ?? true);
      setPreferredDistrictsInput(buyerProfile.purchasingRequirements?.preferredDistricts || ['Nuwara Eliya', 'Matale']);
    }
    setReqModalVisible(true);
  };

  const togglePreferredCrop = (cropName: string) => {
    if (preferredCropsInput.includes(cropName)) {
      setPreferredCropsInput(preferredCropsInput.filter((c) => c !== cropName));
    } else {
      setPreferredCropsInput([...preferredCropsInput, cropName]);
    }
  };

  const togglePreferredDistrict = (districtName: string) => {
    if (preferredDistrictsInput.includes(districtName)) {
      setPreferredDistrictsInput(preferredDistrictsInput.filter((d) => d !== districtName));
    } else {
      setPreferredDistrictsInput([...preferredDistrictsInput, districtName]);
    }
  };

  const handleSaveRequirements = async () => {
    const minKg = parseFloat(minOrderKgInput) || 100;
    const maxKg = parseFloat(maxOrderKgInput) || 3000;
    const budget = parseFloat(budgetLkrInput) || 500000;

    if (minKg <= 0 || maxKg <= 0 || maxKg < minKg) {
      Alert.alert('Validation Error', 'Maximum quantity must be greater than or equal to minimum quantity.');
      return;
    }

    if (preferredCropsInput.length === 0) {
      Alert.alert('Validation Error', 'Please select at least one preferred crop.');
      return;
    }

    setSavingReq(true);
    try {
      const updated = await saveBuyerProfile(
        buyerId,
        {
          businessName: businessNameInput.trim() || buyerProfile?.businessName || 'Wholesale Buyer',
          purchasingRequirements: {
            preferredCrops: preferredCropsInput,
            minOrderQuantityKg: minKg,
            maxOrderQuantityKg: maxKg,
            paymentTerms: paymentTermsInput,
            preferredDeliveryMode: deliveryModeInput,
            hasColdStorage: coldStorageInput,
            weeklyTargetBudgetLkr: budget,
            preferredDistricts: preferredDistrictsInput,
          },
        },
        buyerId
      );

      setBuyerProfile(updated);
      setReqModalVisible(false);
      Alert.alert('Success ✅', 'Purchasing requirements updated and synced with Cloud Firestore.');
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Failed to update purchasing requirements.');
    } finally {
      setSavingReq(false);
    }
  };

  // --- Handlers: Make / Edit Offer Modal ---
  const handleOpenMakeOffer = (listing: FirestoreCropListing) => {
    setSelectedListingForOffer(listing);
    setSelectedOfferToEdit(null);
    setOfferPriceInput(listing.askingPricePerKg.toString());
    setOfferQuantityInput((listing.minOrderKg || 100).toString());
    setOfferPickupDateInput(getDefaultPickupDate());
    setOfferTransportBuyerInput(true);
    setOfferNotesInput('');
    setOfferModalVisible(true);
  };

  const handleOpenReviseOffer = (offer: FirestoreBuyerOffer) => {
    setSelectedOfferToEdit(offer);
    const listingMatch = listings.find((l) => l.id === offer.listingId) || null;
    setSelectedListingForOffer(listingMatch);
    setOfferPriceInput(offer.offeredPricePerKg.toString());
    setOfferQuantityInput(offer.requestedQuantityKg.toString());
    setOfferPickupDateInput(offer.proposedPickupDate);
    setOfferTransportBuyerInput(offer.transportProvidedByBuyer);
    setOfferNotesInput(offer.notes || '');
    setOfferModalVisible(true);
  };

  const handleSubmitOffer = async () => {
    const price = parseFloat(offerPriceInput);
    const qty = parseFloat(offerQuantityInput);

    if (!price || price <= 0) {
      Alert.alert('Validation Error', 'Please enter a valid offer price per kg in LKR.');
      return;
    }

    if (!qty || qty <= 0) {
      Alert.alert('Validation Error', 'Please enter a valid requested quantity in kg.');
      return;
    }

    setSubmittingOffer(true);
    try {
      if (selectedOfferToEdit) {
        // Revise existing offer
        const updated = await updateBuyerOffer(selectedOfferToEdit.id, buyerId, {
          offeredPricePerKg: price,
          requestedQuantityKg: qty,
          proposedPickupDate: offerPickupDateInput,
          notes: offerNotesInput,
        });

        setMyOffers((prev) => prev.map((o) => (o.id === updated.id ? updated : o)));
        Alert.alert('Offer Revised 💬', `Updated offer of Rs. ${price}/kg for ${qty}kg recorded in Firestore.`);
      } else if (selectedListingForOffer) {
        // Create new offer
        const newOffer = await createBuyerOffer(
          {
            listingId: selectedListingForOffer.id,
            cropName: selectedListingForOffer.cropName,
            farmerId: selectedListingForOffer.farmerId,
            farmerName: selectedListingForOffer.farmerName,
            buyerId,
            buyerName: buyerProfile?.contactPerson || user?.fullName || 'Dilan Perera',
            buyerPhone: buyerProfile?.phone || user?.phone || '+94 71 987 6543',
            buyerBusinessType: buyerProfile?.businessType || 'wholesaler',
            offeredPricePerKg: price,
            requestedQuantityKg: qty,
            totalAmount: price * qty,
            farmerAskingPricePerKg: selectedListingForOffer.askingPricePerKg,
            proposedPickupDate: offerPickupDateInput,
            transportProvidedByBuyer: offerTransportBuyerInput,
            notes: offerNotesInput || 'Purchase offer submitted from CropConnect Buyer Marketplace.',
          },
          buyerId
        );

        setMyOffers((prev) => [newOffer, ...prev]);
        Alert.alert(
          'Offer Submitted 💬',
          `Offer of Rs. ${price}/kg for ${qty}kg (Total Rs. ${(price * qty).toLocaleString()}) sent to ${selectedListingForOffer.farmerName}!`
        );
      }

      setOfferModalVisible(false);
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Failed to submit offer.');
    } finally {
      setSubmittingOffer(false);
    }
  };

  const handleWithdrawOffer = (offer: FirestoreBuyerOffer) => {
    Alert.alert(
      'Withdraw Offer',
      `Are you sure you want to withdraw your offer of Rs. ${offer.offeredPricePerKg}/kg on ${offer.cropName}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Withdraw',
          style: 'destructive',
          onPress: async () => {
            try {
              await withdrawBuyerOffer(offer.id, buyerId);
              setMyOffers((prev) =>
                prev.map((o) => (o.id === offer.id ? { ...o, status: 'withdrawn' } : o))
              );
              Alert.alert('Withdrawn', 'Your offer has been withdrawn.');
            } catch (err: any) {
              Alert.alert('Error', err?.message || 'Failed to withdraw offer.');
            }
          },
        },
      ]
    );
  };

  const handleAcceptCounter = async (offer: FirestoreBuyerOffer) => {
    Alert.alert(
      'Accept Counter-Offer 🤝',
      `Accept farmer ${offer.farmerName}&apos;s counter price of Rs. ${offer.counterPricePerKg}/kg for ${offer.requestedQuantityKg}kg (${offer.cropName})? Total: Rs. ${((offer.counterPricePerKg || 0) * offer.requestedQuantityKg).toLocaleString()}.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Accept Deal',
          onPress: async () => {
            try {
              await acceptFarmerCounterOffer(offer.id, buyerId);
              setMyOffers((prev) =>
                prev.map((o) =>
                  o.id === offer.id
                    ? {
                        ...o,
                        status: 'accepted',
                        offeredPricePerKg: offer.counterPricePerKg || o.offeredPricePerKg,
                        totalAmount: (offer.counterPricePerKg || 0) * o.requestedQuantityKg,
                      }
                    : o
                )
              );
              Alert.alert('Deal Closed! 🎉', 'Counter-offer accepted! Farmer has been alerted with deal confirmation.');
            } catch (err: any) {
              Alert.alert('Error', err?.message || 'Failed to accept counter-offer.');
            }
          },
        },
      ]
    );
  };

  // --- Handlers: Enquiries ---
  const handleOpenEnquiryModal = (listing: FirestoreCropListing) => {
    setSelectedListingForEnquiry(listing);
    setEnquiryMsgInput(`Ayubowan ${listing.farmerName}, is this ${listing.cropName} batch available for direct farmgate pickup this week?`);
    setEnquiryModalVisible(true);
  };

  const handleSendEnquiry = async () => {
    if (!enquiryMsgInput.trim()) {
      Alert.alert('Validation Error', 'Please type an inquiry message.');
      return;
    }

    if (!selectedListingForEnquiry) return;

    setSendingEnq(true);
    try {
      const enq = await sendEnquiry(
        {
          listingId: selectedListingForEnquiry.id,
          cropName: selectedListingForEnquiry.cropName,
          farmerId: selectedListingForEnquiry.farmerId,
          buyerId,
          senderName: buyerProfile?.contactPerson || user?.fullName || 'Dilan Perera',
          senderRole: 'buyer',
          recipientId: selectedListingForEnquiry.farmerId,
          recipientName: selectedListingForEnquiry.farmerName,
          message: enquiryMsgInput.trim(),
        },
        buyerId
      );

      setEnquiries((prev) => [enq, ...prev]);
      setEnquiryModalVisible(false);
      Alert.alert('Inquiry Dispatched 📨', `Message sent to ${selectedListingForEnquiry.farmerName} via Firestore.`);
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Failed to send inquiry.');
    } finally {
      setSendingEnq(false);
    }
  };

  const handleOpenThreadModal = (enq: FirestoreEnquiry) => {
    setActiveEnquiryThread(enq);
    setReplyMsgInput('');
    setThreadModalVisible(true);
  };

  const handleSendReply = async () => {
    if (!replyMsgInput.trim() || !activeEnquiryThread) return;

    setSendingReply(true);
    try {
      const newEnq = await sendEnquiry(
        {
          listingId: activeEnquiryThread.listingId,
          cropName: activeEnquiryThread.cropName,
          farmerId: activeEnquiryThread.farmerId,
          buyerId,
          senderName: buyerProfile?.contactPerson || user?.fullName || 'Dilan Perera',
          senderRole: 'buyer',
          recipientId: activeEnquiryThread.farmerId,
          recipientName: activeEnquiryThread.recipientName === user?.fullName ? activeEnquiryThread.senderName : activeEnquiryThread.recipientName,
          message: replyMsgInput.trim(),
        },
        buyerId
      );

      setEnquiries((prev) => [newEnq, ...prev]);
      setActiveEnquiryThread(newEnq);
      setReplyMsgInput('');
      Alert.alert('Reply Sent', 'Your message has been delivered to the farmer.');
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Failed to send reply.');
    } finally {
      setSendingReply(false);
    }
  };

  if (loading && !refreshing) {
    return (
      <View style={[styles.screen, styles.center, { backgroundColor: isDark ? '#121815' : Palette.background }]}>
        <ActivityIndicator size="large" color={Palette.primary} />
        <Text style={[styles.loadingText, { fontSize: scaleFont(14) }]}>
          Loading CropConnect Buyer Marketplace...
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.screen, { backgroundColor: isDark ? '#121815' : Palette.background }]}>
      {/* 1. Header */}
      <Header
        title="CropConnect Marketplace"
        subtitle="Wholesale & Direct Farm Sourcing"
        onNotificationPress={() => router.push('/notifications')}
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        contentContainerStyle={{ paddingBottom: scaleSize(100) }}
      >
        {/* Search Bar */}
        <View style={{ paddingHorizontal: scaleSize(contentPadding), paddingTop: scaleSize(10) }}>
          <Input
            placeholder="Search produce (e.g. Upcountry Carrot, Dambulla Tomato)..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            leftIcon="search-outline"
            rightIcon={searchQuery ? 'close-circle' : 'options-outline'}
            onRightIconPress={() => setSearchQuery('')}
          />
        </View>

        {/* Live Market Price Ticker */}
        <MarketTicker items={tickers} onItemPress={() => router.push('/price-comparison')} />

        {/* Interactive Map Quick Callout */}
        <TouchableOpacity
          activeOpacity={0.88}
          onPress={() => router.push('/(buyer)/map')}
          style={[
            styles.mapBanner,
            {
              marginHorizontal: scaleSize(contentPadding),
              padding: scaleSize(Spacing.md),
              borderRadius: BorderRadius.lg,
              ...Shadows.soft,
            },
          ]}
        >
          <View style={styles.mapBannerLeft}>
            <View style={styles.mapIconCircle}>
              <Ionicons name="map" size={scaleSize(20)} color={Palette.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.mapBannerTitle, { fontSize: scaleFont(14) }]}>
                Explore Nearby Farms on Map
              </Text>
              <Text style={[styles.mapBannerSub, { fontSize: scaleFont(11) }]}>
                View farm locations, distance in km & direct pickup routes
              </Text>
            </View>
          </View>
          <Ionicons name="chevron-forward" size={scaleSize(18)} color={Palette.primary} />
        </TouchableOpacity>

        {/* Quick Market Intelligence Row */}
        <View
          style={{
            flexDirection: 'row',
            marginHorizontal: scaleSize(contentPadding),
            marginTop: scaleSize(8),
            gap: scaleSize(8),
          }}
        >
          <TouchableOpacity
            activeOpacity={0.88}
            onPress={() => router.push('/price-comparison')}
            style={{
              flex: 1,
              flexDirection: 'row',
              alignItems: 'center',
              backgroundColor: Palette.surface,
              padding: scaleSize(10),
              borderRadius: BorderRadius.md,
              borderWidth: 1,
              borderColor: Palette.warmBorder,
              gap: scaleSize(6),
            }}
          >
            <Ionicons name="stats-chart" size={scaleSize(16)} color={Palette.primary} />
            <Text style={{ fontSize: scaleFont(11), fontWeight: '700', color: Palette.charcoal }}>
              Compare Rates
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.88}
            onPress={() => router.push('/price-history')}
            style={{
              flex: 1,
              flexDirection: 'row',
              alignItems: 'center',
              backgroundColor: Palette.surface,
              padding: scaleSize(10),
              borderRadius: BorderRadius.md,
              borderWidth: 1,
              borderColor: Palette.warmBorder,
              gap: scaleSize(6),
            }}
          >
            <Ionicons name="time" size={scaleSize(16)} color={Palette.secondary} />
            <Text style={{ fontSize: scaleFont(11), fontWeight: '700', color: Palette.charcoal }}>
              Price History
            </Text>
          </TouchableOpacity>
        </View>

        {/* Urgent Crop Rescue Clearance Banner */}
        <CropRescueBanner
          urgentCount={rescueCrops.length}
          totalKgAtRisk={totalKgAtRisk}
          onPress={() => router.push('/(buyer)/rescue')}
        />

        {/* ======================================================== */}
        {/* 2. MY PURCHASING REQUIREMENTS CARD                       */}
        {/* ======================================================== */}
        <View
          style={[
            styles.requirementsCard,
            {
              marginHorizontal: scaleSize(contentPadding),
              padding: scaleSize(14),
              borderRadius: BorderRadius.lg,
              ...Shadows.soft,
            },
          ]}
        >
          <View style={styles.reqHeaderRow}>
            <View style={styles.reqHeaderLeft}>
              <View style={styles.reqIconWrap}>
                <Ionicons name="briefcase" size={scaleSize(18)} color={Palette.primary} />
              </View>
              <View>
                <Text style={[styles.reqCardTitle, { fontSize: scaleFont(14) }]}>
                  {buyerProfile?.businessName || 'My Purchasing Requirements'}
                </Text>
                <Text style={[styles.reqCardSub, { fontSize: scaleFont(11) }]}>
                  Active Sourcing Criteria & Capacity
                </Text>
              </View>
            </View>

            <TouchableOpacity
              onPress={handleOpenReqModal}
              style={[
                styles.editReqBtn,
                {
                  paddingHorizontal: scaleSize(10),
                  paddingVertical: scaleSize(5),
                  borderRadius: BorderRadius.full,
                },
              ]}
            >
              <Ionicons name="create-outline" size={scaleSize(13)} color={Palette.primary} />
              <Text style={[styles.editReqBtnText, { fontSize: scaleFont(11) }]}>Update</Text>
            </TouchableOpacity>
          </View>

          {/* Preferred Crops Chips */}
          <Text style={[styles.reqSectionLabel, { fontSize: scaleFont(11) }]}>
            PREFERRED CROPS:
          </Text>
          <View style={styles.reqChipsRow}>
            {(buyerProfile?.purchasingRequirements?.preferredCrops || ['Carrot', 'Tomato', 'Beans']).map(
              (crop) => (
                <View key={crop} style={styles.reqChip}>
                  <Ionicons name="leaf" size={scaleSize(10)} color={Palette.primary} />
                  <Text style={styles.reqChipText}>{crop}</Text>
                </View>
              )
            )}
          </View>

          {/* Sourcing Metrics */}
          <View style={styles.reqMetricsBar}>
            <View style={styles.reqMetricCol}>
              <Text style={styles.reqMetricVal}>
                {(buyerProfile?.purchasingRequirements?.minOrderQuantityKg || 100)} - {(buyerProfile?.purchasingRequirements?.maxOrderQuantityKg || 3000)} kg
              </Text>
              <Text style={styles.reqMetricLbl}>Order Capacity</Text>
            </View>

            <View style={styles.reqMetricDiv} />

            <View style={styles.reqMetricCol}>
              <Text style={styles.reqMetricVal}>
                Rs. {((buyerProfile?.purchasingRequirements?.weeklyTargetBudgetLkr || 750000) / 1000).toFixed(0)}k
              </Text>
              <Text style={styles.reqMetricLbl}>Weekly Budget</Text>
            </View>

            <View style={styles.reqMetricDiv} />

            <View style={styles.reqMetricCol}>
              <Text style={styles.reqMetricVal}>
                {buyerProfile?.purchasingRequirements?.hasColdStorage ? 'Available' : 'Standard'}
              </Text>
              <Text style={styles.reqMetricLbl}>Cold Storage</Text>
            </View>
          </View>
        </View>

        {/* ======================================================== */}
        {/* 3. MY SUBMITTED OFFERS SECTION                            */}
        {/* ======================================================== */}
        <View style={{ marginTop: scaleSize(16) }}>
          <View
            style={[
              styles.sectionHeader,
              { paddingHorizontal: scaleSize(contentPadding), marginBottom: scaleSize(8) },
            ]}
          >
            <View>
              <Text style={[styles.sectionTitle, { fontSize: scaleFont(16) }]}>
                My Submitted Offers ({myOffers.length})
              </Text>
              <Text style={[styles.sectionSub, { fontSize: scaleFont(11) }]}>
                Live purchase bids & farmer counter-offers
              </Text>
            </View>

            <TouchableOpacity onPress={() => router.push('/notifications')}>
              <Text style={[styles.viewAllText, { fontSize: scaleFont(12) }]}>Notifications ➔</Text>
            </TouchableOpacity>
          </View>

          {/* Offer Status Filter Tabs */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{
              paddingHorizontal: scaleSize(contentPadding),
              gap: scaleSize(6),
              marginBottom: scaleSize(10),
            }}
          >
            {(['all', 'pending', 'countered', 'accepted'] as const).map((tab) => {
              const active = offerTab === tab;
              const count =
                tab === 'all'
                  ? myOffers.length
                  : myOffers.filter((o) => o.status === tab).length;
              return (
                <TouchableOpacity
                  key={tab}
                  onPress={() => setOfferTab(tab)}
                  style={[
                    styles.tabChip,
                    active && styles.tabChipActive,
                    {
                      paddingHorizontal: scaleSize(12),
                      paddingVertical: scaleSize(5),
                      borderRadius: BorderRadius.full,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.tabChipText,
                      active && styles.tabChipTextActive,
                      { fontSize: scaleFont(11) },
                    ]}
                  >
                    {tab.toUpperCase()} ({count})
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* Offer Cards */}
          {filteredOffers.length === 0 ? (
            <View
              style={[
                styles.emptyCard,
                { marginHorizontal: scaleSize(contentPadding), padding: scaleSize(16) },
              ]}
            >
              <Ionicons name="chatbubbles-outline" size={scaleSize(28)} color={Palette.slateMedium} />
              <Text style={[styles.emptyCardText, { fontSize: scaleFont(12) }]}>
                No offers found in this category. Browse farm produce below to make purchase offers.
              </Text>
            </View>
          ) : (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{
                paddingHorizontal: scaleSize(contentPadding),
                gap: scaleSize(10),
              }}
            >
              {filteredOffers.map((offer) => {
                const isCountered = offer.status === 'countered';
                const isAccepted = offer.status === 'accepted';
                const isPending = offer.status === 'pending';

                return (
                  <View
                    key={offer.id}
                    style={[
                      styles.offerCard,
                      {
                        width: scaleSize(290),
                        padding: scaleSize(14),
                        borderRadius: BorderRadius.lg,
                        ...Shadows.soft,
                      },
                    ]}
                  >
                    {/* Top Row: Crop Name & Status Badge */}
                    <View style={styles.offerCardTop}>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.offerCropName, { fontSize: scaleFont(15) }]}>
                          {offer.cropName}
                        </Text>
                        <Text style={[styles.offerFarmerName, { fontSize: scaleFont(11) }]}>
                          Farmer: {offer.farmerName}
                        </Text>
                      </View>

                      <Badge
                        label={offer.status.toUpperCase()}
                        variant={
                          isAccepted
                            ? 'verified'
                            : isCountered
                            ? 'aiFair'
                            : isPending
                            ? 'category'
                            : 'neutral'
                        }
                        size="sm"
                      />
                    </View>

                    {/* Price & Quantity Details */}
                    <View style={styles.offerDetailsBox}>
                      <View style={styles.offerDetailRow}>
                        <Text style={styles.offerDetailLbl}>My Offered Price:</Text>
                        <Text style={styles.offerDetailVal}>
                          Rs. {offer.offeredPricePerKg}/kg
                        </Text>
                      </View>
                      <View style={styles.offerDetailRow}>
                        <Text style={styles.offerDetailLbl}>Farmer Asking Price:</Text>
                        <Text style={styles.offerDetailSubVal}>
                          Rs. {offer.farmerAskingPricePerKg}/kg
                        </Text>
                      </View>
                      <View style={styles.offerDetailRow}>
                        <Text style={styles.offerDetailLbl}>Requested Volume:</Text>
                        <Text style={styles.offerDetailVal}>
                          {offer.requestedQuantityKg} kg
                        </Text>
                      </View>
                      <View style={styles.offerDetailRow}>
                        <Text style={styles.offerDetailLbl}>Total Estimated Deal:</Text>
                        <Text style={[styles.offerDetailVal, { color: Palette.primary }]}>
                          Rs. {offer.totalAmount.toLocaleString()}
                        </Text>
                      </View>
                    </View>

                    {/* Counter-Offer Alert Box if Countered */}
                    {isCountered && offer.counterPricePerKg && (
                      <View style={styles.counterAlertBox}>
                        <View style={styles.counterAlertHeader}>
                          <Ionicons name="swap-horizontal" size={scaleSize(13)} color={Palette.warning} />
                          <Text style={styles.counterAlertTitle}>
                            Farmer Countered: Rs. {offer.counterPricePerKg}/kg
                          </Text>
                        </View>
                        {offer.farmerResponseNotes && (
                          <Text style={styles.counterAlertNotes}>
                            &ldquo;{offer.farmerResponseNotes}&rdquo;
                          </Text>
                        )}
                      </View>
                    )}

                    {/* Note if accepted */}
                    {isAccepted && offer.farmerResponseNotes && (
                      <View style={[styles.counterAlertBox, { backgroundColor: '#E8F5E9', borderColor: '#A5D6A7' }]}>
                        <Text style={[styles.counterAlertNotes, { color: '#1B5E20' }]}>
                          ✓ Farmer Accepted: &ldquo;{offer.farmerResponseNotes}&rdquo;
                        </Text>
                      </View>
                    )}

                    {/* Action Buttons */}
                    <View style={styles.offerActionsRow}>
                      {isCountered ? (
                        <>
                          <TouchableOpacity
                            onPress={() => handleAcceptCounter(offer)}
                            style={[styles.offerActionBtn, styles.acceptBtn]}
                          >
                            <Text style={styles.acceptBtnText}>
                              Accept (Rs. {offer.counterPricePerKg})
                            </Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            onPress={() => handleOpenReviseOffer(offer)}
                            style={[styles.offerActionBtn, styles.reviseBtn]}
                          >
                            <Text style={styles.reviseBtnText}>Revise</Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            onPress={() => handleWithdrawOffer(offer)}
                            style={[styles.offerActionBtn, styles.withdrawBtn]}
                          >
                            <Text style={styles.withdrawBtnText}>Withdraw</Text>
                          </TouchableOpacity>
                        </>
                      ) : isPending ? (
                        <>
                          <TouchableOpacity
                            onPress={() => handleOpenReviseOffer(offer)}
                            style={[styles.offerActionBtn, styles.reviseBtn]}
                          >
                            <Text style={styles.reviseBtnText}>Update Price</Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            onPress={() => handleWithdrawOffer(offer)}
                            style={[styles.offerActionBtn, styles.withdrawBtn]}
                          >
                            <Text style={styles.withdrawBtnText}>Withdraw</Text>
                          </TouchableOpacity>
                        </>
                      ) : isAccepted ? (
                        <TouchableOpacity
                          onPress={() =>
                            Alert.alert('Contact Farmer', `Farmer Phone: ${offer.buyerPhone || '+94 77 123 4567'}`)
                          }
                          style={[styles.offerActionBtn, styles.callBtn]}
                        >
                          <Ionicons name="call" size={12} color="#FFFFFF" />
                          <Text style={styles.callBtnText}>Call Farmer for Pickup</Text>
                        </TouchableOpacity>
                      ) : (
                        <Text style={styles.offerStatusClosedText}>Status: {offer.status}</Text>
                      )}
                    </View>
                  </View>
                );
              })}
            </ScrollView>
          )}
        </View>

        {/* ======================================================== */}
        {/* 4. FARMER ENQUIRIES / DIRECT MESSAGES SECTION            */}
        {/* ======================================================== */}
        <View style={{ marginTop: scaleSize(16) }}>
          <View
            style={[
              styles.sectionHeader,
              { paddingHorizontal: scaleSize(contentPadding), marginBottom: scaleSize(8) },
            ]}
          >
            <View>
              <Text style={[styles.sectionTitle, { fontSize: scaleFont(16) }]}>
                Farmer Enquiries & Messages ({enquiries.length})
              </Text>
              <Text style={[styles.sectionSub, { fontSize: scaleFont(11) }]}>
                Direct communications with local farm producers
              </Text>
            </View>

            <TouchableOpacity onPress={() => setAllEnquiriesModalVisible(true)}>
              <Text style={[styles.viewAllText, { fontSize: scaleFont(12) }]}>View All History ➔</Text>
            </TouchableOpacity>
          </View>

          {enquiries.length === 0 ? (
            <View
              style={[
                styles.emptyCard,
                { marginHorizontal: scaleSize(contentPadding), padding: scaleSize(16) },
              ]}
            >
              <Ionicons name="mail-unread-outline" size={scaleSize(26)} color={Palette.slateMedium} />
              <Text style={[styles.emptyCardText, { fontSize: scaleFont(12) }]}>
                No messages yet. Send direct inquiries to farmers on any crop listing.
              </Text>
            </View>
          ) : (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{
                paddingHorizontal: scaleSize(contentPadding),
                gap: scaleSize(10),
              }}
            >
              {enquiries.slice(0, 5).map((enq) => (
                <TouchableOpacity
                  key={enq.id}
                  activeOpacity={0.88}
                  onPress={() => handleOpenThreadModal(enq)}
                  style={[
                    styles.enquiryCard,
                    {
                      width: scaleSize(260),
                      padding: scaleSize(12),
                      borderRadius: BorderRadius.lg,
                      ...Shadows.soft,
                    },
                  ]}
                >
                  <View style={styles.enqTopRow}>
                    <Ionicons name="person-circle" size={scaleSize(28)} color={Palette.primary} />
                    <View style={{ flex: 1, marginLeft: 8 }}>
                      <Text style={[styles.enqSender, { fontSize: scaleFont(13) }]}>
                        {enq.senderRole === 'farmer' ? enq.senderName : enq.recipientName}
                      </Text>
                      <Text style={[styles.enqCropTag, { fontSize: scaleFont(10) }]}>
                        Re: {enq.cropName || 'Farm Produce'}
                      </Text>
                    </View>
                    {!enq.isRead && enq.recipientId === buyerId && (
                      <View style={styles.unreadDot} />
                    )}
                  </View>

                  <Text
                    style={[styles.enqSnippet, { fontSize: scaleFont(12) }]}
                    numberOfLines={2}
                  >
                    &ldquo;{enq.message}&rdquo;
                  </Text>

                  <View style={styles.enqBottomRow}>
                    <Text style={styles.enqTime}>
                      {new Date(enq.createdAt).toLocaleDateString('en-GB', {
                        month: 'short',
                        day: 'numeric',
                      })}
                    </Text>
                    <Text style={styles.enqReplyLink}>View Thread & Reply ➔</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}
        </View>

        {/* ======================================================== */}
        {/* 5. RECENTLY ADDED CROPS SECTION                          */}
        {/* ======================================================== */}
        <View style={{ marginTop: scaleSize(16) }}>
          <View
            style={[
              styles.sectionHeader,
              { paddingHorizontal: scaleSize(contentPadding), marginBottom: scaleSize(8) },
            ]}
          >
            <View>
              <Text style={[styles.sectionTitle, { fontSize: scaleFont(16) }]}>
                Recently Added Crops
              </Text>
              <Text style={[styles.sectionSub, { fontSize: scaleFont(11) }]}>
                Fresh harvests posted by farmers today
              </Text>
            </View>
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{
              paddingHorizontal: scaleSize(contentPadding),
              gap: scaleSize(10),
            }}
          >
            {recentCrops.map((crop) => (
              <TouchableOpacity
                key={crop.id}
                activeOpacity={0.88}
                onPress={() => router.push({ pathname: '/crop/[id]', params: { id: crop.id } })}
                style={[
                  styles.recentCard,
                  {
                    width: scaleSize(220),
                    padding: scaleSize(12),
                    borderRadius: BorderRadius.lg,
                    ...Shadows.soft,
                  },
                ]}
              >
                <View style={styles.recentTop}>
                  <Badge label={`Grade ${crop.grade}`} variant="grade" size="sm" />
                  {crop.isRescueCrop && (
                    <Badge label="RESCUE" variant="rescue" size="sm" />
                  )}
                </View>

                <Text style={[styles.recentCropName, { fontSize: scaleFont(14) }]}>
                  {crop.cropName}
                </Text>
                <Text style={[styles.recentFarmer, { fontSize: scaleFont(11) }]}>
                  📍 {crop.district} • {crop.farmerName}
                </Text>

                <View style={styles.recentPriceRow}>
                  <Text style={[styles.recentPrice, { fontSize: scaleFont(15) }]}>
                    Rs. {crop.askingPricePerKg}/kg
                  </Text>
                  <Text style={[styles.recentQty, { fontSize: scaleFont(11) }]}>
                    {crop.quantityKg} kg
                  </Text>
                </View>

                <View style={styles.recentActionsRow}>
                  <TouchableOpacity
                    onPress={() => handleOpenMakeOffer(crop)}
                    style={styles.recentOfferBtn}
                  >
                    <Ionicons name="pricetag" size={11} color="#FFFFFF" />
                    <Text style={styles.recentOfferBtnText}>Make Offer</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => handleOpenEnquiryModal(crop)}
                    style={styles.recentEnqBtn}
                  >
                    <Ionicons name="chatbubble-outline" size={11} color={Palette.primary} />
                  </TouchableOpacity>
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* ======================================================== */}
        {/* 6. CATEGORIES & DISTRICTS BAR                            */}
        {/* ======================================================== */}
        <View style={{ marginTop: scaleSize(16), marginBottom: scaleSize(6) }}>
          {/* Category Bar */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{
              paddingHorizontal: scaleSize(contentPadding),
              gap: scaleSize(8),
              marginBottom: scaleSize(8),
            }}
          >
            {CROP_CATEGORIES.map((cat) => {
              const active = selectedCategory === cat.id;
              return (
                <TouchableOpacity
                  key={cat.id}
                  onPress={() => setSelectedCategory(cat.id)}
                  style={[
                    styles.catChip,
                    active && styles.catChipActive,
                    {
                      paddingHorizontal: scaleSize(12),
                      paddingVertical: scaleSize(7),
                      borderRadius: BorderRadius.full,
                    },
                  ]}
                >
                  <Ionicons
                    name={cat.icon as any}
                    size={scaleSize(13)}
                    color={active ? '#FFFFFF' : Palette.charcoal}
                    style={{ marginRight: 4 }}
                  />
                  <Text
                    style={[
                      styles.catChipText,
                      active && styles.catChipTextActive,
                      { fontSize: scaleFont(11) },
                    ]}
                  >
                    {cat.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* District Bar */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{
              paddingHorizontal: scaleSize(contentPadding),
              gap: scaleSize(6),
            }}
          >
            {['All Districts', ...SRI_LANKA_DISTRICTS.map((d) => d.name)].map((dist) => {
              const active = selectedDistrict === dist;
              return (
                <TouchableOpacity
                  key={dist}
                  onPress={() => setSelectedDistrict(dist)}
                  style={[
                    styles.distChip,
                    active && styles.distChipActive,
                    {
                      paddingHorizontal: scaleSize(10),
                      paddingVertical: scaleSize(5),
                      borderRadius: BorderRadius.full,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.distChipText,
                      active && styles.distChipTextActive,
                      { fontSize: scaleFont(10) },
                    ]}
                  >
                    {dist}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* ======================================================== */}
        {/* 7. AVAILABLE FARM PRODUCE FEED                           */}
        {/* ======================================================== */}
        <View
          style={[
            styles.feedHeader,
            { paddingHorizontal: scaleSize(contentPadding), marginVertical: scaleSize(10) },
          ]}
        >
          <Text style={[styles.feedTitle, { fontSize: scaleFont(16) }]}>
            Available Farm Produce ({filteredCrops.length})
          </Text>
          <Text style={[styles.feedFilter, { fontSize: scaleFont(12) }]}>Sorted by Distance</Text>
        </View>

        {filteredCrops.map((crop) => (
          <CropListingCard
            key={crop.id}
            listing={crop as any}
            onPress={() => router.push({ pathname: '/crop/[id]', params: { id: crop.id } })}
          />
        ))}
      </ScrollView>

      {/* ======================================================== */}
      {/* MODAL 1: EDIT PURCHASING REQUIREMENTS                   */}
      {/* ======================================================== */}
      <Modal
        visible={reqModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setReqModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { maxHeight: '88%' }]}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={[styles.modalTitle, { fontSize: scaleFont(17) }]}>
                  Update Purchasing Requirements
                </Text>
                <Text style={[styles.modalSub, { fontSize: scaleFont(12) }]}>
                  Saved to Cloud Firestore `buyers/{buyerId}`
                </Text>
              </View>
              <TouchableOpacity onPress={() => setReqModalVisible(false)}>
                <Ionicons name="close-circle" size={scaleSize(24)} color={Palette.slateMedium} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Business Name */}
              <Input
                label="BUSINESS / TRADING ENTITY NAME"
                value={businessNameInput}
                onChangeText={setBusinessNameInput}
                leftIcon="business-outline"
              />

              {/* Preferred Crops Multi-Select */}
              <Text style={[styles.formLabel, { fontSize: scaleFont(12) }]}>
                PREFERRED CROPS TO PURCHASE (MULTI-SELECT)
              </Text>
              <View style={styles.cropPickerContainer}>
                {POPULAR_CROPS.map((c) => {
                  const isSelected = preferredCropsInput.includes(c.name) || preferredCropsInput.some(p => c.name.toLowerCase().includes(p.toLowerCase()));
                  return (
                    <TouchableOpacity
                      key={c.id}
                      onPress={() => togglePreferredCrop(c.name)}
                      style={[
                        styles.cropPickChip,
                        isSelected && styles.cropPickChipActive,
                      ]}
                    >
                      <Ionicons
                        name={isSelected ? 'checkmark-circle' : 'add-circle-outline'}
                        size={12}
                        color={isSelected ? '#FFFFFF' : Palette.charcoal}
                      />
                      <Text
                        style={[
                          styles.cropPickText,
                          isSelected && styles.cropPickTextActive,
                          { fontSize: scaleFont(11) },
                        ]}
                      >
                        {c.name}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Quantities */}
              <View style={styles.formRow}>
                <View style={{ flex: 1 }}>
                  <Input
                    label="MIN ORDER (KG)"
                    value={minOrderKgInput}
                    onChangeText={setMinOrderKgInput}
                    keyboardType="numeric"
                  />
                </View>
                <View style={{ width: 10 }} />
                <View style={{ flex: 1 }}>
                  <Input
                    label="MAX CAPACITY (KG)"
                    value={maxOrderKgInput}
                    onChangeText={setMaxOrderKgInput}
                    keyboardType="numeric"
                  />
                </View>
              </View>

              {/* Weekly Budget */}
              <Input
                label="ESTIMATED WEEKLY BUDGET (LKR)"
                value={budgetLkrInput}
                onChangeText={setBudgetLkrInput}
                keyboardType="numeric"
                leftIcon="cash-outline"
              />

              {/* Delivery Mode */}
              <Text style={[styles.formLabel, { fontSize: scaleFont(12) }]}>
                PREFERRED SOURCING DELIVERY MODE
              </Text>
              <View style={styles.modePickRow}>
                <TouchableOpacity
                  onPress={() => setDeliveryModeInput('farmgate_pickup')}
                  style={[
                    styles.modePickBtn,
                    deliveryModeInput === 'farmgate_pickup' && styles.modePickBtnActive,
                  ]}
                >
                  <Ionicons
                    name="car-outline"
                    size={16}
                    color={deliveryModeInput === 'farmgate_pickup' ? Palette.primary : Palette.slateDark}
                  />
                  <Text
                    style={[
                      styles.modePickText,
                      deliveryModeInput === 'farmgate_pickup' && styles.modePickTextActive,
                    ]}
                  >
                    Farmgate Pickup
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => setDeliveryModeInput('market_delivery')}
                  style={[
                    styles.modePickBtn,
                    deliveryModeInput === 'market_delivery' && styles.modePickBtnActive,
                  ]}
                >
                  <Ionicons
                    name="cube-outline"
                    size={16}
                    color={deliveryModeInput === 'market_delivery' ? Palette.primary : Palette.slateDark}
                  />
                  <Text
                    style={[
                      styles.modePickText,
                      deliveryModeInput === 'market_delivery' && styles.modePickTextActive,
                    ]}
                  >
                    Market Delivery
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Preferred Districts Multi-Select */}
              <Text style={[styles.formLabel, { fontSize: scaleFont(12), marginTop: 12 }]}>
                PREFERRED PURCHASING DISTRICTS
              </Text>
              <View style={styles.cropPickerContainer}>
                {['Nuwara Eliya', 'Matale', 'Kandy', 'Badulla', 'Anuradhapura', 'Jaffna', 'Kurunegala', 'Hambantota'].map((dist) => {
                  const isSelected = preferredDistrictsInput.includes(dist);
                  return (
                    <TouchableOpacity
                      key={dist}
                      onPress={() => togglePreferredDistrict(dist)}
                      style={[
                        styles.cropPickChip,
                        isSelected && styles.cropPickChipActive,
                      ]}
                    >
                      <Ionicons
                        name="location-outline"
                        size={12}
                        color={isSelected ? '#FFFFFF' : Palette.charcoal}
                      />
                      <Text
                        style={[
                          styles.cropPickText,
                          isSelected && styles.cropPickTextActive,
                          { fontSize: scaleFont(11) },
                        ]}
                      >
                        {dist}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Cold Storage Facility Toggle */}
              <View style={styles.switchRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.switchLabel}>Cold Storage Facilities</Text>
                  <Text style={styles.switchSub}>Buyer possesses refrigerated storage hubs</Text>
                </View>
                <Switch
                  value={coldStorageInput}
                  onValueChange={setColdStorageInput}
                  trackColor={{ false: '#CBD5E1', true: Palette.primary }}
                />
              </View>

              <Button
                title={savingReq ? 'Saving Requirements...' : 'Save Requirements to Firestore'}
                variant="primary"
                size="lg"
                icon="save-outline"
                fullWidth
                loading={savingReq}
                onPress={handleSaveRequirements}
                style={{ marginTop: 16 }}
              />
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ======================================================== */}
      {/* MODAL 2: MAKE / REVISE PURCHASE OFFER                    */}
      {/* ======================================================== */}
      <Modal
        visible={offerModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setOfferModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { maxHeight: '85%' }]}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={[styles.modalTitle, { fontSize: scaleFont(17) }]}>
                  {selectedOfferToEdit ? 'Revise Purchase Offer' : 'Submit Purchase Offer'}
                </Text>
                <Text style={[styles.modalSub, { fontSize: scaleFont(12) }]}>
                  {selectedListingForOffer?.cropName || selectedOfferToEdit?.cropName} • Farmer: {selectedListingForOffer?.farmerName || selectedOfferToEdit?.farmerName}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setOfferModalVisible(false)}>
                <Ionicons name="close-circle" size={scaleSize(24)} color={Palette.slateMedium} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Benchmark Reference */}
              <View style={styles.modalRefBox}>
                <View style={styles.modalRefCol}>
                  <Text style={styles.modalRefLbl}>Farmer Asking Price:</Text>
                  <Text style={styles.modalRefVal}>
                    Rs. {selectedListingForOffer?.askingPricePerKg || selectedOfferToEdit?.farmerAskingPricePerKg}/kg
                  </Text>
                </View>
                <View style={styles.modalRefCol}>
                  <Text style={styles.modalRefLbl}>Minimum Order:</Text>
                  <Text style={styles.modalRefVal}>
                    {selectedListingForOffer?.minOrderKg || 100} kg
                  </Text>
                </View>
              </View>

              <Input
                label="YOUR OFFERED PRICE PER KG (LKR)"
                value={offerPriceInput}
                onChangeText={setOfferPriceInput}
                keyboardType="numeric"
                leftIcon="pricetag-outline"
              />

              <Input
                label="REQUESTED QUANTITY (KG)"
                value={offerQuantityInput}
                onChangeText={setOfferQuantityInput}
                keyboardType="numeric"
                leftIcon="scale-outline"
              />

              {/* Total Calculation Display */}
              <View style={styles.calcBox}>
                <Text style={styles.calcLabel}>Total Deal Estimate:</Text>
                <Text style={styles.calcValue}>
                  Rs. {((parseFloat(offerPriceInput) || 0) * (parseFloat(offerQuantityInput) || 0)).toLocaleString()} LKR
                </Text>
              </View>

              <Input
                label="PROPOSED PICKUP / DELIVERY DATE"
                value={offerPickupDateInput}
                onChangeText={setOfferPickupDateInput}
                leftIcon="calendar-outline"
              />

              {/* Transport Switch */}
              <View style={styles.switchRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.switchLabel}>Buyer Arranges Transport</Text>
                  <Text style={styles.switchSub}>Buyer dispatches truck for farmgate collection</Text>
                </View>
                <Switch
                  value={offerTransportBuyerInput}
                  onValueChange={setOfferTransportBuyerInput}
                  trackColor={{ false: '#CBD5E1', true: Palette.primary }}
                />
              </View>

              <Input
                label="ADDITIONAL NOTES FOR FARMER"
                value={offerNotesInput}
                onChangeText={setOfferNotesInput}
                placeholder="e.g. Can bring wooden crates, pickup before noon."
                leftIcon="document-text-outline"
              />

              <Button
                title={submittingOffer ? 'Submitting to Firestore...' : selectedOfferToEdit ? 'Update Offer in Firestore' : 'Submit Purchase Offer'}
                variant="primary"
                size="lg"
                icon="send"
                fullWidth
                loading={submittingOffer}
                onPress={handleSubmitOffer}
                style={{ marginTop: 14 }}
              />
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ======================================================== */}
      {/* MODAL 3: SEND ENQUIRY TO FARMER                          */}
      {/* ======================================================== */}
      <Modal
        visible={enquiryModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setEnquiryModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { maxHeight: '75%' }]}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={[styles.modalTitle, { fontSize: scaleFont(17) }]}>
                  Send Enquiry to Farmer
                </Text>
                <Text style={[styles.modalSub, { fontSize: scaleFont(12) }]}>
                  Farmer: {selectedListingForEnquiry?.farmerName} • {selectedListingForEnquiry?.cropName}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setEnquiryModalVisible(false)}>
                <Ionicons name="close-circle" size={scaleSize(24)} color={Palette.slateMedium} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={[styles.formLabel, { fontSize: scaleFont(12) }]}>
                TYPE YOUR INQUIRY MESSAGE
              </Text>
              <TextInput
                value={enquiryMsgInput}
                onChangeText={setEnquiryMsgInput}
                multiline
                numberOfLines={4}
                style={styles.messageInput}
                placeholder="Ask about harvest time, farmgate loading, vehicle access, or volume availability..."
              />

              {/* Quick suggestions */}
              <View style={styles.suggestionRow}>
                {[
                  'Can you load at 7 AM?',
                  'Is 4-ton truck access available?',
                  'What is the best rate for 1,000kg?',
                ].map((sug) => (
                  <TouchableOpacity
                    key={sug}
                    onPress={() => setEnquiryMsgInput(sug)}
                    style={styles.sugChip}
                  >
                    <Text style={styles.sugText}>{sug}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Button
                title={sendingEnq ? 'Sending Message...' : 'Send Direct Inquiry'}
                variant="primary"
                size="lg"
                icon="send-outline"
                fullWidth
                loading={sendingEnq}
                onPress={handleSendEnquiry}
                style={{ marginTop: 16 }}
              />
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ======================================================== */}
      {/* MODAL 4: ENQUIRY CONVERSATION THREAD                     */}
      {/* ======================================================== */}
      <Modal
        visible={threadModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setThreadModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { maxHeight: '80%' }]}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={[styles.modalTitle, { fontSize: scaleFont(16) }]}>
                  Message Conversation
                </Text>
                <Text style={[styles.modalSub, { fontSize: scaleFont(12) }]}>
                  Farmer: {activeEnquiryThread?.senderRole === 'farmer' ? activeEnquiryThread.senderName : activeEnquiryThread?.recipientName} • Re: {activeEnquiryThread?.cropName}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setThreadModalVisible(false)}>
                <Ionicons name="close-circle" size={scaleSize(24)} color={Palette.slateMedium} />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ flex: 1, marginVertical: 12 }}>
              {/* Show matching messages in thread */}
              {enquiries
                .filter(
                  (e) =>
                    e.cropName === activeEnquiryThread?.cropName ||
                    e.farmerId === activeEnquiryThread?.farmerId
                )
                .map((msg) => {
                  const isMine = msg.senderRole === 'buyer';
                  return (
                    <View
                      key={msg.id}
                      style={[
                        styles.bubbleWrap,
                        isMine ? styles.bubbleRight : styles.bubbleLeft,
                      ]}
                    >
                      <View
                        style={[
                          styles.bubbleContent,
                          isMine ? styles.bubbleContentMine : styles.bubbleContentTheirs,
                        ]}
                      >
                        <Text
                          style={[
                            styles.bubbleSender,
                            isMine ? styles.bubbleSenderMine : styles.bubbleSenderTheirs,
                          ]}
                        >
                          {msg.senderName} ({msg.senderRole})
                        </Text>
                        <Text
                          style={[
                            styles.bubbleText,
                            isMine ? styles.bubbleTextMine : styles.bubbleTextTheirs,
                          ]}
                        >
                          {msg.message}
                        </Text>
                        <Text
                          style={[
                            styles.bubbleTime,
                            isMine ? styles.bubbleTimeMine : styles.bubbleTimeTheirs,
                          ]}
                        >
                          {new Date(msg.createdAt).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </Text>
                      </View>
                    </View>
                  );
                })}
            </ScrollView>

            {/* Quick Reply Composer */}
            <View style={styles.replyComposer}>
              <TextInput
                value={replyMsgInput}
                onChangeText={setReplyMsgInput}
                placeholder="Type your reply to the farmer..."
                style={styles.replyInput}
              />
              <TouchableOpacity
                onPress={handleSendReply}
                disabled={sendingReply || !replyMsgInput.trim()}
                style={[
                  styles.replySendBtn,
                  !replyMsgInput.trim() && { opacity: 0.5 },
                ]}
              >
                <Ionicons name="send" size={16} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ======================================================== */}
      {/* MODAL 5: ALL ENQUIRY HISTORY VIEW                        */}
      {/* ======================================================== */}
      <Modal
        visible={allEnquiriesModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setAllEnquiriesModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { maxHeight: '85%' }]}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={[styles.modalTitle, { fontSize: scaleFont(17) }]}>
                  All Enquiry History ({enquiries.length})
                </Text>
                <Text style={[styles.modalSub, { fontSize: scaleFont(12) }]}>
                  Direct communication log with farm producers
                </Text>
              </View>
              <TouchableOpacity onPress={() => setAllEnquiriesModalVisible(false)}>
                <Ionicons name="close-circle" size={scaleSize(24)} color={Palette.slateMedium} />
              </TouchableOpacity>
            </View>

            {enquiries.length === 0 ? (
              <View style={{ padding: 30, alignItems: 'center' }}>
                <Ionicons name="mail-outline" size={36} color={Palette.slateMedium} />
                <Text style={{ marginTop: 8, fontWeight: '700', color: Palette.charcoal }}>
                  No Enquiry Messages
                </Text>
                <Text style={{ color: Palette.slateMedium, textAlign: 'center', marginTop: 4 }}>
                  Browse crop listings above to send direct inquiries to farmers.
                </Text>
              </View>
            ) : (
              <ScrollView showsVerticalScrollIndicator={false}>
                {enquiries.map((enq) => {
                  const isIncoming = enq.recipientId === buyerId;
                  const otherPartyName = isIncoming ? enq.senderName : enq.recipientName;
                  return (
                    <TouchableOpacity
                      key={enq.id}
                      activeOpacity={0.88}
                      onPress={() => {
                        setAllEnquiriesModalVisible(false);
                        handleOpenThreadModal(enq);
                      }}
                      style={[
                        styles.enquiryCard,
                        {
                          width: '100%',
                          padding: scaleSize(12),
                          borderRadius: BorderRadius.md,
                          marginBottom: scaleSize(8),
                          ...Shadows.soft,
                        },
                      ]}
                    >
                      <View style={styles.enqTopRow}>
                        <Ionicons name="person-circle" size={scaleSize(26)} color={Palette.primary} />
                        <View style={{ flex: 1, marginLeft: 8 }}>
                          <Text style={[styles.enqSender, { fontSize: scaleFont(13) }]}>
                            {otherPartyName} ({enq.senderRole === 'farmer' ? 'Farmer' : 'Buyer'})
                          </Text>
                          <Text style={[styles.enqCropTag, { fontSize: scaleFont(11) }]}>
                            Produce: {enq.cropName || 'Crop Harvest'}
                          </Text>
                        </View>
                        {!enq.isRead && isIncoming && <View style={styles.unreadDot} />}
                      </View>

                      <Text style={[styles.enqSnippet, { fontSize: scaleFont(12), marginVertical: 4 }]}>
                        &ldquo;{enq.message}&rdquo;
                      </Text>

                      <View style={styles.enqBottomRow}>
                        <Text style={styles.enqTime}>
                          {new Date(enq.createdAt).toLocaleDateString('en-GB', {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </Text>
                        <Text style={styles.enqReplyLink}>Open Thread & Reply ➔</Text>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  center: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    color: Palette.slateDark,
    fontWeight: '600',
  },
  mapBanner: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: Palette.warmBorder,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  mapBannerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  mapIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: Palette.primaryTint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mapBannerTitle: {
    fontWeight: '800',
    color: Palette.charcoal,
  },
  mapBannerSub: {
    color: Palette.slateMedium,
    marginTop: 1,
  },
  // Requirements Card
  requirementsCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: Palette.warmBorder,
    marginTop: 8,
  },
  reqHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  reqHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  reqIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: Palette.primaryTint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reqCardTitle: {
    fontWeight: '800',
    color: Palette.charcoal,
  },
  reqCardSub: {
    color: Palette.slateMedium,
  },
  editReqBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Palette.primaryTint,
  },
  editReqBtnText: {
    color: Palette.primary,
    fontWeight: '700',
  },
  reqSectionLabel: {
    fontWeight: '700',
    color: Palette.slateMedium,
    marginBottom: 4,
  },
  reqChipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 10,
  },
  reqChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Palette.primaryTint,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
  },
  reqChipText: {
    fontSize: 11,
    color: Palette.primary,
    fontWeight: '700',
  },
  reqMetricsBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Palette.background,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: BorderRadius.md,
  },
  reqMetricCol: {
    alignItems: 'center',
  },
  reqMetricVal: {
    fontSize: 12,
    fontWeight: '800',
    color: Palette.charcoal,
  },
  reqMetricLbl: {
    fontSize: 10,
    color: Palette.slateMedium,
    marginTop: 1,
  },
  reqMetricDiv: {
    width: 1,
    height: 20,
    backgroundColor: Palette.subtleBorder,
  },
  // Section Headers
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionTitle: {
    fontWeight: '800',
    color: Palette.charcoal,
  },
  sectionSub: {
    color: Palette.slateMedium,
    marginTop: 1,
  },
  viewAllText: {
    color: Palette.primary,
    fontWeight: '700',
  },
  tabChip: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: Palette.warmBorder,
  },
  tabChipActive: {
    backgroundColor: Palette.primary,
    borderColor: Palette.primary,
  },
  tabChipText: {
    fontWeight: '600',
    color: Palette.charcoal,
  },
  tabChipTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  // Offer Cards
  offerCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: Palette.warmBorder,
  },
  offerCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  offerCropName: {
    fontWeight: '800',
    color: Palette.charcoal,
  },
  offerFarmerName: {
    color: Palette.slateMedium,
    marginTop: 1,
  },
  offerDetailsBox: {
    backgroundColor: Palette.background,
    padding: 8,
    borderRadius: BorderRadius.md,
    gap: 4,
    marginBottom: 8,
  },
  offerDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  offerDetailLbl: {
    fontSize: 11,
    color: Palette.slateDark,
  },
  offerDetailVal: {
    fontSize: 11,
    fontWeight: '700',
    color: Palette.charcoal,
  },
  offerDetailSubVal: {
    fontSize: 11,
    color: Palette.slateMedium,
    textDecorationLine: 'line-through',
  },
  counterAlertBox: {
    backgroundColor: '#FFF8E1',
    borderWidth: 1,
    borderColor: '#FFE082',
    padding: 8,
    borderRadius: BorderRadius.md,
    marginBottom: 8,
  },
  counterAlertHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  counterAlertTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#B78103',
  },
  counterAlertNotes: {
    fontSize: 10,
    color: Palette.slateDark,
    marginTop: 2,
    fontStyle: 'italic',
  },
  offerActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  offerActionBtn: {
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  acceptBtn: {
    backgroundColor: Palette.primary,
    flex: 1.5,
  },
  acceptBtnText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
  },
  reviseBtn: {
    backgroundColor: Palette.primaryTint,
    flex: 1,
  },
  reviseBtnText: {
    color: Palette.primary,
    fontSize: 11,
    fontWeight: '700',
  },
  withdrawBtn: {
    backgroundColor: '#FEE2E2',
    flex: 1,
  },
  withdrawBtnText: {
    color: Palette.rescueRed,
    fontSize: 11,
    fontWeight: '700',
  },
  callBtn: {
    backgroundColor: Palette.secondaryDark,
    flexDirection: 'row',
    gap: 4,
    flex: 1,
    paddingVertical: 7,
  },
  callBtnText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  offerStatusClosedText: {
    fontSize: 11,
    color: Palette.slateMedium,
    fontStyle: 'italic',
  },
  // Enquiry Cards
  enquiryCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: Palette.warmBorder,
  },
  enqTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  enqSender: {
    fontWeight: '800',
    color: Palette.charcoal,
  },
  enqCropTag: {
    color: Palette.primary,
    fontWeight: '600',
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Palette.rescueRed,
  },
  enqSnippet: {
    color: Palette.slateDark,
    fontStyle: 'italic',
    lineHeight: 16,
    marginBottom: 8,
  },
  enqBottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: Palette.subtleBorder,
    paddingTop: 6,
  },
  enqTime: {
    fontSize: 10,
    color: Palette.slateMedium,
  },
  enqReplyLink: {
    fontSize: 11,
    color: Palette.primary,
    fontWeight: '700',
  },
  // Recently Added Cards
  recentCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: Palette.warmBorder,
  },
  recentTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  recentCropName: {
    fontWeight: '800',
    color: Palette.charcoal,
  },
  recentFarmer: {
    color: Palette.slateMedium,
    marginTop: 2,
    marginBottom: 8,
  },
  recentPriceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: Palette.background,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: BorderRadius.md,
    marginBottom: 8,
  },
  recentPrice: {
    fontWeight: '900',
    color: Palette.charcoal,
  },
  recentQty: {
    color: Palette.slateDark,
    fontWeight: '600',
  },
  recentActionsRow: {
    flexDirection: 'row',
    gap: 6,
  },
  recentOfferBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    backgroundColor: Palette.primary,
    paddingVertical: 6,
    borderRadius: BorderRadius.md,
  },
  recentOfferBtnText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  recentEnqBtn: {
    width: 32,
    height: 32,
    borderRadius: BorderRadius.md,
    backgroundColor: Palette.primaryTint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Filter Chips
  catChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: Palette.warmBorder,
  },
  catChipActive: {
    backgroundColor: Palette.primary,
    borderColor: Palette.primary,
  },
  catChipText: {
    fontWeight: '600',
    color: Palette.charcoal,
  },
  catChipTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  distChip: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: Palette.warmBorder,
  },
  distChipActive: {
    backgroundColor: Palette.secondaryDark,
    borderColor: Palette.secondaryDark,
  },
  distChipText: {
    color: Palette.charcoal,
    fontWeight: '600',
  },
  distChipTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  emptyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Palette.warmBorder,
    borderStyle: 'dashed',
    gap: 6,
  },
  emptyCardText: {
    color: Palette.slateMedium,
    textAlign: 'center',
  },
  feedHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  feedTitle: {
    fontWeight: '800',
    color: Palette.charcoal,
  },
  feedFilter: {
    color: Palette.secondaryDark,
    fontWeight: '600',
  },
  // Modals Styling
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    padding: 20,
    ...Shadows.elevated,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: Palette.subtleBorder,
    paddingBottom: 10,
  },
  modalTitle: {
    fontWeight: '900',
    color: Palette.charcoal,
  },
  modalSub: {
    color: Palette.slateMedium,
    marginTop: 2,
  },
  formLabel: {
    fontWeight: '800',
    color: Palette.charcoal,
    marginBottom: 6,
  },
  cropPickerContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 14,
  },
  cropPickChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Palette.background,
    borderWidth: 1,
    borderColor: Palette.warmBorder,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: BorderRadius.full,
  },
  cropPickChipActive: {
    backgroundColor: Palette.primary,
    borderColor: Palette.primary,
  },
  cropPickText: {
    color: Palette.charcoal,
    fontWeight: '600',
  },
  cropPickTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  formRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  modePickRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 12,
  },
  modePickBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: Palette.background,
    borderWidth: 1,
    borderColor: Palette.warmBorder,
    paddingVertical: 10,
    borderRadius: BorderRadius.md,
  },
  modePickBtnActive: {
    backgroundColor: Palette.primaryTint,
    borderColor: Palette.primary,
  },
  modePickText: {
    fontSize: 12,
    fontWeight: '600',
    color: Palette.slateDark,
  },
  modePickTextActive: {
    color: Palette.primary,
    fontWeight: '800',
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: 10,
    paddingVertical: 4,
  },
  switchLabel: {
    fontSize: 13,
    fontWeight: '800',
    color: Palette.charcoal,
  },
  switchSub: {
    fontSize: 11,
    color: Palette.slateMedium,
    marginTop: 1,
  },
  modalRefBox: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: Palette.primaryTint,
    padding: 10,
    borderRadius: BorderRadius.md,
    marginBottom: 12,
  },
  modalRefCol: {
    alignItems: 'center',
  },
  modalRefLbl: {
    fontSize: 11,
    color: Palette.primaryDark,
  },
  modalRefVal: {
    fontSize: 14,
    fontWeight: '800',
    color: Palette.primary,
    marginTop: 2,
  },
  calcBox: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: Palette.background,
    padding: 12,
    borderRadius: BorderRadius.md,
    marginVertical: 6,
    borderWidth: 1,
    borderColor: Palette.warmBorder,
  },
  calcLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: Palette.charcoal,
  },
  calcValue: {
    fontSize: 15,
    fontWeight: '900',
    color: Palette.primary,
  },
  messageInput: {
    backgroundColor: Palette.background,
    borderWidth: 1,
    borderColor: Palette.warmBorder,
    borderRadius: BorderRadius.md,
    padding: 10,
    fontSize: 13,
    color: Palette.charcoal,
    textAlignVertical: 'top',
    minHeight: 80,
  },
  suggestionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 8,
  },
  sugChip: {
    backgroundColor: Palette.primaryTint,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
  },
  sugText: {
    fontSize: 10,
    color: Palette.primary,
    fontWeight: '600',
  },
  // Thread chat bubbles
  bubbleWrap: {
    marginVertical: 4,
    flexDirection: 'row',
  },
  bubbleRight: {
    justifyContent: 'flex-end',
  },
  bubbleLeft: {
    justifyContent: 'flex-start',
  },
  bubbleContent: {
    maxWidth: '82%',
    padding: 10,
    borderRadius: BorderRadius.lg,
  },
  bubbleContentMine: {
    backgroundColor: Palette.primary,
    borderBottomRightRadius: 2,
  },
  bubbleContentTheirs: {
    backgroundColor: '#F1F5F9',
    borderBottomLeftRadius: 2,
  },
  bubbleSender: {
    fontSize: 10,
    fontWeight: '700',
    marginBottom: 2,
  },
  bubbleSenderMine: {
    color: '#D1FAE5',
  },
  bubbleSenderTheirs: {
    color: Palette.slateMedium,
  },
  bubbleText: {
    fontSize: 13,
    lineHeight: 18,
  },
  bubbleTextMine: {
    color: '#FFFFFF',
  },
  bubbleTextTheirs: {
    color: Palette.charcoal,
  },
  bubbleTime: {
    fontSize: 9,
    marginTop: 4,
    alignSelf: 'flex-end',
  },
  bubbleTimeMine: {
    color: '#A7F3D0',
  },
  bubbleTimeTheirs: {
    color: Palette.slateMedium,
  },
  replyComposer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: Palette.subtleBorder,
    paddingTop: 10,
  },
  replyInput: {
    flex: 1,
    backgroundColor: Palette.background,
    borderWidth: 1,
    borderColor: Palette.warmBorder,
    borderRadius: BorderRadius.full,
    paddingHorizontal: 14,
    paddingVertical: Platform.OS === 'ios' ? 10 : 8,
    fontSize: 13,
    color: Palette.charcoal,
  },
  replySendBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: Palette.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default BuyerDashboardScreen;
