async function polkadot_signTransaction(
  signClient,
  session,
  chainCAIP,
  accounts,
  [transactionPayload],
) {
  console.log(
    { chainCAIP, accounts, transactionPayload },
  );
  return signClient.request({
    topic: session.topic,
    chainId: chainCAIP,
    request: {
      method: "polkadot_signTransaction",
      params: {
        address: accounts[0].address,
        transactionPayload,
      },
    },
  });
}

async function polkadot_signMessage(
  signClient,
  session,
  chainCAIP,
  accounts,
  [message],
) {
  return signClient.request({
    topic: session.topic,
    chainId: chainCAIP,
    request: {
      method: "polkadot_signMessage",
      params: {
        address: accounts[0].address,
        message,
      },
    },
  });
}

// polkadot_getAccounts is not supported via RPC
// here directly return accounts from session
async function polkadot_getAccounts(
  signClient,
  session,
  chainCAIP,
  accounts,
) {
  return accounts.map((a) => a.address);
}

export const rpcFuncs = {
  polkadot_signTransaction,
  polkadot_signMessage,
  polkadot_getAccounts,
};
