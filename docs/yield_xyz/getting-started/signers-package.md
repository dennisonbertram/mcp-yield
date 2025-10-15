# Signers Package

The StakeKit Signers is a package that allows you to create a signing wallet instance from a mnemonic phrase or Ledger app and sign transactions.

In addition to that, you can provide a custom derivation path for your mnemonic phrase and get different wallets derived from it, from different types of wallet mechanisms, such as MetaMask, Omni, Phantom, or Keplr.

## Supported Networks

We currently support the following EVM networks:

- Testnets: Base-Sepolia, Ethereum-Goerli, Ethereum-Holesky, Ethereum-Sepolia, Polygon-Amoy
- EVM Networks: Arbitrum, Avalanche, Base, BNB Chain, Celo, CoreDAO, Cronos, Ethereum, Harmony, Linea, Optimism, Polygon, Sonic, Unichain, Viction

And the following non-EVM networks:

- Testnets: Solana Devnet, Ton-Testnet, Westend.
- Non-EVM Networks: Agoric, Akash, Axelar, Band Protocol, Bittensor, Bitsong, Cardano, Celestia, Chihuahua, Comdex, Coreum, Cosmos, Crescent, CryptoOrg, Cudos, Desmos, Dymension, DYDX, FetchAI, Gravity Bridge, HumansAI, Injective, Irisnet, Juno, Kava, Ki-Network, Kusama, Mantra, Near, Onomy, Osmosis, Persistence, Polkadot, Quicksilver, Regen, Saga, Secret, Sei, Sentinel, Solana, Sommelier, Stargaze, Tezos, Teritori, Ton, Tron, Umee.

## Supported Wallets

We currently support:

- MetaMask
- Omni
- Phantom
- Keplr
- SteakWallet
- Temple

## Development

Create `.env` file and add variables from `.env.example`.

Install all dependencies:

`yarn install`

## Installation

To install StakeKit Signers (in addition, we recommend installing the packages @stakekit/common):

`npm install @stakekit/signers @stakekit/common`

or

`yarn add @stakekit/signers @stakekit/common`

or

`pnpm add @stakekit/signers @stakekit/common`

## Usage

### Examples

#### Ethereum

```typescript
const walletoptions = {
  mnemonic: process.env.MNEMONIC,
  walletType: ImportableWallets.MetaMask,
  index: 0,
};

const signingWallet = await getSigningWallet(Networks.Ethereum, walletoptions);
const address = await signingWallet.getAddress();
console.log('My wallet address: ', address);

const someUnsignedTx: TransactionRequest = {}; // Your unsigned transaction.
const signedTx = await wallet.signTransaction(unsignedTransaction);
// submitTransaction(signedTx);
```

#### Solana

```typescript
import { ImportableWallets, getSigningWallet } from '@stakekit/signers';
import { Networks } from '@stakekit/common';

const walletoptions = {
  mnemonic: process.env.MNEMONIC,
  walletType: ImportableWallets.MetaMask,
  index: 0,
};

const signingWallet = await getSigningWallet(Networks.Solana, walletoptions);
const address = await signingWallet.getAddress();
console.log('My wallet address: ', address);

const someUnsignedTx: string = ''; // Your unsigned transaction in hex.
const signedTx = await wallet.signTransaction(unsignedTransaction);
// submitTransaction(signedTx);
```
