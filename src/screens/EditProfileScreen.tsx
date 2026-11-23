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
import { SRI_LANKA_DISTRICTS } from '../constants/sriLanka';
import { Button } from '../components/common/Button';
import { Input } from '../components/common/Input';
import { useResponsive } from '../hooks/useResponsive';
import { useAuth } from '../hooks/useAuth';
import { saveBuyerProfile, updateUserDoc, saveFarmerProfile } from '../services/firestoreService';

export const EditProfileScreen: React.FC = () => {
  const { scaleSize, scaleFont, contentPadding } = useResponsive();
  const { user, role } = useAuth();
  const [saving, setSaving] = useState(false);

  const [fullName, setFullName] = useState(user?.fullName || 'Dilan Perera');
  const [phone, setPhone] = useState(user?.phone || '+94 71 987 6543');
  const [email, setEmail] = useState(user?.email || 'dilan.freshmart@cropconnect.lk');
  const [farmName, setFarmName] = useState(user?.farmName || (role === 'buyer' ? 'Pettah Fresh Wholesale Hub' : 'Green Mountain Hill Farm'));
  const [acres, setAcres] = useState('4.5');
  const [selectedDistrict, setSelectedDistrict] = useState(user?.location.district || (role === 'buyer' ? 'Colombo' : 'Nuwara Eliya'));
  const [address, setAddress] = useState(user?.location.address || (role === 'buyer' ? 'Manning Wholesale Market, Pettah, Colombo 11' : 'Kandapola, Nuwara Eliya'));

  const handleSave = async () => {
    if (!fullName.trim()) {
      alert('Please enter your full name.');
      return;
    }
    if (!phone.trim()) {
      alert('Please enter your contact phone number.');
      return;
    }

    setSaving(true);
    try {
      const userId = user?.id || (role === 'buyer' ? 'buyer_001' : 'farmer_001');

      // Update user document
      await updateUserDoc(userId, {
        fullName: fullName.trim(),
        phone: phone.trim(),
        district: selectedDistrict,
      }, userId);

      if (role === 'buyer') {
        await saveBuyerProfile(userId, {
          businessName: farmName.trim(),
          contactPerson: fullName.trim(),
          phone: phone.trim(),
          email: email.trim(),
          address: address.trim(),
          district: selectedDistrict,
        }, userId);
        alert('Buyer business profile updated and synced with Cloud Firestore! ✅');
      } else {
        await saveFarmerProfile(userId, {
          fullName: fullName.trim(),
          phone: phone.trim(),
          email: email.trim(),
          farmName: farmName.trim(),
          landSizeAcres: parseFloat(acres) || 2.0,
          district: selectedDistrict,
          address: address.trim(),
        }, userId);
        alert('Farmer profile updated and synced with Cloud Firestore! 🌾');
      }

      router.back();
    } catch (err: any) {
      alert(`Update Failed: ${err?.message || 'Could not save profile to Cloud Firestore.'}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.screen}>
      {/* Header */}
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

        <Text style={[styles.title, { fontSize: scaleFont(17) }]}>Edit Profile</Text>

        <TouchableOpacity onPress={handleSave}>
          <Text style={[styles.saveText, { fontSize: scaleFont(14) }]}>Save</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingHorizontal: scaleSize(contentPadding),
          paddingVertical: scaleSize(Spacing.base),
          paddingBottom: scaleSize(90),
        }}
      >
        {/* Avatar Photo Edit */}
        <View style={styles.avatarEditContainer}>
          <View
            style={[
              styles.avatarCircle,
              {
                width: scaleSize(80),
                height: scaleSize(80),
                borderRadius: scaleSize(40),
              },
            ]}
          >
            <Ionicons name="person" size={scaleSize(40)} color={Palette.primary} />
            <TouchableOpacity style={styles.cameraBubble}>
              <Ionicons name="camera" size={scaleSize(14)} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
          <Text style={[styles.avatarHint, { fontSize: scaleFont(12) }]}>Change Profile Photo</Text>
        </View>

        <Input
          label="FULL NAME"
          value={fullName}
          onChangeText={setFullName}
          leftIcon="person-outline"
        />

        <Input
          label="PHONE NUMBER"
          value={phone}
          onChangeText={setPhone}
          keyboardType="phone-pad"
          leftIcon="call-outline"
        />

        <Input
          label="EMAIL ADDRESS"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          leftIcon="mail-outline"
        />

        {role === 'farmer' ? (
          <>
            <Input
              label="FARM / LAND NAME"
              value={farmName}
              onChangeText={setFarmName}
              leftIcon="leaf-outline"
            />
            <Input
              label="CULTIVATION LAND SIZE (ACRES)"
              value={acres}
              onChangeText={setAcres}
              keyboardType="numeric"
              leftIcon="expand-outline"
            />
          </>
        ) : (
          <Input
            label="COMPANY / TRADING NAME"
            value={farmName}
            onChangeText={setFarmName}
            leftIcon="business-outline"
          />
        )}

        {/* District Selector */}
        <Text style={[styles.fieldLabel, { fontSize: scaleFont(12) }]}>DISTRICT</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: scaleSize(6), marginBottom: scaleSize(14) }}
        >
          {SRI_LANKA_DISTRICTS.map((d) => {
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
          label="DETAILED FARM / BUSINESS ADDRESS"
          value={address}
          onChangeText={setAddress}
          leftIcon="location-outline"
        />

        <Button
          title={saving ? "Saving Changes..." : "Save Changes"}
          variant="primary"
          size="lg"
          icon="save-outline"
          fullWidth
          loading={saving}
          onPress={handleSave}
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
  saveText: {
    color: Palette.primary,
    fontWeight: '800',
  },
  avatarEditContainer: {
    alignItems: 'center',
    marginVertical: 14,
  },
  avatarCircle: {
    backgroundColor: Palette.primaryTint,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    borderWidth: 2,
    borderColor: Palette.primary,
  },
  cameraBubble: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: Palette.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  avatarHint: {
    color: Palette.primary,
    fontWeight: '700',
    marginTop: 8,
  },
  fieldLabel: {
    fontWeight: '700',
    color: Palette.slateMedium,
    letterSpacing: 0.5,
    marginBottom: 6,
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
});

export default EditProfileScreen;
