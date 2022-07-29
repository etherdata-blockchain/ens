import { expect } from "chai";
import { ethers } from "hardhat";
import { EDNS } from "../edns";

describe("Given a deployed registry", () => {
  let edns: EDNS;
  let ensAddress: string;

  beforeEach(async () => {
    const addresses = await EDNS.deploy("edns");
    edns = await EDNS.connect("edns", addresses.ens);
    ensAddress = addresses.ens;
  });

  it("Test registering a domain", async () => {
    const PublicResolver = await ethers.getContractFactory("PublicResolver");
    const resolver = await PublicResolver.deploy(
      ensAddress,
      EDNS.ZERO_ADDRESS,
      EDNS.ZERO_ADDRESS,
      EDNS.ZERO_ADDRESS
    );
    await edns.register("mydomain");

    await edns.setResolver("mydomain", resolver.address);
    const result = await edns.resolve("mydomain");
    await result.resolver.setName(result.node, "mytest");

    expect(await result.resolver.name(result.node)).to.equal("mytest");
  });

  it("Test registering a domain", async () => {
    const PublicResolver = await ethers.getContractFactory("PublicResolver");
    const resolver = await PublicResolver.deploy(
      ensAddress,
      EDNS.ZERO_ADDRESS,
      EDNS.ZERO_ADDRESS,
      EDNS.ZERO_ADDRESS
    );
    await edns.register("mydomain");
    await edns.setReverseName("mydomain");

    const result = await edns.resolve(edns.accounts[0]);
    await result.resolver.setName(result.node, "mytest2");
    expect(await result.resolver.name(result.node)).to.equal("mytest2");
  });

  it("Test registering a domain", async () => {
    await edns.register("myDomain");
  });

  it("Test registering a domain", async () => {
    await edns.register("mydomain");
  });
});
