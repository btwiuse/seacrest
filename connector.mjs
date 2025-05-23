import { SignClient } from "@walletconnect/sign-client";
import { KeyValueStorage } from "@walletconnect/keyvaluestorage";
import qrcode from "qrcode-terminal";

const POLKADOT_CHAINS = {
  "polkadot": "polkadot:91b171bb158e2d3848fa23a9f1c25182",
  "westend": "polkadot:e143f23803ac50e8f6f8e62695d1ce9e",
  "kusama": "polkadot:b0a8d493285c2df73290dfb7e61f870f",
  "rococo": "polkadot:6402de9248192d349f9625764fad3357",
  "vara": "polkadot:fe1b4c55fd4d668101126434206571a7",
  "tvara": "polkadot:525639f713f397dcf839bd022cd821f3",
};

const CLIENT_METADATA = {
  description: "WalletConnect RPC Server",
  url: "https://github.com/btwiuse/seacrest",
  icons: [
    "https://raw.githubusercontent.com/btwiuse/seacrest/refs/heads/main/logo.png",
  ],
  name: "Waku",
};

const REQUIRED_NAMESPACES = {
  polkadot: {
    methods: [
      "polkadot_signTransaction",
      "polkadot_signMessage",
      // Not available:
      // "polkadot_getAccounts",
    ],
    events: ["chainChanged", "accountsChanged"],
  },
};

let signClientInstance = null;

export async function ensureSignClient(projectId, storageOptions = {}) {
  if (!signClientInstance) {
    signClientInstance = await SignClient.init({
      projectId,
      metadata: CLIENT_METADATA,
      storage: new KeyValueStorage({
        database: "wc_polkadot_db",
        table: "sessions",
        ...storageOptions,
      }),
    });
  }
  return signClientInstance;
}

export async function getExistingSession(chainCAIP) {
  if (!signClientInstance) return null;

  const sessions = signClientInstance.session.getAll();
  return sessions.find((session) =>
    session.namespaces.polkadot.chains.includes(chainCAIP)
  );
}

async function createNewSession(chainCAIP, options) {
  const { uri, approval } = await signClientInstance.connect({
    requiredNamespaces: {
      polkadot: {
        ...REQUIRED_NAMESPACES.polkadot,
        chains: [chainCAIP],
      },
    },
  });

  if (!uri) throw new Error("Failed to generate connection URI");

  const cleanupQrDisplay = displayQrCode(uri, options);

  try {
    let promises = [ approval() ];
    if (options.uriTimeout > 0) {
      promises.push(
	new Promise((_, reject) =>
	  setTimeout(() => reject(new Error("Connection timeout")), options.uriTimeout),
	),
      );
    }
    const session = await Promise.race(promises);

    return session;
  } finally {
    cleanupQrDisplay();
  }
}

function displayQrCode(uri, options) {
  console.info(
    `\n\n[Polkadot][WalletConnect] Scan QR code or use URI:\n\n${uri}\n\n`,
  );
  qrcode.generate(uri, { small: !options.large });

  let intervalId;
  if (options.reshowDelay !== null) {
    intervalId = setInterval(() => {
      console.info("\n[Polkadot][WalletConnect] Refreshing QR code:\n");
      qrcode.generate(uri, { small: !options.large });
    }, options.reshowDelay);
  }

  return () => intervalId && clearInterval(intervalId);
}

function validateChainId(requestedChain) {
  if (POLKADOT_CHAINS[requestedChain]) {
    return POLKADOT_CHAINS[requestedChain];
  }

  if (Object.values(POLKADOT_CHAINS).includes(requestedChain)) {
    return requestedChain;
  }

  throw new Error(`Unsupported Polkadot chain: ${requestedChain}`);
}

function validateSession(session, expectedChainCAIP) {
  const [expectedNamespace, expectedChainId] = expectedChainCAIP.split(":");

  const accounts = session.namespaces.polkadot.accounts.map((account) => {
    const [namespace, chainId, address] = account.split(":");
    return {
      namespace,
      chainId,
      address,
      caip: `${namespace}:${chainId}`,
    };
  });

  const invalidAccounts = accounts.filter(
    (account) => account.caip !== expectedChainCAIP,
  );

  if (invalidAccounts.length > 0) {
    throw new Error(
      `Network mismatch! Expected ${expectedChainCAIP}, ` +
        `found: ${invalidAccounts.map((a) => a.caip).join(", ")}`,
    );
  }

  return accounts.map((account) => ({
    address: account.address,
    caip: account.caip,
    chainId: account.chainId,
    namespace: account.namespace,
  }));
}

export async function getPolkadotConnector(
  projectId,
  requestedChain,
  connectOpts = {},
) {
  const options = {
    reshowDelay: null,
    // 0 = no timeout; 120_000 = 2 min
    uriTimeout: 0,
    large: false,
    ...connectOpts,
  };

  const chainCAIP = validateChainId(requestedChain);

  await ensureSignClient(projectId);

  let session = await getExistingSession(chainCAIP);
  if (!session) {
    session = await createNewSession(chainCAIP, options);
  }

  const accounts = validateSession(session, chainCAIP);

  console.info(
    "[Polkadot][WalletConnect] Connected accounts:",
    accounts.map((a) => a.address),
  );

  return {
    signClient: signClientInstance,
    session,
    chainCAIP,
    accounts,
  };
}
