/** Marketing copy aligned to live paddockparking.com (public site). */

export const SITE_PHONE = "602-922-3737";
export const SITE_PHONE_TEL = "tel:6029223737";
export const SITE_EMAIL = "hello@paddockparking.com";

export const SERVICES = [
  {
    slug: "heavy-equipment-storage",
    title: "Heavy Equipment Storage",
    blurb:
      "Excavators. Dozers. Cranes. If it's worth six figures, it deserves better than a random lot.",
    popular: true,
  },
  {
    slug: "outdoor-storage-yard",
    title: "Outdoor Storage Yard",
    blurb:
      "Gated contractor yards with room to stage gear, materials, and rolling stock.",
  },
  {
    slug: "storage-by-square-foot",
    title: "Storage by Square Foot",
    blurb: "Sized pads for equipment and materials — month-to-month, no long contracts.",
  },
  {
    slug: "land-lease-per-acre",
    title: "Land Lease per Acre",
    blurb: "Lease by the acre for larger contractor yards and mixed-use staging.",
  },
  {
    slug: "truck-and-trailer-storage",
    title: "Truck and Trailer Storage",
    blurb:
      "Your trucks make money on the road — not sitting in traffic finding parking.",
  },
] as const;

export const WHAT_WE_PARK = [
  {
    title: "Heavy Equipment Storage",
    blurb:
      "Excavators. Dozers. Cranes. If it's worth six figures, it deserves better than a random lot.",
  },
  {
    title: "Semi Truck & Fleet Parking",
    blurb:
      "Your trucks make you money on the road — not sitting in traffic finding parking. We're always open.",
  },
  {
    title: "Contractor Equipment Yard",
    blurb:
      "Tools, trailers, materials — all in one secure spot. Stop spreading your gear across three counties.",
  },
  {
    title: "Industrial Machinery",
    blurb:
      "Manufacturing equipment that doesn't fit anywhere else? Wide access points. No problem.",
  },
  {
    title: "Container Storage",
    blurb:
      "Shipping containers need space. We have acres of it. Drop it, lock it, forget about it.",
  },
  {
    title: "RV & Trailer Parking",
    blurb:
      "Your HOA hates your RV. We love it. Secure outdoor parking without the neighbor drama.",
  },
] as const;

export const PRICING_TIERS = [
  {
    title: "Contractor Yard",
    size: "0.5-2+ acres",
    price: null as string | null,
    items: [
      "Dedicated contractor space",
      "Equipment & material storage",
      "Flexible yard configurations",
      "Tailored to your business",
    ],
  },
  {
    title: "Equipment Storage",
    size: "25' x 50', 50' x 50' & more",
    price: "$450/cycle",
    items: [
      "Construction equipment",
      "Tools & materials",
      "24/7 secure access",
      "Month-to-month terms",
    ],
  },
  {
    title: "Fleet Parking",
    size: "12' × 75' space",
    price: "$225/cycle",
    items: [
      "Commercial vehicle parking",
      "Truck + trailer spaces",
      "Security monitoring",
      "Flexible terms available",
    ],
  },
  {
    title: "Mixed Use Space",
    size: "Custom layout",
    price: null as string | null,
    items: [
      "Storage + parking combo",
      "Office trailer placement",
      "Utility connections",
      "Scalable solutions",
    ],
  },
] as const;

/** Public marketing locations — live yards only (David). */
export const LOCATIONS = [
  {
    id: "prop-16",
    name: "Paddock 16",
    address: "2005 E Elwood St, Phoenix, AZ 85040",
    maps: "https://www.google.com/maps/search/?api=1&query=2005+E+Elwood+St+Phoenix+AZ+85040",
  },
  {
    id: "prop-325",
    name: "Paddock 325",
    address: "325 S 31st Ave, Phoenix, AZ 85009",
    maps: "https://www.google.com/maps/search/?api=1&query=325+S+31st+Ave+Phoenix+AZ+85009",
  },
  {
    id: "prop-6060",
    name: "Paddock 6060",
    address: "6060 W Washington St, Phoenix, AZ 85043",
    maps: "https://www.google.com/maps/search/?api=1&query=6060+W+Washington+St+Phoenix+AZ+85043",
  },
] as const;

export const FAQS = [
  {
    q: "What can I store at Paddock Parking?",
    a: "Heavy equipment, semi trucks and trailers, contractor gear, industrial machinery, shipping containers, RVs, and more — if it has wheels or tracks, we park it.",
  },
  {
    q: "How is this different from a regular storage unit?",
    a: "These are gated outdoor yards with wide drive lanes, 24/7 access, and live camera visibility — built for commercial equipment, not household boxes.",
  },
  {
    q: "Do you offer contractor storage?",
    a: "Yes. Lease by the spot or by the acre for contractor yards, staging, and mixed-use layouts.",
  },
  {
    q: "Can I scale storage as my business grows?",
    a: "Month-to-month terms let you add spots or acreage as your fleet grows — no long lock-in.",
  },
  {
    q: "Why do Phoenix businesses choose Paddock?",
    a: "Zero theft track record since 2022, live camera feeds, true 24/7 gate access, and yards across Phoenix so you're near the job.",
  },
  {
    q: "What amenities are included?",
    a: "Secure gates, cameras, wide lanes, restrooms, water access, waste disposal, and perimeter fencing at our yards.",
  },
  {
    q: "Do you offer lease-by-acre options?",
    a: "Yes — contractor yards from roughly 0.5–2+ acres, tailored to how you stage equipment and materials.",
  },
  {
    q: "How do I get started?",
    a: "Book online: pick a location, complete lease details, sign, and pay. Staff confirms your stall in Onboarding.",
  },
] as const;

export const REVIEWS = [
  {
    name: "Erwan E.",
    text: "Easy access and very secured. Highly competitive pricing",
  },
  {
    name: "Bobby P.",
    text: "Used parking here long term for several of my trucks. The lot is safe and secure, nothing was ever stolen, and I never had any issues.",
  },
  {
    name: "Alexios",
    text: "New good location, close to I-10! Recommend to local fleets.",
  },
  {
    name: "Mike R.",
    text: "Best storage yard in Phoenix. Staff is friendly and the facility is well-maintained.",
  },
  {
    name: "Carlos T.",
    text: "24/7 access is a game changer for my business. Security cameras everywhere.",
  },
] as const;
