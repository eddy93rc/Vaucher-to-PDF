/**
 * Valida y normaliza el formato passenger_voucher (ej: DEOLEOREYES/FRANCISWILLYS).
 * Si ya viene correcto del payload, lo devuelve sin cambios.
 */
export function formatPassengerVoucher(passengerVoucher: string): string {
  if (!passengerVoucher || typeof passengerVoucher !== 'string') {
    return '-';
  }
  const trimmed = passengerVoucher.trim();
  return trimmed || '-';
}
