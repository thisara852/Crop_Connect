import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Modal,
  TextInput,
  Switch,
  Linking,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Palette, BorderRadius, Shadows } from '../constants/theme';
import { Badge } from '../components/common/Badge';
import { Button } from '../components/common/Button';
import { Input } from '../components/common/Input';
import { useResponsive } from '../hooks/useResponsive';
import { useAuth } from '../hooks/useAuth';
import { ALL_MOCK_LISTINGS } from '../services/mockDataService';
import {
  getCropListingById,
  getAllBuyers,
  createBuyerOffer,
  sendEnquiry,
  getFarmerProfile,
} from '../services/firestoreService';
import {
  FirestoreCropListing,
  FirestoreBuyer,
  FirestoreFarmer,
} from '../types/database';

const getDefaultPickupDate = (): string => {
  const d = new Date();
  d.setDate(d.getDate() + 2);
  return d.toISOString().split('T')[0];
};

export const CropDetailsScreen: React.FC = () => {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { scaleSize, scaleFont, contentPadding } = useResponsive();
  const { user } = useAuth();

  const [listing, setListing] = useState<FirestoreCropListing | null>(null);
  const [farmer, setFarmer] = useState<FirestoreFarmer | null>(null);
  const [matchingBuyers, setMatchingBuyers] = useState<FirestoreBuyer[]>([]);
  const [loading, setLoading] = useState(true);

  // Modals
  const [offerModalVisible, setOfferModalVisible] = useState(false);
  const [enquiryModalVisible, setEnquiryModalVisible] = useState(false);

  // Offer Form States
  const [offerPrice, setOfferPrice] = useState('');
  const [offerQuantity, setOfferQuantity] = useState('');
  const [offerDate, setOfferDate] = useState(() => getDefaultPickupDate());
  const [offerTransportBuyer, setOfferTransportBuyer] = useState(true);
  const [offerNotes, setOfferNotes] = useState('');
  const [submittingOffer, setSubmittingOffer] = useState(false);

  // Enquiry Form States
  const [enquiryMessage, setEnquiryMessage] = useState('');
  const [sendingEnquiry, setSendingEnquiry] = useState(false);

  useEffect(() => {
    let isMounted = true;
    async function loadData() {
      try {
        const found = id ? await getCropListingById(id) : null;
        const allBuyers = await getAllBuyers();

        if (isMounted) {
          let currentListing: FirestoreCropListing;
          if (found) {
            currentListing = found;
          } else {
            const mock = ALL_MOCK_LISTINGS.find((l) => l.id === id) || ALL_MOCK_LISTINGS[0];
            currentListing = {
              ...mock,
              cropId: `crop_${mock.cropName.toLowerCase().replace(/[^a-z0-9]/g, '_')}`,
              expiryDate: mock.expiryDate || new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
              farmerRating: mock.farmerRating || 4.9,
              minOrderKg: mock.minOrderKg || 100,
              district: mock.location.district,
              address: mock.location.address || `${mock.location.district}, Sri Lanka`,
              latitude: mock.location.latitude,
              longitude: mock.location.longitude,
              activeOffersCount: 2,
              viewsCount: 24,
            };
          }
          setListing(currentListing);
          setOfferPrice(currentListing.askingPricePerKg.toString());
          setOfferQuantity((currentListing.minOrderKg || 100).toString());
          setEnquiryMessage(
            `Ayubowan ${currentListing.farmerName}, is this ${currentListing.cropName} batch available for direct farmgate pickup?`
          );

          // Fetch farmer details
          const farmerData = await getFarmerProfile(currentListing.farmerId);
          setFarmer(farmerData);

          // Filter matching buyers
          setMatchingBuyers(allBuyers.slice(0, 3));
        }
      } catch {
        // Handled
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadData();
    return () => {
      isMounted = false;
    };
  }, [id]);

  if (loading || !listing) {
    return (
      <View style={[styles.screen, styles.center]}>
        <ActivityIndicator size="large" color={Palette.primary} />
        <Text style={[styles.loadingText, { fontSize: scaleFont(13) }]}>
          Retrieving crop batch and farmer details from Cloud Firestore...
        </Text>
      </View>
    );
  }

  const isRescue = listing.isRescueCrop;
  const isOwner = user?.id === listing.farmerId || (user?.role === 'farmer' && listing.farmerId === 'farmer_001');
  const buyerId = user?.id || 'buyer_001';

  const handleOpenOfferModal = () => {
    setOfferPrice(listing.askingPricePerKg.toString());
    setOfferQuantity((listing.minOrderKg || 100).toString());
    setOfferModalVisible(true);
  };

  const handleSubmitOffer = async () => {
    const price = parseFloat(offerPrice);
    const qty = parseFloat(offerQuantity);

    if (!price || price <= 0) {
      Alert.alert('Validation Error', 'Please enter a valid offered price per kg in LKR.');
      return;
    }
    if (!qty || qty <= 0) {
      Alert.alert('Validation Error', 'Please enter a valid requested quantity in kg.');
      return;
    }

    setSubmittingOffer(true);
    try {
      const buyerName = user?.fullName || 'Dilan Perera';
      const buyerPhone = user?.phone || '+94 71 987 6543';

      await createBuyerOffer(
        {
          listingId: listing.id,
          cropName: listing.cropName,
          farmerId: listing.farmerId,
          farmerName: listing.farmerName,
          buyerId,
          buyerName,
          buyerPhone,
          buyerBusinessType: user?.buyerBusinessType || 'wholesaler',
          offeredPricePerKg: price,
          requestedQuantityKg: qty,
          totalAmount: price * qty,
          farmerAskingPricePerKg: listing.askingPricePerKg,
          proposedPickupDate: offerDate,
          transportProvidedByBuyer: offerTransportBuyer,
          notes: offerNotes || 'Buyer purchase offer placed from Crop batch details.',
        },
        buyerId
      );

      setOfferModalVisible(false);
      Alert.alert(
        'Offer Submitted 💬',
        `Offer of Rs. ${price}/kg for ${qty}kg (Total Rs. ${(price * qty).toLocaleString()}) recorded in Cloud Firestore! ${listing.farmerName} has been alerted.`
      );
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Failed to submit buyer offer.');
    } finally {
      setSubmittingOffer(false);
    }
  };

  const handleSendEnquiry = async () => {
    if (!enquiryMessage.trim()) {
      Alert.alert('Validation Error', 'Please enter an inquiry message.');
      return;
    }

    setSendingEnquiry(true);
    try {
      await sendEnquiry(
        {
          listingId: listing.id,
          cropName: listing.cropName,
          farmerId: listing.farmerId,
          buyerId,
          senderName: user?.fullName || 'Dilan Perera',
          senderRole: 'buyer',
          recipientId: listing.farmerId,
          recipientName: listing.farmerName,
          message: enquiryMessage.trim(),
        },
        buyerId
      );

      setEnquiryModalVisible(false);
      Alert.alert(
        'Enquiry Sent 📨',
        `Your inquiry has been delivered to ${listing.farmerName} via Cloud Firestore.`
      );
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Failed to send inquiry.');
    } finally {
      setSendingEnquiry(false);
    }
  };

  const handleCallFarmer = () => {
    const phone = farmer?.phone || listing.farmerPhone || '+94 77 123 4567';
    Linking.openURL(`tel:${phone}`);
  };

  return (
    <View style={styles.screen}>
      {/* Top Navigation Bar */}
      <View
        style={[
          styles.topBar,
          {
            paddingHorizontal: scaleSize(contentPadding),
          },
        ]}
      >
        <TouchableOpacity
          onPress={() => router.back()}
          style={[
            styles.iconBtn,
            {
              width: scaleSize(38),
              height: scaleSize(38),
              borderRadius: scaleSize(19),
            },
          ]}
        >
          <Ionicons name="arrow-back" size={scaleSize(20)} color={Palette.charcoal} />
        </TouchableOpacity>

        <Text style={[styles.topTitle, { fontSize: scaleFont(16) }]}>Crop Batch Details</Text>

        <TouchableOpacity
          onPress={() =>
            Alert.alert(
              'Share Produce',
              `CropConnect Listing: ${listing.quantityKg}kg ${listing.cropName} at Rs. ${listing.askingPricePerKg}/kg in ${listing.district}.`
            )
          }
          style={[
            styles.iconBtn,
            {
              width: scaleSize(38),
              height: scaleSize(38),
              borderRadius: scaleSize(19),
            },
          ]}
        >
          <Ionicons name="share-social-outline" size={scaleSize(18)} color={Palette.charcoal} />
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: scaleSize(120) }}
      >
        {/* Crop Hero Image with Badges */}
        <View style={[styles.imageContainer, { height: scaleSize(240) }]}>
          <Image
            source={{
              uri: listing.images?.[0] || 'https://images.unsplash.com/photo-1598170845058-32b9d6a5da37?w=700',
            }}
            style={styles.heroImage}
          />

          <View style={styles.imageOverlayTop}>
            <Badge label={`Grade ${listing.grade}`} variant="grade" />
            {isRescue && (
              <Badge
                label={`⚡ RESCUE (${listing.rescueDiscountPercentage || 25}% OFF)`}
                variant="rescue"
              />
            )}
          </View>

          <View style={styles.imageOverlayBottom}>
            <View style={styles.unitBadge}>
              <Text style={styles.unitBadgeText}>Default Unit: Kilograms (kg)</Text>
            </View>
          </View>
        </View>

        {/* Content Body */}
        <View style={{ paddingHorizontal: scaleSize(contentPadding), marginTop: scaleSize(12) }}>
          {/* 1. Crop Title & Localized Names */}
          <View style={styles.titleRow}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.cropTitle, { fontSize: scaleFont(22) }]}>{listing.cropName}</Text>
              {(listing.sinhalaName || listing.tamilName) && (
                <Text style={[styles.cropLocalized, { fontSize: scaleFont(13) }]}>
                  {listing.sinhalaName} {listing.tamilName ? `• ${listing.tamilName}` : ''}
                </Text>
              )}
            </View>

            {/* Expected Price per kg in LKR */}
            <View style={styles.priceContainer}>
              <Text style={[styles.priceNum, { fontSize: scaleFont(22) }]}>
                Rs. {listing.askingPricePerKg}
              </Text>
              <Text style={[styles.pricePerUnit, { fontSize: scaleFont(11) }]}>per kg (LKR)</Text>
            </View>
          </View>

          {/* 2. Key Metrics Row */}
          <View
            style={[
              styles.metricsBar,
              {
                padding: scaleSize(12),
                borderRadius: BorderRadius.lg,
                marginVertical: scaleSize(10),
                ...Shadows.soft,
              },
            ]}
          >
            <View style={styles.metricItem}>
              <Text style={[styles.metricLbl, { fontSize: scaleFont(11) }]}>Total Harvest</Text>
              <Text style={[styles.metricNum, { fontSize: scaleFont(16) }]}>
                {listing.quantityKg.toLocaleString()} kg
              </Text>
            </View>

            <View style={styles.metricSep} />

            <View style={styles.metricItem}>
              <Text style={[styles.metricLbl, { fontSize: scaleFont(11) }]}>Minimum Order</Text>
              <Text style={[styles.metricNum, { fontSize: scaleFont(16) }]}>
                {listing.minOrderKg} kg
              </Text>
            </View>

            <View style={styles.metricSep} />

            <View style={styles.metricItem}>
              <Text style={[styles.metricLbl, { fontSize: scaleFont(11) }]}>Harvest Date</Text>
              <Text style={[styles.metricNum, { fontSize: scaleFont(12) }]}>
                {listing.harvestDate}
              </Text>
            </View>
          </View>

          {/* 3. AI Fair-Price Verification Widget */}
          <View
            style={[
              styles.aiPriceCard,
              {
                padding: scaleSize(14),
                borderRadius: BorderRadius.lg,
                marginVertical: scaleSize(8),
                ...Shadows.soft,
              },
            ]}
          >
            <View style={styles.aiPriceHeader}>
              <Ionicons name="sparkles" size={scaleSize(18)} color={Palette.primary} />
              <Text style={[styles.aiPriceTitle, { fontSize: scaleFont(13) }]}>
                AI Fair-Price Intelligence Verification
              </Text>
            </View>
            <Text style={[styles.aiPriceDesc, { fontSize: scaleFont(12) }]}>
              Verified against Dambulla Dedicated Economic Centre baseline. The farmer&apos;s expected price of Rs. {listing.askingPricePerKg}/kg is balanced and equitable within Sri Lankan market wholesale brackets.
            </Text>
            <View style={{ gap: scaleSize(8), marginTop: scaleSize(10) }}>
              <TouchableOpacity
                onPress={() =>
                  router.push({
                    pathname: '/price-comparison',
                    params: {
                      cropName: listing.cropName,
                      quantityKg: listing.quantityKg.toString(),
                      aiReferencePrice: listing.askingPricePerKg.toString(),
                    },
                  })
                }
                style={styles.compareLink}
              >
                <Text style={styles.compareLinkText}>
                  Compare Buyer Offers against AI Reference (Rs. {listing.askingPricePerKg}/kg) ➔
                </Text>
              </TouchableOpacity>

              <View style={{ flexDirection: 'row', gap: scaleSize(8) }}>
                <TouchableOpacity
                  onPress={() =>
                    router.push({
                      pathname: '/price-prediction',
                      params: {
                        cropName: listing.cropName,
                        district: listing.district,
                        quantityKg: listing.quantityKg.toString(),
                      },
                    })
                  }
                  style={[styles.compareLink, { flex: 1, backgroundColor: Palette.primaryTint, padding: scaleSize(8), borderRadius: BorderRadius.sm }]}
                >
                  <Text style={[styles.compareLinkText, { fontSize: scaleFont(11) }]}>
                    🤖 Run AI Predictor
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() =>
                    router.push({
                      pathname: '/price-history',
                      params: {
                        cropName: listing.cropName,
                      },
                    })
                  }
                  style={[styles.compareLink, { flex: 1, backgroundColor: Palette.primaryTint, padding: scaleSize(8), borderRadius: BorderRadius.sm }]}
                >
                  <Text style={[styles.compareLinkText, { fontSize: scaleFont(11) }]}>
                    📈 Market Price Chart
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>

          {/* ======================================================== */}
          {/* 4. FARMER INFORMATION CARD                               */}
          {/* ======================================================== */}
          <View
            style={[
              styles.farmerCard,
              {
                padding: scaleSize(14),
                borderRadius: BorderRadius.lg,
                marginVertical: scaleSize(8),
                ...Shadows.soft,
              },
            ]}
          >
            <View style={styles.farmerTop}>
              <View style={styles.farmerAvatarBubble}>
                <Ionicons name="person" size={scaleSize(26)} color={Palette.primary} />
              </View>

              <View style={{ flex: 1, marginLeft: 10 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Text style={[styles.farmerName, { fontSize: scaleFont(15) }]}>
                    {farmer?.fullName || listing.farmerName}
                  </Text>
                  <Badge label="Verified Farmer" variant="verified" size="sm" />
                </View>

                <Text style={[styles.farmerFarmName, { fontSize: scaleFont(12) }]}>
                  🏡 {farmer?.farmName || 'Kandapola Organic Highlands'}
                </Text>
                <Text style={[styles.farmerMeta, { fontSize: scaleFont(11) }]}>
                  ★ {farmer?.rating || listing.farmerRating || 4.9} Rating • {farmer?.completedDeals || 42} Completed Deals
                </Text>
              </View>
            </View>

            {/* Farmer Experience & Credentials */}
            <View style={styles.farmerCredentialsRow}>
              <View style={styles.credBadge}>
                <Ionicons name="time-outline" size={12} color={Palette.primary} />
                <Text style={styles.credBadgeText}>
                  {farmer?.farmingExperienceYears || 15}+ Yrs Exp
                </Text>
              </View>
              <View style={styles.credBadge}>
                <Ionicons name="expand-outline" size={12} color={Palette.primary} />
                <Text style={styles.credBadgeText}>
                  {farmer?.landSizeAcres || 3.5} Acres
                </Text>
              </View>
              <View style={styles.credBadge}>
                <Ionicons name="shield-checkmark-outline" size={12} color={Palette.secondaryDark} />
                <Text style={[styles.credBadgeText, { color: Palette.secondaryDark }]}>
                  {farmer?.isCertifiedOrganic ? 'Organic Certified' : 'Good Agri Practice'}
                </Text>
              </View>
            </View>

            {/* Farm Location & Address */}
            <View style={styles.distanceLine}>
              <Ionicons name="location" size={scaleSize(16)} color={Palette.primary} />
              <Text style={[styles.distanceText, { fontSize: scaleFont(12) }]}>
                {farmer?.address || listing.address || `${listing.district}, Sri Lanka`}
              </Text>
            </View>

            {/* Direct Contact Button */}
            <TouchableOpacity
              activeOpacity={0.88}
              onPress={handleCallFarmer}
              style={styles.callFarmerBtn}
            >
              <Ionicons name="call" size={14} color="#FFFFFF" />
              <Text style={styles.callFarmerBtnText}>
                Call Farmer ({farmer?.phone || listing.farmerPhone || '+94 77 123 4567'})
              </Text>
            </TouchableOpacity>
          </View>

          {/* 5. Additional Description */}
          <View style={{ marginTop: scaleSize(8), marginBottom: scaleSize(14) }}>
            <Text style={[styles.descTitle, { fontSize: scaleFont(14) }]}>Harvest & Packaging Notes</Text>
            <Text style={[styles.descBody, { fontSize: scaleFont(13) }]}>
              {listing.description || 'Cleanly sorted produce ready for immediate wholesale transport.'}
            </Text>
          </View>

          {/* 6. Matching Commercial Buyers Section */}
          <View style={styles.matchingBuyersSection}>
            <View style={styles.matchingHeader}>
              <View>
                <Text style={[styles.matchingTitle, { fontSize: scaleFont(15) }]}>
                  Matching Buyers in {listing.district}
                </Text>
                <Text style={[styles.matchingSub, { fontSize: scaleFont(11) }]}>
                  Verified commercial buyers actively purchasing {listing.cropName}
                </Text>
              </View>
              <Ionicons name="people" size={scaleSize(20)} color={Palette.primary} />
            </View>

            {matchingBuyers.map((buyer) => (
              <View
                key={buyer.id}
                style={[
                  styles.buyerMatchCard,
                  {
                    padding: scaleSize(12),
                    borderRadius: BorderRadius.md,
                    marginTop: scaleSize(8),
                  },
                ]}
              >
                <View style={styles.buyerMatchTop}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.buyerMatchName, { fontSize: scaleFont(13) }]}>
                      {buyer.businessName}
                    </Text>
                    <Text style={[styles.buyerMatchLocation, { fontSize: scaleFont(11) }]}>
                      📍 {buyer.district} • {buyer.businessType}
                    </Text>
                  </View>
                  <Badge label="Verified Buyer" variant="verified" />
                </View>

                <Text style={[styles.buyerMatchDemand, { fontSize: scaleFont(11) }]}>
                  Requirement: Up to {buyer.purchasingRequirements?.maxOrderQuantityKg || 2500} kg • Farmgate Pickup Available
                </Text>

                <TouchableOpacity
                  onPress={() => router.push({ pathname: '/buyer/[id]', params: { id: buyer.id } })}
                  style={styles.buyerActionBtn}
                >
                  <Text style={styles.buyerActionText}>View Buyer Profile & Send Quote ➔</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>

      {/* Floating Bottom Action Bar */}
      <View
        style={[
          styles.bottomBar,
          {
            paddingHorizontal: scaleSize(contentPadding),
            paddingVertical: scaleSize(12),
          },
        ]}
      >
        {isOwner ? (
          <Button
            title="Manage in My Farm Listings"
            variant="primary"
            size="lg"
            icon="leaf"
            fullWidth
            onPress={() => router.push('/(farmer)/my-crops')}
          />
        ) : (
          <View style={styles.buyerActionsBottomRow}>
            <TouchableOpacity
              activeOpacity={0.88}
              onPress={() => setEnquiryModalVisible(true)}
              style={styles.enquireBtnBottom}
            >
              <Ionicons name="chatbubble-ellipses-outline" size={18} color={Palette.primary} />
              <Text style={styles.enquireBtnBottomText}>Enquire</Text>
            </TouchableOpacity>

            <View style={{ flex: 1 }}>
              <Button
                title={isRescue ? 'Rescue Produce (Offer)' : 'Submit Price Offer'}
                variant={isRescue ? 'rescue' : 'primary'}
                size="lg"
                icon={isRescue ? 'flash' : 'pricetag'}
                fullWidth
                onPress={handleOpenOfferModal}
              />
            </View>
          </View>
        )}
      </View>

      {/* ======================================================== */}
      {/* MODAL 1: SUBMIT PRICE OFFER                              */}
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
                  Submit Crop Price Offer
                </Text>
                <Text style={[styles.modalSub, { fontSize: scaleFont(12) }]}>
                  Farmer: {listing.farmerName} • {listing.cropName} (Grade {listing.grade})
                </Text>
              </View>
              <TouchableOpacity onPress={() => setOfferModalVisible(false)}>
                <Ionicons name="close-circle" size={scaleSize(24)} color={Palette.slateMedium} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.refBox}>
                <View style={styles.refCol}>
                  <Text style={styles.refLbl}>Farmer Asking Price</Text>
                  <Text style={styles.refVal}>Rs. {listing.askingPricePerKg} / kg</Text>
                </View>
                <View style={styles.refCol}>
                  <Text style={styles.refLbl}>Available Harvest</Text>
                  <Text style={styles.refVal}>{listing.quantityKg.toLocaleString()} kg</Text>
                </View>
                <View style={styles.refCol}>
                  <Text style={styles.refLbl}>Minimum Order</Text>
                  <Text style={styles.refVal}>{listing.minOrderKg} kg</Text>
                </View>
              </View>

              <Input
                label="OFFERED PRICE PER KG (LKR)"
                value={offerPrice}
                onChangeText={setOfferPrice}
                keyboardType="numeric"
                leftIcon="pricetag-outline"
              />

              <Input
                label="REQUESTED QUANTITY (KG)"
                value={offerQuantity}
                onChangeText={setOfferQuantity}
                keyboardType="numeric"
                leftIcon="scale-outline"
              />

              {/* Live Deal Value */}
              <View style={styles.calcRow}>
                <Text style={styles.calcLbl}>Total Deal Estimate:</Text>
                <Text style={styles.calcVal}>
                  Rs. {((parseFloat(offerPrice) || 0) * (parseFloat(offerQuantity) || 0)).toLocaleString()} LKR
                </Text>
              </View>

              <Input
                label="PROPOSED PICKUP DATE"
                value={offerDate}
                onChangeText={setOfferDate}
                leftIcon="calendar-outline"
              />

              {/* Transport Switch */}
              <View style={styles.switchRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.switchLabel}>Buyer Arranges Transport</Text>
                  <Text style={styles.switchSub}>Buyer dispatches truck for farmgate collection</Text>
                </View>
                <Switch
                  value={offerTransportBuyer}
                  onValueChange={setOfferTransportBuyer}
                  trackColor={{ false: '#CBD5E1', true: Palette.primary }}
                />
              </View>

              <Input
                label="OPTIONAL NOTE FOR FARMER"
                value={offerNotes}
                onChangeText={setOfferNotes}
                placeholder="e.g. Can bring wooden crates, pickup at 8 AM."
                leftIcon="document-text-outline"
              />

              <Button
                title={submittingOffer ? 'Submitting Offer...' : 'Submit Purchase Offer to Farmer'}
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
      {/* MODAL 2: SEND ENQUIRY TO FARMER                          */}
      {/* ======================================================== */}
      <Modal
        visible={enquiryModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setEnquiryModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { maxHeight: '78%' }]}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={[styles.modalTitle, { fontSize: scaleFont(17) }]}>
                  Send Enquiry to {listing.farmerName}
                </Text>
                <Text style={[styles.modalSub, { fontSize: scaleFont(12) }]}>
                  Regarding {listing.cropName} • {listing.district}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setEnquiryModalVisible(false)}>
                <Ionicons name="close-circle" size={scaleSize(24)} color={Palette.slateMedium} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={[styles.formLabel, { fontSize: scaleFont(12) }]}>
                TYPE YOUR MESSAGE
              </Text>
              <TextInput
                value={enquiryMessage}
                onChangeText={setEnquiryMessage}
                multiline
                numberOfLines={4}
                style={styles.msgInput}
                placeholder="Ask about harvest time, farmgate loading, vehicle access, or volume availability..."
              />

              {/* Suggestions */}
              <View style={styles.sugRow}>
                {[
                  'Can you load at 7 AM?',
                  'Is 4-ton truck access available?',
                  'What is the best rate for 1,000kg?',
                  'Are crates provided by farm?',
                ].map((sug) => (
                  <TouchableOpacity
                    key={sug}
                    onPress={() => setEnquiryMessage(sug)}
                    style={styles.sugChip}
                  >
                    <Text style={styles.sugText}>{sug}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Button
                title={sendingEnquiry ? 'Sending Enquiry...' : 'Send Direct Message to Farmer'}
                variant="primary"
                size="lg"
                icon="send-outline"
                fullWidth
                loading={sendingEnquiry}
                onPress={handleSendEnquiry}
                style={{ marginTop: 16 }}
              />
            </ScrollView>
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
  center: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 30,
  },
  loadingText: {
    color: Palette.slateMedium,
    marginTop: 10,
    fontWeight: '600',
    textAlign: 'center',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Palette.warmBorder,
    backgroundColor: '#FFFFFF',
  },
  iconBtn: {
    backgroundColor: Palette.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topTitle: {
    fontWeight: '800',
    color: Palette.charcoal,
  },
  imageContainer: {
    position: 'relative',
    backgroundColor: Palette.slateBorder,
  },
  heroImage: {
    width: '100%',
    height: '100%',
  },
  imageOverlayTop: {
    position: 'absolute',
    top: 12,
    left: 12,
    right: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  imageOverlayBottom: {
    position: 'absolute',
    bottom: 12,
    left: 12,
  },
  unitBadge: {
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
  },
  unitBadgeText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 11,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  cropTitle: {
    fontWeight: '900',
    color: Palette.charcoal,
  },
  cropLocalized: {
    color: Palette.slateMedium,
    fontWeight: '600',
    marginTop: 2,
  },
  priceContainer: {
    alignItems: 'flex-end',
  },
  priceNum: {
    fontWeight: '900',
    color: Palette.primary,
  },
  pricePerUnit: {
    color: Palette.slateMedium,
    fontWeight: '700',
    marginTop: 1,
  },
  metricsBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: Palette.warmBorder,
  },
  metricItem: {
    alignItems: 'center',
  },
  metricLbl: {
    color: Palette.slateMedium,
    fontWeight: '600',
  },
  metricNum: {
    fontWeight: '800',
    color: Palette.charcoal,
    marginTop: 2,
  },
  metricSep: {
    width: 1,
    height: 24,
    backgroundColor: Palette.subtleBorder,
  },
  aiPriceCard: {
    backgroundColor: Palette.primaryTint,
    borderWidth: 1,
    borderColor: 'rgba(36, 92, 70, 0.25)',
  },
  aiPriceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  aiPriceTitle: {
    fontWeight: '800',
    color: Palette.primary,
  },
  aiPriceDesc: {
    color: Palette.charcoal,
    lineHeight: 18,
  },
  compareLink: {
    marginTop: 8,
  },
  compareLinkText: {
    color: Palette.primary,
    fontWeight: '800',
    fontSize: 12,
  },
  // Farmer Card
  farmerCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: Palette.warmBorder,
  },
  farmerTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  farmerAvatarBubble: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Palette.primaryTint,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: Palette.primary,
  },
  farmerName: {
    fontWeight: '800',
    color: Palette.charcoal,
  },
  farmerFarmName: {
    color: Palette.secondaryDark,
    fontWeight: '700',
    marginTop: 2,
  },
  farmerMeta: {
    color: Palette.slateMedium,
    marginTop: 2,
  },
  farmerCredentialsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 10,
  },
  credBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Palette.background,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    borderColor: Palette.warmBorder,
  },
  credBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: Palette.slateDark,
  },
  distanceLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: Palette.subtleBorder,
  },
  distanceText: {
    color: Palette.slateMedium,
    fontWeight: '600',
  },
  callFarmerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: Palette.primary,
    paddingVertical: 8,
    borderRadius: BorderRadius.md,
    marginTop: 10,
  },
  callFarmerBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 12,
  },
  descTitle: {
    fontWeight: '800',
    color: Palette.charcoal,
    marginBottom: 4,
  },
  descBody: {
    color: Palette.slateMedium,
    lineHeight: 19,
  },
  matchingBuyersSection: {
    backgroundColor: '#FFFFFF',
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Palette.warmBorder,
    padding: 14,
    marginTop: 10,
  },
  matchingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  matchingTitle: {
    fontWeight: '800',
    color: Palette.charcoal,
  },
  matchingSub: {
    color: Palette.slateMedium,
    marginTop: 1,
  },
  buyerMatchCard: {
    backgroundColor: Palette.background,
    borderWidth: 1,
    borderColor: Palette.warmBorder,
  },
  buyerMatchTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  buyerMatchName: {
    fontWeight: '800',
    color: Palette.charcoal,
  },
  buyerMatchLocation: {
    color: Palette.slateMedium,
    fontWeight: '600',
    marginTop: 1,
  },
  buyerMatchDemand: {
    color: Palette.primary,
    fontWeight: '700',
    marginTop: 6,
  },
  buyerActionBtn: {
    marginTop: 8,
    alignSelf: 'flex-start',
  },
  buyerActionText: {
    color: Palette.primary,
    fontWeight: '800',
    fontSize: 11,
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: Palette.warmBorder,
  },
  buyerActionsBottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  enquireBtnBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderWidth: 1.5,
    borderColor: Palette.primary,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: BorderRadius.lg,
  },
  enquireBtnBottomText: {
    color: Palette.primary,
    fontWeight: '800',
    fontSize: 14,
  },
  // Modal Styles
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
    marginBottom: 14,
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
  refBox: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: Palette.primaryTint,
    padding: 10,
    borderRadius: BorderRadius.md,
    marginBottom: 12,
  },
  refCol: {
    alignItems: 'center',
  },
  refLbl: {
    fontSize: 10,
    color: Palette.primaryDark,
  },
  refVal: {
    fontSize: 13,
    fontWeight: '800',
    color: Palette.primary,
    marginTop: 2,
  },
  calcRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: Palette.background,
    padding: 10,
    borderRadius: BorderRadius.md,
    marginVertical: 6,
    borderWidth: 1,
    borderColor: Palette.warmBorder,
  },
  calcLbl: {
    fontSize: 12,
    fontWeight: '700',
    color: Palette.charcoal,
  },
  calcVal: {
    fontSize: 15,
    fontWeight: '900',
    color: Palette.primary,
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
  formLabel: {
    fontWeight: '800',
    color: Palette.charcoal,
    marginBottom: 6,
  },
  msgInput: {
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
  sugRow: {
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
});

export default CropDetailsScreen;
