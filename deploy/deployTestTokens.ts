import { setBalance } from "@nomicfoundation/hardhat-network-helpers";
import { HardhatRuntimeEnvironment } from "hardhat/types";
import { TokenConfig } from "../config/tokens";

import * as keys from "../utils/keys";
import { setAddressIfDifferent, setUintIfDifferent } from "../utils/dataStore";
import { expandDecimals } from "../utils/math";

const func = async ({ getNamedAccounts, deployments, gmx, network }: HardhatRuntimeEnvironment) => {
  const { deploy, log } = deployments;
  const { deployer } = await getNamedAccounts();
  const { getTokens } = gmx;
  const tokens: Record<string, TokenConfig> = await getTokens();

  for (const [tokenSymbol, token] of Object.entries(tokens)) {
    if (token.synthetic || !token.deploy) {
      continue;
    }

    if (network.live) {
      console.warn("WARN: Deploying token on live network");
    }

    const existingToken = await deployments.getOrNull(tokenSymbol);
    if (existingToken) {
      log(`Reusing ${tokenSymbol} at ${existingToken.address}`);
      console.warn(`WARN: bytecode diff is not checked`);
      tokens[tokenSymbol].address = existingToken.address;
      continue;
    }

    const { address, newlyDeployed } = await deploy(tokenSymbol, {
      from: deployer,
      log: true,
      contract: token.wrappedNative ? "WNT" : (network.name === "testnet" ? "BetaToken" : "MintableToken"),
      args: token.wrappedNative ? [] : [tokenSymbol, tokenSymbol, token.decimals],
    });

    tokens[tokenSymbol].address = address;
    if (newlyDeployed) {
      if (token.wrappedNative && !network.live) {
        await setBalance(address, expandDecimals(1000, token.decimals));
      }

      if (!token.wrappedNative) {
        const tokenContract = await ethers.getContractAt(network.name === "testnet" ? "BetaToken" : "MintableToken", address);
        await tokenContract.mint(deployer, expandDecimals(1000000000, token.decimals));
      }
    }
  }

  for (const [tokenSymbol, token] of Object.entries(tokens)) {
    if (token.synthetic) {
      continue;
    }

    await setUintIfDifferent(
      keys.tokenTransferGasLimit(token.address!),
      token.transferGasLimit,
      `${tokenSymbol} transfer gas limit`
    );
  }

  const wrappedAddress = Object.values(tokens).find((token) => token.wrappedNative)?.address;
  if (!wrappedAddress) {
    throw new Error("No wrapped native token found");
  }
  await setAddressIfDifferent(keys.WNT, wrappedAddress, "WNT");
};

func.tags = ["Tokens"];
func.dependencies = ["DataStore"];
export default func;
