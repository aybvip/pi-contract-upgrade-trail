# Verification — pi-contract-upgrade-trail

Two things are checked, and they are separate: the **timeline logic** (offline,
deterministic) and the **RPC limits** (measured, and therefore dated).

## Offline: the test suite

```bash
git clone https://github.com/aybvip/pi-contract-upgrade-trail
cd pi-contract-upgrade-trail
node --test test.mjs
```

Expected result: **14 pass, 0 fail**, with **no network access**.

What the 14 checks cover:

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

## Check the timeline by hand

```bash
node upgrade-trail.mjs --manifest deployments/testnet.json --offline
```

The output lists, per contract, every recorded deployment with its `wasmHash`,
`deployTx` and timestamp, followed by the counts. Because grouping and upgrade
detection are pure, the same manifest always produces the same timeline; a
disagreement with an independent reading of the manifest shows exactly which
entry differs.

## What a passing run does and does not show

- A passing suite shows the **timeline logic** is as specified: grouping,
  upgrade detection, key acceptance, exit codes.
- It does **not** show the manifest is complete. A manifest missing an upgrade
  still produces a clean timeline; the `# Caveat` block says so on every run.
- It does **not** show the on-chain contract matches the last `wasmHash`, because
  no measured RPC method returns a current `wasmHash`.

## Reproducibility note

No digest or signature is attached to these results, and none is claimed. A
digest would prove integrity, not truth, and a signature would require naming an
authority this project does not have. What is offered instead is a command whose
outcome anyone can recompute.
