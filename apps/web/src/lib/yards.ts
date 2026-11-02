/**
 * Live Paddock yards (David): only these three today.
 * Names are address-based: Paddock 16 (Elwood), Paddock 325, Paddock 6060.
 * Anthem / Rio Vista and Paddock 51 are not live yet.
 */

export const LIVE_PROPERTY_IDS = [
  "prop-16",
  "prop-325",
  "prop-6060",
] as const;

export type LivePropertyId = (typeof LIVE_PROPERTY_IDS)[number];

export const LIVE_PROPERTY_ORDER: LivePropertyId[] = [
  "prop-16",
  "prop-325",
  "prop-6060",
];

export function isLivePropertyId(id: string): id is LivePropertyId {
  return (LIVE_PROPERTY_IDS as readonly string[]).includes(id);
}
