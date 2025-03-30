import http from "http";
import { getPolkadotConnector } from "./connector.mjs";
import { rpcFuncs } from "./rpc.mjs";

function getReqBody(req) {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (chunk) => (body += chunk));
    req.on("end", () => resolve(body));
    req.on("error", reject);
  });
}

async function sendJson(response, json) {
  response.writeHead(200, { "content-type": "application/json" });
  response.end(JSON.stringify(json));
}

export async function startServer(
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
        throw new Error(`Method not found: ${method}`);
      }
    } catch (error) {
      console.error("Request error:", error);
      sendJson(response, {
        jsonrpc: "2.0",
        error: { code: -32603, message: error.message },
      });
    }
  }).listen(port);

  console.log(`WalletConnect RPC Server running on http://localhost:${port}`);
}
