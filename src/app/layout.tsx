import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "TezosX EVM",
  description: "Single-page dashboard for sending native-token testnet airdrops.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
