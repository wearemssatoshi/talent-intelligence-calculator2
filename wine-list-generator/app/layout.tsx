import type { Metadata } from "next";
import { Noto_Sans_JP, Noto_Serif_JP } from "next/font/google";
import "./globals.css";

const notoSansJP = Noto_Sans_JP({
  variable: "--font-noto-sans-jp",
  subsets: ["latin"],
  weight: ["400", "500", "700"],
});

const notoSerifJP = Noto_Serif_JP({
  variable: "--font-noto-serif-jp",
  subsets: ["latin"],
  weight: ["400", "700"],
});

export const metadata: Metadata = {
  title: "Wine List Generator | Premium Sommelier Tool",
  description: "Automated wine list creation from invoices.",
};

import { WineProvider } from "@/context/WineContext";

// ... imports

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body
        className={`${notoSansJP.variable} ${notoSerifJP.variable} antialiased font-sans bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-gray-100`}
      >
        <div className="fixed inset-0 -z-20 bg-gradient-to-br from-indigo-50 via-white to-purple-50 dark:from-gray-950 dark:via-gray-900 dark:to-indigo-950"></div>
        <WineProvider>
          {children}
        </WineProvider>
      </body>
    </html>
  );
}
