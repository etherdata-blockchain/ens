import { ethers } from "hardhat";
//@ts-ignore
import namehash from "@ensdomains/eth-ens-namehash";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import {
  ENSRegistry,
  ENSRegistry__factory,
  FIFSRegistrar__factory,
  PublicResolver,
  PublicResolver__factory,
  ReverseRegistrar,
  ReverseRegistrar__factory,
} from "../typechain-types";

interface ResolverResult {
  node: string;
  resolver: PublicResolver;
}

async function setupResolver(ens: any, resolver: any, accounts: any) {
  const resolverNode = namehash.hash("resolver");
  const resolverLabel = EDNS.labelhash("resolver");
  await ens.setSubnodeOwner(EDNS.ZERO_HASH, resolverLabel, accounts[0]);
  await ens.setResolver(resolverNode, resolver.address);
  await resolver["setAddr(bytes32,address)"](resolverNode, resolver.address);
}

async function setupRegistrar(
  ens: ENSRegistry,
  registrar: any,
  topLevelDomain: string
) {
  await ens.setSubnodeOwner(
    EDNS.ZERO_HASH,
    EDNS.labelhash(topLevelDomain),
    registrar.address
  );
}

async function setupReverseRegistrar(
  ens: ENSRegistry,
  reverseRegistrar: ReverseRegistrar,
  accounts: string[]
) {
  const ReverseResolver = await ethers.getContractFactory("PublicResolver");
  await ens.setSubnodeOwner(
    EDNS.ZERO_HASH,
    EDNS.labelhash("reverse"),
    accounts[0]
  );
  await ens.setSubnodeOwner(
    EDNS.namehash("reverse"),
    EDNS.labelhash("addr"),
    reverseRegistrar.address
  );
  const reverseResolver = await ReverseResolver.deploy(
    ens.address,
    EDNS.ZERO_ADDRESS,
    EDNS.ZERO_ADDRESS,
    reverseRegistrar.address
  );
  await reverseRegistrar.setDefaultResolver(reverseResolver.address);
  return reverseResolver;
}

export class EDNS {
  static ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";
  static ZERO_HASH =
    "0x0000000000000000000000000000000000000000000000000000000000000000";

  static namehash(content: string): string {
    return namehash.hash(content);
  }

  static labelhash(content: string): string {
    return ethers.utils.keccak256(ethers.utils.toUtf8Bytes(content));
  }

  private topLevelDomain: string;
  accounts: string[];
  signers: SignerWithAddress[];

  private ens: ENSRegistry;

  constructor(
    topLevelDomain: string,
    ensContractAddress: string,
    accounts: string[],
    signers: SignerWithAddress[]
  ) {
    this.topLevelDomain = topLevelDomain;
    this.accounts = accounts;
    this.signers = signers;
    this.ens = ENSRegistry__factory.connect(ensContractAddress, signers[0]);
  }

  static async connect(topLevelDomain: string, ensContractAddress: string) {
    const signers = await ethers.getSigners();
    const accounts = signers.map((s: SignerWithAddress) => s.address);
    return new EDNS(topLevelDomain, ensContractAddress, accounts, signers);
  }

  /**
   * Deploy edns contracts
   * @returns Deployed EDNS address
   */
  static async deploy(topLevelDomain: string) {
    const ENSRegistry = await ethers.getContractFactory("ENSRegistry");
    const FIFSRegistrar = await ethers.getContractFactory("FIFSRegistrar");
    const ReverseRegistrar = await ethers.getContractFactory(
      "ReverseRegistrar"
    );
    const PublicResolver = await ethers.getContractFactory("PublicResolver");

    const signers = await ethers.getSigners();
    const accounts = signers.map((s: SignerWithAddress) => s.address);

    const ens = await ENSRegistry.deploy();
    await ens.deployed();

    const resolver = await PublicResolver.deploy(
      ens.address,
      EDNS.ZERO_ADDRESS,
      EDNS.ZERO_ADDRESS,
      EDNS.ZERO_ADDRESS
    );
    await resolver.deployed();
    await setupResolver(ens, resolver, accounts);

    const registrar = await FIFSRegistrar.deploy(
      ens.address,
      namehash.hash(topLevelDomain)
    );
    await registrar.deployed();
    await setupRegistrar(ens, registrar, topLevelDomain);

    const reverseRegistrar = await ReverseRegistrar.deploy(ens.address);
    await reverseRegistrar.deployed();
    await setupReverseRegistrar(ens, reverseRegistrar, accounts);

    return {
      ens: ens.address,
      resolver: resolver.address,
      registrar: registrar.address,
      reverseRegistrar: reverseRegistrar.address,
    };
  }


  private normalizeName(name: string) {
    const normalizedName = name.toLowerCase();
    return {
      normalizedName,
      domain: `${normalizedName}.${this.topLevelDomain}`,
    };
  }

  async register(name: string) {
    const { normalizedName, domain } = this.normalizeName(name);
    const registrarAddress = await this.ens.owner(
      EDNS.namehash(this.topLevelDomain)
    );

    if (registrarAddress === EDNS.ZERO_ADDRESS) {
      throw new Error(`${this.topLevelDomain} registrar is not set`);
    }

    const registrar = FIFSRegistrar__factory.connect(
      registrarAddress,
      this.signers[0]
    );

    await registrar.register(EDNS.labelhash(normalizedName), this.accounts[0]);

    const owner = await this.ens.owner(EDNS.namehash(domain));
    if (owner !== this.accounts[0]) {
      throw new Error(`${normalizedName} is not registered`);
    }
  }

  async setResolver(name: string, resolverAddress: string) {
    const { domain } = this.normalizeName(name);
    // set resolver
    await this.ens.setResolver(namehash.hash(domain), resolverAddress);

    // get resolver
    const newResolverAddress = await this.ens.resolver(namehash.hash(domain));
    if (newResolverAddress !== resolverAddress) {
      throw new Error(`${name} resolver is not set`);
    }
    return PublicResolver__factory.connect(newResolverAddress, this.signers[0]);
  }

  async setReverseName(name: string) {
    const { domain } = this.normalizeName(name);
    const reverseRegistrarAddress = await this.ens.owner(
      EDNS.namehash("addr.reverse")
    );
    const reverseRegistrar = ReverseRegistrar__factory.connect(
      reverseRegistrarAddress,
      this.signers[0]
    );

    await reverseRegistrar.setName(name);

    const node =
      this.accounts[0].substring(2).toLocaleLowerCase() + ".addr.reverse";

    const nodeHash = namehash.hash(node);

    const reverseResolverAddress = await this.ens.resolver(nodeHash);
    if (reverseResolverAddress === EDNS.ZERO_ADDRESS) {
      throw new Error(`${name} reverse resolver is not set`);
    }
    const reverseResolver = PublicResolver__factory.connect(
      reverseResolverAddress,
      this.signers[0]
    );
    // get reverse owner
    const result = await this.ens.owner(nodeHash);
    if (result === EDNS.ZERO_ADDRESS) {
      throw new Error(`${name} reverse owner is not set`);
    }
  }

  async resolve(name: string): Promise<ResolverResult> {
    if (name.startsWith("0x")) {
      return await this.resolveAddress(name.toLowerCase());
    }
    return await this._resolve(name);
  }

  private async resolveAddress(name: string) {
    const node = name.substring(2).toLocaleLowerCase() + ".addr.reverse";
    const nodeHash = namehash.hash(node);
    const reverseResolverAddress = await this.ens.resolver(nodeHash);
    const reverseResolver = PublicResolver__factory.connect(
      reverseResolverAddress,
      this.signers[0]
    );
    return {
      resolver: reverseResolver,
      node: nodeHash,
    };
  }

  private async _resolve(name: string) {
    const { domain } = this.normalizeName(name);
    const owner = await this.ens.owner(EDNS.namehash(domain));
    if (owner === EDNS.ZERO_ADDRESS) {
      throw new Error(`${name} is not registered`);
    }

    const resolverAddress = await this.ens.resolver(namehash.hash(domain));
    if (resolverAddress === EDNS.ZERO_ADDRESS) {
      throw new Error(`${name} is not configured with a resolver`);
    }

    const resolver = PublicResolver__factory.connect(
      resolverAddress,
      this.signers[0]
    );
    return {
      resolver: resolver,
      node: namehash.hash(domain),
    };
  }
}
