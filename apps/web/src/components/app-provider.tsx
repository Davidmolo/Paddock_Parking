"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { endpoints, type AuthUser, type Property } from "@/lib/api";

type AppContextValue = {
  user: AuthUser | null;
  token: string | null;
  properties: Property[];
  propertyId: string | "all";
  setPropertyId: (id: string | "all") => void;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
  setUser: (user: AuthUser) => void;
  ready: boolean;
};

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [user, setUserState] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [properties, setProperties] = useState<Property[]>([]);
  const [propertyId, setPropertyIdState] = useState<string | "all">("all");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const savedToken = localStorage.getItem("pp_token");
    const savedProperty = localStorage.getItem("pp_property") as
      | string
      | null;
    if (savedProperty)
      setPropertyIdState(savedProperty === "all" ? "all" : savedProperty);

    async function boot() {
      if (!savedToken) {
        setReady(true);
        return;
      }
      setToken(savedToken);
      try {
        const [me, props] = await Promise.all([
          endpoints.me(),
          endpoints.properties(),
        ]);
        setUserState(me);
        setProperties(props);
      } catch {
        localStorage.removeItem("pp_token");
        setToken(null);
        setUserState(null);
      } finally {
        setReady(true);
      }
    }
    void boot();
  }, []);

  const setPropertyId = useCallback((id: string | "all") => {
    setPropertyIdState(id);
    localStorage.setItem("pp_property", id);
  }, []);

  const setUser = useCallback((next: AuthUser) => {
    setUserState(next);
  }, []);

  const refreshUser = useCallback(async () => {
    const me = await endpoints.me();
    setUserState(me);
  }, []);

  const login = useCallback(async (username: string, password: string) => {
    const res = await endpoints.login({ username, password });
    localStorage.setItem("pp_token", res.token);
    setToken(res.token);
    setUserState(res.user);
    const props = await endpoints.properties();
    setProperties(props);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem("pp_token");
    setToken(null);
    setUserState(null);
  }, []);

  const value = useMemo(
    () => ({
      user,
      token,
      properties,
      propertyId,
      setPropertyId,
      login,
      logout,
      refreshUser,
      setUser,
      ready,
    }),
    [
      user,
      token,
      properties,
      propertyId,
      setPropertyId,
      login,
      logout,
      refreshUser,
      setUser,
      ready,
    ],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
}
