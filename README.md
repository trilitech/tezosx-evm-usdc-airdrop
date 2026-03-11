## TezosX EVM

Single-page Next.js app for sending a fixed USDC airdrop to any valid EVM address entered in the UI.

The browser only submits the recipient address. The actual transaction is created and broadcast on the server using private keys stored in environment variables.

## Setup

1. Copy `.env.example` to `.env.local`.
2. Fill in your funded private keys in `AIRDROP_PRIVATE_KEYS`.
3. Set `AIRDROP_TOKEN_ADDRESS` to your USDC token contract.
4. Adjust `AIRDROP_AMOUNT` if you want a different fixed airdrop amount.
5. Start the app:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Environment Variables

```bash
EVM_RPC=https://demo.txpark.nomadic-labs.com/rpc
AIRDROP_PRIVATE_KEYS=0xabc...,0xdef...
AIRDROP_TOKEN_ADDRESS=0x...
AIRDROP_TOKEN_SYMBOL=USDC
AIRDROP_TOKEN_DECIMALS=6
AIRDROP_AMOUNT=100
AIRDROP_GAS_RESERVE=0.001
EXPLORER_TX_URL_BASE=

NEXT_PUBLIC_NETWORK_NAME=TezosX EVM
NEXT_PUBLIC_NETWORK_SUBTITLE=Tezos X Testnet Dashboard
NEXT_PUBLIC_EVM_RPC=https://demo.txpark.nomadic-labs.com/rpc
NEXT_PUBLIC_AIRDROP_AMOUNT=100
NEXT_PUBLIC_AIRDROP_TOKEN_SYMBOL=USDC
```

## Notes

- `AIRDROP_PRIVATE_KEYS` can contain multiple comma-separated or newline-separated private keys.
- The API route chooses the first configured wallet with enough USDC balance and enough native balance to cover gas.
- The default setup assumes USDC uses `6` decimals. Change `AIRDROP_TOKEN_DECIMALS` if your token differs.
- Add `EXPLORER_TX_URL_BASE` if you want the success state to include a transaction link.

## API

`POST /api/airdrop`

Request body:

```json
{
  "walletAddress": "0x..."
}
```

Successful response includes the sender wallet used and the transaction hash.

## Security

Do not expose your private keys through `NEXT_PUBLIC_*` variables. Only keep them in server-only env vars such as `AIRDROP_PRIVATE_KEYS`.
