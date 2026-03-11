import { NextResponse } from "next/server";
import { ethers } from "ethers";

const rpcUrl = process.env.EVM_RPC;
const tokenAddress = process.env.AIRDROP_TOKEN_ADDRESS;
const configuredAmount = process.env.AIRDROP_AMOUNT ?? "10";
const tokenSymbol = process.env.AIRDROP_TOKEN_SYMBOL ?? "USDC";
const tokenDecimals = Number(process.env.AIRDROP_TOKEN_DECIMALS ?? "6");
const explorerBaseUrl = process.env.EXPLORER_TX_URL_BASE ?? null;
const gasReserve = ethers.parseEther(process.env.AIRDROP_GAS_RESERVE ?? "0.001");
const erc20Abi = [
  "function balanceOf(address owner) view returns (uint256)",
  "function transfer(address to, uint256 value) returns (bool)",
];

function getPrivateKeys() {
  const source = process.env.AIRDROP_PRIVATE_KEYS ?? process.env.PRIVATE_KEYS ?? "";

  return source
    .split(/[,\n]/)
    .map((key) => key.trim())
    .filter(Boolean);
}

function getProvider() {
  if (!rpcUrl) {
    throw new Error("Missing EVM_RPC environment variable.");
  }

  return new ethers.JsonRpcProvider(rpcUrl);
}

function getTokenContract(providerOrSigner: ethers.JsonRpcProvider | ethers.Wallet) {
  if (!tokenAddress) {
    throw new Error("Missing AIRDROP_TOKEN_ADDRESS environment variable.");
  }

  if (!ethers.isAddress(tokenAddress)) {
    throw new Error("AIRDROP_TOKEN_ADDRESS is not a valid EVM address.");
  }

  return new ethers.Contract(tokenAddress, erc20Abi, providerOrSigner);
}

async function getAvailableWallet(
  provider: ethers.JsonRpcProvider,
  amountUnits: bigint,
) {
  const privateKeys = getPrivateKeys();

  if (privateKeys.length === 0) {
    throw new Error("No private keys configured. Set AIRDROP_PRIVATE_KEYS in your env.");
  }

  for (const privateKey of privateKeys) {
    const wallet = new ethers.Wallet(privateKey, provider);
    const nativeBalance = await provider.getBalance(wallet.address);
    const token = getTokenContract(wallet);
    const tokenBalance = (await token.balanceOf(wallet.address)) as bigint;

    if (nativeBalance >= gasReserve && tokenBalance >= amountUnits) {
      return wallet;
    }
  }

  throw new Error(
    `No funded wallet has enough ${tokenSymbol} and native gas balance to cover the airdrop.`,
  );
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { walletAddress?: string };
    const walletAddress = body.walletAddress?.trim();

    if (!walletAddress) {
      return NextResponse.json(
        { ok: false, message: "Wallet address is required." },
        { status: 400 },
      );
    }

    if (!ethers.isAddress(walletAddress)) {
      return NextResponse.json(
        { ok: false, message: "Wallet address is not a valid EVM address." },
        { status: 400 },
      );
    }

    const provider = getProvider();
    const amountUnits = ethers.parseUnits(configuredAmount, tokenDecimals);
    const wallet = await getAvailableWallet(provider, amountUnits);
    const token = getTokenContract(wallet);

    const tx = await token.transfer(walletAddress, amountUnits);

    await tx.wait();

    return NextResponse.json({
      ok: true,
      message: `${configuredAmount} ${tokenSymbol} sent successfully to ${walletAddress}.`,
      txHash: tx.hash,
      amount: configuredAmount,
      explorerUrl: explorerBaseUrl ? `${explorerBaseUrl}${tx.hash}` : null,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Airdrop request failed unexpectedly.";

    return NextResponse.json({ ok: false, message }, { status: 500 });
  }
}
