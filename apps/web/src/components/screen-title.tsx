"use client";

import { createContext, useContext } from "react";

const ScreenTitleContext = createContext<(title: string) => void>(() => {});

export function ScreenTitleProvider({
  setTitle,
  children,
}: {
  setTitle: (title: string) => void;
  children: React.ReactNode;
}) {
  return (
    <ScreenTitleContext.Provider value={setTitle}>
      {children}
    </ScreenTitleContext.Provider>
  );
}

export function useSetScreenTitle() {
  return useContext(ScreenTitleContext);
}
