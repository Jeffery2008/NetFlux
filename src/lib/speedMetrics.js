export function calculateWeightedLatency(nodes) {
  const validNodes = nodes
    .map((node) => ({
      bytes: Number(node.bytes) || 0,
      latency: Number(node.latency),
    }))
    .filter((node) => Number.isFinite(node.latency));

  if (validNodes.length === 0) return null;

  const totalWeightedBytes = validNodes.reduce((sum, node) => sum + Math.max(node.bytes, 0), 0);
  if (totalWeightedBytes > 0) {
    const weightedLatency = validNodes.reduce((sum, node) => {
      return sum + node.latency * Math.max(node.bytes, 0);
    }, 0) / totalWeightedBytes;

    return Math.round(weightedLatency);
  }

  const averageLatency = validNodes.reduce((sum, node) => sum + node.latency, 0) / validNodes.length;
  return Math.round(averageLatency);
}

export async function readStreamChunkWithTimeout(reader, timeoutMs, controller) {
  let timeoutId;

  try {
    return await Promise.race([
      reader.read(),
      new Promise((_, reject) => {
        timeoutId = setTimeout(() => {
          controller?.abort();
          reject(new Error('Stream read timed out'));
        }, timeoutMs);
      }),
    ]);
  } finally {
    clearTimeout(timeoutId);
  }
}

export function selectHealthyTrafficNode(nodes, statsById, cursor = 0, now = Date.now()) {
  if (!nodes || nodes.length === 0) return null;

  for (let offset = 0; offset < nodes.length; offset++) {
    const index = (cursor + offset) % nodes.length;
    const node = nodes[index];
    const stats = statsById?.[node.id];
    const cooldownUntil = Number(stats?.cooldownUntil) || 0;

    if (cooldownUntil <= now) {
      return {
        node,
        nextCursor: (index + 1) % nodes.length,
      };
    }
  }

  return null;
}

export function applyTrafficOutcome(stat, outcome, config = {}) {
  if (!stat) return;

  const minUsefulBytes = config.minUsefulBytes ?? 512 * 1024;
  const cooldownBaseMs = config.cooldownBaseMs ?? 5_000;
  const cooldownMaxMs = config.cooldownMaxMs ?? 30_000;
  const now = outcome.now ?? Date.now();
  const bytes = Number(outcome.bytes) || 0;
  const isUseful = outcome.ok && bytes >= minUsefulBytes;

  if (isUseful) {
    stat.failures = 0;
    stat.cooldownUntil = 0;
    stat.status = 'downloading';
    return;
  }

  stat.failures = (stat.failures || 0) + 1;
  stat.cooldownUntil = now + Math.min(cooldownMaxMs, cooldownBaseMs * stat.failures);
  stat.status = 'cooling';
}
