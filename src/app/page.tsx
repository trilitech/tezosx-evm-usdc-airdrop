"use client";

import { FormEvent, useEffect, useState } from "react";
import styles from "./page.module.css";

type AirdropAsset = "usdc" | "xtz";
type ThemeMode = "light" | "dark";

type ClaimResult = {
  ok: boolean;
  message: string;
  txHash?: string;
  amount?: string;
  explorerUrl?: string | null;
};

const networkName = process.env.NEXT_PUBLIC_NETWORK_NAME ?? "TezosX EVM";
const networkSubtitle =
  process.env.NEXT_PUBLIC_NETWORK_SUBTITLE ?? "Tezos X Testnet Dashboard";
const rpcEndpoint =
  process.env.NEXT_PUBLIC_EVM_RPC ?? "https://demo.txpark.nomadic-labs.com/rpc";
const assetOptions: Record<
  AirdropAsset,
  { label: string; amount: string; description: string }
> = {
  usdc: {
    label: process.env.NEXT_PUBLIC_AIRDROP_TOKEN_SYMBOL ?? "USDC",
    amount: process.env.NEXT_PUBLIC_AIRDROP_AMOUNT ?? "10",
    description: "Send the fixed testnet USDC faucet amount to your wallet.",
  },
  xtz: {
    label: process.env.NEXT_PUBLIC_NATIVE_AIRDROP_SYMBOL ?? "XTZ",
    amount: process.env.NEXT_PUBLIC_NATIVE_AIRDROP_AMOUNT ?? "5",
    description: "Send the fixed native-token airdrop amount to your wallet.",
  },
};

export default function Home() {
  const [walletAddress, setWalletAddress] = useState("");
  const [selectedAsset, setSelectedAsset] = useState<AirdropAsset>("usdc");
  const [theme, setTheme] = useState<ThemeMode>("light");
  const [result, setResult] = useState<ClaimResult | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const activeAsset = assetOptions[selectedAsset];

  useEffect(() => {
    const savedTheme = window.localStorage.getItem("tezosx-evm-theme");
    if (savedTheme === "light" || savedTheme === "dark") {
      setTheme(savedTheme);
      return;
    }

    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    setTheme(prefersDark ? "dark" : "light");
  }, []);

  function toggleTheme() {
    const nextTheme: ThemeMode = theme === "dark" ? "light" : "dark";
    setTheme(nextTheme);
    window.localStorage.setItem("tezosx-evm-theme", nextTheme);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setResult(null);

    try {
      const response = await fetch("/api/airdrop", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ walletAddress, asset: selectedAsset }),
      });

      const data = (await response.json()) as ClaimResult;
      setResult(data);
    } catch {
      setResult({
        ok: false,
        message: "The request failed before the server could respond.",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className={`${styles.page} ${theme === "dark" ? styles.darkTheme : ""}`}>
      <main className={styles.panel}>
        <header className={styles.hero}>
          <div className={styles.heroTopRow}>
            <button className={styles.themeToggle} type="button" onClick={toggleTheme}>
              {theme === "dark" ? "Switch to Light Mode" : "Switch to Dark Mode"}
            </button>
          </div>
          <h1>{networkName}</h1>
          <p>{networkSubtitle}</p>
        </header>

        <section className={styles.details}>
          <div className={styles.sectionHeader}>
            <h2>Airdrop Console</h2>
            <div className={styles.rule} />
          </div>

          <div className={styles.detailRows}>
            <div className={styles.detailRow}>
              <span>Network Name</span>
              <strong>{networkName}</strong>
            </div>
            <div className={styles.detailRow}>
              <span>RPC Endpoint</span>
              <strong className={styles.mono}>{rpcEndpoint}</strong>
            </div>
            <div className={styles.detailRow}>
              <span>Selected Asset</span>
              <strong>
                {activeAsset.label}
              </strong>
            </div>
            <div className={styles.detailRow}>
              <span>Default Airdrop</span>
              <strong>
                {activeAsset.amount} {activeAsset.label}
              </strong>
            </div>
          </div>

          <form className={styles.form} onSubmit={handleSubmit}>
            <div className={styles.tabList} role="tablist" aria-label="Select token to airdrop">
              <button
                type="button"
                role="tab"
                aria-selected={selectedAsset === "usdc"}
                className={`${styles.tab} ${
                  selectedAsset === "usdc" ? styles.tabActive : ""
                }`}
                onClick={() => {
                  setSelectedAsset("usdc");
                  setResult(null);
                }}
                disabled={isSubmitting}
              >
                USDC Airdrop
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={selectedAsset === "xtz"}
                className={`${styles.tab} ${
                  selectedAsset === "xtz" ? styles.tabActive : ""
                }`}
                onClick={() => {
                  setSelectedAsset("xtz");
                  setResult(null);
                }}
                disabled={isSubmitting}
              >
                XTZ Airdrop
              </button>
            </div>

            <p className={styles.helperText}>
              Selected: {activeAsset.amount} {activeAsset.label}. {activeAsset.description}
            </p>

            <label className={styles.label} htmlFor="walletAddress">
              Recipient Wallet
            </label>
            <input
              id="walletAddress"
              name="walletAddress"
              type="text"
              inputMode="text"
              autoComplete="off"
              spellCheck="false"
              placeholder="0x..."
              className={styles.input}
              value={walletAddress}
              onChange={(event) => setWalletAddress(event.target.value)}
              disabled={isSubmitting}
            />

            <button className={styles.button} type="submit" disabled={isSubmitting}>
              {isSubmitting
                ? "Sending..."
                : selectedAsset === "xtz"
                  ? "Send XTZ to your wallet"
                  : "Send USDC to your wallet"}
            </button>
          </form>

          <div
            className={`${styles.statusBox} ${
              result ? (result.ok ? styles.statusSuccess : styles.statusError) : ""
            }`}
          >
            {result ? (
              <>
                <p>{result.message}</p>
                {result.txHash ? (
                  <p className={styles.mono}>Tx: {result.txHash}</p>
                ) : null}
                {result.explorerUrl ? (
                  <a href={result.explorerUrl} target="_blank" rel="noreferrer">
                    Open transaction →
                  </a>
                ) : null}
              </>
            ) : (
              <p>
                Enter a wallet address to send an Airdrop of {activeAsset.amount}{" "}
                {activeAsset.label} on {networkName}.
              </p>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
