export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // 🔍 Health check
    if (request.method === "GET" && url.pathname === "/health") {
      try {
        const rpcRes = await fetch(env.RPC_URL, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            jsonrpc: "2.0",
            id: 1,
            method: "eth_blockNumber",
            params: []
          })
        });

        const data = await rpcRes.json();

        return new Response(
          JSON.stringify({
            status: "ok",
            network: "polygon",
            block: parseInt(data.result, 16)
          }),
          { headers: { "content-type": "application/json" } }
        );
      } catch (e) {
        return new Response(
          JSON.stringify({ status: "error", message: e.message }),
          { status: 500 }
        );
      }
    }

    // ❌ Bloqueo cualquier otra cosa
    return new Response("Not allowed", { status: 405 });
  }
};
