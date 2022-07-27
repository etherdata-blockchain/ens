import { Contract, Signer } from "ethers";

import hre from "hardhat";
//@ts-ignore
import namehash from "@ensdomains/eth-ens-namehash";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { ENSRegistry } from "../typechain-types";

const tld = "test";
const ethers = hre.ethers;
const utils = ethers.utils;
const labelhash = (label: string) => utils.keccak256(utils.toUtf8Bytes(label));
const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";
const ZERO_HASH =
  "0x0000000000000000000000000000000000000000000000000000000000000000";
async function main() {
  const ENSRegistry = await ethers.getContractFactory("ENSRegistry");
  const FIFSRegistrar = await ethers.getContractFactory("FIFSRegistrar");
  const ReverseRegistrar = await ethers.getContractFactory("ReverseRegistrar");
  const PublicResolver = await ethers.getContractFactory("PublicResolver");
  const signers = await ethers.getSigners();
  const accounts = signers.map((s: SignerWithAddress) => s.address);

  const ens = await ENSRegistry.deploy();
  await ens.deployed();
  const resolver = await PublicResolver.deploy(
    ens.address,
    ZERO_ADDRESS,
    ZERO_ADDRESS,
    ZERO_ADDRESS
  );
  await resolver.deployed();
  await setupResolver(ens, resolver, accounts);
  const registrar = await FIFSRegistrar.deploy(ens.address, namehash.hash(tld));
  await registrar.deployed();
  await setupRegistrar(ens, registrar);
  const reverseRegistrar = await ReverseRegistrar.deploy(ens.address);
  await reverseRegistrar.deployed();
  await setupReverseRegistrar(ens, registrar, reverseRegistrar, accounts);
}

async function setupResolver(ens: any, resolver: any, accounts: any) {
  const resolverNode = namehash.hash("resolver");
  const resolverLabel = labelhash("resolver");
  await ens.setSubnodeOwner(ZERO_HASH, resolverLabel, accounts[0]);
  await ens.setResolver(resolverNode, resolver.address);
  await resolver["setAddr(bytes32,address)"](resolverNode, resolver.address);
}

async function setupRegistrar(ens: ENSRegistry, registrar: any) {
  await ens.setSubnodeOwner(ZERO_HASH, labelhash(tld), registrar.address);
}

async function setupReverseRegistrar(
  ens: ENSRegistry,
  registrar: Contract,
  reverseRegistrar: Contract,
  accounts: string[]
) {
  await ens.setSubnodeOwner(ZERO_HASH, labelhash("reverse"), accounts[0]);
  await ens.setSubnodeOwner(
    namehash.hash("reverse"),
    labelhash("addr"),
    reverseRegistrar.address
  );
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
