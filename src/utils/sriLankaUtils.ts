/**
 * sriLankaUtils.ts
 *
 * Sri Lanka localization, formatting, and validation utilities:
 * 1. +94 phone number validation and normalization.
 * 2. LKR currency formatting (Rs. X,XXX or Rs. X,XXX.XX).
 * 3. Default metric measurement (kg, tons, grams).
 * 4. Date formatting suitable for Sri Lankan users (DD/MM/YYYY or D MMM YYYY).
 */

/**
 * Validates Sri Lankan mobile phone numbers.
 * Accepts formats:
 *  - +94 7X XXX XXXX
 *  - +947XXXXXXXX
 *  - 07XXXXXXXX
 *  - 7XXXXXXXX
 */
export function isValidSriLankanPhone(phone: string): boolean {
  if (!phone) return false;
  const cleaned = phone.replace(/[\s\-()]/g, '');
  // Matches:
  // +94 followed by 7 and 8 digits: ^\+947[0-9]{8}$
  // 07 followed by 8 digits: ^07[0-9]{8}$
  // 7 followed by 8 digits: ^7[0-9]{8}$
  const slRegex = /^(\+947[0-9]{8}|07[0-9]{8}|7[0-9]{8})$/;
  return slRegex.test(cleaned);
}

/**
 * Normalizes any Sri Lankan mobile phone into canonical international +94 format:
 * e.g. "077 123 4567" -> "+94 77 123 4567"
 */
export function formatSriLankanPhone(phone: string): string {
  if (!phone) return '';
  const digitsOnly = phone.replace(/\D/g, '');
  let localNine = '';

  if (digitsOnly.startsWith('94') && digitsOnly.length === 11) {
    localNine = digitsOnly.slice(2);
  } else if (digitsOnly.startsWith('0') && digitsOnly.length === 10) {
    localNine = digitsOnly.slice(1);
  } else if (digitsOnly.length === 9) {
    localNine = digitsOnly;
  } else {
    return phone; // Return as-is if unrecognized shape
  }

  // Format as +94 XX XXX XXXX
  const operator = localNine.slice(0, 2);
  const part1 = localNine.slice(2, 5);
  const part2 = localNine.slice(5);
  return `+94 ${operator} ${part1} ${part2}`;
}

/**
 * Format currency in Sri Lankan Rupees (LKR).
 * Always uses "Rs." prefix with standard en-LK thousands separators.
 */
export function formatLKRPrice(amount: number, decimals: number = 0): string {
  if (isNaN(amount) || amount === null || amount === undefined) {
    return 'Rs. 0';
  }
  return `Rs. ${amount.toLocaleString('en-LK', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })}`;
}

/**
 * Format agricultural crop weight. Defaults to kg for farmer convenience.
 */
export function formatCropWeight(quantityKg: number): string {
  if (isNaN(quantityKg) || quantityKg <= 0) return '0 kg';
  if (quantityKg >= 1000) {
    const tons = quantityKg / 1000;
    return `${tons % 1 === 0 ? tons : tons.toFixed(1)} Tons (${quantityKg.toLocaleString('en-LK')} kg)`;
  }
  return `${quantityKg.toLocaleString('en-LK')} kg`;
}

/**
 * Format date for Sri Lankan agrarian records (e.g. "24 Nov 2026" or "24/11/2026").
 */
export function formatSriLankanDate(dateInput: string | Date | number, formatStyle: 'short' | 'medium' | 'long' = 'medium'): string {
  if (!dateInput) return '';
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return String(dateInput);

  if (formatStyle === 'short') {
    // DD/MM/YYYY
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  }

  if (formatStyle === 'long') {
    return d.toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  }

  // Medium: "24 Nov 2026"
  return d.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}
