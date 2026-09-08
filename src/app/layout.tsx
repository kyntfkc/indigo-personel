import type { Metadata, Viewport } from "next";
import { Providers } from "@/components/providers";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

export const metadata: Metadata = {
  title: "İndigo Personel Takip",
  description: "İndigo Takı personel takip sistemi",
  appleWebApp: {
    capable: true,
    title: "İndigo Personel",
    statusBarStyle: "default",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  interactiveWidget: "resizes-content",
  themeColor: "#d39c82",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="tr">
      <body>
        <Providers>
          {children}
          <Toaster richColors position="bottom-center" />
        </Providers>
      </body>
    </html>
  );
}
