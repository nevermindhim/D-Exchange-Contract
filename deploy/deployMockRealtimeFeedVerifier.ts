import { HardhatRuntimeEnvironment } from "hardhat/types";
import { createDeployFunction } from "../utils/deploy";

const func = createDeployFunction({
  contractName: "MockRealtimeFeedVerifier",
});

func.skip = async ({ network }: HardhatRuntimeEnvironment) => {
  const shouldDeployForNetwork = ["hardhat", "tenderly", "testnet"];
  return !shouldDeployForNetwork.includes(network.name);
};

export default func;
