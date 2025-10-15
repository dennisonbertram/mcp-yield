# Stablecoins

# Stablecoin Yields

Yield.xyz offers the most flexible and powerful infrastructure for integrating stablecoin yields into any wallet, neobank, or financial application. Our API coverage represents ~80% of the DeFi market, covering more than 200 stablecoin strategies and across networks including Ethereum, Base, Arbitrum, Optimism, Solana, BNB Chain, Polygon, Avalanche, and more.

Clients can choose between a frictionless, fee-less setup or a fully monetized, optimized deployment using our OAVs (Optimized Allocator Vaults).

## Supported protocols

| Protocol | Supported Chains | Stablecoins |
|----------|------------------|-------------|
| Aave | Ethereum, Base, Polygon, Arbitrum, Optimism, Avalanche, BNB Chain | USDC, USDT, DAI, EURC, USDS, USDe, GHO, crvUSD, PYUSD, LUSD, RLUSD, AUSD, sUSD |
| Compound | Ethereum, Base, Polygon, Arbitrum | USDC, USDT, USDS, USDe |
| Morpho | Ethereum, Base | USDC, USDT, eUSD, EURC, EURA, USDA, crvUSD, PYUSD, AUSD, RLUSD |
| Spark | Ethereum | USDC, USDT, USDS, DAI |
| Ethena | Ethereum | USDe |
| Syrup | Ethereum | USDC, USDT |
| Yearn | Ethereum, Optimism, Arbtrum | USDC, USDT, crvUSD, DAI, USDS. LUSD, MIM, TUSD, |
| Fluid | Ethereum, Base, Arbitrum | USDC, USDT, GHO, EURC |
| Gearbox | Ethereum, Arbitrum, Optimism | USDC, USDT, DAI, GHO, crvUSD |
| Kamino | Solana | USDC, USDT, USDS, EURC, PYUSD, USDe |
| Drift | Solana | USDC, USDT, USDS, USDe, PYUSD, AUSD |
| Angle | Ethereum, Arbitrum, Optimism, Polygon | EURC, EURA, USDA |
| Idle Finance | Ethereum | USDC, USDe |
| Venus | BNB Chain | BUSD, USDC, USDT |

---

# Integration Options

When integrating StakeKit, clients have two distinct options:

- Base Stablecoin Yields (Plain Vanilla)
  - Users interact directly with underlying DeFi protocols.
  - No fees are charged to the user.
  - Ideal for clients seeking a straightforward, no-friction integration.
  - Zero complexity: no vault deployment required.

- Optimized Allocator Vaults (OAVs)
  - Fully customizable vaults built on StakeKit's OAV infrastructure.
  - Enable clients to offer single-strategy or multi-strategy stablecoin vaults.
  - Unlock monetization through configurable fees (performance, deposit, management).
  - Automate workflows including wrapping, swapping, bridging, off-ramping of incentive tokens, increased compounding, and more.

Learn more about how OAVs work [here](https://docs.stakek.it/docs/allocator-vaults-management-performance-fees).

---

# Monetization Options

For clients opting to deploy stablecoin vaults via OAVs, StakeKit provides a transparent and flexible monetization model:

- Deposit Fee: Optional upfront fee on user deposits.
- Performance Fee: Charged only on actual profits earned by the user.
- Management Fee: Annual fee based on assets under management (AUM).

These fees are fully customizable and can be embedded seamlessly within your application. You can enable monetization on a per-strategy or per-user basis, depending on your business model.

Learn more about monetization configurations [here](https://docs.stakek.it/docs/allocator-vaults-management-performance-fees#monetization-options).
