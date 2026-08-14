const CM_PER_INCH = 2.54;

export function cmToFeetInches(cm: number | null): { feet: number; inches: number } {
  if (cm == null) return { feet: 0, inches: 0 };
  const totalInches = Math.round(cm / CM_PER_INCH);
  return { feet: Math.floor(totalInches / 12), inches: totalInches % 12 };
}

export function feetInchesToCm(feet: number, inches: number): number {
  return Math.round((feet * 12 + inches) * CM_PER_INCH * 10) / 10;
}

const KG_PER_LB = 0.45359237;

export function kgToLb(kg: number): number {
  return Math.round((kg / KG_PER_LB) * 10) / 10;
}

export function lbToKg(lb: number): number {
  return Math.round(lb * KG_PER_LB * 100) / 100;
}
