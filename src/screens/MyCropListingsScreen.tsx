import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  Alert,
  ActivityIndicator,
  RefreshControl,
  Linking,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Palette, Spacing, BorderRadius, Shadows } from '../constants/theme';
import { Header } from '../components/common/Header';
import { Button } from '../components/common/Button';
import { Input } from '../components/common/Input';
import { CropListingCard } from '../components/home/CropListingCard';
import { useResponsive } from '../hooks/useResponsive';
import { useAuth } from '../hooks/useAuth';
import {
  getFarmerListings,
  updateCropListing,
  deleteCropListing,
  getOffersForListing,
  updateOfferStatus,
  counterBuyerOffer,
} from '../services/firestoreService';
import { FirestoreCropListing, FirestoreBuyerOffer } from '../types/database';
import { ListingStatus } from '../types/listing';

export const MyCropListingsScreen: React.FC = () => {
  const { scaleSize, scaleFont, contentPadding } = useResponsive();
  const { user } = useAuth();

  const [activeTab, setActiveTab] = useState<'active' | 'negotiating' | 'sold'>('active');
  const [listings, setListings] = useState<FirestoreCropListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Edit Listing Modal state
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [selectedListing, setSelectedListing] = useState<FirestoreCropListing | null>(null);
  const [editPrice, setEditPrice] = useState('');
  const [editQuantity, setEditQuantity] = useState('');
  const [editStatus, setEditStatus] = useState<ListingStatus>('active');
  const [editDescription, setEditDescription] = useState('');
  const [editLoading, setEditLoading] = useState(false);

  // Interested Buyers / Offers Modal state
  const [offersModalVisible, setOffersModalVisible] = useState(false);
  const [currentOffers, setCurrentOffers] = useState<FirestoreBuyerOffer[]>([]);
  const [loadingOffers, setLoadingOffers] = useState(false);
  const [targetListingForOffers, setTargetListingForOffers] = useState<FirestoreCropListing | null>(null);

  const farmerId = user?.id || 'farmer_001';
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  useEffect(() => {
    let isMounted = true;
    const load = async () => {
      try {
        const data = await getFarmerListings(farmerId);
        if (isMounted) {
          setListings(data);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    };

    load();
    return () => {
      isMounted = false;
    };
  }, [farmerId, refreshTrigger]);

  const onRefresh = () => {
    setRefreshing(true);
    setRefreshTrigger((prev) => prev + 1);
  };

  // Open Edit Modal
  const openEditModal = (listing: FirestoreCropListing) => {
    setSelectedListing(listing);
    setEditPrice(listing.askingPricePerKg.toString());
    setEditQuantity(listing.quantityKg.toString());
    setEditStatus(listing.status);
    setEditDescription(listing.description);
    setEditModalVisible(true);
  };

  // Save Edits to Firestore
  const handleSaveEdits = async () => {
    if (!selectedListing) return;

    const price = parseFloat(editPrice) || 0;
    const qty = parseFloat(editQuantity) || 0;

    if (price <= 0 || qty <= 0) {
      Alert.alert('Validation Error', 'Please enter a valid price and quantity greater than 0.');
      return;
    }

    setEditLoading(true);
    try {
      await updateCropListing(
        selectedListing.id,
        {
          askingPricePerKg: price,
          quantityKg: qty,
          status: editStatus,
          description: editDescription,
        },
        farmerId
      );

      Alert.alert('Success', `Updated listing for ${selectedListing.cropName} in Cloud Firestore! 🌾`);
      setEditModalVisible(false);
      setRefreshTrigger((prev) => prev + 1);
    } catch (err: any) {
      Alert.alert('Update Failed', err?.message || 'Could not update listing in Firestore.');
    } finally {
      setEditLoading(false);
    }
  };

  // Delete Listing with Confirmation
  const handleDeleteListing = (listing: FirestoreCropListing) => {
    Alert.alert(
      'Delete Crop Listing',
      `Are you sure you want to delete ${listing.quantityKg}kg of ${listing.cropName}? This action will permanently remove it from Cloud Firestore.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete Permanently',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteCropListing(listing.id, farmerId);
              Alert.alert('Deleted', 'Crop listing removed from Firestore.');
              setRefreshTrigger((prev) => prev + 1);
            } catch (err: any) {
              Alert.alert('Deletion Error', err?.message || 'Failed to delete listing.');
            }
          },
        },
      ]
    );
  };

  // Quick toggle status (e.g. Mark as Sold / Active)
  const handleToggleStatus = async (listing: FirestoreCropListing, newStatus: ListingStatus) => {
    try {
      await updateCropListing(listing.id, { status: newStatus }, farmerId);
      Alert.alert('Status Updated', `Listing marked as "${newStatus.toUpperCase()}".`);
      setRefreshTrigger((prev) => prev + 1);
    } catch (err: any) {
      Alert.alert('Status Update Failed', err?.message || 'Failed to update status.');
    }
  };

  // Open Offers / Interested Buyers
  const handleViewOffers = async (listing: FirestoreCropListing) => {
    setTargetListingForOffers(listing);
    setLoadingOffers(true);
    setOffersModalVisible(true);
    try {
      const offers = await getOffersForListing(listing.id, farmerId);
      setCurrentOffers(offers);
    } catch {
      setCurrentOffers([]);
    } finally {
      setLoadingOffers(false);
    }
  };

  // Handle Offer Response (Accept / Reject)
  const handleOfferResponse = async (offerId: string, newStatus: 'accepted' | 'rejected') => {
    try {
      await updateOfferStatus(offerId, newStatus, farmerId, `Farmer confirmed: ${newStatus}`);
      Alert.alert(
        newStatus === 'accepted' ? 'Deal Accepted! 🎉' : 'Offer Rejected',
        `Buyer has been notified in Cloud Firestore.`
      );
      if (targetListingForOffers) {
        handleViewOffers(targetListingForOffers);
      }
    } catch (err: any) {
      Alert.alert('Action Failed', err?.message || 'Failed to update offer status.');
    }
  };

  // Handle Counter Offer
  const handleCounterOffer = (offer: FirestoreBuyerOffer) => {
    if (Alert.prompt) {
      Alert.prompt(
        'Counter-Offer Price (LKR / kg)',
        `Enter your counter price per kg for ${offer.buyerName} (Asking: Rs. ${offer.farmerAskingPricePerKg}/kg, Offered: Rs. ${offer.offeredPricePerKg}/kg):`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Submit Counter-Offer',
            onPress: async (val) => {
              const counterPrice = parseFloat(val || '0');
              if (counterPrice <= 0) {
                Alert.alert('Invalid Price', 'Please enter a valid counter price.');
                return;
              }
              try {
                await counterBuyerOffer(offer.id, counterPrice, farmerId);
                Alert.alert('Counter-Offer Sent 🤝', `Proposed Rs. ${counterPrice}/kg to ${offer.buyerName}.`);
                if (targetListingForOffers) handleViewOffers(targetListingForOffers);
              } catch (err: any) {
                Alert.alert('Failed', err?.message || 'Failed to submit counter offer.');
              }
            },
          },
        ],
        'plain-text',
        offer.farmerAskingPricePerKg.toString()
      );
    } else {
      Alert.alert('Counter Offer', `Contact ${offer.buyerName} at ${offer.buyerPhone} to confirm counter-terms.`);
    }
  };

  // Filter listings based on selected tab
  const displayedListings = listings.filter((l) => {
    if (activeTab === 'active') return l.status === 'active';
    if (activeTab === 'negotiating') return l.status === 'negotiating' || l.activeOffersCount > 0;
    return l.status === 'sold' || l.status === 'expired';
  });

  const tabs: { id: 'active' | 'negotiating' | 'sold'; label: string; count: number }[] = [
    {
      id: 'active',
      label: 'Active Harvest',
      count: listings.filter((l) => l.status === 'active').length,
    },
    {
      id: 'negotiating',
      label: 'Buyer Offers',
      count: listings.filter((l) => l.status === 'negotiating' || l.activeOffersCount > 0).length,
    },
    {
      id: 'sold',
      label: 'Completed / Sold',
      count: listings.filter((l) => l.status === 'sold').length,
    },
  ];

  return (
    <View style={styles.screen}>
      <Header
        title="My Farm Listings"
        subtitle={`Live Inventory • ${listings.length} Harvest Batches`}
        onNotificationPress={() => router.push('/notifications')}
      />

      {/* Status Filter Tabs */}
      <View
        style={[
          styles.tabBar,
          {
            paddingHorizontal: scaleSize(contentPadding),
            paddingVertical: scaleSize(10),
          },
        ]}
      >
        {tabs.map((t) => {
          const isSelected = activeTab === t.id;
          return (
            <TouchableOpacity
              key={t.id}
              onPress={() => setActiveTab(t.id)}
              style={[
                styles.tabBtn,
                isSelected && styles.tabBtnActive,
                { paddingVertical: scaleSize(8), borderRadius: BorderRadius.full },
              ]}
            >
              <Text
                style={[
                  styles.tabLabel,
                  isSelected && styles.tabLabelActive,
                  { fontSize: scaleFont(12) },
                ]}
              >
                {t.label} ({t.count})
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {loading && !refreshing ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={Palette.primary} />
          <Text style={[styles.loadingText, { fontSize: scaleFont(13) }]}>
            Loading your farm listings from Cloud Firestore...
          </Text>
        </View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          contentContainerStyle={{
            paddingBottom: scaleSize(100),
            paddingTop: scaleSize(8),
          }}
        >
          {displayedListings.length === 0 ? (
            <View
              style={[
                styles.emptyBox,
                {
                  marginHorizontal: scaleSize(contentPadding),
                  padding: scaleSize(Spacing.xl),
                  borderRadius: BorderRadius.lg,
                  ...Shadows.soft,
                },
              ]}
            >
              <Ionicons name="cube-outline" size={scaleSize(48)} color={Palette.slateMedium} />
              <Text style={[styles.emptyTitle, { fontSize: scaleFont(16) }]}>
                No Listings in &ldquo;{tabs.find((t) => t.id === activeTab)?.label}&rdquo;
              </Text>
              <Text style={[styles.emptySub, { fontSize: scaleFont(12) }]}>
                Publish your crop harvest to connect with wholesale buyers and get fair market prices.
              </Text>
              <Button
                title="+ Add Produce Listing"
                variant="primary"
                size="md"
                icon="add-circle"
                onPress={() => router.push('/(farmer)/add-crop')}
                style={{ marginTop: 14 }}
              />
            </View>
          ) : (
            displayedListings.map((listing) => (
              <View key={listing.id} style={{ marginBottom: scaleSize(14) }}>
                {/* Crop Listing Visual Card */}
                <CropListingCard
                  listing={{
                    ...listing,
                    farmerRating: listing.farmerRating || 4.9,
                    minOrderKg: listing.minOrderKg || 100,
                    location: {
                      latitude: listing.latitude,
                      longitude: listing.longitude,
                      district: listing.district,
                      address: listing.address,
                    },
                  }}
                  onPress={() =>
                    router.push({ pathname: '/crop/[id]', params: { id: listing.id } })
                  }
                />

                {/* Farmer Operations Bar */}
                <View
                  style={[
                    styles.operationsBar,
                    {
                      marginHorizontal: scaleSize(contentPadding),
                    },
                  ]}
                >
                  {/* View Interested Buyers / Offers */}
                  <TouchableOpacity
                    onPress={() => handleViewOffers(listing)}
                    style={[styles.opBtn, { backgroundColor: Palette.primaryTint, borderColor: 'rgba(36, 92, 70, 0.3)' }]}
                  >
                    <Ionicons name="people" size={scaleSize(15)} color={Palette.primary} />
                    <Text style={[styles.opBtnText, { color: Palette.primary }]}>
                      Interested Buyers ({listing.activeOffersCount || 0})
                    </Text>
                  </TouchableOpacity>

                  {/* Edit Listing */}
                  <TouchableOpacity
                    onPress={() => openEditModal(listing)}
                    style={styles.opBtn}
                  >
                    <Ionicons name="create-outline" size={scaleSize(15)} color={Palette.charcoal} />
                    <Text style={[styles.opBtnText, { color: Palette.charcoal }]}>Edit</Text>
                  </TouchableOpacity>

                  {/* Mark Sold / Active Status */}
                  <TouchableOpacity
                    onPress={() =>
                      handleToggleStatus(listing, listing.status === 'sold' ? 'active' : 'sold')
                    }
                    style={styles.opBtn}
                  >
                    <Ionicons
                      name={listing.status === 'sold' ? 'refresh' : 'checkmark-done'}
                      size={scaleSize(15)}
                      color={listing.status === 'sold' ? Palette.secondary : Palette.primary}
                    />
                    <Text
                      style={[
                        styles.opBtnText,
                        { color: listing.status === 'sold' ? Palette.secondary : Palette.primary },
                      ]}
                    >
                      {listing.status === 'sold' ? 'Relist' : 'Mark Sold'}
                    </Text>
                  </TouchableOpacity>

                  {/* Delete Listing */}
                  <TouchableOpacity
                    onPress={() => handleDeleteListing(listing)}
                    style={[styles.opBtn, { borderColor: Palette.rescueBorder }]}
                  >
                    <Ionicons name="trash-outline" size={scaleSize(15)} color={Palette.rescueRed} />
                    <Text style={[styles.opBtnText, { color: Palette.rescueRed }]}>Delete</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))
          )}
        </ScrollView>
      )}

      {/* Floating Action Button (+ Add Produce) */}
      <TouchableOpacity
        activeOpacity={0.9}
        onPress={() => router.push('/(farmer)/add-crop')}
        style={[
          styles.fab,
          {
            width: scaleSize(56),
            height: scaleSize(56),
            borderRadius: scaleSize(28),
            bottom: scaleSize(22),
            right: scaleSize(20),
            ...Shadows.elevated,
          },
        ]}
      >
        <Ionicons name="add" size={scaleSize(30)} color="#FFFFFF" />
      </TouchableOpacity>

      {/* EDIT LISTING MODAL */}
      <Modal
        visible={editModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setEditModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View
            style={[
              styles.modalSheet,
              {
                padding: scaleSize(Spacing.lg),
                borderRadius: BorderRadius.xl,
                ...Shadows.elevated,
              },
            ]}
          >
            <View style={styles.modalHeader}>
              <View>
                <Text style={[styles.modalTitle, { fontSize: scaleFont(17) }]}>
                  Edit Listing: {selectedListing?.cropName}
                </Text>
                <Text style={[styles.modalSub, { fontSize: scaleFont(12) }]}>
                  Update quantity, expected price, and market status
                </Text>
              </View>
              <TouchableOpacity onPress={() => setEditModalVisible(false)}>
                <Ionicons name="close" size={scaleSize(24)} color={Palette.charcoal} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: scaleSize(340) }}>
              <Input
                label="EXPECTED ASKING PRICE (LKR / KG)"
                value={editPrice}
                onChangeText={setEditPrice}
                keyboardType="numeric"
                leftIcon="cash-outline"
              />

              <Input
                label="AVAILABLE QUANTITY (KG)"
                value={editQuantity}
                onChangeText={setEditQuantity}
                keyboardType="numeric"
                leftIcon="scale-outline"
              />

              {/* Status Selector */}
              <Text style={[styles.modalLabel, { fontSize: scaleFont(12) }]}>MARKETPLACE STATUS</Text>
              <View style={styles.statusRow}>
                {(['active', 'negotiating', 'sold'] as ListingStatus[]).map((st) => (
                  <TouchableOpacity
                    key={st}
                    onPress={() => setEditStatus(st)}
                    style={[
                      styles.statusChip,
                      editStatus === st && styles.statusChipActive,
                    ]}
                  >
                    <Text
                      style={[
                        styles.statusChipText,
                        editStatus === st && styles.statusChipTextActive,
                        { fontSize: scaleFont(12) },
                      ]}
                    >
                      {st.toUpperCase()}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Input
                label="HARVEST NOTES & PACKAGING"
                value={editDescription}
                onChangeText={setEditDescription}
                multiline
                numberOfLines={3}
                inputStyle={{ height: scaleSize(65), textAlignVertical: 'top' }}
              />
            </ScrollView>

            <View style={styles.modalActions}>
              <Button
                title="Cancel"
                variant="outline"
                onPress={() => setEditModalVisible(false)}
                style={{ flex: 1 }}
              />
              <Button
                title={editLoading ? 'Saving...' : 'Save Changes'}
                variant="primary"
                loading={editLoading}
                onPress={handleSaveEdits}
                style={{ flex: 1 }}
              />
            </View>
          </View>
        </View>
      </Modal>

      {/* INTERESTED BUYERS / OFFERS MODAL */}
      <Modal
        visible={offersModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setOffersModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View
            style={[
              styles.modalSheet,
              {
                padding: scaleSize(Spacing.lg),
                borderRadius: BorderRadius.xl,
                ...Shadows.elevated,
              },
            ]}
          >
            <View style={styles.modalHeader}>
              <View>
                <Text style={[styles.modalTitle, { fontSize: scaleFont(17) }]}>
                  Interested Buyers • {targetListingForOffers?.cropName}
                </Text>
                <Text style={[styles.modalSub, { fontSize: scaleFont(12) }]}>
                  Asking: Rs. {targetListingForOffers?.askingPricePerKg}/kg •{' '}
                  {targetListingForOffers?.quantityKg} kg
                </Text>
              </View>
              <TouchableOpacity onPress={() => setOffersModalVisible(false)}>
                <Ionicons name="close" size={scaleSize(24)} color={Palette.charcoal} />
              </TouchableOpacity>
            </View>

            {loadingOffers ? (
              <View style={{ padding: 30, alignItems: 'center' }}>
                <ActivityIndicator size="small" color={Palette.primary} />
                <Text style={{ marginTop: 8, color: Palette.slateMedium }}>
                  Checking offers in Cloud Firestore...
                </Text>
              </View>
            ) : currentOffers.length === 0 ? (
              <View style={{ paddingVertical: 24, alignItems: 'center' }}>
                <Ionicons name="chatbubbles-outline" size={scaleSize(36)} color={Palette.slateMedium} />
                <Text style={{ fontWeight: '700', color: Palette.charcoal, marginTop: 8 }}>
                  No Direct Buyer Offers Yet
                </Text>
                <Text style={{ color: Palette.slateMedium, textAlign: 'center', marginTop: 4 }}>
                  Buyers browsing {targetListingForOffers?.district} will submit offers shortly.
                </Text>
              </View>
            ) : (
              <ScrollView style={{ maxHeight: scaleSize(340) }} showsVerticalScrollIndicator={false}>
                {currentOffers.map((offer) => (
                  <View
                    key={offer.id}
                    style={[
                      styles.offerCard,
                      {
                        padding: scaleSize(12),
                        borderRadius: BorderRadius.md,
                        marginBottom: scaleSize(10),
                      },
                    ]}
                  >
                    <View style={styles.offerCardTop}>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.offerBuyerName, { fontSize: scaleFont(14) }]}>
                          {offer.buyerName} ({offer.buyerBusinessType})
                        </Text>
                        <TouchableOpacity
                          onPress={() => Linking.openURL(`tel:${offer.buyerPhone}`)}
                          style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 }}
                        >
                          <Ionicons name="call" size={12} color={Palette.primary} />
                          <Text style={[styles.offerPhone, { fontSize: scaleFont(11), color: Palette.primary, fontWeight: '700' }]}>
                            {offer.buyerPhone}
                          </Text>
                          <Text style={[styles.offerPhone, { fontSize: scaleFont(11) }]}>
                            • Pickup: {offer.proposedPickupDate}
                          </Text>
                        </TouchableOpacity>
                      </View>
                      <View style={[styles.statusBadge, { backgroundColor: Palette.primaryTint }]}>
                        <Text style={[styles.statusBadgeText, { fontSize: scaleFont(11) }]}>
                          {offer.status.toUpperCase()}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.offerDetailsBox}>
                      <Text style={[styles.offerDetailRow, { fontSize: scaleFont(12) }]}>
                        Offered: <Text style={{ fontWeight: '800', color: Palette.primary }}>Rs. {offer.offeredPricePerKg}/kg</Text> for{' '}
                        <Text style={{ fontWeight: '800' }}>{offer.requestedQuantityKg} kg</Text>
                      </Text>
                      <Text style={[styles.offerTotalText, { fontSize: scaleFont(12) }]}>
                        Total Deal Value: <Text style={{ fontWeight: '900', color: Palette.charcoal }}>Rs. {offer.totalAmount.toLocaleString()}</Text>
                      </Text>
                      {offer.notes && (
                        <Text style={[styles.offerNotes, { fontSize: scaleFont(11) }]}>
                          Note: &ldquo;{offer.notes}&rdquo;
                        </Text>
                      )}
                    </View>

                    {offer.status === 'pending' && (
                      <View style={styles.offerActionRow}>
                        <Button
                          title="Accept"
                          size="sm"
                          variant="primary"
                          icon="checkmark"
                          onPress={() => handleOfferResponse(offer.id, 'accepted')}
                          style={{ flex: 1 }}
                        />
                        <Button
                          title="Counter"
                          size="sm"
                          variant="outline"
                          icon="swap-horizontal"
                          onPress={() => handleCounterOffer(offer)}
                          style={{ flex: 1 }}
                        />
                        <Button
                          title="Reject"
                          size="sm"
                          variant="ghost"
                          onPress={() => handleOfferResponse(offer.id, 'rejected')}
                          style={{ flex: 1 }}
                        />
                      </View>
                    )}

                    {offer.status === 'accepted' && (
                      <View style={{ marginTop: 6, paddingTop: 6, borderTopWidth: 1, borderTopColor: Palette.subtleBorder }}>
                        <Button
                          title={`Call Buyer for Dispatch (${offer.buyerPhone})`}
                          size="sm"
                          variant="primary"
                          icon="call"
                          fullWidth
                          onPress={() => Linking.openURL(`tel:${offer.buyerPhone}`)}
                        />
                      </View>
                    )}
                  </View>
                ))}
              </ScrollView>
            )}

            <Button
              title="Close Offers Panel"
              variant="outline"
              fullWidth
              onPress={() => setOffersModalVisible(false)}
              style={{ marginTop: 12 }}
            />
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
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 30,
  },
  loadingText: {
    color: Palette.slateMedium,
    marginTop: 10,
    fontWeight: '600',
  },
  tabBar: {
    flexDirection: 'row',
    gap: 8,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: Palette.warmBorder,
  },
  tabBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Palette.surfaceAlt,
  },
  tabBtnActive: {
    backgroundColor: Palette.primary,
  },
  tabLabel: {
    color: Palette.slateMedium,
    fontWeight: '600',
  },
  tabLabelActive: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  operationsBar: {
    flexDirection: 'row',
    gap: 6,
    marginTop: -8,
  },
  opBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: Palette.warmBorder,
    paddingVertical: 7,
    borderRadius: BorderRadius.md,
  },
  opBtnText: {
    fontSize: 11,
    fontWeight: '700',
  },
  emptyBox: {
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    textAlign: 'center',
    marginTop: 30,
    borderWidth: 1,
    borderColor: Palette.warmBorder,
  },
  emptyTitle: {
    fontWeight: '800',
    color: Palette.charcoal,
    marginTop: 12,
  },
  emptySub: {
    color: Palette.slateMedium,
    textAlign: 'center',
    marginTop: 4,
    lineHeight: 18,
  },
  fab: {
    position: 'absolute',
    backgroundColor: Palette.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: '#FFFFFF',
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: Palette.warmBorder,
    paddingBottom: 10,
  },
  modalTitle: {
    fontWeight: '900',
    color: Palette.charcoal,
  },
  modalSub: {
    color: Palette.slateMedium,
    fontWeight: '600',
    marginTop: 2,
  },
  modalLabel: {
    fontWeight: '700',
    color: Palette.slateMedium,
    marginBottom: 6,
    letterSpacing: 0.5,
  },
  statusRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14,
  },
  statusChip: {
    flex: 1,
    backgroundColor: Palette.surfaceAlt,
    borderWidth: 1,
    borderColor: Palette.warmBorder,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: BorderRadius.md,
  },
  statusChipActive: {
    backgroundColor: Palette.primary,
    borderColor: Palette.primary,
  },
  statusChipText: {
    color: Palette.charcoal,
    fontWeight: '700',
  },
  statusChipTextActive: {
    color: '#FFFFFF',
  },
  modalActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 14,
  },
  offerCard: {
    backgroundColor: Palette.background,
    borderWidth: 1,
    borderColor: Palette.warmBorder,
  },
  offerCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  offerBuyerName: {
    fontWeight: '800',
    color: Palette.charcoal,
  },
  offerPhone: {
    color: Palette.slateMedium,
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: BorderRadius.full,
  },
  statusBadgeText: {
    color: Palette.primary,
    fontWeight: '800',
  },
  offerDetailsBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: BorderRadius.sm,
    padding: 8,
    marginTop: 8,
    borderWidth: 1,
    borderColor: Palette.warmBorder,
  },
  offerDetailRow: {
    color: Palette.charcoal,
  },
  offerTotalText: {
    color: Palette.slateMedium,
    marginTop: 2,
  },
  offerNotes: {
    color: Palette.charcoal,
    fontStyle: 'italic',
    marginTop: 4,
  },
  offerActionRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 10,
  },
});

export default MyCropListingsScreen;
