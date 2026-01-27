export function formatMl(ml: number): string {
  if (ml >= 1000) {
    return `${(ml / 1000).toFixed(1)}L`;
  }
  return `${ml}ml`;
}

export function formatWeight(kg: number): string {
  if (kg < 1) {
    return `${Math.round(kg * 1000)}g`;
  }
  return `${kg.toFixed(2)}kg`;
}

export function formatHeight(cm: number): string {
  return `${cm.toFixed(1)}cm`;
}

export function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

export function pluralize(count: number, singular: string, plural?: string): string {
  return count === 1 ? singular : (plural ?? `${singular}s`);
}

const ML_PER_OZ = 29.5735;

export function mlToOz(ml: number): number {
  return Math.round((ml / ML_PER_OZ) * 10) / 10;
}

export function ozToMl(oz: number): number {
  return Math.round(oz * ML_PER_OZ);
}

// Weight conversions
const LBS_PER_KG = 2.20462;
const OZ_PER_LB = 16;

export function kgToLbs(kg: number): number {
  return kg * LBS_PER_KG;
}

export function lbsToKg(lbs: number): number {
  return lbs / LBS_PER_KG;
}

export function lbsOzToKg(lbs: number, oz: number): number {
  const totalLbs = lbs + oz / OZ_PER_LB;
  return totalLbs / LBS_PER_KG;
}

export function kgToLbsOz(kg: number): { lbs: number; oz: number } {
  const totalLbs = kg * LBS_PER_KG;
  const lbs = Math.floor(totalLbs);
  const oz = Math.round((totalLbs - lbs) * OZ_PER_LB);
  return { lbs, oz };
}

export function formatWeightImperial(kg: number): string {
  const { lbs, oz } = kgToLbsOz(kg);
  if (oz === 0) {
    return `${lbs} lb`;
  }
  return `${lbs} lb ${oz} oz`;
}

// Height conversions
const CM_PER_INCH = 2.54;
const INCHES_PER_FOOT = 12;

export function cmToInches(cm: number): number {
  return cm / CM_PER_INCH;
}

export function inchesToCm(inches: number): number {
  return inches * CM_PER_INCH;
}

export function cmToFtIn(cm: number): { ft: number; inches: number } {
  const totalInches = cm / CM_PER_INCH;
  const ft = Math.floor(totalInches / INCHES_PER_FOOT);
  const inches = Math.round(totalInches % INCHES_PER_FOOT);
  return { ft, inches };
}

export function ftInToCm(ft: number, inches: number): number {
  const totalInches = ft * INCHES_PER_FOOT + inches;
  return totalInches * CM_PER_INCH;
}

export function formatHeightImperial(cm: number): string {
  const { ft, inches } = cmToFtIn(cm);
  if (inches === 0) {
    return `${ft}'`;
  }
  return `${ft}' ${inches}"`;
}

// Temperature conversions
export function celsiusToFahrenheit(celsius: number): number {
  return Math.round((celsius * 9 / 5 + 32) * 10) / 10;
}

export function fahrenheitToCelsius(fahrenheit: number): number {
  return Math.round(((fahrenheit - 32) * 5 / 9) * 10) / 10;
}
