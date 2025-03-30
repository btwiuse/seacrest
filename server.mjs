import http from "http";
import { getPolkadotConnector } from "./connector.mjs";

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

async function polkadot_getAccounts(
  signClient,
  session,
  chainCAIP,
  accounts,
) {
  return accounts.map((a) => a.address);
}

const rpcFuncs = {
  polkadot_signTransaction,
  polkadot_signMessage,
  polkadot_getAccounts,
};

function getReqBody(req) {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (chunk) => (body += chunk));
    req.on("end", () => resolve(body));
    req.on("error", reject);
  });
}

async function proxy(host, request, reqBody, response) {
  const pathname = URL.parse(request.url).pathname;
  const hostname = URL.parse(host).host;
  const proxyUrl = `${host}${pathname === "/" ? "" : pathname}`;
  const reqHeaders = { ...request.headers, host: hostname };

  const result = await fetch(proxyUrl, {
    method: request.method,
    headers: reqHeaders,
    body: reqBody,
  });

  const headers = Object.fromEntries(
    [...result.headers].filter(([name]) =>
      name.toLowerCase() === "content-type"
    ),
  );

  response.writeHead(result.status, headers);
  result.body.pipe(response);
}

async function sendJson(response, json) {
  response.writeHead(200, { "content-type": "application/json" });
  response.end(JSON.stringify(json));
}

export async function startServer(
  host,
  port,
  walletConnectProjectId,
  requestedChain,
  connectOpts = {},
) {
  const connectorPromise = getPolkadotConnector(
    walletConnectProjectId,
    requestedChain,
    connectOpts,
  );

  http.createServer(async (request, response) => {
    try {
      const reqBody = await getReqBody(request);
      const requestJson = JSON.parse(reqBody);
      const method = requestJson.method;

      if (rpcFuncs[method]) {
        console.log(`Handling Polkadot method: ${method}`);

        const { signClient, session, chainCAIP, accounts } =
          await connectorPromise;
        const result = await rpcFuncs[method](
          signClient,
          session,
          chainCAIP,
          accounts,
          requestJson.params,
        );

        await sendJson(response, {
          id: requestJson.id,
          jsonrpc: "2.0",
          result,
        });
      } else {
        console.log(`Proxying method: ${method}`);
        await proxy(host, request, reqBody, response);
      }
    } catch (error) {
      console.error("Request error:", error);
      sendJson(response, {
        jsonrpc: "2.0",
        error: { code: -32603, message: error.message },
      });
    }
  }).listen(port);

  console.log(`Polkadot RPC proxy running on http://localhost:${port}`);
}
