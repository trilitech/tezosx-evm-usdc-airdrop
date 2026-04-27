import { NextResponse } from "next/server";
import { ethers } from "ethers";

const rpcUrl = process.env.EVM_RPC;
const tokenAddress = process.env.AIRDROP_TOKEN_ADDRESS;
const tokenSymbol = process.env.AIRDROP_TOKEN_SYMBOL ?? "USDC";
const tokenDecimals = Number(process.env.AIRDROP_TOKEN_DECIMALS ?? "6");
const tokenAmount = process.env.AIRDROP_AMOUNT ?? "10";
const nativeSymbol = process.env.NATIVE_AIRDROP_SYMBOL ?? "XTZ";
const nativeAmount = process.env.NATIVE_AIRDROP_AMOUNT ?? "5";
const explorerBaseUrl = process.env.EXPLORER_TX_URL_BASE ?? null;
const gasReserve = ethers.parseEther(process.env.AIRDROP_GAS_RESERVE ?? "0.001");
const erc20Abi = [
  "function balanceOf(address owner) view returns (uint256)",
  "function transfer(address to, uint256 value) returns (bool)",
];
type AirdropAsset = "usdc" | "xtz";
type TransferRequest = {
  asset: AirdropAsset;
  amount: string;
};

type AirdropRequestBody = {
  walletAddress?: string;
  asset?: AirdropAsset;
  xtz?: boolean;
  usdc?: boolean;
};

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

async function getAvailableTokenWallet(
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

async function getAvailableNativeWallet(
  provider: ethers.JsonRpcProvider,
  amountWei: bigint,
) {
  const privateKeys = getPrivateKeys();

  if (privateKeys.length === 0) {
    throw new Error("No private keys configured. Set AIRDROP_PRIVATE_KEYS in your env.");
  }

  for (const privateKey of privateKeys) {
    const wallet = new ethers.Wallet(privateKey, provider);
    const nativeBalance = await provider.getBalance(wallet.address);

    if (nativeBalance >= amountWei + gasReserve) {
      return wallet;
    }
  }

  throw new Error(
    `No funded wallet has enough ${nativeSymbol} balance to cover the airdrop and gas.`,
  );
}

function getTransferRequests(body: AirdropRequestBody): TransferRequest[] {
  const transfers: TransferRequest[] = [];

  if (body.usdc) {
    transfers.push({ asset: "usdc", amount: tokenAmount });
  }

  if (body.xtz) {
    transfers.push({ asset: "xtz", amount: nativeAmount });
  }

  if (transfers.length > 0) {
    return transfers;
  }

  const asset: AirdropAsset = body.asset === "xtz" ? "xtz" : "usdc";

  return [
    {
      asset,
      amount: asset === "xtz" ? nativeAmount : tokenAmount,
    },
  ];
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as AirdropRequestBody;
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
    const transfers = getTransferRequests(body);
    const results: Array<{
      asset: AirdropAsset;
      amount: string;
      symbol: string;
      txHash: string;
      explorerUrl: string | null;
    }> = [];

    for (const transferRequest of transfers) {
      if (transferRequest.asset === "xtz") {
        const amountWei = ethers.parseEther(transferRequest.amount);
        const wallet = await getAvailableNativeWallet(provider, amountWei);
        const tx = await wallet.sendTransaction({
          to: walletAddress,
          value: amountWei,
        });

        await tx.wait();
        results.push({
          asset: "xtz",
          amount: transferRequest.amount,
          symbol: nativeSymbol,
          txHash: tx.hash,
          explorerUrl: explorerBaseUrl ? `${explorerBaseUrl}${tx.hash}` : null,
        });
        continue;
      }

      const amountUnits = ethers.parseUnits(transferRequest.amount, tokenDecimals);
      const wallet = await getAvailableTokenWallet(provider, amountUnits);
      const token = getTokenContract(wallet);
      const tx = await token.transfer(walletAddress, amountUnits);

      await tx.wait();
      results.push({
        asset: "usdc",
        amount: transferRequest.amount,
        symbol: tokenSymbol,
        txHash: tx.hash,
        explorerUrl: explorerBaseUrl ? `${explorerBaseUrl}${tx.hash}` : null,
      });
    }

    const summary = results.map((result) => `${result.amount} ${result.symbol}`).join(" and ");

    return NextResponse.json({
      ok: true,
      message: `${summary} sent successfully to ${walletAddress}.`,
      txHash: results[0]?.txHash,
      amount: results[0]?.amount,
      explorerUrl: results[0]?.explorerUrl ?? null,
      transfers: results,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Airdrop request failed unexpectedly.";

    return NextResponse.json({ ok: false, message }, { status: 500 });
  }
}
