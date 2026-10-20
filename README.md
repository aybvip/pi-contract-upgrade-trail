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
| That the on-chain contract still matches the last `wasmHash` | **No measured RPC method returns a contract's current wasmHash.** `getContractData` is not implemented (`method not found`); `getLedgerEntries` exists but needs a base64 ledger key this tool does not build. |
| That the deployer is a known or trusted party | On-chain data never proves venue or team ownership. |
| That Mainnet was checked live | There is no public Soroban RPC on Mainnet: `rpc.mainnet.minepi.com` answers **HTTP 503** and serves a certificate that expired 2023-05-30. |

## Tests

```bash
node --test test.mjs
```

14 checks, all offline:

- a single entry reports `first_seen` and **0** upgrades
- two entries with different `wasmHash` report exactly **1** `UPGRADE`
- two entries with the same `wasmHash` report **0** upgrades
- `contract_id` / `wasm_hash` / `deploy_tx` snake_case keys are accepted
- nested manifests are walked to any depth
- two contracts are grouped into separate timelines
- an empty manifest reports `entries: 0` and exits `0`
- invalid JSON and a missing file both exit `1`
- `--offline` prints the skip notice and performs no network call
- `--network mainnet` reports the measured HTTP 503 and performs no query
- the live check never claims to have read a current `wasmHash`

`--offline` exists so the timeline logic can be verified deterministically
without depending on RPC availability.


## Documentation

| Document | What it covers |
|---|---|
| [`docs/INDEX.md`](docs/INDEX.md) | everything, in reading order, with the claim status of each figure |
| [`docs/BOUNDARIES.md`](docs/BOUNDARIES.md) | every non-claim, in full |
| [`docs/DECISIONS.md`](docs/DECISIONS.md) | the design choices and the measurement behind each |
| [`docs/SOURCES.md`](docs/SOURCES.md) | the endpoint, the date, and how to re-measure |
| [`docs/VERIFICATION.md`](docs/VERIFICATION.md) | how to reproduce the tests and the live run |
| [`llms.txt`](llms.txt) | a compact summary for machine readers |

## See also

- `pi-soroban-events` — walk events with measured coverage
- `pi-nft-fee-check` — reconcile declared fees against on-chain events
- `pi-muxed-guard` — validate muxed deposit addresses before a send
