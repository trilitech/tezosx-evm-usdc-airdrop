"use client";

import { FormEvent, useState } from "react";
import styles from "./page.module.css";

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
const defaultAmount = process.env.NEXT_PUBLIC_AIRDROP_AMOUNT ?? "10";
const tokenSymbol = process.env.NEXT_PUBLIC_AIRDROP_TOKEN_SYMBOL ?? "USDC";

export default function Home() {
  const [walletAddress, setWalletAddress] = useState("");
  const [result, setResult] = useState<ClaimResult | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

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
        body: JSON.stringify({ walletAddress }),
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
    <div className={styles.page}>
      <main className={styles.panel}>
        <header className={styles.hero}>
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
              <span>Default Airdrop</span>
              <strong>
                {defaultAmount} {tokenSymbol}
              </strong>
            </div>
          </div>

          <form className={styles.form} onSubmit={handleSubmit}>
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
              {isSubmitting ? "Sending..." : "Send Airdrop"}
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
                Enter a wallet address to send an Airdrop of {defaultAmount} {tokenSymbol} on{" "}
                {networkName}.
              </p>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
