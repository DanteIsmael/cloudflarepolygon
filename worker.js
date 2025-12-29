import { ethers } from "ethers";

export default {
  async fetch(request, env) {
    try {
      if (request.method !== "POST") {
        return new Response("Method Not Allowed", { status: 405 });
      }

      // =========================
      // AUTH SIMPLE (API KEY)
      // =========================
      const apiKey = request.headers.get("x-api-key");
      if (apiKey !== env.API_KEY) {
        return new Response(
          JSON.stringify({ status: "error", msg: "UNAUTHORIZED" }),
          { status: 401 }
        );
      }

      // =========================
      // INPUT
      // =========================
      const body = await request.json();
      const { hash, entity, type, state } = body;

      if (!/^0x[a-fA-F0-9]{64}$/.test(hash))
        throw "DOCUMENT HASH INVALID";
      if (!/^0x[a-fA-F0-9]{64}$/.test(entity))
        throw "ENTITY INVALID";
      if (!Number.isInteger(type) || !Number.isInteger(state))
        throw "TYPE OR STATE INVALID";

      // =========================
      // PROVIDER + WALLET
      // =========================
      const provider = new ethers.JsonRpcProvider(env.ALCHEMY_RPC_URL);
      const wallet = new ethers.Wallet(env.PRIVATE_KEY, provider);

      // =========================
      // CONTRACT
      // =========================
      const abi = [
        "function stamp(bytes32,bytes32,uint16,uint16)"
      ];

      const contract = new ethers.Contract(
        env.CONTRACT_ADDRESS,
        abi,
        wallet
      );

      // =========================
      // TX
      // =========================
      const tx = await contract.stamp(
        hash,
        entity,
        type,
        state,
        {
          gasLimit: 250000
        }
      );

      return new Response(
        JSON.stringify({
          status: "ok",
          tx: tx.hash
        }),
        { headers: { "Content-Type": "application/json" } }
      );

    } catch (err) {
      return new Response(
        JSON.stringify({
          status: "error",
          msg: err.toString()
        }),
        { status: 400 }
      );
    }
  }
};
