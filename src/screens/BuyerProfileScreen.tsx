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
import { SRI_LANKA_DISTRICTS, POPULAR_CROPS } from '../constants/sriLanka';
import { Header } from '../components/common/Header';
import { Badge } from '../components/common/Badge';
import { Button } from '../components/common/Button';
import { Input } from '../components/common/Input';
import { useResponsive } from '../hooks/useResponsive';
import { useAuth } from '../hooks/useAuth';
import { useTheme } from '../hooks/useTheme';
import {
  getBuyerProfile,
  saveBuyerProfile,
  getUserEnquiries,
  getOffersByBuyer,
  sendEnquiry,
} from '../services/firestoreService';
import {
  FirestoreBuyer,
  FirestoreEnquiry,
  FirestoreBuyerOffer,
  BuyerBusinessType,
  BuyerPaymentTerms,
} from '../types/database';

export const BuyerProfileScreen: React.FC = () => {
  const { scaleSize, scaleFont, contentPadding } = useResponsive();
  const { user, logout } = useAuth();
  const { isDark } = useTheme();

  const buyerId = user?.id || 'buyer_001';

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [buyerProfile, setBuyerProfile] = useState<FirestoreBuyer | null>(null);
  const [myOffers, setMyOffers] = useState<FirestoreBuyerOffer[]>([]);
  const [enquiries, setEnquiries] = useState<FirestoreEnquiry[]>([]);

  // Edit Profile / Requirements Modal State
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [enqHistoryModalVisible, setEnqHistoryModalVisible] = useState(false);
  const [selectedEnquiryThread, setSelectedEnquiryThread] = useState<FirestoreEnquiry | null>(null);
  const [replyText, setReplyText] = useState('');
  const [sendingReply, setSendingReply] = useState(false);

  // Form states for profile editing
  const [businessNameInput, setBusinessNameInput] = useState('');
  const [contactPersonInput, setContactPersonInput] = useState('');
  const [phoneInput, setPhoneInput] = useState('');
  const [emailInput, setEmailInput] = useState('');
  const [addressInput, setAddressInput] = useState('');
  const [districtInput, setDistrictInput] = useState('Colombo');
  const [businessTypeInput, setBusinessTypeInput] = useState<BuyerBusinessType>('wholesaler');
  const [preferredCropsInput, setPreferredCropsInput] = useState<string[]>([]);
  const [minOrderKgInput, setMinOrderKgInput] = useState('100');
  const [maxOrderKgInput, setMaxOrderKgInput] = useState('3000');
  const [preferredDistrictsInput, setPreferredDistrictsInput] = useState<string[]>([]);
  const [deliveryModeInput, setDeliveryModeInput] = useState<'farmgate_pickup' | 'market_delivery'>('farmgate_pickup');
  const [paymentTermsInput, setPaymentTermsInput] = useState<BuyerPaymentTerms>('instant_bank_transfer');
  const [coldStorageInput, setColdStorageInput] = useState(true);
  const [budgetLkrInput, setBudgetLkrInput] = useState('750000');
  const [savingProfile, setSavingProfile] = useState(false);

  const [refreshTrigger, setRefreshTrigger] = useState(0);

  useEffect(() => {
    let isMounted = true;
    async function loadData() {
      try {
        const [profile, offers, userEnqs] = await Promise.all([
          getBuyerProfile(buyerId),
          getOffersByBuyer(buyerId),
          getUserEnquiries(buyerId),
        ]);

        if (isMounted) {
          setBuyerProfile(profile);
          setMyOffers(offers);
          setEnquiries(userEnqs);

          if (profile) {
            setBusinessNameInput(profile.businessName);
            setContactPersonInput(profile.contactPerson);
            setPhoneInput(profile.phone);
            setEmailInput(profile.email);
            setAddressInput(profile.address);
            setDistrictInput(profile.district);
            setBusinessTypeInput(profile.businessType);
            setPreferredCropsInput(profile.purchasingRequirements?.preferredCrops || ['Carrot', 'Tomato', 'Beans']);
            setMinOrderKgInput(profile.purchasingRequirements?.minOrderQuantityKg?.toString() || '100');
            setMaxOrderKgInput(profile.purchasingRequirements?.maxOrderQuantityKg?.toString() || '3000');
            setPreferredDistrictsInput(profile.purchasingRequirements?.preferredDistricts || ['Nuwara Eliya', 'Matale']);
            setDeliveryModeInput(profile.purchasingRequirements?.preferredDeliveryMode || 'farmgate_pickup');
            setPaymentTermsInput(profile.purchasingRequirements?.paymentTerms || 'instant_bank_transfer');
            setColdStorageInput(profile.purchasingRequirements?.hasColdStorage ?? true);
            setBudgetLkrInput(profile.purchasingRequirements?.weeklyTargetBudgetLkr?.toString() || '750000');
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

  const handleOpenEditModal = () => {
    if (buyerProfile) {
      setBusinessNameInput(buyerProfile.businessName);
      setContactPersonInput(buyerProfile.contactPerson);
      setPhoneInput(buyerProfile.phone);
      setEmailInput(buyerProfile.email);
      setAddressInput(buyerProfile.address);
      setDistrictInput(buyerProfile.district);
      setBusinessTypeInput(buyerProfile.businessType);
      setPreferredCropsInput(buyerProfile.purchasingRequirements?.preferredCrops || ['Carrot', 'Tomato']);
      setMinOrderKgInput(buyerProfile.purchasingRequirements?.minOrderQuantityKg?.toString() || '100');
      setMaxOrderKgInput(buyerProfile.purchasingRequirements?.maxOrderQuantityKg?.toString() || '3000');
      setPreferredDistrictsInput(buyerProfile.purchasingRequirements?.preferredDistricts || ['Nuwara Eliya', 'Matale']);
      setDeliveryModeInput(buyerProfile.purchasingRequirements?.preferredDeliveryMode || 'farmgate_pickup');
      setPaymentTermsInput(buyerProfile.purchasingRequirements?.paymentTerms || 'instant_bank_transfer');
      setColdStorageInput(buyerProfile.purchasingRequirements?.hasColdStorage ?? true);
      setBudgetLkrInput(buyerProfile.purchasingRequirements?.weeklyTargetBudgetLkr?.toString() || '750000');
    }
    setEditModalVisible(true);
  };

  const togglePreferredCrop = (crop: string) => {
    if (preferredCropsInput.includes(crop)) {
      setPreferredCropsInput(preferredCropsInput.filter((c) => c !== crop));
    } else {
      setPreferredCropsInput([...preferredCropsInput, crop]);
    }
  };

  const togglePreferredDistrict = (district: string) => {
    if (preferredDistrictsInput.includes(district)) {
      setPreferredDistrictsInput(preferredDistrictsInput.filter((d) => d !== district));
    } else {
      setPreferredDistrictsInput([...preferredDistrictsInput, district]);
    }
  };

  const handleSaveProfile = async () => {
    if (!businessNameInput.trim()) {
      Alert.alert('Validation Error', 'Please enter your Business / Trading Entity Name.');
      return;
    }
    if (!addressInput.trim()) {
      Alert.alert('Validation Error', 'Please enter your Business Address.');
      return;
    }
    if (!phoneInput.trim()) {
      Alert.alert('Validation Error', 'Please enter your Contact Number.');
      return;
    }
    if (preferredCropsInput.length === 0) {
      Alert.alert('Validation Error', 'Please select at least one preferred crop type.');
      return;
    }

    const minKg = parseFloat(minOrderKgInput) || 100;
    const maxKg = parseFloat(maxOrderKgInput) || 3000;
    if (minKg <= 0 || maxKg <= 0 || maxKg < minKg) {
      Alert.alert('Validation Error', 'Maximum order quantity must be greater than or equal to minimum order quantity.');
      return;
    }

    setSavingProfile(true);
    try {
      const updated = await saveBuyerProfile(
        buyerId,
        {
          businessName: businessNameInput.trim(),
          contactPerson: contactPersonInput.trim() || user?.fullName || 'Procurement Officer',
          phone: phoneInput.trim(),
          email: emailInput.trim(),
          address: addressInput.trim(),
          district: districtInput,
          businessType: businessTypeInput,
          purchasingRequirements: {
            preferredCrops: preferredCropsInput,
            minOrderQuantityKg: minKg,
            maxOrderQuantityKg: maxKg,
            preferredDistricts: preferredDistrictsInput,
            preferredDeliveryMode: deliveryModeInput,
            paymentTerms: paymentTermsInput,
            hasColdStorage: coldStorageInput,
            weeklyTargetBudgetLkr: parseFloat(budgetLkrInput) || 750000,
          },
        },
        buyerId
      );

      setBuyerProfile(updated);
      setEditModalVisible(false);
      Alert.alert('Success ✅', 'Buyer profile and purchasing requirements successfully saved to Cloud Firestore!');
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Failed to save buyer profile.');
    } finally {
      setSavingProfile(false);
    }
  };

  const handleSendThreadReply = async () => {
    if (!replyText.trim() || !selectedEnquiryThread) return;

    setSendingReply(true);
    try {
      const newEnq = await sendEnquiry(
        {
          listingId: selectedEnquiryThread.listingId,
          cropName: selectedEnquiryThread.cropName,
          farmerId: selectedEnquiryThread.farmerId,
          buyerId,
          senderName: buyerProfile?.contactPerson || user?.fullName || 'Dilan Perera',
          senderRole: 'buyer',
          recipientId: selectedEnquiryThread.farmerId,
          recipientName: selectedEnquiryThread.recipientName === user?.fullName ? selectedEnquiryThread.senderName : selectedEnquiryThread.recipientName,
          message: replyText.trim(),
        },
        buyerId
      );

      setEnquiries((prev) => [newEnq, ...prev]);
      setSelectedEnquiryThread(newEnq);
      setReplyText('');
      Alert.alert('Reply Sent', 'Your message has been delivered to the farmer via Firestore.');
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Failed to send reply.');
    } finally {
      setSendingReply(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    router.replace('/welcome');
  };

  if (loading && !refreshing) {
    return (
      <View style={[styles.screen, styles.center, { backgroundColor: isDark ? '#121815' : Palette.background }]}>
        <ActivityIndicator size="large" color={Palette.primary} />
        <Text style={[styles.loadingText, { fontSize: scaleFont(13) }]}>Loading Buyer Profile from Firestore...</Text>
      </View>
    );
  }

  const preferredCropsList = buyerProfile?.purchasingRequirements?.preferredCrops || ['Carrot', 'Tomato', 'Beans'];
  const preferredDistrictsList = buyerProfile?.purchasingRequirements?.preferredDistricts || ['Nuwara Eliya', 'Matale'];

  return (
    <View style={[styles.screen, { backgroundColor: isDark ? '#121815' : Palette.background }]}>
      <Header
        title="Buyer Profile"
        subtitle="Wholesale & Commercial Sourcing"
        showRoleBadge={false}
        onNotificationPress={() => router.push('/notifications')}
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        contentContainerStyle={{
          paddingHorizontal: scaleSize(contentPadding),
          paddingBottom: scaleSize(100),
          paddingTop: scaleSize(10),
        }}
      >
        {/* ======================================================== */}
        {/* 1. BUYER BUSINESS IDENTITY CARD                          */}
        {/* ======================================================== */}
        <View
          style={[
            styles.idCard,
            {
              padding: scaleSize(Spacing.lg),
              borderRadius: BorderRadius.xl,
              ...Shadows.soft,
            },
          ]}
        >
          <View style={styles.idCardHeader}>
            <View
              style={[
                styles.avatarCircle,
                {
                  width: scaleSize(60),
                  height: scaleSize(60),
                  borderRadius: scaleSize(30),
                },
              ]}
            >
              <Ionicons name="business" size={scaleSize(30)} color={Palette.primary} />
            </View>

            <View style={{ flex: 1, marginLeft: 12 }}>
              <View style={styles.nameRow}>
                <Text style={[styles.businessNameTitle, { fontSize: scaleFont(18) }]}>
                  {buyerProfile?.businessName || 'Pettah Fresh Wholesale Hub'}
                </Text>
                <Badge label="Verified Buyer" variant="verified" size="sm" />
              </View>

              <Text style={[styles.contactPersonText, { fontSize: scaleFont(13) }]}>
                Representative: {buyerProfile?.contactPerson || user?.fullName || 'Dilan Perera'}
              </Text>
              <Text style={[styles.buyerLocationText, { fontSize: scaleFont(12) }]}>
                📍 {buyerProfile?.address || 'Manning Wholesale Market, Pettah, Colombo 11'}
              </Text>
              <Text style={[styles.contactNumberText, { fontSize: scaleFont(12) }]}>
                📞 {buyerProfile?.phone || '+94 71 987 6543'} • ✉️ {buyerProfile?.email || 'buyer@cropconnect.lk'}
              </Text>
            </View>
          </View>

          {/* Sourcing Stats */}
          <View style={styles.statsBar}>
            <View style={styles.statCol}>
              <Text style={[styles.statNum, { fontSize: scaleFont(17) }]}>
                ★ {buyerProfile?.rating || 4.9}
              </Text>
              <Text style={[styles.statLbl, { fontSize: scaleFont(11) }]}>Payment Rating</Text>
            </View>
            <View style={styles.statDiv} />
            <View style={styles.statCol}>
              <Text style={[styles.statNum, { fontSize: scaleFont(17) }]}>
                {buyerProfile?.dealsCompleted || 94}
              </Text>
              <Text style={[styles.statLbl, { fontSize: scaleFont(11) }]}>Completed Deals</Text>
            </View>
            <View style={styles.statDiv} />
            <View style={styles.statCol}>
              <Text style={[styles.statNum, { fontSize: scaleFont(17), color: Palette.primary }]}>
                {myOffers.length}
              </Text>
              <Text style={[styles.statLbl, { fontSize: scaleFont(11) }]}>Active Offers</Text>
            </View>
          </View>
        </View>

        {/* Action Button: Edit Business Profile & Requirements */}
        <Button
          title="Edit Business Profile & Requirements"
          variant="primary"
          size="md"
          icon="create-outline"
          fullWidth
          onPress={handleOpenEditModal}
          style={{ marginVertical: scaleSize(12) }}
        />

        {/* ======================================================== */}
        {/* 2. PURCHASING REQUIREMENTS SUMMARY CARD                  */}
        {/* ======================================================== */}
        <View
          style={[
            styles.sectionCard,
            {
              padding: scaleSize(14),
              borderRadius: BorderRadius.lg,
              marginBottom: scaleSize(12),
              ...Shadows.soft,
            },
          ]}
        >
          <View style={styles.sectionCardHeader}>
            <Ionicons name="cart" size={scaleSize(18)} color={Palette.primary} />
            <Text style={[styles.sectionCardTitle, { fontSize: scaleFont(14) }]}>
              Purchasing Requirements & Capacity
            </Text>
          </View>

          {/* Preferred Crops */}
          <Text style={[styles.subLabel, { fontSize: scaleFont(11), marginTop: 8 }]}>
            PREFERRED CROP TYPES:
          </Text>
          <View style={styles.chipsWrap}>
            {preferredCropsList.map((crop) => (
              <View key={crop} style={styles.cropChip}>
                <Ionicons name="leaf" size={scaleSize(11)} color={Palette.primary} />
                <Text style={styles.cropChipText}>{crop}</Text>
              </View>
            ))}
          </View>

          {/* Required Quantities */}
          <View style={styles.metaRow}>
            <View style={styles.metaCol}>
              <Text style={styles.metaLbl}>Minimum Order</Text>
              <Text style={styles.metaVal}>
                {buyerProfile?.purchasingRequirements?.minOrderQuantityKg || 100} kg
              </Text>
            </View>
            <View style={styles.metaCol}>
              <Text style={styles.metaLbl}>Max Capacity</Text>
              <Text style={styles.metaVal}>
                {buyerProfile?.purchasingRequirements?.maxOrderQuantityKg || 3000} kg
              </Text>
            </View>
            <View style={styles.metaCol}>
              <Text style={styles.metaLbl}>Weekly Budget</Text>
              <Text style={[styles.metaVal, { color: Palette.primary }]}>
                Rs. {((buyerProfile?.purchasingRequirements?.weeklyTargetBudgetLkr || 750000) / 1000).toFixed(0)}k
              </Text>
            </View>
          </View>

          {/* Preferred Purchasing Locations */}
          <Text style={[styles.subLabel, { fontSize: scaleFont(11), marginTop: 12 }]}>
            PREFERRED PURCHASING LOCATIONS:
          </Text>
          <View style={styles.chipsWrap}>
            {preferredDistrictsList.map((dist) => (
              <View key={dist} style={styles.distChip}>
                <Ionicons name="location" size={scaleSize(11)} color={Palette.secondaryDark} />
                <Text style={styles.distChipText}>{dist}</Text>
              </View>
            ))}
          </View>

          {/* Commercial & Logistics Terms */}
          <View style={styles.termsBox}>
            <View style={styles.termLine}>
              <Ionicons name="car-outline" size={scaleSize(14)} color={Palette.primary} />
              <Text style={styles.termText}>
                Mode: {buyerProfile?.purchasingRequirements?.preferredDeliveryMode === 'farmgate_pickup' ? 'Farmgate Pickup (Buyer arranges transport)' : 'Market Delivery'}
              </Text>
            </View>
            <View style={styles.termLine}>
              <Ionicons name="snow-outline" size={scaleSize(14)} color={Palette.primary} />
              <Text style={styles.termText}>
                Cold Storage: {buyerProfile?.purchasingRequirements?.hasColdStorage ? 'Refrigerated Storage Hub Available' : 'Standard Ventilation Storehouse'}
              </Text>
            </View>
            <View style={styles.termLine}>
              <Ionicons name="card-outline" size={scaleSize(14)} color={Palette.primary} />
              <Text style={styles.termText}>
                Payment: Instant LankaPay Bank Transfer upon farmgate loading
              </Text>
            </View>
          </View>
        </View>

        {/* ======================================================== */}
        {/* 3. ENQUIRIES & SUBMITTED OFFERS SUMMARY SHORTCUTS        */}
        {/* ======================================================== */}
        <View style={[styles.shortcutsRow, { gap: scaleSize(10), marginBottom: scaleSize(14) }]}>
          <TouchableOpacity
            activeOpacity={0.88}
            onPress={() => setEnqHistoryModalVisible(true)}
            style={[
              styles.shortcutCard,
              {
                flex: 1,
                padding: scaleSize(12),
                borderRadius: BorderRadius.lg,
                ...Shadows.soft,
              },
            ]}
          >
            <Ionicons name="chatbubbles" size={scaleSize(22)} color={Palette.primary} />
            <Text style={[styles.shortcutTitle, { fontSize: scaleFont(13) }]}>Enquiry History</Text>
            <Text style={[styles.shortcutSub, { fontSize: scaleFont(11) }]}>
              {enquiries.length} Messages with Farmers
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.88}
            onPress={() => router.push('/(buyer)')}
            style={[
              styles.shortcutCard,
              {
                flex: 1,
                padding: scaleSize(12),
                borderRadius: BorderRadius.lg,
                ...Shadows.soft,
              },
            ]}
          >
            <Ionicons name="pricetags" size={scaleSize(22)} color={Palette.secondaryDark} />
            <Text style={[styles.shortcutTitle, { fontSize: scaleFont(13) }]}>My Offers</Text>
            <Text style={[styles.shortcutSub, { fontSize: scaleFont(11) }]}>
              {myOffers.length} Submitted Bids
            </Text>
          </TouchableOpacity>
        </View>

        {/* ======================================================== */}
        {/* 4. NAVIGATION LINKS                                      */}
        {/* ======================================================== */}
        <View style={styles.linksContainer}>
          <TouchableOpacity onPress={() => router.push('/(buyer)/map')} style={styles.linkRow}>
            <View style={styles.linkLeft}>
              <Ionicons name="map-outline" size={scaleSize(18)} color={Palette.primary} />
              <Text style={[styles.linkTitle, { fontSize: scaleFont(14) }]}>Nearby Farm Map & Sourcing Centroids</Text>
            </View>
            <Ionicons name="chevron-forward" size={scaleSize(18)} color={Palette.slateMedium} />
          </TouchableOpacity>

          <TouchableOpacity onPress={() => router.push('/price-comparison')} style={styles.linkRow}>
            <View style={styles.linkLeft}>
              <Ionicons name="swap-vertical-outline" size={scaleSize(18)} color={Palette.primary} />
              <Text style={[styles.linkTitle, { fontSize: scaleFont(14) }]}>Wholesale Price Comparison Engine</Text>
            </View>
            <Ionicons name="chevron-forward" size={scaleSize(18)} color={Palette.slateMedium} />
          </TouchableOpacity>

          <TouchableOpacity onPress={() => router.push('/settings')} style={styles.linkRow}>
            <View style={styles.linkLeft}>
              <Ionicons name="settings-outline" size={scaleSize(18)} color={Palette.primary} />
              <Text style={[styles.linkTitle, { fontSize: scaleFont(14) }]}>Account Settings & Preferences</Text>
            </View>
            <Ionicons name="chevron-forward" size={scaleSize(18)} color={Palette.slateMedium} />
          </TouchableOpacity>

          <TouchableOpacity onPress={() => router.push('/role-selection')} style={styles.linkRow}>
            <View style={styles.linkLeft}>
              <Ionicons name="swap-horizontal" size={scaleSize(18)} color={Palette.warning} />
              <Text style={[styles.linkTitle, { fontSize: scaleFont(14), color: Palette.warning }]}>
                Switch Active Role Sandbox
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={scaleSize(18)} color={Palette.slateMedium} />
          </TouchableOpacity>

          <TouchableOpacity onPress={handleLogout} style={[styles.linkRow, { borderBottomWidth: 0 }]}>
            <View style={styles.linkLeft}>
              <Ionicons name="log-out-outline" size={scaleSize(18)} color={Palette.rescueRed} />
              <Text style={[styles.linkTitle, { fontSize: scaleFont(14), color: Palette.rescueRed }]}>
                Sign Out from CropConnect
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={scaleSize(18)} color={Palette.slateMedium} />
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* ======================================================== */}
      {/* MODAL 1: EDIT BUSINESS PROFILE & REQUIREMENTS            */}
      {/* ======================================================== */}
      <Modal
        visible={editModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setEditModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { maxHeight: '88%' }]}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={[styles.modalTitle, { fontSize: scaleFont(17) }]}>
                  Edit Business Profile & Requirements
                </Text>
                <Text style={[styles.modalSub, { fontSize: scaleFont(12) }]}>
                  Persisted directly to Cloud Firestore `buyers/{buyerId}`
                </Text>
              </View>
              <TouchableOpacity onPress={() => setEditModalVisible(false)}>
                <Ionicons name="close-circle" size={scaleSize(24)} color={Palette.slateMedium} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <Input
                label="BUSINESS / TRADING ENTITY NAME"
                value={businessNameInput}
                onChangeText={setBusinessNameInput}
                leftIcon="business-outline"
              />

              <Input
                label="CONTACT PERSON / PROCUREMENT REP"
                value={contactPersonInput}
                onChangeText={setContactPersonInput}
                leftIcon="person-outline"
              />

              <Input
                label="CONTACT NUMBER (PHONE)"
                value={phoneInput}
                onChangeText={setPhoneInput}
                keyboardType="phone-pad"
                leftIcon="call-outline"
              />

              <Input
                label="EMAIL ADDRESS"
                value={emailInput}
                onChangeText={setEmailInput}
                keyboardType="email-address"
                autoCapitalize="none"
                leftIcon="mail-outline"
              />

              <Input
                label="DETAILED BUSINESS ADDRESS"
                value={addressInput}
                onChangeText={setAddressInput}
                leftIcon="location-outline"
              />

              {/* Business Location / District */}
              <Text style={[styles.formLabel, { fontSize: scaleFont(12) }]}>
                BUSINESS LOCATION (PRIMARY DISTRICT)
              </Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ gap: 6, marginBottom: 12 }}
              >
                {SRI_LANKA_DISTRICTS.map((d) => {
                  const active = districtInput === d.name;
                  return (
                    <TouchableOpacity
                      key={d.name}
                      onPress={() => setDistrictInput(d.name)}
                      style={[styles.distChipSelect, active && styles.distChipSelectActive]}
                    >
                      <Text style={[styles.distChipSelectText, active && styles.distChipSelectTextActive]}>
                        {d.name}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>

              {/* Preferred Crops Multi-Select */}
              <Text style={[styles.formLabel, { fontSize: scaleFont(12) }]}>
                PREFERRED CROP TYPES TO PURCHASE (MULTI-SELECT)
              </Text>
              <View style={styles.cropPickerContainer}>
                {POPULAR_CROPS.map((c) => {
                  const isSelected = preferredCropsInput.includes(c.name);
                  return (
                    <TouchableOpacity
                      key={c.id}
                      onPress={() => togglePreferredCrop(c.name)}
                      style={[styles.cropPickChip, isSelected && styles.cropPickChipActive]}
                    >
                      <Ionicons
                        name={isSelected ? 'checkmark-circle' : 'add-circle-outline'}
                        size={12}
                        color={isSelected ? '#FFFFFF' : Palette.charcoal}
                      />
                      <Text style={[styles.cropPickText, isSelected && styles.cropPickTextActive]}>
                        {c.name}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Required Quantities */}
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

              {/* Preferred Purchasing Locations */}
              <Text style={[styles.formLabel, { fontSize: scaleFont(12), marginTop: 8 }]}>
                PREFERRED PURCHASING LOCATIONS (DISTRICTS)
              </Text>
              <View style={styles.cropPickerContainer}>
                {['Nuwara Eliya', 'Matale', 'Badulla', 'Kandy', 'Jaffna', 'Anuradhapura', 'Colombo', 'Kurunegala'].map((dist) => {
                  const isSelected = preferredDistrictsInput.includes(dist);
                  return (
                    <TouchableOpacity
                      key={dist}
                      onPress={() => togglePreferredDistrict(dist)}
                      style={[styles.cropPickChip, isSelected && styles.cropPickChipActive]}
                    >
                      <Ionicons
                        name="location-outline"
                        size={12}
                        color={isSelected ? '#FFFFFF' : Palette.charcoal}
                      />
                      <Text style={[styles.cropPickText, isSelected && styles.cropPickTextActive]}>
                        {dist}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Cold Storage Switch */}
              <View style={styles.switchRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.switchLabel}>Refrigerated Cold Storage Facilities</Text>
                  <Text style={styles.switchSub}>Equipped with cold chain logistics</Text>
                </View>
                <Switch
                  value={coldStorageInput}
                  onValueChange={setColdStorageInput}
                  trackColor={{ false: '#CBD5E1', true: Palette.primary }}
                />
              </View>

              <Button
                title={savingProfile ? 'Saving to Firestore...' : 'Save Profile & Requirements'}
                variant="primary"
                size="lg"
                icon="save-outline"
                fullWidth
                loading={savingProfile}
                onPress={handleSaveProfile}
                style={{ marginTop: 14 }}
              />
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ======================================================== */}
      {/* MODAL 2: VIEW ENQUIRY HISTORY                            */}
      {/* ======================================================== */}
      <Modal
        visible={enqHistoryModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setEnqHistoryModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { maxHeight: '85%' }]}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={[styles.modalTitle, { fontSize: scaleFont(17) }]}>
                  Farmer Enquiry History ({enquiries.length})
                </Text>
                <Text style={[styles.modalSub, { fontSize: scaleFont(12) }]}>
                  All direct inquiries sent to and received from farm producers
                </Text>
              </View>
              <TouchableOpacity onPress={() => setEnqHistoryModalVisible(false)}>
                <Ionicons name="close-circle" size={scaleSize(24)} color={Palette.slateMedium} />
              </TouchableOpacity>
            </View>

            {enquiries.length === 0 ? (
              <View style={{ padding: 30, alignItems: 'center' }}>
                <Ionicons name="chatbubble-outline" size={36} color={Palette.slateMedium} />
                <Text style={{ marginTop: 8, color: Palette.slateDark, fontWeight: '700' }}>
                  No Enquiry Messages Yet
                </Text>
                <Text style={{ color: Palette.slateMedium, textAlign: 'center', marginTop: 4 }}>
                  Browse crop listings in Marketplace and send inquiries to farmers.
                </Text>
              </View>
            ) : (
              <ScrollView showsVerticalScrollIndicator={false}>
                {enquiries.map((enq) => (
                  <TouchableOpacity
                    key={enq.id}
                    activeOpacity={0.88}
                    onPress={() => setSelectedEnquiryThread(enq)}
                    style={styles.historyEnqCard}
                  >
                    <View style={styles.historyEnqTop}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.historyEnqFarmer}>
                          {enq.senderRole === 'farmer' ? enq.senderName : enq.recipientName}
                        </Text>
                        <Text style={styles.historyEnqCrop}>Re: {enq.cropName || 'Produce Batch'}</Text>
                      </View>
                      <Text style={styles.historyEnqDate}>
                        {new Date(enq.createdAt).toLocaleDateString()}
                      </Text>
                    </View>
                    <Text style={styles.historyEnqMsg} numberOfLines={2}>
                      &ldquo;{enq.message}&rdquo;
                    </Text>
                    <Text style={styles.historyViewThread}>View Conversation & Reply ➔</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}

            {/* Conversation Thread Sub-Modal inside History */}
            {selectedEnquiryThread && (
              <View style={styles.threadOverlayBox}>
                <View style={styles.threadHeader}>
                  <Text style={styles.threadTitle}>
                    Conversation with {selectedEnquiryThread.senderRole === 'farmer' ? selectedEnquiryThread.senderName : selectedEnquiryThread.recipientName}
                  </Text>
                  <TouchableOpacity onPress={() => setSelectedEnquiryThread(null)}>
                    <Ionicons name="close" size={20} color={Palette.charcoal} />
                  </TouchableOpacity>
                </View>

                <ScrollView style={{ maxHeight: 180, marginVertical: 8 }}>
                  {enquiries
                    .filter((e) => e.cropName === selectedEnquiryThread.cropName || e.farmerId === selectedEnquiryThread.farmerId)
                    .map((msg) => {
                      const isMine = msg.senderRole === 'buyer';
                      return (
                        <View key={msg.id} style={[styles.bubbleWrap, isMine ? styles.bubbleRight : styles.bubbleLeft]}>
                          <View style={[styles.bubbleContent, isMine ? styles.bubbleContentMine : styles.bubbleContentTheirs]}>
                            <Text style={[styles.bubbleSender, isMine ? styles.bubbleSenderMine : styles.bubbleSenderTheirs]}>
                              {msg.senderName}
                            </Text>
                            <Text style={[styles.bubbleText, isMine ? styles.bubbleTextMine : styles.bubbleTextTheirs]}>
                              {msg.message}
                            </Text>
                          </View>
                        </View>
                      );
                    })}
                </ScrollView>

                <View style={styles.replyBar}>
                  <TextInput
                    value={replyText}
                    onChangeText={setReplyText}
                    placeholder="Type reply to farmer..."
                    style={styles.replyBarInput}
                  />
                  <TouchableOpacity
                    onPress={handleSendThreadReply}
                    disabled={sendingReply || !replyText.trim()}
                    style={styles.replyBarBtn}
                  >
                    <Ionicons name="send" size={16} color="#FFFFFF" />
                  </TouchableOpacity>
                </View>
              </View>
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
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 10,
    color: Palette.slateDark,
    fontWeight: '600',
  },
  idCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: Palette.warmBorder,
  },
  idCardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 14,
  },
  avatarCircle: {
    backgroundColor: Palette.primaryTint,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: Palette.primary,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  businessNameTitle: {
    fontWeight: '900',
    color: Palette.charcoal,
    flex: 1,
    marginRight: 6,
  },
  contactPersonText: {
    color: Palette.secondaryDark,
    fontWeight: '700',
    marginBottom: 2,
  },
  buyerLocationText: {
    color: Palette.slateDark,
    fontWeight: '500',
    marginBottom: 2,
  },
  contactNumberText: {
    color: Palette.slateMedium,
    fontSize: 11,
  },
  statsBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Palette.background,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: BorderRadius.md,
  },
  statCol: {
    alignItems: 'center',
  },
  statNum: {
    fontWeight: '900',
    color: Palette.charcoal,
  },
  statLbl: {
    color: Palette.slateMedium,
    marginTop: 1,
  },
  statDiv: {
    width: 1,
    height: 22,
    backgroundColor: Palette.subtleBorder,
  },
  // Section Card
  sectionCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: Palette.warmBorder,
  },
  sectionCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderBottomWidth: 1,
    borderBottomColor: Palette.subtleBorder,
    paddingBottom: 8,
  },
  sectionCardTitle: {
    fontWeight: '800',
    color: Palette.charcoal,
  },
  subLabel: {
    fontWeight: '700',
    color: Palette.slateMedium,
    marginBottom: 4,
  },
  chipsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 8,
  },
  cropChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Palette.primaryTint,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
  },
  cropChipText: {
    fontSize: 11,
    color: Palette.primary,
    fontWeight: '700',
  },
  distChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Palette.secondaryTint,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
  },
  distChipText: {
    fontSize: 11,
    color: Palette.secondaryDark,
    fontWeight: '700',
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: Palette.background,
    padding: 10,
    borderRadius: BorderRadius.md,
    marginVertical: 6,
  },
  metaCol: {
    alignItems: 'center',
  },
  metaLbl: {
    fontSize: 10,
    color: Palette.slateMedium,
  },
  metaVal: {
    fontSize: 13,
    fontWeight: '800',
    color: Palette.charcoal,
    marginTop: 2,
  },
  termsBox: {
    backgroundColor: Palette.background,
    padding: 10,
    borderRadius: BorderRadius.md,
    gap: 6,
    marginTop: 6,
  },
  termLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  termText: {
    fontSize: 11,
    color: Palette.slateDark,
    flex: 1,
  },
  shortcutsRow: {
    flexDirection: 'row',
  },
  shortcutCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: Palette.warmBorder,
    alignItems: 'center',
    gap: 4,
  },
  shortcutTitle: {
    fontWeight: '800',
    color: Palette.charcoal,
    marginTop: 2,
  },
  shortcutSub: {
    color: Palette.slateMedium,
  },
  linksContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Palette.warmBorder,
    overflow: 'hidden',
  },
  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: Palette.subtleBorder,
  },
  linkLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  linkTitle: {
    fontWeight: '600',
    color: Palette.charcoal,
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
  distChipSelect: {
    backgroundColor: Palette.background,
    borderWidth: 1,
    borderColor: Palette.warmBorder,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: BorderRadius.full,
  },
  distChipSelectActive: {
    backgroundColor: Palette.secondaryDark,
    borderColor: Palette.secondaryDark,
  },
  distChipSelectText: {
    fontSize: 11,
    color: Palette.charcoal,
    fontWeight: '600',
  },
  distChipSelectTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  cropPickerContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 12,
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
    fontSize: 11,
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
  // History Modal Styles
  historyEnqCard: {
    backgroundColor: Palette.background,
    borderWidth: 1,
    borderColor: Palette.warmBorder,
    borderRadius: BorderRadius.md,
    padding: 12,
    marginBottom: 8,
  },
  historyEnqTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  historyEnqFarmer: {
    fontWeight: '800',
    color: Palette.charcoal,
    fontSize: 13,
  },
  historyEnqCrop: {
    fontSize: 11,
    color: Palette.primary,
    fontWeight: '600',
  },
  historyEnqDate: {
    fontSize: 10,
    color: Palette.slateMedium,
  },
  historyEnqMsg: {
    fontSize: 12,
    color: Palette.slateDark,
    fontStyle: 'italic',
    marginVertical: 4,
  },
  historyViewThread: {
    fontSize: 11,
    color: Palette.primary,
    fontWeight: '700',
    marginTop: 2,
  },
  threadOverlayBox: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: Palette.primary,
    borderRadius: BorderRadius.lg,
    padding: 12,
    marginTop: 10,
    ...Shadows.elevated,
  },
  threadHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: Palette.subtleBorder,
    paddingBottom: 6,
  },
  threadTitle: {
    fontWeight: '800',
    fontSize: 13,
    color: Palette.charcoal,
  },
  bubbleWrap: {
    marginVertical: 3,
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
    padding: 8,
    borderRadius: BorderRadius.md,
  },
  bubbleContentMine: {
    backgroundColor: Palette.primary,
  },
  bubbleContentTheirs: {
    backgroundColor: '#F1F5F9',
  },
  bubbleSender: {
    fontSize: 9,
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
    fontSize: 12,
  },
  bubbleTextMine: {
    color: '#FFFFFF',
  },
  bubbleTextTheirs: {
    color: Palette.charcoal,
  },
  replyBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 6,
  },
  replyBarInput: {
    flex: 1,
    backgroundColor: Palette.background,
    borderWidth: 1,
    borderColor: Palette.warmBorder,
    borderRadius: BorderRadius.full,
    paddingHorizontal: 12,
    paddingVertical: Platform.OS === 'ios' ? 8 : 6,
    fontSize: 12,
  },
  replyBarBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: Palette.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default BuyerProfileScreen;
