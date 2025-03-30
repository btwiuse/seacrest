import { ApiPromise, WsProvider } from "@polkadot/api";
import { getPolkadotAccounts } from "./getPolkadotAccounts.mjs";

const rpc = "wss://rpc.vara.network";

const wsProvider = new WsProvider(rpc);
const api = await ApiPromise.create({ provider: wsProvider });
const genesisHash = api.genesisHash.toHex();

const caip = `polkadot:${genesisHash.replace("0x", "").substring(0, 32)}`;

const signedExtensions = api.registry.signedExtensions;

console.log({
  rpc,
  genesisHash,
  caip,
  signedExtensions,
});

api.disconnect();
