import type { Metadata } from "next";
import { Outfit, Playfair_Display, Zen_Old_Mincho } from "next/font/google";
import "./globals.css";

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
});

const playfair = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin"],
  style: ['normal', 'italic'],
});

const zenOldMincho = Zen_Old_Mincho({
  variable: "--font-zen-old-mincho",
  weight: ["400", "500", "700"],
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "SVD OS",
  description: "SAPPORO VIEWTIFUL DINING Operating System",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body className={`${outfit.variable} ${playfair.variable} ${zenOldMincho.variable} font-sans antialiased`}>
        {children}
      </body>
    </html>
  );
}
