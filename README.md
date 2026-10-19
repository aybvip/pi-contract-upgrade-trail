# Pi Contract Upgrade Trail

A **read-only, zero-dependency** timeline builder for Soroban contract deployments on Pi Network.

> **Plainly:** it reads a deployments manifest (contract id, `wasmHash`, `deployTx`,
> timestamp) and prints a **per-contract history**, flagging every `wasmHash`
> change as an **upgrade**. A missing entry does **not** prove an upgrade did not
> happen — the manifest is only as complete as the deploy script that wrote it.

## Why it exists

Smart contracts are supposed to be immutable, but Soroban contracts **can** be
upgraded by replacing the stored `wasmHash`. Anyone auditing a Pi contract needs
to answer: *has this contract ever been changed, and when?* A manifest of
deployments makes that answerable; this tool turns that manifest into a readable
timeline and surfaces hash changes at a glance.

## Quick start

```bash
node upgrade-trail.mjs --manifest deployments/testnet.json
node upgrade-trail.mjs --manifest deployments/testnet.json --network mainnet
```

No install. No API keys. No writes.

## Input format

Any nested JSON containing objects with `contractId` (or `contract_id`) and
optionally `wasmHash`, `deployTx`, `timestamp`, `name`. The loader walks the
whole tree, so a flat or nested manifest both work.

```json
{
  "RihlaNft": {
    "contractId": "C...",
    "wasmHash": "03c26a…34eaa",
    "deployTx": "113a50…80f8",
    "timestamp": 1790501228227
  }
}
```

## Output

```
## RihlaNft  C…
  [0] hash=03c26a…34eaa  tx=113a50…80f8  ts=1790501228227  first_seen
  -> recorded deployments: 1, upgrades (hash changes): 0
```

## What this tool does **not** claim

| Not claimed | Why |
|---|---|
| That a single entry proves no earlier deployment | The manifest only records what the deploy script logged. Absence of an entry is not evidence of absence. |
| That the on-chain contract still matches the last `wasmHash` | The live check is best-effort; the RPC does not expose a uniform "current wasm" query across all Pi versions. |
| That the deployer is a known or trusted party | On-chain data never proves venue or team ownership. |

## See also

- `pi-soroban-events` — walk events with measured coverage
- `pi-nft-fee-check` — reconcile declared fees against on-chain events
- `pi-muxed-guard` — validate muxed deposit addresses before a send
