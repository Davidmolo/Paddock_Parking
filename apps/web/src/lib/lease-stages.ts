import type { LeaseDirection, LeaseStage } from "@/lib/api";

/** Who the lease is with — UI labels (API still tenant | landlord) */
export function leaseDirectionLabel(direction: LeaseDirection) {
  return direction === "landlord" ? "admin" : "tenant";
}

/**
 * Simple renewal-status labels (David / ops).
 * API values stay the same; only UI wording is short.
 */
export const LEASE_STAGES: {
  value: LeaseStage;
  label: string;
  hint: string;
}[] = [
  {
    value: "not_contacted",
    label: "To do",
    hint: "Need to reach out (auto when notify window opens)",
  },
  {
    value: "outreach_sent",
    label: "Contacted",
    hint: "You already emailed or called",
  },
  {
    value: "negotiating",
    label: "In talks",
    hint: "Discussing stay, rate, or move-out",
  },
  {
    value: "notice_given",
    label: "Notice sent",
    hint: "Formal notice is out",
  },
  {
    value: "renewed",
    label: "Staying",
    hint: "They renew / keep the lot",
  },
  {
    value: "exiting",
    label: "Leaving",
    hint: "They vacate — free the lot",
  },
];

export function leaseStageLabel(stage?: LeaseStage | null) {
  if (!stage) return "Not set";
  return LEASE_STAGES.find((s) => s.value === stage)?.label ?? "Not set";
}
