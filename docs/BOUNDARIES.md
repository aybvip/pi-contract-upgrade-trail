# What this tool does **not** claim

A timeline is only as complete as the manifest that feeds it, and this repository
says so on every run (the closing `# Caveat` block). The list below is the full
boundary.

| Not claimed | Why |
|---|---|
| That a single entry proves no earlier deployment | The manifest records only what the deploy script logged. **Absence of an entry is not evidence of absence.** |
| That the on-chain contract still matches the last `wasmHash` | **No measured RPC method returns a contract's current `wasmHash`.** `getContractData` is not implemented (`method not found`); `getLedgerEntries` exists but needs a base64 ledger key this tool does not build. |
| That the deployer is a known or trusted party | On-chain data never proves venue or team ownership. |
| That Mainnet was checked live | There is no public Soroban RPC on Mainnet: the host answers **HTTP 503** and serves a certificate that expired 2023-05-30. |
| That a `wasmHash` change is malicious, or a non-change is safe | The tool flags a change; judging it is the reader's job. It reports, it does not judge. |
| That the manifest schema is the only valid one | The loader accepts the common shapes; a manifest that uses other key names is not read. |
| That this is the first such tool | The prior-art position is **"no prior work found"**, not "we are first". |
| That Pi Network has adopted, reviewed or endorsed this | Adoption is **not-claimed**. |

## The shape of the claim

- **Verifiable** — decided by this repository's own code, so an offline test
  settles it: grouping by contract, detecting a `wasmHash` change, accepting
  snake_case and nested manifests, the exit codes.
- **Measured** — an observation of the live RPC: which methods exist, and that no
  method returns a current `wasmHash`.
- **Not claimed** — everything about completeness, ownership, intent, and safety.

The distinction matters because the natural question — *"is this contract still
what it was?"* — is exactly the one this tool **cannot** answer from the chain
today, and it says so rather than approximating.
