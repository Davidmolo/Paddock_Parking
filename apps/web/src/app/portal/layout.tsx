import { PortalGate } from "./portal-gate";
import type { PortalGateProps } from "./types";

export default function PortalLayout({ children }: PortalGateProps) {
  return <PortalGate>{children}</PortalGate>;
}
