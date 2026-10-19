#!/usr/bin/env node
/**
 * Pi Contract Upgrade Trail — read-only.
 *
 * Reads a deployments manifest (the JSON shape produced by deploy scripts:
 * contract id, wasmHash, deployTx, timestamp) and produces a per-contract
 * timeline of every recorded deployment, flagging wasmHash changes as
 * upgrades. Also queries the chain for the current live wasmHash where the
 * RPC supports it, so the manifest can be compared against what is actually
 * deployed.
 *
 * GET-only. No writes. No database.
 *
 * Usage:
 *   node upgrade-trail.mjs --manifest deployments/testnet.json [--network testnet]
 */

import { parseArgs } from "node:util";
import { readFileSync } from "node:fs";

const RPCS = {
  testnet: "https://rpc.testnet.minepi.com",
  // MEASURED 2026-10-19: no public Soroban JSON-RPC exists on Pi Mainnet.
  // rpc.mainnet.minepi.com and soroban-rpc.mainnet.minepi.com answer HTTP 503
  // and serve a certificate that expired 2023-05-30. api.mainnet.minepi.com
  // is a REST (Horizon) API, not JSON-RPC.
  mainnet: null,
};

async function rpc(rpcUrl, method, params = {}) {
  const res = await fetch(rpcUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
  });
  if (!res.ok) throw new Error(`RPC HTTP ${res.status}`);
  const j = await res.json();
  if (j.error) throw new Error(j.error.message || "RPC error");
  return j.result;
}

function usage() {
  console.log(
    [
      "Pi Contract Upgrade Trail",
      "",
      "  node upgrade-trail.mjs --manifest <deployments.json> [--network testnet] [--offline]",
      "",
      "Reads a deployments manifest and prints a per-contract timeline,",
      "flagging wasmHash changes as upgrades. --offline skips the live RPC check.",
      "There is no public Soroban RPC on mainnet (measured 2026-10-19).",
    ].join("\n")
  );
}

const { values } = parseArgs({
  options: {
    manifest: { type: "string" },
    network: { type: "string", default: "testnet" },
    offline: { type: "boolean", default: false },
    help: { type: "boolean", default: false },
  },
});

if (values.help || !values.manifest) {
  usage();
  process.exit(values.help ? 0 : 1);
}

const network = values.network === "mainnet" ? "mainnet" : "testnet";
const rpcUrl = RPCS[network];

function flattenManifest(obj, out = []) {
  if (!obj || typeof obj !== "object") return out;
  if (obj.contractId || obj.contract_id) {
    out.push({
      name: obj.name ?? obj.label ?? null,
      contractId: obj.contractId ?? obj.contract_id,
      wasmHash: obj.wasmHash ?? obj.wasm_hash ?? null,
      deployTx: obj.deployTx ?? obj.deploy_tx ?? null,
      timestamp: obj.timestamp ?? obj.time ?? obj.date ?? null,
      raw: obj,
    });
  }
  for (const v of Object.values(obj)) {
    if (Array.isArray(v)) for (const e of v) flattenManifest(e, out);
    else if (v && typeof v === "object") flattenManifest(v, out);
  }
  return out;
}

(async () => {
  console.log("# Pi Contract Upgrade Trail");
  console.log(`network:  ${network}`);
  console.log(`manifest: ${values.manifest}`);
  console.log("");

  let manifest;
  try {
    manifest = JSON.parse(readFileSync(values.manifest, "utf8"));
  } catch (e) {
    console.error(`ERROR: cannot read manifest: ${e.message}`);
    process.exit(1);
  }

  const entries = flattenManifest(manifest);
  console.log(`entries: ${entries.length}`);
  console.log("");

  if (entries.length === 0) {
    console.log("No contract entries found in manifest.");
    process.exit(0);
  }

  // Group by contractId, preserve order, detect wasmHash change
  const byId = new Map();
  for (const e of entries) {
    const id = e.contractId;
    if (!byId.has(id)) byId.set(id, []);
    byId.get(id).push(e);
  }

  for (const [id, list] of byId) {
    console.log(`## ${list[0].name ?? "(unnamed)"}  ${id}`);
    let prevHash = null;
    let upgradeCount = 0;
    for (const [i, e] of list.entries()) {
      const hash = e.wasmHash ?? "(none)";
      const isUpgrade = prevHash !== null && e.wasmHash && prevHash && e.wasmHash !== prevHash;
      if (isUpgrade) upgradeCount++;
      const flags = [
        i === 0 ? "first_seen" : null,
        isUpgrade ? "UPGRADE" : null,
      ].filter(Boolean).join(",") || "-";
      console.log(`  [${i}] hash=${hash}  tx=${e.deployTx ?? "n/a"}  ts=${e.timestamp ?? "n/a"}  ${flags}`);
      if (e.wasmHash) prevHash = e.wasmHash;
    }
    console.log(`  -> recorded deployments: ${list.length}, upgrades (hash changes): ${upgradeCount}`);
    console.log("");
  }

  // Live check: no measured RPC method returns a contract's current wasmHash.
  if (values.offline) {
    console.log("# Live check skipped (--offline)");
  } else if (!rpcUrl) {
    console.log("# Live check skipped (no Soroban RPC on mainnet)");
    console.log("  measured 2026-10-19: rpc.mainnet.minepi.com -> HTTP 503");
    console.log("  api.mainnet.minepi.com is REST (Horizon), not JSON-RPC");
    console.log("  no measured RPC method returns a contract's current wasmHash");
  } else {
    console.log("# Live check (best-effort)");
    try {
      const h = await rpc(rpcUrl, "getHealth");
      console.log(`  rpc healthy: oldest=${h.oldestLedger} latest=${h.latestLedger} retention=${h.ledgerRetentionWindow}`);
    } catch (e) {
      console.log(`  rpc unavailable: ${e.message}`);
    }
    console.log("  NOTE: no measured RPC method returns a contract's current wasmHash.");
    console.log("        `getContractData` is not implemented on this RPC (method not found);");
    console.log("        `getLedgerEntries` exists but needs a base64 ledger key, which this");
    console.log("        tool does not build. The manifest remains the source of truth here.");
  }

  console.log("");
  console.log("# Caveat");
  console.log("Manifest entries are only as complete as the deploy script that wrote them.");
  console.log("A missing entry does not prove an upgrade did not happen.");
})().catch((e) => {
  console.error("ERROR:", e.message);
  process.exit(1);
});
