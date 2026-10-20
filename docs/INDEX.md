# Documentation index — pi-contract-upgrade-trail

A read-only, zero-dependency timeline builder for Soroban contract deployments on
Pi Network; flags every `wasmHash` change as an upgrade.

| Document | What it covers |
|---|---|
| [`BOUNDARIES.md`](BOUNDARIES.md) | every claim this tool does **not** make, and why |
| [`DECISIONS.md`](DECISIONS.md) | the manifest-first design and why no live `wasmHash` is read |
| [`SOURCES.md`](SOURCES.md) | the manifest as the source of truth, and the measured RPC limits |
| [`VERIFICATION.md`](VERIFICATION.md) | how to reproduce the 14 offline checks |
| [`../README.md`](../README.md) | the full description and quick start |
| [`../llms.txt`](../llms.txt) | a compact summary for machine readers |

## The one-line answer

> Soroban contracts **can** be upgraded by replacing the stored `wasmHash`. This
> tool turns a deployments manifest into a per-contract history and flags every
> hash change — while stating plainly that a missing entry proves nothing.

## Claim status at a glance

| Statement | Status |
|---|---|
| Two entries with different `wasmHash` = one upgrade | **verifiable** (`node --test test.mjs`) |
| Snake_case keys and nested manifests are accepted | **verifiable** |
| No measured RPC method returns a contract's current `wasmHash` | **measured** (2026-10-19, protocol 28) |
| There is no public Soroban RPC on Mainnet | **measured** (HTTP 503) |
| The manifest is complete | **not claimed** |
| The on-chain contract still matches the last `wasmHash` | **not claimed** |
