import test from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const CLI = join(HERE, "upgrade-trail.mjs");

function run(args) {
  try {
    const out = execFileSync(process.execPath, [CLI, ...args], { encoding: "utf8", stdio: "pipe" });
    return { code: 0, out };
  } catch (e) {
    return { code: e.status ?? 1, out: (e.stdout ?? "") + (e.stderr ?? "") };
  }
}

function withManifest(manifest) {
  const dir = mkdtempSync(join(tmpdir(), "upgrade-trail-"));
  const p = join(dir, "deployments.json");
  writeFileSync(p, JSON.stringify(manifest));
  return { path: p, cleanup: () => rmSync(dir, { recursive: true, force: true }) };
}

test("--help exits 0", () => {
  const r = run(["--help"]);
  assert.equal(r.code, 0);
});

test("missing --manifest exits 1", () => {
  const r = run([]);
  assert.equal(r.code, 1);
});

test("a single deployment reports first_seen and zero upgrades", () => {
  const f = withManifest({
    RihlaNft: { contractId: "CAAA", wasmHash: "hash-a", deployTx: "tx1", timestamp: 1 },
  });
  try {
    const r = run(["--manifest", f.path, "--offline"]);
    assert.equal(r.code, 0);
    assert.match(r.out, /first_seen/);
    assert.match(r.out, /upgrades \(hash changes\):\s+0/);
  } finally {
    f.cleanup();
  }
});

test("two deployments with different wasmHash report one UPGRADE", () => {
  const f = withManifest({
    RihlaNft: [
      { contractId: "CAAA", wasmHash: "hash-a", deployTx: "tx1" },
      { contractId: "CAAA", wasmHash: "hash-b", deployTx: "tx2" },
    ],
  });
  try {
    const r = run(["--manifest", f.path, "--offline"]);
    assert.equal(r.code, 0);
    assert.match(r.out, /UPGRADE/);
    assert.match(r.out, /upgrades \(hash changes\):\s+1/);
  } finally {
    f.cleanup();
  }
});

test("two deployments with the same wasmHash report zero upgrades", () => {
  const f = withManifest({
    RihlaNft: [
      { contractId: "CAAA", wasmHash: "hash-a", deployTx: "tx1" },
      { contractId: "CAAA", wasmHash: "hash-a", deployTx: "tx2" },
    ],
  });
  try {
    const r = run(["--manifest", f.path, "--offline"]);
    assert.equal(r.code, 0);
    assert.match(r.out, /upgrades \(hash changes\):\s+0/);
  } finally {
    f.cleanup();
  }
});

test("contract_id / wasm_hash snake_case keys are accepted", () => {
  const f = withManifest({
    Market: { contract_id: "CBBB", wasm_hash: "h1", deploy_tx: "t1" },
  });
  try {
    const r = run(["--manifest", f.path, "--offline"]);
    assert.equal(r.code, 0);
    assert.match(r.out, /CBBB/);
    assert.match(r.out, /entries:\s+1/);
  } finally {
    f.cleanup();
  }
});

test("nested manifests are walked to any depth", () => {
  const f = withManifest({
    deployments: { testnet: { Nft: { contractId: "C1", wasmHash: "a" } } },
    other: [{ contractId: "C2", wasmHash: "b" }],
  });
  try {
    const r = run(["--manifest", f.path, "--offline"]);
    assert.equal(r.code, 0);
    assert.match(r.out, /entries:\s+2/);
  } finally {
    f.cleanup();
  }
});

test("two contracts are grouped separately", () => {
  const f = withManifest([
    { contractId: "C1", wasmHash: "a" },
    { contractId: "C2", wasmHash: "b" },
    { contractId: "C1", wasmHash: "a2" },
  ]);
  try {
    const r = run(["--manifest", f.path, "--offline"]);
    assert.equal(r.code, 0);
    assert.match(r.out, /recorded deployments:\s+2, upgrades \(hash changes\):\s+1/);
    assert.match(r.out, /recorded deployments:\s+1, upgrades \(hash changes\):\s+0/);
  } finally {
    f.cleanup();
  }
});

test("an empty manifest reports zero entries and exits 0", () => {
  const f = withManifest({});
  try {
    const r = run(["--manifest", f.path, "--offline"]);
    assert.equal(r.code, 0);
    assert.match(r.out, /entries:\s+0/);
  } finally {
    f.cleanup();
  }
});

test("invalid JSON exits 1", () => {
  const dir = mkdtempSync(join(tmpdir(), "upgrade-trail-bad-"));
  try {
    const p = join(dir, "bad.json");
    writeFileSync(p, "{ nope");
    const r = run(["--manifest", p, "--offline"]);
    assert.equal(r.code, 1);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("missing file exits 1", () => {
  const r = run(["--manifest", "Z:/does/not/exist.json", "--offline"]);
  assert.equal(r.code, 1);
});

test("--offline prints the skip notice and performs no network call", () => {
  const f = withManifest({ X: { contractId: "C1", wasmHash: "a" } });
  try {
    const r = run(["--manifest", f.path, "--offline"]);
    assert.match(r.out, /Live check skipped/);
  } finally {
    f.cleanup();
  }
});

test("--network mainnet reports that no Soroban RPC exists and does not query", () => {
  const f = withManifest({ X: { contractId: "C1", wasmHash: "a" } });
  try {
    const r = run(["--manifest", f.path, "--network", "mainnet"]);
    assert.equal(r.code, 0);
    assert.match(r.out, /no Soroban RPC on mainnet/);
    assert.match(r.out, /HTTP 503/);
  } finally {
    f.cleanup();
  }
});

test("the live check never claims to have read a current wasmHash", () => {
  const f = withManifest({ X: { contractId: "C1", wasmHash: "a" } });
  try {
    const r = run(["--manifest", f.path, "--network", "mainnet"]);
    assert.doesNotMatch(r.out, /current wasmHash: [0-9a-f]{6}/i);
    assert.match(r.out, /no measured RPC method returns a contract's current wasmHash/);
  } finally {
    f.cleanup();
  }
});
