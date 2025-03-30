import { getPolkadotConnector } from "./connector.mjs";
import { rpcFuncs } from "./rpc.mjs";

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

  const server = Bun.serve({
    port,
    async fetch(request) {
      try {
        const requestJson = await request.json();
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

          return new Response(
            JSON.stringify({
              id: requestJson.id,
              jsonrpc: "2.0",
              result,
            }),
            { headers: { "Content-Type": "application/json" } },
          );
        } else {
          throw new Error(`Method not found: ${method}`);
        }
      } catch (error) {
        console.error("Request error:", error);
        return new Response(
          JSON.stringify({
            jsonrpc: "2.0",
            error: { code: -32603, message: error.message },
          }),
          {
            headers: { "Content-Type": "application/json" },
          },
        );
      }
    },
  });

  console.log(`WalletConnect RPC Server running on http://localhost:${server.port}`);
}