# Sources — pi-contract-upgrade-trail

This repository's primary source is the **manifest** — the JSON a deploy script
writes. Everything the tool reports about a contract comes from that file. The
RPC is consulted only for a best-effort health note, and only because the chain
cannot supply the one fact the tool would otherwise want.

## Endpoints

| Endpoint | Role | Measured 2026-10-19 |
|---|---|---|
| `https://rpc.testnet.minepi.com` | the only Soroban JSON-RPC used, and only for a `getHealth` best-effort note | works — protocol `28`, node `28.0.1`, retention `120960` |
| `rpc.mainnet.minepi.com` | attempted; the tool refuses to query it | **HTTP 503**; certificate expired 2023-05-30 |
| `https://api.mainnet.minepi.com` | Horizon REST, not JSON-RPC — not used here | works (see `pi-nft-provenance`) |

## Measured limits that shape the tool

| Figure | Value | How to re-measure |
|---|---|---|
| `getContractData` | method not found | call it on the testnet RPC and read the error code |
| `getLedgerEntries` | exists, but needs a base64 ledger key | call it with a raw key and read the parameter error |
| Any method returning a current `wasmHash` | none found | enumerate the RPC surface and look for one; none appears |
| Mainnet Soroban RPC | HTTP 503 | request the host and read the status |
| RPC health fields | `oldestLedger`, `latestLedger`, `ledgerRetentionWindow` | `getHealth` on the testnet RPC |

These are the measurements behind the decision to treat the **manifest** as the
source of truth instead of the chain: the chain demonstrably does not expose a
contract's current `wasmHash` through any method this tool can find.

## Re-checking everything

```bash
git clone https://github.com/aybvip/pi-contract-upgrade-trail
cd pi-contract-upgrade-trail
node --test test.mjs                                              # 14 offline checks
node upgrade-trail.mjs --manifest deployments/testnet.json        # timeline + best-effort health
node upgrade-trail.mjs --manifest deployments/testnet.json --offline   # no network
node upgrade-trail.mjs --manifest deployments/testnet.json --network mainnet
```

## Provenance of the numbers

The measurements were taken on **2026-10-19** against the Testnet Soroban RPC at
protocol version **28**. The protocol version is read from `getNetwork` /
`getVersionInfo` at measurement time. No third-party mirror or blog is used as a
source; where a widely held assumption ("the chain can tell you a contract's
current code") is addressed, it is addressed by showing the method that would be
needed is absent — measured, not assumed.
