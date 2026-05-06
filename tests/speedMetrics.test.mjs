import assert from 'node:assert/strict';
import {
  applyTrafficOutcome,
  calculateWeightedLatency,
  readStreamChunkWithTimeout,
  selectHealthyTrafficNode,
} from '../src/lib/speedMetrics.js';

function testWeightedLatencyUsesDownloadedBytes() {
  const latency = calculateWeightedLatency([
    { bytes: 100, latency: 50 },
    { bytes: 300, latency: 150 },
  ]);

  assert.equal(latency, 125);
}

function testWeightedLatencyFallsBackBeforeTrafficArrives() {
  const latency = calculateWeightedLatency([
    { bytes: 0, latency: 40 },
    { bytes: 0, latency: 80 },
  ]);

  assert.equal(latency, 60);
}

async function testReadStreamChunkTimeoutAbortsController() {
  const controller = new AbortController();
  const reader = {
    read: () => new Promise(() => {}),
  };

  await assert.rejects(
    () => readStreamChunkWithTimeout(reader, 20, controller),
    /Stream read timed out/
  );
  assert.equal(controller.signal.aborted, true);
}

function testSelectHealthyTrafficNodeSkipsCoolingNodes() {
  const nodes = [{ id: 'slow' }, { id: 'fast' }];
  const stats = {
    slow: { cooldownUntil: 2_000 },
    fast: { cooldownUntil: 0 },
  };

  const selected = selectHealthyTrafficNode(nodes, stats, 0, 1_000);

  assert.equal(selected.node.id, 'fast');
  assert.equal(selected.nextCursor, 0);
}

function testSelectHealthyTrafficNodeWaitsWhenAllNodesAreCooling() {
  const nodes = [{ id: 'a' }, { id: 'b' }];
  const stats = {
    a: { cooldownUntil: 2_000 },
    b: { cooldownUntil: 3_000 },
  };

  const selected = selectHealthyTrafficNode(nodes, stats, 0, 1_000);

  assert.equal(selected, null);
}

function testBadTrafficOutcomeCoolsNode() {
  const stat = { failures: 0, cooldownUntil: 0, status: 'downloading' };

  applyTrafficOutcome(stat, {
    ok: false,
    bytes: 0,
    now: 1_000,
  }, {
    minUsefulBytes: 512 * 1024,
    cooldownBaseMs: 5_000,
    cooldownMaxMs: 30_000,
  });

  assert.equal(stat.failures, 1);
  assert.equal(stat.cooldownUntil, 6_000);
  assert.equal(stat.status, 'cooling');
}

function testGoodTrafficOutcomeRestoresNode() {
  const stat = { failures: 2, cooldownUntil: 10_000, status: 'cooling' };

  applyTrafficOutcome(stat, {
    ok: true,
    bytes: 2 * 1024 * 1024,
    now: 2_000,
  }, {
    minUsefulBytes: 512 * 1024,
    cooldownBaseMs: 5_000,
    cooldownMaxMs: 30_000,
  });

  assert.equal(stat.failures, 0);
  assert.equal(stat.cooldownUntil, 0);
  assert.equal(stat.status, 'downloading');
}

testWeightedLatencyUsesDownloadedBytes();
testWeightedLatencyFallsBackBeforeTrafficArrives();
await testReadStreamChunkTimeoutAbortsController();
testSelectHealthyTrafficNodeSkipsCoolingNodes();
testSelectHealthyTrafficNodeWaitsWhenAllNodesAreCooling();
testBadTrafficOutcomeCoolsNode();
testGoodTrafficOutcomeRestoresNode();

console.log('speedMetrics tests passed');
