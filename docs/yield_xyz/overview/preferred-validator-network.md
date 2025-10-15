# Preferred Validator Network

The Preferred Validator Network (PVN) is Yield.xyz's curated registry of top institutional-grade validators in the ecosystem. It is designed to provide clients and integrators with trusted, pre-vetted validator options across supported blockchain networks, ensuring maximum reliability, performance, and monetization of staking integrations.

These validators are selected based on strict operational and performance criteria

- Historical uptime and reliability
- Performance
- Total value staked (TVS)
- Slashing history (zero or minimal incidents)

In addition to adherence to uniform Service Level Agreements (SLAs) with key provisions regarding uptime guarantees and slashing protection.

## List of Validators in PVN

| Validator | Staking Support in Yield.xyz |
|-----------|------------------------------|
| Blockdaemon | Cosmos, Cronos, Polygon, Solana |
| Blockshard | Tezos |
| Bware Labs | Axelar, Celestia, Injective, Polygon, Zetachain |
| Chainflow | Agoric, Cosmos, Osmosis, Polygon, Quicksilver, Regen, Solana, Stargaze |
| Chorus One | Agoric, Akash, Axelar, Band, Celo, Cosmos, Dydx, Ethereum, Injective, Kava, Near, Osmosis, Polygon, Sei, Solana, Stargaze, Tezos |
| Coinbase Cloud | Axelar, Cardano, Celo, Cosmos, Near, Osmosis, Polkadot, Polygon, Solana |
| Crosnest | Axelar, Chihuahua, Comdex, Cosmos, Cronos, Dydx, Dymension, Fetch, Gravity, Injective, Juno, Kava, Mars, Osmosis, Persistence, Quicksilver, Secret, Sei, Stargaze, Teritori |
| Everstake | Cardano, Celestia, CoreDAO, Cosmos, Ethereum, Injective, Kava, Near, Osmosis, Polygon, Sei, Solana, Tezos |
| Figment | Agoric, Axelar, Band, BNB, Celestia, Celo, Cosmos, CoreDAO, Dydx, Ethereum, Injective, Near, Osmosis, Polygon, Sei, Solana, The Graph |
| InfStones | Agoric, Band, BNB, Cardano, Comdex, CoreDAO, Cosmos, Dydx, Ethereum, Fetch, Harmony, Humansai, Polygon, Solana, Tron, Zetachain |
| Kiln | Cardano, Cosmos, Cronos, CoreDAO, Dydx, Harmony, Injective, Kava, Mantra, Near, Polygon, Solana, Tron |
| Luganodes | Cardano, Dydx, Ethereum, Kava, Kusama, Near, Polkadot, Polygon, Saga, Solana, Tron |
| Meria | Akash, Axelar, Band, Cosmos, Cudos, Dydx, Dymension, Fetch, Humansai, Irisnet, Juno, Kava, Ki, Near, Osmosis, Persistence, Polkadot, Polygon, Quicksilver, Solana, Sommelier |
| Nodes.Guru | Agoric, Band, Desmos, Dydx, Dymension, Gravity, Humansai, Juno, Persistence, Quicksilver, Sei, Solana, Teritori, Umee |
| P2P | Ethereum |
| P-Ops | Agoric, Avalanche, Axelar, Dymension, Harmony, Solana, The Graph, Umee |
| Pier Two | Near, Polygon, Solana |
| RockX | Near, Persistence, Polkadot, Solana, Viction |
| StakeLab | Akash, Band, Bitsong, Chihuahua, Comdex, Coreum, Cosmos, Crescent, Desmos, Fetch, Humansai, Juno, Kava, Mantra, Mars, Osmosis, Persistence, Quicksilver, Secret, Sentinel, Sommelier, Stargaze, Teritori, Umee, Zetachain |
| Stakin | Agoric, Akash, Axelar, Celestia, Cosmos, Cronos, Kava, Kusama, Near, Persistence, Polygon, Saga, Sei, Umee |
| Staking Facilities | Celestia, Solana |
| Staking4All | Cudos, Dymension, Harmony, Humansai, Kava, Near, Persistence, Polygon, Tron |
| Yuma | Bittensor |

## Accessing Preferred Validators via API

Yield.xyz exposes an API to programmatically fetch validators across all supported integrations. You can use this endpoint to retrieve preferred validators:

`GET /v1/yields/validators?preferredValidatorsOnly=true`

To retrieve preferred validators for a given staking yield you may use the [Get yield validators](/reference/yieldscontroller_getyieldvalidators) endpoint by flagging the preferred param as `"true"`.

`GET /v1/yields/{yieldId}/validators`

**Example query:**

```bash
curl --request GET \
  --url 'https://api.yield.xyz/v1/yields/tron-trx-native-staking/validators?offset=0&limit=100&preferred=true' \
  --header 'accept: application/json' \
  --header 'X-API-KEY: YOUR_API_KEY'
```

**Example response snippet:**

```json
{
  "items": [
    {
      "address": "TGyrSc9ZmTdbYziuk1SKEmdtCdETafewJ9",
      "preferred": true,
      "name": "Luganodes",
      "logoURI": "https://assets.stakek.it/validators/luganodes.png",
      "website": "https://luganodes.com/",
      "commission": 0.05,
      "votingPower": 0.0335790605725797,
      "status": "active",
      "providerId": "9ef6235e-b039-4619-8307-c675d374ef8c",
      "tvl": "1410235950",
      "rewardRate": {
        "total": 0.03254183,
        "rateType": "APR",
        "components": []
      }
    },
    {
      "address": "TVa6MF7SgZa8PToLoQ9PNq6KQHyTXLBz1p",
      "preferred": true,
      "name": "InfStones",
      "logoURI": "https://assets.stakek.it/validators/infstones.png",
      "website": "https://infstones.com/",
      "commission": 0.15,
      "votingPower": 0.00017514486270703273,
      "status": "active",
      "providerId": "a092d613-75f4-48a1-a19f-35d0234b48e0",
      "tvl": "7355643",
      "rewardRate": {
        "total": 0.027239100000000002,
        "rateType": "APR",
        "components": []
      }
    }
  ]
}
```

**Validator metadata breakdown:**

| Field | Type | Description |
|-------|------|-------------|
| `address` | `string` | The validator's on-chain address (used for delegating). |
| `preferred` | `boolean` | Indicates if the validator is a member of the Preferred Validator Network (`true` if so). |
| `name` | `string` | Human-readable validator name (e.g. "Luganodes"). |
| `logoURI` | `string` | Direct link to the validator's logo image (PNG or SVG). |
| `website` | `string` | Validator's official website. Can be shown in advanced UI or explorer links. |
| `commission` | `number` | Commission rate charged by the validator, expressed as a decimal (e.g. 0.05 = 5%). |
| `votingPower` | `number` | The validator's share of the total active stake (between 0 and 1). Shows relative weight/influence in the network. |
| `status` | `string` | Operational status of the validator: `active`, `inactive`, or `jailed`. Use to filter out unavailable validators. |
| `providerId` | `UUID` | Internal ID for the validator |
| `tvl` | `string` | Total value locked with this validator in native units. |
| `rewardRate.total` | `number` | The validator's current yield rate, typically as APR. Includes commission impact. |
| `rewardRate.rateType` | `string` | Type of reward rate provided (e.g. APR, APY). APR if rewards are manually claimed and APY if they auto-compound. |
| `rewardRate.components` | `array` | Optional breakdown of how the total reward rate is composed (e.g. base rewards + bonus incentives). |
| `nominatorCount` | `number` | Number of addresses who have delegated to the validator. . |
