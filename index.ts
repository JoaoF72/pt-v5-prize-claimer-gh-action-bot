import nodeFetch from 'node-fetch';
import { BaseProvider } from '@ethersproject/providers';
import { downloadContractsBlob, ContractsBlob } from '@generationsoftware/pt-v5-utils-js';
import {
  getProvider,
  loadPrizeClaimerEnvVars,
  instantiateRelayerAccount,
  runPrizeClaimer,
  PrizeClaimerEnvVars,
  PrizeClaimerConfig,
  RelayerAccount,
} from '@generationsoftware/pt-v5-autotasks-library';

const RETRY_LIMIT = 50;  // Number of times to retry

const main = async () => {
  const envVars: PrizeClaimerEnvVars = loadPrizeClaimerEnvVars();
  const provider: BaseProvider = getProvider(envVars);

  const relayerAccount: RelayerAccount = await instantiateRelayerAccount(
    provider,
    envVars.CUSTOM_RELAYER_PRIVATE_KEY,
  );

  const config: PrizeClaimerConfig = {
    ...relayerAccount,
    provider,
    chainId: envVars.CHAIN_ID,
    rewardRecipient: envVars.REWARD_RECIPIENT,
    minProfitThresholdUsd: Number(envVars.MIN_PROFIT_THRESHOLD_USD),
    covalentApiKey: envVars.COVALENT_API_KEY,
    contractJsonUrl: envVars.CONTRACT_JSON_URL,
    subgraphUrl: envVars.SUBGRAPH_URL,
  };

  const contracts: ContractsBlob = await downloadContractsBlob(config.contractJsonUrl, nodeFetch);

  let attempts = 0;
  let success = false;

  while (attempts < RETRY_LIMIT && !success) {
    try {
      await runPrizeClaimer(contracts, config);
      success = true;
    } catch (error) {
      attempts++;
      console.error(`Attempt ${attempts} failed: ${error.message}`);
      if (attempts >= RETRY_LIMIT) {
        console.error('All retry attempts failed.');
        throw error;
      }
    }
  }
}

main()
