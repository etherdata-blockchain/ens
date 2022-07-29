import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";

const config: HardhatUserConfig = {
  solidity: "0.8.9",
  // defaultNetwork: "main",
  // networks: {
  //   main: {
  //     url: "http://127.0.0.1:7545",
  //     accounts: [
  //       "c60545c6a03b63f80c4a9cfc11ce1fa7d5e9cd639e40537dbeaeb68f174dcccf",
  //     ],
  //   },
  // },
};

export default config;
