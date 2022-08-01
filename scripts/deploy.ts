import { EDNS } from "../lib/edns";
import { writeFileSync } from "fs";

async function main() {
  console.log("Deploying EDNS...");
  const address = await EDNS.deploy("etd");
  writeFileSync("edns.address.json", JSON.stringify(address));
  console.log("Deployed EDNS at", address);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
