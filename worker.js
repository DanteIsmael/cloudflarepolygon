import { ethers } from "ethers";

const CONTRACT_ABI = [
  {
    "inputs": [
      { "internalType": "bytes32", "name": "documentHash", "type": "bytes32" },
      { "internalType": "bytes32", "name": "entity", "type": "bytes32" },
      { "internalType": "uint16", "name": "docType", "type": "uint16" },
      { "internalType": "uint16", "name": "state", "type": "uint16" }
    ],
    "name": "stamp",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  }
];

function isBytes32(value) {
  return typeof value === "string" &&
    /^0x[0-9a-fA-F]{64}$/.test(value);
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    /* =====================
       HEALTH CHECK
    ====================== */
    if (url.pathname === "/health") {
      return new Response(JSON.stringify({
        status: "ok",
        network: "polygon",
        rpc: env.RPC_URL ? "set" : "missing",
        contract: env.CONTRACT_ADDRESS || "missing"
      }), {
        headers: { "Content-Type": "application/json" }
      });
    }

    /* =====================
       STAMP ON-CHAIN
    ====================== */
    if (url.pathname === "/stamp") {

      if (request.method !== "POST") {
        return new Response("Method Not Allowed", { status: 405 });
      }

      try {
        const body = await request.json();
        const { documentHash, entity, docType, state } = body;

        // 🔒 Validaciones duras
        if (!isBytes32(documentHash)) {
          return new Response(JSON.stringify({
            ok: false,
            error: "documentHash debe ser bytes32 (0x + 64 hex)"
          }), { status: 400 });
        }

        if (!isBytes32(entity)) {
          return new Response(JSON.stringify({
            ok: false,
            error: "entity debe ser bytes32 (0x + 64 hex)"
          }), { status: 400 });
        }

        const provider = new ethers.JsonRpcProvider(
          env.RPC_URL.trim()
        );

        const wallet = new ethers.Wallet(
          env.PRIVATE_KEY.trim(),
          provider
        );

        const contract = new ethers.Contract(
          env.CONTRACT_ADDRESS.trim(),
          CONTRACT_ABI,
          wallet
        );

        // 🔥 Estimación de gas real
        const estimatedGas = await contract.stamp.estimateGas(
          documentHash,
          entity,
          Number(docType),
          Number(state)
        );

        // +20% buffer institucional
        const gasLimit = (estimatedGas * 12n) / 10n;

        const tx = await contract.stamp(
          documentHash,
          entity,
          Number(docType),
          Number(state),
          { gasLimit }
        );

        return new Response(JSON.stringify({
          ok: true,
          hash: tx.hash,
          gasLimit: gasLimit.toString()
        }), {
          headers: { "Content-Type": "application/json" }
        });

      } catch (e) {
        return new Response(JSON.stringify({
          ok: false,
          error: e.message
        }), { status: 500 });
      }
    }

    /* =====================
       DEFAULT
    ====================== */
    return new Response("Not Found", { status: 404 });
  }
};
