import type { Metadata } from "next";
import { Outfit, Sora } from "next/font/google";
import { Providers } from "@/components/providers";
import { AppProvider } from "@/components/app-provider";
import { AppShell } from "@/components/app-shell";
import "./globals.css";

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
});

const sora = Sora({
  variable: "--font-sora",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Paddock Parking | Property Management",
  description:
    "Long-term parking ops — yards, lots, tenants, collections, and Book Now.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${outfit.variable} ${sora.variable} h-full antialiased`}
    >
      <body className="min-h-full">
        <Providers>
          <AppProvider>
            <AppShell>{children}</AppShell>
          </AppProvider>
        </Providers>
      </body>
    </html>
  );
}
