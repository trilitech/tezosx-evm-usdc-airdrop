import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "TezosX EVM",
  description: "Testnet faucet — fixed USDC or native XTZ payouts on TezosX EVM.",
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
