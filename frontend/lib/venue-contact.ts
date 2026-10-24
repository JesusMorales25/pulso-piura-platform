export function addressWithGps(
  address: string,
  latitude: string,
  longitude: string,
) {
  if (
    address.trim() &&
    !/^Ubicación GPS: -?\d+\.\d+, -?\d+\.\d+$/.test(address)
  ) {
    return address;
  }
  return `Ubicación GPS: ${Number(latitude).toFixed(6)}, ${Number(longitude).toFixed(6)}`;
}

export function peruPhoneDigits(value: string) {
  const digits = value.replace(/\D/g, "");
  return (
    digits.length > 9 && digits.startsWith("51") ? digits.slice(2) : digits
  ).slice(0, 9);
}

export function peruPublicPhone(value: string): string | null {
  const digits = value.replace(/\D/g, "");
  if (!digits) return null;
  const local =
    digits.length === 11 && digits.startsWith("51") ? digits.slice(2) : digits;
  if (local.length !== 9)
    throw new Error("El teléfono público debe tener 9 dígitos.");
  return `+51${local}`;
}
