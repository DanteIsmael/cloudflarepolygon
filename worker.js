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
        contract: env.CONTRACT_ADDRESS
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

        if (!documentHash || !entity) {
          return new Response(
            JSON.stringify({ error: "documentHash y entity son requeridos" }),
            { status: 400 }
          );
        }

        const provider = new ethers.JsonRpcProvider(
          env.ALCHEMY_POLYGON_RPC
        );

        const wallet = new ethers.Wallet(
          env.PRIVATE_KEY,
          provider
        );

        const contract = new ethers.Contract(
          env.CONTRACT_ADDRESS,
          CONTRACT_ABI,
          wallet
        );

        const tx = await contract.stamp(
          documentHash,
          entity,
          Number(docType),
          Number(state),
          { gasLimit: 120_000 }
        );

        return new Response(JSON.stringify({
          ok: true,
          hash: tx.hash
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
