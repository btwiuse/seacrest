#!/usr/bin/env bun

import { startServer } from "./server.mjs";

let requestedNetwork = process.argv[2] || process.env["REQUESTED_NETWORK"] ||
  "vara";

const walletConnectProjectId = process.argv[3] ||
  process.env["WALLET_CONNECT_PROJECT_ID"] ||
  "4fae85e642724ee66587fa9f37b997e2";

const portStr = process.env["PORT"] || 8585;
const port = Number(portStr);

let connectOpts = {};
if (process.env["LARGE"] === "false") {
  connectOpts.large = false;
}
if (process.env["RESHOW_DELAY"]) {
  connectOpts.reshowDelay = Number(process.env["RESHOW_DELAY"]);
}

startServer(port, walletConnectProjectId, requestedNetwork, connectOpts);
