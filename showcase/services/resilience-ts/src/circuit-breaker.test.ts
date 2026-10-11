import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  CircuitBreaker,
  CircuitOpenError,
  type CircuitState,
} from './circuit-breaker.ts';

const fail = async () => {
  throw new Error('dependency down');
};
const succeed = async () => 'ok';

function setup(failureThreshold = 3, resetTimeoutMs = 1_000) {
  let now = 0;
  const transitions: string[] = [];
  const breaker = new CircuitBreaker({
    failureThreshold,
    resetTimeoutMs,
    now: () => now,
    onStateChange: (from: CircuitState, to: CircuitState) =>
      transitions.push(`${from}->${to}`),
  });
  return { breaker, transitions, advance: (ms: number) => (now += ms) };
}

describe('CircuitBreaker', () => {
  it('opens after consecutive failures and then fails fast', async () => {
    const { breaker } = setup();
    for (let i = 0; i < 3; i++)
      await assert.rejects(breaker.execute(fail), /dependency down/);
    assert.equal(breaker.state, 'open');

    let called = false;
    await assert.rejects(
      breaker.execute(async () => {
        called = true;
      }),
      CircuitOpenError
    );
    assert.equal(called, false, 'operation must not run while open');
  });

  it('a success resets the consecutive failure count', async () => {
    const { breaker } = setup();
    await assert.rejects(breaker.execute(fail));
    await assert.rejects(breaker.execute(fail));
    await breaker.execute(succeed);
    await assert.rejects(breaker.execute(fail));
    assert.equal(breaker.state, 'closed');
  });

  it('half-opens after the timeout and closes on a successful trial', async () => {
    const { breaker, transitions, advance } = setup();
    for (let i = 0; i < 3; i++) await assert.rejects(breaker.execute(fail));
    advance(1_000);
    assert.equal(breaker.state, 'half-open');
    assert.equal(await breaker.execute(succeed), 'ok');
    assert.deepEqual(transitions, [
      'closed->open',
      'open->half-open',
      'half-open->closed',
    ]);
  });

  it('re-opens immediately when the trial call fails', async () => {
    const { breaker, advance } = setup();
    for (let i = 0; i < 3; i++) await assert.rejects(breaker.execute(fail));
    advance(1_000);
    await assert.rejects(breaker.execute(fail), /dependency down/);
    assert.equal(breaker.state, 'open');
  });

  it('allows only one trial call while half-open', async () => {
    const { breaker, advance } = setup(1);
    await assert.rejects(breaker.execute(fail));
    advance(1_000);

    let release!: () => void;
    const trial = breaker.execute(() => new Promise<void>(r => (release = r)));
    await assert.rejects(breaker.execute(succeed), CircuitOpenError);
    release();
    await trial;
    assert.equal(breaker.state, 'closed');
  });

  it('ignores errors that are not dependency failures', async () => {
    const breaker = new CircuitBreaker({
      failureThreshold: 1,
      isFailure: e => (e as { status?: number }).status !== 404,
    });
    await assert.rejects(
      breaker.execute(async () => {
        throw Object.assign(new Error('not found'), { status: 404 });
      })
    );
    assert.equal(breaker.state, 'closed');
  });
});
