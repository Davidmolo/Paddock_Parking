"use client";

import { createContext, useContext } from "react";
import type { PortalEmailProps } from "./types";

const PortalEmailContext = createContext("");

export function PortalEmailProvider({ email, children }: PortalEmailProps) {
  return <PortalEmailContext.Provider value={email}>{children}</PortalEmailContext.Provider>;
}

export function usePortalEmail() {
  return useContext(PortalEmailContext);
}
