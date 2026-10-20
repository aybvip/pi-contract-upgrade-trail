# Design decisions — pi-contract-upgrade-trail

## D1 — The manifest is the source of truth

**Measurement:** no measured RPC method returns a contract's current `wasmHash`.
`getContractData` is not implemented on the RPC (`method not found`), and
`getLedgerEntries` — which does exist — requires a base64 ledger key this tool
does not build.

**Decision:** the timeline is built from a **manifest** (the JSON a deploy script
writes: `contractId`, `wasmHash`, `deployTx`, `timestamp`). The tool does not
pretend to read the chain for this data. The live check is labelled
**"best-effort"** and only reports RPC health, never a current hash.

## D2 — Say "absence is not evidence" on every run

**Reasoning:** a timeline invites the conclusion "these are all the deployments".
That conclusion is not supported: the manifest is only as complete as the script
that wrote it.

**Decision:** every run ends with a `# Caveat` block stating that a missing entry
does not prove an upgrade did not happen. The tool never prints a completeness
claim.

## D3 — Group by `contractId`, preserve order

**Decision:** entries are grouped by `contractId` in first-seen order, and within
a contract the order of the manifest is preserved. An upgrade is flagged exactly
when a later entry's `wasmHash` differs from the previous non-null one
(`isUpgrade`), so interleaved null-hash entries do not create false upgrades. Two
entries with the same hash report zero upgrades.

## D4 — Accept the shapes deploy scripts actually emit

**Decision:** the loader (`flattenManifest`) walks the whole JSON tree and
accepts both camelCase (`contractId`, `wasmHash`, `deployTx`) and snake_case
(`contract_id`, `wasm_hash`, `deploy_tx`), plus `name`/`label` and
`timestamp`/`time`/`date`. A flat or a nested manifest both work, because a
manifest's nesting is an artefact of the deploy script, not a contract property.

## D5 — `--offline` exists so the logic is testable

**Reasoning:** a timeline tool whose output depends on RPC availability cannot be
verified deterministically.

**Decision:** `--offline` prints the skip notice and performs no network call, so
the grouping and upgrade detection can be checked without any dependency on the
endpoint. On `--network mainnet` the tool reports the measured HTTP 503 and
performs no query, rather than failing with a transport error.

## D6 — Never claim a live `wasmHash`

**Decision:** even in the live branch, the tool prints the note that no measured
RPC method returns a contract's current `wasmHash`, and that the manifest remains
the source of truth. This keeps a reader from mistaking a health probe for a
comparison against the chain.
