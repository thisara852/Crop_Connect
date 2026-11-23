import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Palette, Spacing, BorderRadius, Shadows } from '../constants/theme';
import { POPULAR_CROPS, SRI_LANKA_DISTRICTS, CROP_CATEGORIES } from '../constants/sriLanka';
import { Button } from '../components/common/Button';
import { Input } from '../components/common/Input';
import { useResponsive } from '../hooks/useResponsive';
import { useAuth } from '../hooks/useAuth';
import { CropQualityGrade } from '../types/ai';
import { CropCategory } from '../types/listing';
import { createCropListing } from '../services/firestoreService';

// Preset high quality images for Sri Lankan crops
const CROP_IMAGES: Record<string, string> = {
  rice: 'https://images.unsplash.com/photo-1586201375761-83865001e31c?w=600',
  carrot: 'https://images.unsplash.com/photo-1598170845058-32b9d6a5da37?w=600',
  cabbage: 'https://images.unsplash.com/photo-1550142414-ad2626ad1327?w=600',
  green_beans: 'https://images.unsplash.com/photo-1551248429-40975aa4de74?w=600',
  tomato: 'https://images.unsplash.com/photo-1592924357228-91a4daadcfea?w=600',
  big_onion: 'https://images.unsplash.com/photo-1618512496248-a07fe83aa8cb?w=600',
  red_onion: 'https://images.unsplash.com/photo-1618512496248-a07fe83aa8cb?w=600',
  potato: 'https://images.unsplash.com/photo-1518977676601-b53f82aba655?w=600',
  green_chilli: 'https://images.unsplash.com/photo-1588252303782-cb80119abd6d?w=600',
  brinjal: 'https://images.unsplash.com/photo-1615484477778-ca3b77940c25?w=600',
  banana: 'https://images.unsplash.com/photo-1571771894821-ce9b6c11b08e?w=600',
  leeks: 'https://images.unsplash.com/photo-1587049352846-4a222e784d38?w=600',
  pumpkin: 'https://images.unsplash.com/photo-1506869640319-fe1a24fd76dc?w=600',
  papaya: 'https://images.unsplash.com/photo-1517282009859-f000ec3b26fe?w=600',
  paddy_samba: 'https://images.unsplash.com/photo-1586201375761-83865001e31c?w=600',
};

export const AddCropListingScreen: React.FC = () => {
  const { scaleSize, scaleFont, contentPadding } = useResponsive();
  const { user } = useAuth();
  const searchParams = useLocalSearchParams<{
    cropName?: string;
    askingPrice?: string;
    quantity?: string;
    district?: string;
  }>();

  const initialCrop = searchParams.cropName
    ? POPULAR_CROPS.find(
        (c) =>
          c.name.toLowerCase().includes(searchParams.cropName?.toLowerCase() || '') ||
          (searchParams.cropName?.toLowerCase() || '').includes(c.name.toLowerCase())
      ) || POPULAR_CROPS[1]
    : POPULAR_CROPS[1];

  const [selectedCropInfo, setSelectedCropInfo] = useState(initialCrop);
  const [category, setCategory] = useState<CropCategory>(initialCrop.category);
  const [grade, setGrade] = useState<CropQualityGrade>('A');
  const [quantity, setQuantity] = useState(searchParams.quantity || '1000');
  const [minOrder, setMinOrder] = useState('100');
  const [askingPrice, setAskingPrice] = useState(
    searchParams.askingPrice || (initialCrop.benchmarkPriceLkrPerKg || 280).toString()
  );
  const [harvestDateOption, setHarvestDateOption] = useState<'today' | 'yesterday' | 'custom'>('today');
  const [customHarvestDate, setCustomHarvestDate] = useState(new Date().toISOString().split('T')[0]);
  const [district, setDistrict] = useState(
    searchParams.district || user?.location?.district || 'Nuwara Eliya'
  );
  const [farmAddress, setFarmAddress] = useState(
    user?.location?.address || `${user?.location?.district || 'Nuwara Eliya'} Agrarian Division`
  );
  const [isRescue, setIsRescue] = useState(false);
  const [hoursRemaining, setHoursRemaining] = useState('18');
  const [description, setDescription] = useState(
    'Freshly harvested Grade-A farm produce. Hand-graded, washed, and packed in ventilated crates for farmgate pickup.'
  );
  const [submitting, setSubmitting] = useState(false);

  // Compute AI suggestion dynamically
  const benchmarkPrice = selectedCropInfo.benchmarkPriceLkrPerKg || 250;
  const aiSuggestedFair = isRescue ? Math.round(benchmarkPrice * 0.72) : benchmarkPrice;

  const handleApplyAIFairPrice = () => {
    setAskingPrice(aiSuggestedFair.toString());
  };

  const handleSelectCrop = (crop: (typeof POPULAR_CROPS)[0]) => {
    setSelectedCropInfo(crop);
    setCategory(crop.category);
    setAskingPrice(crop.benchmarkPriceLkrPerKg.toString());
  };

  const getResolvedHarvestDate = () => {
    if (harvestDateOption === 'today') {
      return new Date().toISOString().split('T')[0];
    } else if (harvestDateOption === 'yesterday') {
      const d = new Date(Date.now() - 24 * 60 * 60 * 1000);
      return d.toISOString().split('T')[0];
    }
    return customHarvestDate;
  };

  const handleSubmit = async () => {
    const qty = parseFloat(quantity) || 0;
    const price = parseFloat(askingPrice) || 0;
    const minOrd = parseFloat(minOrder) || 100;

    // Strict Validations
    if (!selectedCropInfo?.name) {
      Alert.alert('Validation Error', 'Please select a crop from the catalog.');
      return;
    }
    if (qty <= 0) {
      Alert.alert('Validation Error', 'Available quantity must be greater than 0 kg.');
      return;
    }
    if (price <= 0) {
      Alert.alert('Validation Error', 'Expected price per kg must be greater than Rs. 0.');
      return;
    }
    if (minOrd > qty) {
      Alert.alert('Validation Error', 'Minimum order quantity cannot exceed total harvest quantity.');
      return;
    }
    if (!district) {
      Alert.alert('Validation Error', 'Please select your farm district.');
      return;
    }

    setSubmitting(true);
    try {
      const farmerId = user?.id || 'farmer_001';
      const farmerName = user?.fullName || 'Sunil Bandara';
      const farmerPhone = user?.phone || '+94 77 123 4567';
      const cropImageUrl =
        CROP_IMAGES[selectedCropInfo.id] ||
        'https://images.unsplash.com/photo-1598170845058-32b9d6a5da37?w=600';

      const harvestDate = getResolvedHarvestDate();
      const expiryDate = new Date(
        Date.now() + (isRescue ? 2 : selectedCropInfo.typicalShelfLifeDays) * 24 * 60 * 60 * 1000
      )
        .toISOString()
        .split('T')[0];

      // Save directly to Cloud Firestore `cropListings` collection
      await createCropListing(
        {
          farmerId,
          farmerName,
          farmerPhone,
          farmerRating: user?.rating || 4.9,
          cropId: `crop_${selectedCropInfo.id}`,
          cropName: selectedCropInfo.name,
          sinhalaName: selectedCropInfo.sinhalaName,
          tamilName: selectedCropInfo.tamilName,
          category,
          grade,
          quantityKg: qty,
          minOrderKg: minOrd,
          askingPricePerKg: price,
          originalPricePerKg: isRescue ? Math.round(price * 1.35) : price,
          isRescueCrop: isRescue,
          rescueDiscountPercentage: isRescue ? 28 : undefined,
          rescueReason: isRescue ? 'rapid_spoilage' : undefined,
          hoursRemaining: isRescue ? parseInt(hoursRemaining, 10) || 18 : undefined,
          harvestDate,
          expiryDate,
          district,
          address: farmAddress,
          latitude: user?.location?.latitude || 6.9497,
          longitude: user?.location?.longitude || 80.7891,
          images: [cropImageUrl],
          description,
          status: 'active',
        },
        farmerId
      );

      Alert.alert(
        'Listing Published Successfully! 🌾',
        `Your listing for ${qty.toLocaleString()} kg of ${selectedCropInfo.name} at Rs. ${price}/kg has been saved to Cloud Firestore. Wholesale buyers in ${district} are now alerted!`,
        [
          {
            text: 'View My Listings',
            onPress: () => router.replace('/(farmer)/my-crops'),
          },
        ]
      );
    } catch (err: any) {
      Alert.alert('Publishing Failed', err?.message || 'Error writing to Firestore database.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={styles.screen}>
      {/* Top Header */}
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
            styles.backBtn,
            {
              width: scaleSize(38),
              height: scaleSize(38),
              borderRadius: scaleSize(19),
            },
          ]}
        >
          <Ionicons name="arrow-back" size={scaleSize(20)} color={Palette.charcoal} />
        </TouchableOpacity>

        <Text style={[styles.title, { fontSize: scaleFont(17) }]}>Add New Crop Listing</Text>

        <View style={{ width: 38 }} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingHorizontal: scaleSize(contentPadding),
          paddingVertical: scaleSize(Spacing.base),
          paddingBottom: scaleSize(100),
        }}
      >
        {/* Optional Crop Photo Preview */}
        <View
          style={[
            styles.uploadContainer,
            {
              height: scaleSize(150),
              borderRadius: BorderRadius.lg,
              marginBottom: scaleSize(14),
              ...Shadows.soft,
            },
          ]}
        >
          <Image
            source={{
              uri:
                CROP_IMAGES[selectedCropInfo.id] ||
                'https://images.unsplash.com/photo-1598170845058-32b9d6a5da37?w=600',
            }}
            style={styles.uploadedImagePreview}
          />
          <View style={styles.uploadOverlay}>
            <Ionicons name="image" size={scaleSize(18)} color="#FFFFFF" />
            <Text style={[styles.uploadText, { fontSize: scaleFont(12) }]}>
              {selectedCropInfo.name} • {selectedCropInfo.sinhalaName}
            </Text>
          </View>
        </View>

        {/* 1. Crop Selection (Popular Sri Lankan Crops) */}
        <Text style={[styles.fieldLabel, { fontSize: scaleFont(12) }]}>
          SELECT COMMONLY GROWN SRI LANKAN CROP
        </Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: scaleSize(8), marginBottom: scaleSize(14) }}
        >
          {POPULAR_CROPS.map((crop) => {
            const active = selectedCropInfo.id === crop.id;
            return (
              <TouchableOpacity
                key={crop.id}
                onPress={() => handleSelectCrop(crop)}
                style={[
                  styles.cropChip,
                  active && styles.cropChipActive,
                  { paddingHorizontal: scaleSize(12), paddingVertical: scaleSize(8) },
                ]}
              >
                <Text
                  style={[
                    styles.cropChipTitle,
                    active && styles.cropChipTextActive,
                    { fontSize: scaleFont(12) },
                  ]}
                >
                  {crop.name}
                </Text>
                <Text
                  style={[
                    styles.cropChipSub,
                    active && { color: 'rgba(255, 255, 255, 0.85)' },
                    { fontSize: scaleFont(10) },
                  ]}
                >
                  {crop.sinhalaName}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* 2. Crop Category Selection */}
        <Text style={[styles.fieldLabel, { fontSize: scaleFont(12) }]}>CROP CATEGORY</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: scaleSize(8), marginBottom: scaleSize(14) }}
        >
          {CROP_CATEGORIES.filter((c) => c.id !== 'all').map((cat) => {
            const active = category === cat.id;
            return (
              <TouchableOpacity
                key={cat.id}
                onPress={() => setCategory(cat.id as CropCategory)}
                style={[
                  styles.categoryChip,
                  active && styles.categoryChipActive,
                  { paddingHorizontal: scaleSize(12), paddingVertical: scaleSize(6) },
                ]}
              >
                <Text
                  style={[
                    styles.categoryChipText,
                    active && styles.categoryChipTextActive,
                    { fontSize: scaleFont(12) },
                  ]}
                >
                  {cat.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* 3. Measurement Unit & Available Quantity */}
        <View style={styles.unitBadgeContainer}>
          <Ionicons name="scale" size={scaleSize(16)} color={Palette.primary} />
          <Text style={[styles.unitBadgeText, { fontSize: scaleFont(12) }]}>
            Standard Measurement Unit: <Text style={{ fontWeight: '800' }}>Kilograms (kg)</Text>
          </Text>
        </View>

        <View style={styles.twoCol}>
          <View style={{ flex: 1 }}>
            <Input
              label="AVAILABLE QUANTITY (KG)"
              value={quantity}
              onChangeText={setQuantity}
              keyboardType="numeric"
              leftIcon="scale-outline"
              helperText="Total available harvest in kg"
            />
          </View>

          <View style={{ flex: 1, marginLeft: scaleSize(10) }}>
            <Input
              label="MINIMUM ORDER (KG)"
              value={minOrder}
              onChangeText={setMinOrder}
              keyboardType="numeric"
              leftIcon="bag-outline"
              helperText="Smallest lot accepted"
            />
          </View>
        </View>

        {/* 4. Quality Grade */}
        <Text style={[styles.fieldLabel, { fontSize: scaleFont(12) }]}>QUALITY GRADE</Text>
        <View style={[styles.gradeRow, { marginBottom: scaleSize(14) }]}>
          {(['A', 'B', 'C'] as CropQualityGrade[]).map((g) => (
            <TouchableOpacity
              key={g}
              onPress={() => setGrade(g)}
              style={[
                styles.gradeBtn,
                grade === g && styles.gradeBtnActive,
                { paddingVertical: scaleSize(9) },
              ]}
            >
              <Text
                style={[
                  styles.gradeBtnText,
                  grade === g && styles.gradeBtnTextActive,
                  { fontSize: scaleFont(13) },
                ]}
              >
                Grade {g}
              </Text>
              <Text
                style={[
                  styles.gradeBtnSub,
                  grade === g && { color: 'rgba(255, 255, 255, 0.85)' },
                  { fontSize: scaleFont(10) },
                ]}
              >
                {g === 'A' ? 'Premium Spotless' : g === 'B' ? 'Standard Wholesale' : 'Processing Bulk'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* 5. Expected Price in LKR with AI Recommendation */}
        <View
          style={[
            styles.aiWidget,
            {
              padding: scaleSize(Spacing.md),
              borderRadius: BorderRadius.lg,
              marginBottom: scaleSize(12),
              ...Shadows.soft,
            },
          ]}
        >
          <View style={styles.aiWidgetTop}>
            <View style={styles.sparkleIcon}>
              <Ionicons name="sparkles" size={scaleSize(16)} color={Palette.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.aiWidgetTitle, { fontSize: scaleFont(13) }]}>
                AI Fair-Price Intelligence (LKR / kg)
              </Text>
              <Text style={[styles.aiWidgetPrice, { fontSize: scaleFont(18) }]}>
                Rs. {aiSuggestedFair} <Text style={{ fontSize: scaleFont(12) }}>/ kg</Text>
              </Text>
              <Text style={[styles.aiWidgetNote, { fontSize: scaleFont(11) }]}>
                Based on Dambulla Economic Centre baseline: Rs. {benchmarkPrice}/kg
              </Text>
              <TouchableOpacity
                onPress={() =>
                  router.push({
                    pathname: '/price-prediction',
                    params: {
                      cropName: selectedCropInfo.name,
                      district,
                      quantityKg: quantity,
                    },
                  })
                }
                style={{ marginTop: 6 }}
              >
                <Text style={{ fontSize: scaleFont(11), color: Palette.primary, fontWeight: '700' }}>
                  Run Deep ML Price Prediction Model ➔
                </Text>
              </TouchableOpacity>
            </View>
            <TouchableOpacity onPress={handleApplyAIFairPrice} style={styles.applyBtn}>
              <Text style={styles.applyBtnText}>Apply Fair Price</Text>
            </TouchableOpacity>
          </View>
        </View>

        <Input
          label="EXPECTED PRICE PER KG IN LKR (RS. / KG)"
          value={askingPrice}
          onChangeText={setAskingPrice}
          keyboardType="numeric"
          leftIcon="cash-outline"
          helperText="Expected unit selling price in Sri Lankan Rupees"
        />

        {/* 6. Harvest Date */}
        <Text style={[styles.fieldLabel, { fontSize: scaleFont(12) }]}>HARVEST DATE</Text>
        <View style={[styles.harvestDateRow, { marginBottom: scaleSize(12) }]}>
          <TouchableOpacity
            onPress={() => setHarvestDateOption('today')}
            style={[
              styles.dateOptionBtn,
              harvestDateOption === 'today' && styles.dateOptionBtnActive,
            ]}
          >
            <Text
              style={[
                styles.dateOptionText,
                harvestDateOption === 'today' && styles.dateOptionTextActive,
                { fontSize: scaleFont(12) },
              ]}
            >
              Harvested Today
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setHarvestDateOption('yesterday')}
            style={[
              styles.dateOptionBtn,
              harvestDateOption === 'yesterday' && styles.dateOptionBtnActive,
            ]}
          >
            <Text
              style={[
                styles.dateOptionText,
                harvestDateOption === 'yesterday' && styles.dateOptionTextActive,
                { fontSize: scaleFont(12) },
              ]}
            >
              Yesterday
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setHarvestDateOption('custom')}
            style={[
              styles.dateOptionBtn,
              harvestDateOption === 'custom' && styles.dateOptionBtnActive,
            ]}
          >
            <Text
              style={[
                styles.dateOptionText,
                harvestDateOption === 'custom' && styles.dateOptionTextActive,
                { fontSize: scaleFont(12) },
              ]}
            >
              Custom Date
            </Text>
          </TouchableOpacity>
        </View>

        {harvestDateOption === 'custom' && (
          <Input
            label="ENTER HARVEST DATE (YYYY-MM-DD)"
            value={customHarvestDate}
            onChangeText={setCustomHarvestDate}
            leftIcon="calendar-outline"
          />
        )}

        {/* 7. Location & District */}
        <Text style={[styles.fieldLabel, { fontSize: scaleFont(12) }]}>
          FARM LOCATION & DISTRICT (SRI LANKA)
        </Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: scaleSize(8), marginBottom: scaleSize(10) }}
        >
          {SRI_LANKA_DISTRICTS.map((dist) => {
            const active = district === dist.name;
            return (
              <TouchableOpacity
                key={dist.name}
                onPress={() => setDistrict(dist.name)}
                style={[
                  styles.districtChip,
                  active && styles.districtChipActive,
                  { paddingHorizontal: scaleSize(11), paddingVertical: scaleSize(6) },
                ]}
              >
                <Text
                  style={[
                    styles.districtChipText,
                    active && styles.districtChipTextActive,
                    { fontSize: scaleFont(12) },
                  ]}
                >
                  {dist.name}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        <Input
          label="FARM ADDRESS / PICKUP LOCATION"
          value={farmAddress}
          onChangeText={setFarmAddress}
          leftIcon="location-outline"
          helperText="Address for buyer transport lorries & pickup"
        />

        {/* 8. Emergency Crop Rescue Clearance Toggle */}
        <TouchableOpacity
          activeOpacity={0.88}
          onPress={() => setIsRescue(!isRescue)}
          style={[
            styles.rescueToggleBox,
            isRescue && styles.rescueToggleBoxActive,
            { padding: scaleSize(12), borderRadius: BorderRadius.md, marginBottom: scaleSize(12) },
          ]}
        >
          <View style={styles.rescueToggleLeft}>
            <Ionicons
              name={isRescue ? 'flash' : 'flash-outline'}
              size={scaleSize(22)}
              color={isRescue ? Palette.rescueRed : Palette.slateMedium}
            />
            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text
                style={[
                  styles.rescueToggleTitle,
                  { fontSize: scaleFont(13), color: isRescue ? Palette.rescueRed : Palette.charcoal },
                ]}
              >
                Emergency Crop Rescue Mode (Fast Clearance)
              </Text>
              <Text style={[styles.rescueToggleSub, { fontSize: scaleFont(11) }]}>
                Urgent harvest needing immediate buyer pickup. Notifies all 40+ wholesale buyers nearby.
              </Text>
            </View>
          </View>
          <Ionicons
            name={isRescue ? 'checkbox' : 'square-outline'}
            size={scaleSize(22)}
            color={isRescue ? Palette.rescueRed : Palette.slateMedium}
          />
        </TouchableOpacity>

        {isRescue && (
          <Input
            label="HOURS REMAINING UNTIL SHELF-LIFE EXPIRY"
            value={hoursRemaining}
            onChangeText={setHoursRemaining}
            keyboardType="numeric"
            leftIcon="time-outline"
            helperText="Countdown alert displayed to matching buyers"
          />
        )}

        {/* 9. Additional Harvest Description */}
        <Input
          label="ADDITIONAL DESCRIPTION & PACKAGING"
          value={description}
          onChangeText={setDescription}
          multiline
          numberOfLines={3}
          inputStyle={{ height: scaleSize(75), textAlignVertical: 'top' }}
          helperText="Packaging mode (crates, sacks, bags), organic certification, or transport accessibility"
        />

        {/* Submit Button */}
        <Button
          title={submitting ? 'Publishing to Cloud Firestore...' : 'Publish Crop Listing'}
          variant="primary"
          size="lg"
          icon="checkmark-done"
          fullWidth
          loading={submitting}
          onPress={handleSubmit}
          style={{ marginTop: scaleSize(Spacing.md) }}
        />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Palette.background,
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
  backBtn: {
    backgroundColor: Palette.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontWeight: '800',
    color: Palette.charcoal,
  },
  uploadContainer: {
    position: 'relative',
    overflow: 'hidden',
    backgroundColor: Palette.slateBorder,
  },
  uploadedImagePreview: {
    width: '100%',
    height: '100%',
  },
  uploadOverlay: {
    position: 'absolute',
    bottom: 10,
    left: 10,
    backgroundColor: 'rgba(36, 92, 70, 0.88)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: BorderRadius.full,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  uploadText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  fieldLabel: {
    fontWeight: '700',
    color: Palette.slateMedium,
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  cropChip: {
    backgroundColor: '#FFFFFF',
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Palette.warmBorder,
  },
  cropChipActive: {
    backgroundColor: Palette.primary,
    borderColor: Palette.primary,
  },
  cropChipTitle: {
    color: Palette.charcoal,
    fontWeight: '700',
  },
  cropChipSub: {
    color: Palette.slateMedium,
    marginTop: 2,
    fontWeight: '600',
  },
  cropChipTextActive: {
    color: '#FFFFFF',
  },
  categoryChip: {
    backgroundColor: '#FFFFFF',
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    borderColor: Palette.warmBorder,
  },
  categoryChipActive: {
    backgroundColor: Palette.secondary,
    borderColor: Palette.secondary,
  },
  categoryChipText: {
    color: Palette.charcoal,
    fontWeight: '600',
  },
  categoryChipTextActive: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  unitBadgeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Palette.primaryTint,
    borderWidth: 1,
    borderColor: 'rgba(36, 92, 70, 0.25)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: BorderRadius.md,
    marginBottom: 12,
  },
  unitBadgeText: {
    color: Palette.primary,
    fontWeight: '600',
  },
  twoCol: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  gradeRow: {
    flexDirection: 'row',
    gap: 8,
  },
  gradeBtn: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: Palette.warmBorder,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
  },
  gradeBtnActive: {
    backgroundColor: Palette.primary,
    borderColor: Palette.primary,
  },
  gradeBtnText: {
    fontWeight: '800',
    color: Palette.charcoal,
  },
  gradeBtnSub: {
    color: Palette.slateMedium,
    marginTop: 2,
    fontWeight: '500',
  },
  gradeBtnTextActive: {
    color: '#FFFFFF',
  },
  aiWidget: {
    backgroundColor: Palette.primaryTint,
    borderWidth: 1,
    borderColor: 'rgba(36, 92, 70, 0.25)',
  },
  aiWidgetTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  sparkleIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  aiWidgetTitle: {
    fontWeight: '800',
    color: Palette.primary,
  },
  aiWidgetPrice: {
    fontWeight: '900',
    color: Palette.charcoal,
    marginTop: 2,
  },
  aiWidgetNote: {
    color: Palette.slateMedium,
    marginTop: 2,
  },
  applyBtn: {
    backgroundColor: Palette.primary,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: BorderRadius.md,
  },
  applyBtnText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 11,
  },
  harvestDateRow: {
    flexDirection: 'row',
    gap: 8,
  },
  dateOptionBtn: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: Palette.warmBorder,
    borderRadius: BorderRadius.md,
    paddingVertical: 8,
    alignItems: 'center',
  },
  dateOptionBtnActive: {
    backgroundColor: Palette.primary,
    borderColor: Palette.primary,
  },
  dateOptionText: {
    color: Palette.charcoal,
    fontWeight: '600',
  },
  dateOptionTextActive: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  districtChip: {
    backgroundColor: '#FFFFFF',
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    borderColor: Palette.warmBorder,
  },
  districtChipActive: {
    backgroundColor: Palette.primary,
    borderColor: Palette.primary,
  },
  districtChipText: {
    color: Palette.charcoal,
    fontWeight: '600',
  },
  districtChipTextActive: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  rescueToggleBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: Palette.warmBorder,
  },
  rescueToggleBoxActive: {
    backgroundColor: Palette.rescueLight,
    borderColor: Palette.rescueBorder,
  },
  rescueToggleLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  rescueToggleTitle: {
    fontWeight: '800',
  },
  rescueToggleSub: {
    color: Palette.slateMedium,
    marginTop: 2,
    lineHeight: 15,
  },
});
