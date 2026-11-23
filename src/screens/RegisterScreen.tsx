import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Palette, Spacing, BorderRadius } from '../constants/theme';
import { SRI_LANKA_DISTRICTS, POPULAR_CROPS } from '../constants/sriLanka';
import { isValidSriLankanPhone, formatSriLankanPhone } from '../utils/sriLankaUtils';
import { Button } from '../components/common/Button';
import { Input } from '../components/common/Input';
import { useResponsive } from '../hooks/useResponsive';
import { useAuth } from '../hooks/useAuth';
import { UserRole } from '../types/user';

export const RegisterScreen: React.FC = () => {
  const { scaleSize, scaleFont, contentPadding } = useResponsive();
  const { register, loading, error, clearError } = useAuth();

  const [role, setRole] = useState<UserRole>('farmer');
  const [fullName, setFullName] = useState('Anura Kumara Wickramasinghe');
  const [email, setEmail] = useState('anura.k@cropconnect.lk');
  const [phone, setPhone] = useState('+94 77 444 8899');
  const [selectedDistrict, setSelectedDistrict] = useState(SRI_LANKA_DISTRICTS[0].name);
  const [entityName, setEntityName] = useState('Kotmale Terraced Farm');
  const [businessAddress, setBusinessAddress] = useState('Manning Wholesale Market, Pettah, Colombo 11');
  const [buyerBusinessType, setBuyerBusinessType] = useState<'wholesaler' | 'supermarket' | 'restaurant' | 'retailer' | 'exporter' | 'processor'>('wholesaler');
  const [preferredCrops, setPreferredCrops] = useState<string[]>(['Carrot', 'Tomato', 'Green Beans (Bonchi)']);
  const [minOrderKg, setMinOrderKg] = useState('150');
  const [maxOrderKg, setMaxOrderKg] = useState('3500');
  const [preferredDistricts, setPreferredDistricts] = useState<string[]>(['Nuwara Eliya', 'Matale', 'Badulla']);
  const [password, setPassword] = useState('LankaCrop#2026');
  const [confirmPassword, setConfirmPassword] = useState('LankaCrop#2026');
  const [localError, setLocalError] = useState<string | null>(null);

  const togglePreferredCrop = (crop: string) => {
    if (preferredCrops.includes(crop)) {
      setPreferredCrops(preferredCrops.filter((c) => c !== crop));
    } else {
      setPreferredCrops([...preferredCrops, crop]);
    }
  };

  const togglePreferredDistrict = (district: string) => {
    if (preferredDistricts.includes(district)) {
      setPreferredDistricts(preferredDistricts.filter((d) => d !== district));
    } else {
      setPreferredDistricts([...preferredDistricts, district]);
    }
  };

  const handleRegister = async () => {
    setLocalError(null);
    clearError();

    // Validation
    if (!fullName.trim() || fullName.trim().length < 3) {
      setLocalError('Please enter your full name (minimum 3 characters).');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email.trim() || !emailRegex.test(email.trim())) {
      setLocalError('Please enter a valid email address.');
      return;
    }

    if (!isValidSriLankanPhone(phone)) {
      setLocalError('Please enter a valid Sri Lankan mobile number (e.g. 077 123 4567 or +94 77 123 4567).');
      return;
    }
    const formattedPhone = formatSriLankanPhone(phone);

    if (role === 'buyer') {
      if (!entityName.trim()) {
        setLocalError('Please enter your registered Business / Company Name.');
        return;
      }
      if (!businessAddress.trim()) {
        setLocalError('Please enter your Business Address.');
        return;
      }
      if (preferredCrops.length === 0) {
        setLocalError('Please select at least one preferred crop type.');
        return;
      }
      const minKg = parseFloat(minOrderKg) || 0;
      const maxKg = parseFloat(maxOrderKg) || 0;
      if (minKg <= 0 || maxKg <= 0 || maxKg < minKg) {
        setLocalError('Max order quantity must be greater than or equal to minimum order quantity.');
        return;
      }
    }

    if (!password || password.length < 6) {
      setLocalError('Password must be at least 6 characters.');
      return;
    }

    if (password !== confirmPassword) {
      setLocalError('Passwords do not match. Please re-enter.');
      return;
    }

    try {
      const profile = await register({
        fullName: fullName.trim(),
        email: email.trim().toLowerCase(),
        phone: formattedPhone,
        password,
        role: role === 'buyer' ? 'buyer' : 'farmer', // strictly sanitize
        district: selectedDistrict,
        farmOrBusinessName: entityName.trim(),
        businessAddress: role === 'buyer' ? businessAddress.trim() : undefined,
        buyerBusinessType: role === 'buyer' ? buyerBusinessType : undefined,
        preferredCrops: role === 'buyer' ? preferredCrops : undefined,
        minOrderKg: role === 'buyer' ? (parseFloat(minOrderKg) || 100) : undefined,
        maxOrderKg: role === 'buyer' ? (parseFloat(maxOrderKg) || 2500) : undefined,
        preferredDistricts: role === 'buyer' ? preferredDistricts : undefined,
      });

      // Role-based redirection
      if (profile.role === 'buyer') {
        router.replace('/(buyer)');
      } else {
        router.replace('/(farmer)');
      }
    } catch (err: any) {
      setLocalError(err?.message || 'Registration failed. Please try again.');
    }
  };

  const displayError = localError || error;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{
        flexGrow: 1,
        paddingHorizontal: scaleSize(contentPadding),
        paddingVertical: scaleSize(Spacing.lg),
        justifyContent: 'space-between',
      }}
      showsVerticalScrollIndicator={false}
    >
      <View>
        {/* Back Button */}
        <View style={styles.topBar}>
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
        </View>

        <View style={styles.titleSection}>
          <Text style={[styles.mainTitle, { fontSize: scaleFont(26) }]}>Create Account</Text>
          <Text style={[styles.subTitle, { fontSize: scaleFont(14) }]}>
            Join the Sri Lankan zero-waste agricultural trade network.
          </Text>
        </View>

        {/* Error Banner */}
        {displayError && (
          <View
            style={[
              styles.errorBanner,
              {
                padding: scaleSize(10),
                borderRadius: BorderRadius.md,
                marginBottom: scaleSize(12),
              },
            ]}
          >
            <Ionicons name="alert-circle" size={scaleSize(18)} color={Palette.rescueRed} />
            <Text style={[styles.errorBannerText, { fontSize: scaleFont(12) }]}>
              {displayError}
            </Text>
          </View>
        )}

        {/* Role Toggle Selector */}
        <Text style={[styles.fieldLabel, { fontSize: scaleFont(12) }]}>I AM JOINING AS A:</Text>
        <View style={styles.roleChoiceRow}>
          <TouchableOpacity
            onPress={() => {
              setRole('farmer');
              setEntityName('Kotmale Terraced Farm');
            }}
            style={[
              styles.roleChoiceCard,
              role === 'farmer' && styles.roleChoiceCardActive,
              { padding: scaleSize(12), borderRadius: BorderRadius.md },
            ]}
          >
            <Ionicons
              name="leaf"
              size={scaleSize(22)}
              color={role === 'farmer' ? Palette.primary : Palette.slateMedium}
            />
            <Text
              style={[
                styles.roleChoiceTitle,
                role === 'farmer' && styles.roleChoiceTitleActive,
                { fontSize: scaleFont(13) },
              ]}
            >
              Farmer (ගොවි)
            </Text>
            <Text style={[styles.roleChoiceDesc, { fontSize: scaleFont(11) }]}>
              Sell crops at fair AI prices
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => {
              setRole('buyer');
              setEntityName('Colombo Central Food Supplies');
            }}
            style={[
              styles.roleChoiceCard,
              role === 'buyer' && styles.roleChoiceCardActive,
              { padding: scaleSize(12), borderRadius: BorderRadius.md },
            ]}
          >
            <Ionicons
              name="cart"
              size={scaleSize(22)}
              color={role === 'buyer' ? Palette.primary : Palette.slateMedium}
            />
            <Text
              style={[
                styles.roleChoiceTitle,
                role === 'buyer' && styles.roleChoiceTitleActive,
                { fontSize: scaleFont(13) },
              ]}
            >
              Buyer (ගැනුම්කරු)
            </Text>
            <Text style={[styles.roleChoiceDesc, { fontSize: scaleFont(11) }]}>
              Wholesaler, retail, hotel
            </Text>
          </TouchableOpacity>
        </View>

        {/* Input Fields */}
        <Input
          label="FULL NAME"
          value={fullName}
          onChangeText={(val) => {
            setFullName(val);
            setLocalError(null);
          }}
          leftIcon="person-outline"
        />

        <Input
          label="EMAIL ADDRESS"
          value={email}
          onChangeText={(val) => {
            setEmail(val);
            setLocalError(null);
          }}
          keyboardType="email-address"
          autoCapitalize="none"
          leftIcon="mail-outline"
        />

        <Input
          label="MOBILE NUMBER"
          value={phone}
          onChangeText={(val) => {
            setPhone(val);
            setLocalError(null);
          }}
          keyboardType="phone-pad"
          leftIcon="call-outline"
        />

        <Input
          label={role === 'farmer' ? 'FARM OR LAND NAME' : 'BUSINESS / COMPANY NAME'}
          value={entityName}
          onChangeText={(val) => {
            setEntityName(val);
            setLocalError(null);
          }}
          leftIcon="business-outline"
        />

        {role === 'buyer' && (
          <>
            {/* Business Address */}
            <Input
              label="BUSINESS ADDRESS"
              value={businessAddress}
              onChangeText={(val) => {
                setBusinessAddress(val);
                setLocalError(null);
              }}
              leftIcon="location-outline"
            />

            {/* Business Type */}
            <Text style={[styles.fieldLabel, { fontSize: scaleFont(12) }]}>BUSINESS / OPERATION TYPE</Text>
            <View style={styles.businessTypeRow}>
              {(['wholesaler', 'supermarket', 'restaurant', 'retailer', 'exporter'] as const).map((bt) => {
                const active = buyerBusinessType === bt;
                return (
                  <TouchableOpacity
                    key={bt}
                    onPress={() => setBuyerBusinessType(bt)}
                    style={[
                      styles.typeChip,
                      active && styles.typeChipActive,
                      { paddingHorizontal: scaleSize(10), paddingVertical: scaleSize(6) },
                    ]}
                  >
                    <Text
                      style={[
                        styles.typeChipText,
                        active && styles.typeChipTextActive,
                        { fontSize: scaleFont(11) },
                      ]}
                    >
                      {bt.toUpperCase()}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Preferred Crop Types */}
            <Text style={[styles.fieldLabel, { fontSize: scaleFont(12), marginTop: 8 }]}>
              PREFERRED CROP TYPES
            </Text>
            <View style={styles.cropPickWrap}>
              {POPULAR_CROPS.map((crop) => {
                const isSelected = preferredCrops.includes(crop.name);
                return (
                  <TouchableOpacity
                    key={crop.id}
                    onPress={() => togglePreferredCrop(crop.name)}
                    style={[
                      styles.cropPickChip,
                      isSelected && styles.cropPickChipActive,
                      { paddingHorizontal: scaleSize(9), paddingVertical: scaleSize(5) },
                    ]}
                  >
                    <Ionicons
                      name={isSelected ? 'checkmark-circle' : 'add-circle-outline'}
                      size={scaleSize(13)}
                      color={isSelected ? '#FFFFFF' : Palette.charcoal}
                    />
                    <Text
                      style={[
                        styles.cropPickText,
                        isSelected && styles.cropPickTextActive,
                        { fontSize: scaleFont(11) },
                      ]}
                    >
                      {crop.name}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Required Quantities (Min & Max kg) */}
            <View style={styles.qtyRow}>
              <View style={{ flex: 1 }}>
                <Input
                  label="MIN ORDER (KG)"
                  value={minOrderKg}
                  onChangeText={(val) => {
                    setMinOrderKg(val);
                    setLocalError(null);
                  }}
                  keyboardType="numeric"
                  leftIcon="scale-outline"
                />
              </View>
              <View style={{ width: scaleSize(10) }} />
              <View style={{ flex: 1 }}>
                <Input
                  label="MAX CAPACITY (KG)"
                  value={maxOrderKg}
                  onChangeText={(val) => {
                    setMaxOrderKg(val);
                    setLocalError(null);
                  }}
                  keyboardType="numeric"
                  leftIcon="cube-outline"
                />
              </View>
            </View>

            {/* Preferred Purchasing Locations */}
            <Text style={[styles.fieldLabel, { fontSize: scaleFont(12) }]}>
              PREFERRED PURCHASING LOCATIONS
            </Text>
            <View style={styles.cropPickWrap}>
              {['Nuwara Eliya', 'Matale', 'Badulla', 'Kandy', 'Jaffna', 'Anuradhapura', 'Colombo', 'Kurunegala'].map((district) => {
                const isSelected = preferredDistricts.includes(district);
                return (
                  <TouchableOpacity
                    key={district}
                    onPress={() => togglePreferredDistrict(district)}
                    style={[
                      styles.cropPickChip,
                      isSelected && styles.cropPickChipActive,
                      { paddingHorizontal: scaleSize(9), paddingVertical: scaleSize(5) },
                    ]}
                  >
                    <Ionicons
                      name={isSelected ? 'checkmark-circle' : 'location-outline'}
                      size={scaleSize(12)}
                      color={isSelected ? '#FFFFFF' : Palette.charcoal}
                    />
                    <Text
                      style={[
                        styles.cropPickText,
                        isSelected && styles.cropPickTextActive,
                        { fontSize: scaleFont(11) },
                      ]}
                    >
                      {district}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </>
        )}

        {/* District Selector Chips */}
        <Text style={[styles.fieldLabel, { fontSize: scaleFont(12), marginTop: 6 }]}>
          {role === 'buyer' ? 'BUSINESS LOCATION / DISTRICT' : 'PRIMARY DISTRICT'}
        </Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: scaleSize(6), marginBottom: scaleSize(14) }}
        >
          {SRI_LANKA_DISTRICTS.slice(0, 10).map((d) => {
            const active = selectedDistrict === d.name;
            return (
              <TouchableOpacity
                key={d.name}
                onPress={() => setSelectedDistrict(d.name)}
                style={[
                  styles.districtChip,
                  active && styles.districtChipActive,
                  { paddingHorizontal: scaleSize(12), paddingVertical: scaleSize(6) },
                ]}
              >
                <Text
                  style={[
                    styles.districtChipText,
                    active && styles.districtChipTextActive,
                    { fontSize: scaleFont(12) },
                  ]}
                >
                  {d.name}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        <Input
          label="PASSWORD (MIN 6 CHARACTERS)"
          value={password}
          onChangeText={(val) => {
            setPassword(val);
            setLocalError(null);
          }}
          secureTextEntry
          leftIcon="lock-closed-outline"
        />

        <Input
          label="CONFIRM PASSWORD"
          value={confirmPassword}
          onChangeText={(val) => {
            setConfirmPassword(val);
            setLocalError(null);
          }}
          secureTextEntry
          leftIcon="lock-closed-outline"
        />

        <Button
          title={`Register as ${role === 'farmer' ? 'Farmer' : 'Buyer'}`}
          onPress={handleRegister}
          variant="primary"
          size="lg"
          loading={loading}
          icon="checkmark-circle-outline"
          fullWidth
          style={{ marginTop: scaleSize(Spacing.md) }}
        />
      </View>

      {/* Footer */}
      <View style={styles.footerRow}>
        <Text style={[styles.footerText, { fontSize: scaleFont(13) }]}>
          Already registered?
        </Text>
        <TouchableOpacity onPress={() => router.push('/login')}>
          <Text style={[styles.loginLink, { fontSize: scaleFont(13) }]}>Sign In</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Palette.background,
  },
  topBar: {
    marginBottom: 10,
  },
  backBtn: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: Palette.warmBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleSection: {
    marginBottom: 12,
  },
  mainTitle: {
    fontWeight: '900',
    color: Palette.charcoal,
    letterSpacing: -0.5,
  },
  subTitle: {
    color: Palette.slateMedium,
    marginTop: 4,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Palette.rescueLight,
    borderWidth: 1,
    borderColor: Palette.rescueBorder,
  },
  errorBannerText: {
    color: Palette.rescueRed,
    fontWeight: '600',
    flex: 1,
  },
  fieldLabel: {
    fontWeight: '700',
    color: Palette.slateMedium,
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  roleChoiceRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 14,
  },
  roleChoiceCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: Palette.warmBorder,
  },
  roleChoiceCardActive: {
    borderColor: Palette.primary,
    backgroundColor: Palette.primaryTint,
  },
  roleChoiceTitle: {
    fontWeight: '800',
    color: Palette.charcoal,
    marginTop: 6,
  },
  roleChoiceTitleActive: {
    color: Palette.primary,
  },
  roleChoiceDesc: {
    color: Palette.slateMedium,
    marginTop: 2,
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
    fontWeight: '500',
  },
  districtChipTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 14,
  },
  footerText: {
    color: Palette.slateMedium,
  },
  loginLink: {
    color: Palette.primary,
    fontWeight: '800',
  },
  businessTypeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 10,
  },
  typeChip: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: Palette.warmBorder,
    borderRadius: BorderRadius.full,
  },
  typeChipActive: {
    backgroundColor: Palette.primary,
    borderColor: Palette.primary,
  },
  typeChipText: {
    fontSize: 10,
    fontWeight: '700',
    color: Palette.charcoal,
  },
  typeChipTextActive: {
    color: '#FFFFFF',
  },
  cropPickWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 10,
  },
  cropPickChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: Palette.warmBorder,
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
  qtyRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});

export default RegisterScreen;
