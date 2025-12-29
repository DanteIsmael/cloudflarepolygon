import { ethers } from "ethers";

/* =====================
   ABI DEL CONTRATO
===================== */
const CONTRACT_ABI = [
  {
    "inputs": [
      { "internalType": "bytes32", "name": "documentHash", "type": "bytes32" }
    ],
    "name": "exists",
    "outputs": [
      { "internalType": "bool", "name": "", "type": "bool" }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      { "internalType": "bytes32", "name": "documentHash", "type": "bytes32" }
    ],
    "name": "getRecord",
    "outputs": [
      { "internalType": "address", "name": "owner", "type": "address" },
      { "internalType": "uint256", "name": "timestamp", "type": "uint256" },
      { "internalType": "uint256", "name": "blockNumber", "type": "uint256" },
      { "internalType": "bytes32", "name": "entity", "type": "bytes32" },
      { "internalType": "uint16", "name": "docType", "type": "uint16" },
      { "internalType": "uint16", "name": "state", "type": "uint16" }
    ],
    "stateMutability": "view",
    "type": "function"
  },
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

/* =====================
   HELPERS
===================== */
function isBytes32(value) {
  return typeof value === "string" &&
    /^0x[0-9a-fA-F]{64}$/.test(value);
}

/* =====================
   WORKER
===================== */
export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    /* =====================
       HEALTH
    ====================== */
    if (url.pathname === "/health") {
      return Response.json({
        status: "ok",
        network: "polygon",
        rpc: env.RPC_URL ? "set" : "missing",
        contract: env.CONTRACT_ADDRESS || "missing"
      });
    }

    /* =====================
       STAMP
    ====================== */
    if (url.pathname === "/stamp") {
      if (request.method !== "POST") {
        return new Response("Method Not Allowed", { status: 405 });
      }

      try {
        const { documentHash, entity, docType, state } = await request.json();

        if (!isBytes32(documentHash)) {
          return Response.json({ ok: false, error: "documentHash inválido" }, { status: 400 });
        }
        if (!isBytes32(entity)) {
          return Response.json({ ok: false, error: "entity inválido" }, { status: 400 });
        }

        const provider = new ethers.JsonRpcProvider(env.RPC_URL.trim());
        const wallet = new ethers.Wallet(env.PRIVATE_KEY.trim(), provider);

        const contract = new ethers.Contract(
          env.CONTRACT_ADDRESS.trim(),
          CONTRACT_ABI,
          wallet
        );

        const estimatedGas = await contract.stamp.estimateGas(
          documentHash,
          entity,
          Number(docType),
          Number(state)
        );

        const gasLimit = (estimatedGas * 12n) / 10n;

        const tx = await contract.stamp(
          documentHash,
          entity,
          Number(docType),
          Number(state),
          { gasLimit }
        );

        return Response.json({
          ok: true,
          hash: tx.hash,
          gasLimit: gasLimit.toString()
        });

      } catch (e) {
        return Response.json({ ok: false, error: e.message }, { status: 500 });
      }
    }

    /* =====================
       VERIFY (EXISTS)
    ====================== */
    if (url.pathname === "/verify") {
      if (request.method !== "POST") {
        return new Response("Method Not Allowed", { status: 405 });
      }

      try {
        const { documentHash } = await request.json();

        if (!isBytes32(documentHash)) {
          return Response.json({ ok: false, error: "documentHash inválido" }, { status: 400 });
        }

        const provider = new ethers.JsonRpcProvider(env.RPC_URL.trim());
        const contract = new ethers.Contract(
          env.CONTRACT_ADDRESS.trim(),
          CONTRACT_ABI,
          provider
        );

        const exists = await contract.exists(documentHash);

        return Response.json({
          ok: true,
          exists
        });

      } catch (e) {
        return Response.json({ ok: false, error: e.message }, { status: 500 });
      }
    }

    /* =====================
       GET RECORD (SAFE)
    ====================== */
    if (url.pathname === "/getRecord") {
      if (request.method !== "POST") {
        return new Response("Method Not Allowed", { status: 405 });
      }

      try {
        const { documentHash } = await request.json();

        if (!isBytes32(documentHash)) {
          return Response.json({ ok: false, error: "documentHash inválido" }, { status: 400 });
        }

        const provider = new ethers.JsonRpcProvider(env.RPC_URL.trim());
        const contract = new ethers.Contract(
          env.CONTRACT_ADDRESS.trim(),
          CONTRACT_ABI,
          provider
        );

        const exists = await contract.exists(documentHash);
        if (!exists) {
          return Response.json({ ok: false, error: "Hash no encontrado" }, { status: 404 });
        }

        const r = await contract.getRecord(documentHash);

        return Response.json({
          ok: true,
          owner: r.owner,
          timestamp: Number(r.timestamp),
          blockNumber: Number(r.blockNumber),
          entity: r.entity,
          docType: Number(r.docType),
          state: Number(r.state)
        });

      } catch (e) {
        return Response.json({ ok: false, error: e.message }, { status: 500 });
      }
    }

    return new Response("Not Found", { status: 404 });
  }
};
