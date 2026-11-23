export type BookingTone = "success" | "warning" | "danger" | "info" | "neutral";

export type BookingCard = {
  id: string;
  href: string;
  status: string;
  tone: BookingTone;
  title: string;
  meta: string;
};

export type BookingRowProps = {
  items: BookingCard[];
  viewAllHref: string;
};

export type BookingTileProps = {
  item: BookingCard;
};

export type BookingFact = {
  label: string;
  value: string;
};

export type BookingDetailProps = {
  backHref: string;
  title: string;
  status: string;
  tone: BookingTone;
  facts: BookingFact[];
  plates: string[];
  insurance: string;
};
