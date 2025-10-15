# FAQs

### Supported blockchains

StakeKit currently offers support for most major Layer 1 blockchains, and many Layer 2s. We are constantly working to integrate support for more chains and expand the yield offering on the ones that are currently supported. At the time of writing, we support the following blockchains:

- **Testnets**: Base-Sepolia, Ethereum-Goerli, Ethereum-Holesky, Ethereum-Sepolia, Polygon-Amoy, Solana Devnet, Ton-Testnet, Westend
- **EVM Networks**: Arbitrum, Avalanche, Base, BNB Chain, Celo, CoreDAO, Cronos, Ethereum, Harmony, Linea, Optimism, Polygon, Sonic, Unichain, Viction
- **Non-EVM Networks**: Agoric, Akash, Axelar, Band Protocol, Bitsong, Cardano, Celestia, Chihuahua, Comdex, Coreum, Cosmos, Crescent, CryptoOrg, Cudos, Desmos, Dymension, DYDX, FetchAI, Gravity Bridge, HumansAI, Injective, Irisnet, Juno, Kava, Ki-Network, Kusama, Mantra, Near, Onomy, Osmosis, Persistence, Polkadot, Quicksilver, Regen, Saga, Secret, Sei, Sentinel, Solana, Sommelier, Stargaze, Tezos, Teritori, Ton, Tron, Umee

### Which yields are supported

StakeKit provides a wide range of options for earning yield no matter what the chain is or the type of yield. Be it staking, liquid staking, lending, or yield vaults, you'll find them all in StakeKit and have a unified experience while we abstract the different flows. We are constantly expanding our offering so be on the lookout for new opportunities. At the moment, you can access these:**Staking on non-EVMs**: ATOM, NEAR, XTZ, SOL, TRX, DOT, KSM, CRO, OSMO, AXL, QCK, XPRT, COREUM, NOM, JUNO, KAVA, STARS, DSM, AKT, BLD, BAND, BTSG, HUAHUA, CMDX, CRE, CRO, CUDOS, FET, GRAVITON, IRIS, XKI, MARS, REGEN, SCRT, DVPN, SOMM, TORI, and UMEE**Staking on EVMs:** MATIC, AVAX, BNB, APE, ONE, CELO, and GRT**Liquid staking:** stETH, rETH, cAPE, sAVAX, and stMATIC**Yield vaults:** Angle Protocol, Yearn V2, and Yearn V3**Lending:** all lending pools of Morpho Aave on Ethereum, Morpho Compound on Ethereum, wETH and USDC on Ethereum and USDC on Polygon via Compound, as well as all Aave V3 pools on Polygon, Avalanche, Arbitrum, and Optimism

### How to switch accounts in Ledger Live?

For example, if you have more than one Ethereum account in Ledger Live you might need to switch the account you have connected to StakeKit in order to interact with the available yields with the right assets.

To switch the account, follow these quick steps:

- Once you are connected to StakeKit, make sure you are connected to the correct network. Check the top left corner of the widget – if the network is not the correct one, click on it and choose the right one.
- Once you are on the correct network, click on the address in the top right corner.
- On the pop-up, you'll see your current address at the top, your balance right below, and then another address. Click on the address you want to be connected with.

### How do I unstake my tokens?

Select the network on which you want to unstake your assets in the top left corner of the widget.

- Click on the "Positions" tab.
- Click on the yield positions where you want to unstake your tokens
- Once you are in the yield page, select the amount you want to unstake, and click othe "Unstake" button.
- Click on "Confirm" button on the new page.
- Review and approve the transaction in your wallet.
- Once your transaction is confirmed, the tokens will be available in your wallet once the unstaking period has ended.

Be mindful of the fact that on some networks you'll have to manually withdraw the tokens once the unbonding period is over.

### How to stake?

Although many networks have a different staking flow, StakeKit simplifies and unifies the staking experience across all the supported blockchains. Here's a quick example of how to stake MATIC (other tokens will have the same flow no matter what type of yield you are looking for – staking, liquid staking, lending, or depositing into vaults):

- Connect to the Ethereum network.
- In the Earn tab, choose MATIC as the input token.
- MATIC is already selected as the yield token, but you can also choose stMATIC instead.
  - Optional: switch a validator by clicking on the default one right below where the APR is displayed. Click "Stake"
- Click "Confirm" on the next page.
- Review the transaction and approve it in your wallet.
- Done! You've successfully staked MATIC. Now you can see and manage your position in the "Positions" tab.

### How do I claim my staking rewards?

- Select the network on which you want to claim rewards in the top left corner of the widget.
- Click on the "Positions" tab.
- Click on the yield for which you want to claim the rewards.
- Once you are on the yield page, click on the "Claim" button.
- Click on "Confirm" button on the new page.
- Review and approve the transaction in your wallet.

### How do I restake my staking rewards?

- Select the network on which you want to restake your rewards in the top left corner of the widget.
- Click on the "Positions" tab.
- Click on the yield for which you want to restake the rewards.
- Once you are in the yield page, click on the "Restake" button.
- Click on "Confirm" button on the new page.
- Review and approve the transaction in your wallet.
- Once your transaction is confirmed, the restaked rewards will be added to your staked balance.

### I don't see my positions, what now

If you don't see your staking position in the "Positions" tab, the likely reason is that you didn't stake via StakeKit initially. However, you can easily import the validator you staked with and then manage all your positions in one place. Here is how:

- Go to the yield for which you don't see your position.
- Click on the "Positions" tab.
- Click on the "Import" button.
- Enter the validator name or address into the search bar.
- Click on the correct validator that pops up.
- Go back to the positions where you'll see it and be able to manage your staked assets.

In case you don't know who you staked with, you can find that information in the relevant block explorer. If you have any troubles, please, send us a message to support@stakek.it and we'll help you find it and import it.

### How to select a validator

There are multiple validators that you can stake your tokens with. While staking is relatively safe, users can fall under slashing risk if their validator acts dishonestly. In Stakekit, you have the option to choose your validator so that you can stake with validators to whom you are comfortable providing your tokens.

- How to select a validator in Stakekit:
- Select the chain and token you want to stake.
- Click on the default validator displayed right below the field displaying the APR.
- Choose another validator among the ones you see in the pop-up.

### Why are my rewards gone after I staked again?

When you stake on various Cosmos-based chains, your earned rewards get automatically claimed and restaked. For example, had you staked 100 OSMO and earned 9 OSMO in staking rewards, but then staked more the following month, those 9 OSMO would be automatically claimed when you submitted the new staking transaction.

### What are network fees?

Network fees - also known as gas fees refer to the amount payable to validators that are expending computing power to validate new transactions on the blockchain.

Network fees increase with the rise in transaction demands. This is why Ethereum tends to have very high network fees. As more dApps are built on the network, more transactions are requested, causing validators to prioritize transactions that pay higher network fees.

### Why are gas fees higher?

Gas fees vary depending on the usage and congestion of a specific chain. There is limited space in each block that is produced and people compete with each other to get their transactions included on the blockchain. The higher fees you are prepared to pay, the higher the chances of getting your transaction prioritized by the block producers – therefore, when a lot of people want to send transactions, the costs grow as well.

Another reason why the gas fees might be higher is due to the higher computational requirements of a specific on-chain operation.

### What are preferred validators

In Stakekit, you have the option to choose among a range of validators to stake some of your tokens. While staking is a relatively safe way to earn rewards with your assets, there are slashing risks involved with the validator of your choice.

If your validator acts maliciously, its funds could get taken away, causing you to lose a portion of your staked funds. Make sure that you choose your validator wisely.

Stakekit provides a verified green check mark next to its recommended validators based on their reputation in the industry. Some of our recommended validators include Figment, Stakely, Everstake, Chorus One, and others.

### What is liquid staking?

Liquid staking is similar to regular staking, with the additional benefit of providing stakers with access to a liquid representation of their staked assets.

Staking is the process of delegating tokens that are used to validate transactions in blockchains that use the Proof-of-Stake consensus mechanism. Stakers are incentivized to delegate their tokens because this earns them rewards. With regular staking, staked assets are locked. So, stakers do not have access to their staked assets until they unstake their tokens. A huge drawback to this is that users are unable to leverage their staked assets to access the DeFi ecosystem. They would have to unstake their tokens instead, which not only incurs waiting periods but also loses profits. Additionally, if stakers had liquidity over their staked tokens, they would be able to make added returns on those assets.

This is why liquid staking is attractive. Having access to staked tokens allows stakers to trade or lend that asset elsewhere to make extra returns and to interact with other opportunities in the DeFi-verse. Liquid staking has encouraged a lot more engagement with staking simply because of the wide range of advantages it provides users.

### What is Staking?

Staking is a process commonly associated with blockchain-based cryptocurrencies and networks. It involves participating in the operations of a proof-of-stake (PoS) blockchain by locking up a certain amount of digital assets as collateral. This collateral is then used to support various network functions such as transaction validation, block generation, and security.

### How does Staking work?

When you stake your cryptocurrency, you are essentially contributing to the blockchain network's operations. In a PoS system, validators are chosen to create new blocks and validate transactions based on the number of coins they hold and are willing to "stake" as collateral. The more coins a participant stakes, the higher the likelihood they have of being chosen to validate transactions and earn rewards.

### What are the Benefits of Staking?

**Earn Passive Income:** Staking allows cryptocurrency holders to earn additional tokens as rewards for helping to secure the network. These rewards are often distributed in the form of the cryptocurrency being staked.**Network Security:** Stakers play a vital role in maintaining the security and integrity of the blockchain network. By staking their assets, participants are financially incentivized to act honestly and follow the rules of the network.**Participation in Governance:** Some blockchain networks allow stakeholders to participate in the decision-making processes of the network, such as voting on proposed protocol upgrades or changes.**Reduced Energy Consumption:** Unlike proof-of-work (PoW) systems used in cryptocurrencies like Bitcoin, PoS mechanisms are more energy-efficient since they don't require the same computational power for mining operations.
