import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import "./globals.css";

const archivo = localFont({
  src: "./fonts/Archivo-latin-wght-normal.woff2",
  variable: "--font-archivo",
  weight: "400 800",
  display: "swap",
});

const jetbrainsMono = localFont({
  src: "./fonts/JetBrainsMono-latin-wght-normal.woff2",
  variable: "--font-jetbrains-mono",
  weight: "400 700",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Pronosticat",
  description: "Pronostica resultats de futbol amb els teus amics",
  icons: {
    icon: "/favicon.ico",
  },
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Pronosticat",
  },
};

export const viewport: Viewport = {
  themeColor: "#0b1116",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ca"
      className={`${archivo.variable} ${jetbrainsMono.variable} h-full`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
