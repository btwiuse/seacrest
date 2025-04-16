import { ApiPromise, WsProvider } from "@polkadot/api";
import { getPolkadotAccounts } from "./getPolkadotAccounts.mjs";

// 1. Initialize Polkadot API
// const wsProvider = new WsProvider("wss://rpc.polkadot.io");
// const wsProvider = new WsProvider("wss://rpc.vara.network");
const wsProvider = new WsProvider("wss://testnet.vara.network");
const api = await ApiPromise.create({ provider: wsProvider });

const lastHeader = await api.rpc.chain.getHeader();
const blockHash = lastHeader.hash;
const blockNumber = api.registry.createType(
  "BlockNumber",
  lastHeader.number.toNumber(),
);
const tx = api.tx.system.remark("WC");
const method = api.createType("Call", tx);

const era = api.registry.createType("ExtrinsicEra", {
  current: lastHeader.number.toNumber(),
  period: 64,
});

// const address = "13dGJevQfK1tYCXNHcKhaQNi3zw3SaTZdZ727upnh3pFewiK";
const address = (await getPolkadotAccounts())[0];

const nonce = await api.rpc.system.accountNextIndex(address);

console.log({
  specVersion: api.runtimeVersion.specVersion.toHuman(),
  era: era.toHuman(),
  blockHash: blockHash.toHex(),
  blockNumber: blockNumber.toHuman(),
  address,
  nonce: nonce.toHuman(),
  method: method.toHuman(),
  version: tx.version,
});

const unsignedTransaction = {
  specVersion: api.runtimeVersion.specVersion.toHex(),
  transactionVersion: api.runtimeVersion.transactionVersion.toHex(),
  address: address,
  blockHash: blockHash.toHex(),
  blockNumber: blockNumber.toHex(),
  era: era.toHex(),
  genesisHash: api.genesisHash.toHex(),
  method: method.toHex(),
  nonce: nonce.toHex(),
  signedExtensions: api.registry.signedExtensions,
  tip: api.registry.createType("Compact<Balance>", 0).toHex(),
  version: tx.version,
  // withSignedTransaction: true,
};

console.log({ unsignedTransaction });

// 4. Send via fetch API
try {
  const response = await fetch("http://localhost:8585", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      id: 1,
      jsonrpc: "2.0",
      method: "polkadot_signTransaction",
      params: [unsignedTransaction],
    }),
  });

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  const data = await response.json();
  console.log("Signed transaction:", data.result);

  // send tx withSignedTransaction: false
  tx.addSignature(address, data.result.signature, unsignedTransaction);
  const txHash = await api.rpc.author.submitExtrinsic(tx);

  // send tx withSignedTransaction: true
  // 2025-04-16 08:05:08        RPC-CORE: submitExtrinsic(extrinsic: Extrinsic): Hash:: 1010: Invalid Transaction: Transaction call is not expected
  // Signing failed: 1010: Invalid Transaction: Transaction call is not expected
  /*
  const txHash = await api.rpc.author.submitExtrinsic(
    data.result.signedTransaction,
  );
  */
  console.log("txHash", txHash.toHex());
} catch (error) {
  console.error("Signing failed:", error.message);
} finally {
  // await api.disconnect();
  console.log("EOF");
}
