/**
 * Location and distance utilities for Sri Lankan districts & farm coordinates
 * Integrates with Expo Location for GPS retrieval and provides district centroid fallbacks.
 */
import * as Location from 'expo-location';

export interface DistrictGeoPoint {
  district: string;
  province: string;
  latitude: number;
  longitude: number;
}

export interface FarmerLocation {
  latitude: number;
  longitude: number;
  district: string;
  province?: string;
  address?: string;
  isManualFallback: boolean;
  permissionGranted: boolean;
}

/**
 * Centroid coordinates for all 25 Sri Lankan administrative districts
 */
export const SRI_LANKA_DISTRICT_COORDINATES: Record<string, DistrictGeoPoint> = {
  'Nuwara Eliya': { district: 'Nuwara Eliya', province: 'Central', latitude: 6.9497, longitude: 80.7891 },
  'Kandy': { district: 'Kandy', province: 'Central', latitude: 7.2906, longitude: 80.6337 },
  'Matale': { district: 'Matale', province: 'Central', latitude: 7.4675, longitude: 80.6234 },
  'Badulla': { district: 'Badulla', province: 'Uva', latitude: 6.9934, longitude: 81.0550 },
  'Monaragala': { district: 'Monaragala', province: 'Uva', latitude: 6.8728, longitude: 81.3507 },
  'Colombo': { district: 'Colombo', province: 'Western', latitude: 6.9271, longitude: 79.8612 },
  'Gampaha': { district: 'Gampaha', province: 'Western', latitude: 7.0840, longitude: 79.9943 },
  'Kalutara': { district: 'Kalutara', province: 'Western', latitude: 6.5854, longitude: 79.9607 },
  'Kurunegala': { district: 'Kurunegala', province: 'North Western', latitude: 7.4863, longitude: 80.3623 },
  'Puttalam': { district: 'Puttalam', province: 'North Western', latitude: 8.0362, longitude: 79.8283 },
  'Anuradhapura': { district: 'Anuradhapura', province: 'North Central', latitude: 8.3114, longitude: 80.4037 },
  'Polonnaruwa': { district: 'Polonnaruwa', province: 'North Central', latitude: 7.9403, longitude: 81.0188 },
  'Jaffna': { district: 'Jaffna', province: 'Northern', latitude: 9.6615, longitude: 80.0255 },
  'Kilinochchi': { district: 'Kilinochchi', province: 'Northern', latitude: 9.3803, longitude: 80.3770 },
  'Mannar': { district: 'Mannar', province: 'Northern', latitude: 8.9810, longitude: 79.9044 },
  'Vavuniya': { district: 'Vavuniya', province: 'Northern', latitude: 8.7542, longitude: 80.4982 },
  'Mullaitivu': { district: 'Mullaitivu', province: 'Northern', latitude: 9.2671, longitude: 80.8142 },
  'Batticaloa': { district: 'Batticaloa', province: 'Eastern', latitude: 7.7310, longitude: 81.6747 },
  'Ampara': { district: 'Ampara', province: 'Eastern', latitude: 7.2912, longitude: 81.6724 },
  'Trincomalee': { district: 'Trincomalee', province: 'Eastern', latitude: 8.5874, longitude: 81.2152 },
  'Ratnapura': { district: 'Ratnapura', province: 'Sabaragamuwa', latitude: 6.6828, longitude: 80.3992 },
  'Kegalle': { district: 'Kegalle', province: 'Sabaragamuwa', latitude: 7.2513, longitude: 80.3464 },
  'Galle': { district: 'Galle', province: 'Southern', latitude: 6.0535, longitude: 80.2210 },
  'Matara': { district: 'Matara', province: 'Southern', latitude: 5.9549, longitude: 80.5550 },
  'Hambantota': { district: 'Hambantota', province: 'Southern', latitude: 6.1248, longitude: 81.1185 },
};

export const SRI_LANKA_DISTRICT_LIST: string[] = Object.keys(SRI_LANKA_DISTRICT_COORDINATES);

export function calculateDistanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Radius of the earth in km
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(deg2rad(lat1)) *
      Math.cos(deg2rad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const d = R * c; // Distance in km
  return Math.round(d * 10) / 10;
}

function deg2rad(deg: number): number {
  return deg * (Math.PI / 180);
}

export function formatDistance(distanceKm?: number): string {
  if (distanceKm === undefined || distanceKm === null) return 'Distance unknown';
  if (distanceKm < 1) return `${Math.round(distanceKm * 1000)} m away`;
  return `${distanceKm.toFixed(1)} km away`;
}

/**
 * Finds the closest Sri Lankan district to a given latitude and longitude.
 */
export function findClosestDistrict(lat: number, lon: number): DistrictGeoPoint {
  let closest: DistrictGeoPoint = SRI_LANKA_DISTRICT_COORDINATES['Nuwara Eliya'];
  let minDistance = Infinity;

  for (const key of SRI_LANKA_DISTRICT_LIST) {
    const pt = SRI_LANKA_DISTRICT_COORDINATES[key];
    const dist = calculateDistanceKm(lat, lon, pt.latitude, pt.longitude);
    if (dist < minDistance) {
      minDistance = dist;
      closest = pt;
    }
  }

  return closest;
}

/**
 * Request location permission using Expo Location
 */
export async function requestFarmerLocationPermission(): Promise<boolean> {
  try {
    const { status } = await Location.requestForegroundPermissionsAsync();
    return status === 'granted';
  } catch (err) {
    console.warn('Location permission request failed:', err);
    return false;
  }
}

/**
 * Check existing location permission status without prompting
 */
export async function checkFarmerLocationPermission(): Promise<boolean> {
  try {
    const { status } = await Location.getForegroundPermissionsAsync();
    return status === 'granted';
  } catch {
    return false;
  }
}

/**
 * Retrieve farmer's GPS coordinates using Expo Location.
 * If permission is denied or retrieval fails, falls back safely to the specified manual district.
 */
export async function getFarmerCurrentLocation(
  fallbackDistrict: string = 'Nuwara Eliya'
): Promise<FarmerLocation> {
  try {
    const hasPermission = await checkFarmerLocationPermission();
    if (!hasPermission) {
      const requested = await requestFarmerLocationPermission();
      if (!requested) {
        return getFallbackFarmerLocation(fallbackDistrict, false);
      }
    }

    const loc = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    });

    const lat = loc.coords.latitude;
    const lon = loc.coords.longitude;
    const closest = findClosestDistrict(lat, lon);

    let resolvedAddress: string | undefined;
    try {
      const [geo] = await Location.reverseGeocodeAsync({ latitude: lat, longitude: lon });
      if (geo) {
        resolvedAddress = [geo.street, geo.district || geo.city, geo.region]
          .filter(Boolean)
          .join(', ');
      }
    } catch {
      // Reverse geocode is best effort
    }

    return {
      latitude: lat,
      longitude: lon,
      district: closest.district,
      province: closest.province,
      address: resolvedAddress || `${closest.district}, Sri Lanka`,
      isManualFallback: false,
      permissionGranted: true,
    };
  } catch (err) {
    console.warn('Failed to retrieve current GPS location, using fallback district:', err);
    return getFallbackFarmerLocation(fallbackDistrict, false);
  }
}

/**
 * Creates a FarmerLocation instance using district centroid fallback.
 */
export function getFallbackFarmerLocation(
  districtName: string = 'Nuwara Eliya',
  permissionGranted: boolean = false
): FarmerLocation {
  const geo = SRI_LANKA_DISTRICT_COORDINATES[districtName] || SRI_LANKA_DISTRICT_COORDINATES['Nuwara Eliya'];
  return {
    latitude: geo.latitude,
    longitude: geo.longitude,
    district: geo.district,
    province: geo.province,
    address: `${geo.district} Agrarian Zone, Sri Lanka`,
    isManualFallback: true,
    permissionGranted,
  };
}
