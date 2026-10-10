import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { backoffDelay, retry, RetryError } from './retry.ts';

const noSleep = async () => {};

describe('backoffDelay', () => {
  it('grows exponentially and respects the cap', () => {
    const max = () => 0.999999;
    assert.equal(backoffDelay(1, 100, 10_000, max), 99);
    assert.equal(backoffDelay(4, 100, 10_000, max), 799);
    assert.equal(backoffDelay(20, 100, 10_000, max), 9_999);
  });

  it('uses full jitter between zero and the ceiling', () => {
    assert.equal(
      backoffDelay(3, 100, 10_000, () => 0),
      0
    );
    assert.equal(
      backoffDelay(3, 100, 10_000, () => 0.5),
      200
    );
  });
});

describe('retry', () => {
  it('returns as soon as an attempt succeeds', async () => {
    let calls = 0;
    const result = await retry(
      async () => {
        calls++;
        if (calls < 3) throw new Error('transient');
        return 'ok';
      },
      { sleep: noSleep }
    );
    assert.equal(result, 'ok');
    assert.equal(calls, 3);
  });

  it('gives up after maxAttempts and keeps the last error as cause', async () => {
    const delays: number[] = [];
    await assert.rejects(
      retry(
        async attempt => {
          throw new Error(`boom ${attempt}`);
        },
        {
          maxAttempts: 4,
          random: () => 0.5,
          sleep: noSleep,
          onRetry: ({ delayMs }) => delays.push(delayMs),
        }
      ),
      (err: unknown) =>
        err instanceof RetryError &&
        err.attempts === 4 &&
        (err.cause as Error).message === 'boom 4'
    );
    assert.deepEqual(delays, [50, 100, 200]);
  });

  it('does not retry non-retryable errors', async () => {
    let calls = 0;
    await assert.rejects(
      retry(
        async () => {
          calls++;
          throw Object.assign(new Error('bad request'), { status: 400 });
        },
        {
          isRetryable: e => (e as { status?: number }).status !== 400,
          sleep: noSleep,
        }
      ),
      RetryError
    );
    assert.equal(calls, 1);
  });

  it('stops waiting when aborted', async () => {
    const controller = new AbortController();
    const pending = retry(
      async () => {
        throw new Error('down');
      },
      { baseDelayMs: 60_000, random: () => 1, signal: controller.signal }
    );
    controller.abort(new Error('shutdown'));
    await assert.rejects(pending, /shutdown/);
  });
});
