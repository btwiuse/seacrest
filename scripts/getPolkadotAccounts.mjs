export async function getPolkadotAccounts() {
  try {
    const response = await fetch("http://localhost:8585", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: Date.now(),
        jsonrpc: "2.0",
        method: "polkadot_getAccounts",
        params: [],
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }

    const data = await response.json();

    if (data.error) {
      throw new Error(`RPC error: ${data.error.message}`);
    }

    return data.result;
  } catch (error) {
    console.error("Account fetch failed:", error.message);
    return [];
  }
}
