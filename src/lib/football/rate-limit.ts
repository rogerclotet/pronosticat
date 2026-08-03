/** Leave headroom below football-data.org free tier (10 calls/min). */
const MAX_CALLS_PER_MINUTE = 8;
const WINDOW_MS = 60_000;

const callTimestamps: number[] = [];
let chain: Promise<void> = Promise.resolve();

function pruneTimestamps(now: number) {
  while (callTimestamps.length > 0 && now - callTimestamps[0]! >= WINDOW_MS) {
    callTimestamps.shift();
  }
}

async function acquireSlot(): Promise<void> {
  const now = Date.now();
  pruneTimestamps(now);

  if (callTimestamps.length >= MAX_CALLS_PER_MINUTE) {
    const waitMs = WINDOW_MS - (now - callTimestamps[0]!) + 50;
    await new Promise((resolve) => setTimeout(resolve, waitMs));
    return acquireSlot();
  }

  callTimestamps.push(Date.now());
}

/** Serialize API calls and cap throughput to stay under the free-plan limit. */
export async function withFootballApiRateLimit<T>(
  fn: () => Promise<T>,
): Promise<T> {
  let release!: () => void;
  const slot = new Promise<void>((resolve) => {
    release = resolve;
  });

  const previous = chain;
  chain = previous.then(() => slot);

  await previous;
  try {
    await acquireSlot();
    return await fn();
  } finally {
    release();
  }
}
