/** US ABA routing number — 9 digits + checksum. */
export function isValidAbaRouting(routing: string): boolean {
  const d = routing.replace(/\D/g, "");
  if (!/^\d{9}$/.test(d)) return false;
  const n = [...d].map(Number);
  const sum =
    3 * (n[0] + n[3] + n[6]) +
    7 * (n[1] + n[4] + n[7]) +
    (n[2] + n[5] + n[8]);
  return sum % 10 === 0;
}
