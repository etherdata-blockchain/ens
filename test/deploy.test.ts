import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { ethers } from "hardhat";
//@ts-ignore
import namehash from "@ensdomains/eth-ens-namehash";
import { expect } from "chai";
import {
  DefaultReverseResolver,
  ENSRegistry,
  FIFSRegistrar,
  PublicResolver,
  ReverseRegistrar,
} from "../typechain-types";

const tld = "test";
const utils = ethers.utils;
const labelhash = (label: string) => utils.keccak256(utils.toUtf8Bytes(label));
const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";
const ZERO_HASH =
  "0x0000000000000000000000000000000000000000000000000000000000000000";

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
  resolver: DefaultReverseResolver,
  reverseRegistrar: ReverseRegistrar,
  accounts: string[]
) {
  await ens.setSubnodeOwner(ZERO_HASH, labelhash("reverse"), accounts[0]);
  await ens.setSubnodeOwner(
    namehash.hash("reverse"),
    labelhash("addr"),
    reverseRegistrar.address
  );
  await reverseRegistrar.setDefaultResolver(resolver.address);
}

describe("Given a deployed registry", () => {
  let ens: ENSRegistry;
  let registrar: FIFSRegistrar;
  let reverseRegistrar: ReverseRegistrar;
  let reverseResolver: DefaultReverseResolver;
  let resolver: PublicResolver;
  let signers: SignerWithAddress[];
  let accounts: string[];

  beforeEach(async () => {
    const ENSRegistry = await ethers.getContractFactory("ENSRegistry");
    const FIFSRegistrar = await ethers.getContractFactory("FIFSRegistrar");
    const ReverseRegistrar = await ethers.getContractFactory(
      "ReverseTestRegistrar"
    );
    const PublicResolver = await ethers.getContractFactory("PublicResolver");
    const ReverseResolver = await ethers.getContractFactory(
      "DefaultReverseResolver"
    );

    signers = await ethers.getSigners();
    accounts = signers.map((s: SignerWithAddress) => s.address);

    ens = await ENSRegistry.deploy();
    await ens.deployed();

    resolver = await PublicResolver.deploy(
      ens.address,
      ZERO_ADDRESS,
      ZERO_ADDRESS,
      ZERO_ADDRESS
    );
    await resolver.deployed();
    await setupResolver(ens, resolver, accounts);

    reverseResolver = await ReverseResolver.deploy(ens.address);

    registrar = await FIFSRegistrar.deploy(ens.address, namehash.hash(tld));
    await registrar.deployed();
    await setupRegistrar(ens, registrar);

    reverseRegistrar = await ReverseRegistrar.deploy(ens.address);
    await reverseRegistrar.deployed();
    await setupReverseRegistrar(
      ens,
      reverseResolver,
      reverseRegistrar,
      accounts
    );
  });

  it("Test registering a domain", async () => {
    console.log();
    console.log("Public resolver", resolver.address);
    console.log("Registrar", registrar.address);
    console.log("Reverse registrar", reverseRegistrar.address);
    console.log("ENS", ens.address);
    console.log("Account", accounts[0]);
    console.log();

    // register a domain
    const domain = `mydomain.${tld}`;
    await registrar.register(labelhash("mydomain"), accounts[0]);

    // check that the domain is registered
    const owner = await ens.owner(namehash.hash(domain));
    expect(owner).to.equal(accounts[0]);

    // set resolver
    await ens.setResolver(namehash.hash(domain), resolver.address);

    // get resolver
    const resolverAddress = await ens.resolver(namehash.hash(domain));
    expect(resolverAddress).to.equal(resolver.address);

    // get reverse registrar and set reverse resolver
    await reverseRegistrar.setName(domain);

    // get reverse resolver
    const reversedNaming =
      accounts[0].substring(2).toLocaleLowerCase() + ".addr.reverse";
    const reverseResolverAddress = await ens.resolver(
      namehash.hash(reversedNaming)
    );
    console.log("reverse resolver", reverseResolverAddress);
    expect(reverseResolverAddress).to.equal(reverseResolver.address);

    const result = await reverseResolver.name(namehash.hash(accounts[0]));
    expect(result).to.equal(domain);
  });
});
