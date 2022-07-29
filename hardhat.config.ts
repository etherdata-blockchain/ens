import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import dotenv from "dotenv";

dotenv.config();

const config: HardhatUserConfig = {
  solidity: "0.8.9",
  defaultNetwork: "main",
  networks: {
    main: {
      url: process.env.URL,
      accounts: [process.env.PK!],
    },
  },
};

export default config;
