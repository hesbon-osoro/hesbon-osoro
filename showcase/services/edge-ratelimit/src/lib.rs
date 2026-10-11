//! Keyed token-bucket rate limiting for edge services.
//!
//! Each key (client IP, API key, tenant id, ...) gets its own bucket that
//! holds up to `burst` tokens and refills continuously at `rate` tokens per
//! second. Time is injected through [`Clock`] so behaviour is fully
//! deterministic under test.
//!
//! ```
//! use std::num::NonZeroU32;
//! use edge_ratelimit::{Decision, Quota, RateLimiter};
//!
//! let quota = Quota::per_second(NonZeroU32::new(10).unwrap())
//!     .with_burst(NonZeroU32::new(20).unwrap());
//! let limiter = RateLimiter::new(quota);
//!
//! match limiter.check("203.0.113.7") {
//!     Decision::Allowed { remaining } => println!("ok, {remaining} left"),
//!     Decision::Limited { retry_after } => println!("429, retry in {retry_after:?}"),
//! }
//! ```

use std::collections::HashMap;
use std::hash::Hash;
use std::num::NonZeroU32;
use std::sync::{Arc, Mutex, PoisonError};
use std::time::{Duration, Instant};

/// Source of monotonic time.
pub trait Clock: Send + Sync {
    /// Returns the current instant.
    fn now(&self) -> Instant;
}

/// Wall-clock implementation backed by [`Instant::now`].
#[derive(Debug, Default, Clone, Copy)]
pub struct SystemClock;

impl Clock for SystemClock {
    fn now(&self) -> Instant {
        Instant::now()
    }
}

impl<T: Clock + ?Sized> Clock for Arc<T> {
    fn now(&self) -> Instant {
        (**self).now()
    }
}

/// How many requests a single key may make.
#[derive(Debug, Clone, Copy, PartialEq)]
pub struct Quota {
    burst: u32,
    refill_per_sec: f64,
}

impl Quota {
    /// Sustained `rate` requests per second, with a burst of the same size.
    #[must_use]
    pub fn per_second(rate: NonZeroU32) -> Self {
        Self {
            burst: rate.get(),
            refill_per_sec: f64::from(rate.get()),
        }
    }

    /// Sustained `rate` requests per minute, with a burst of the same size.
    #[must_use]
    pub fn per_minute(rate: NonZeroU32) -> Self {
        Self {
            burst: rate.get(),
            refill_per_sec: f64::from(rate.get()) / 60.0,
        }
    }

    /// Overrides the maximum number of tokens a bucket can hold.
    #[must_use]
    pub fn with_burst(self, burst: NonZeroU32) -> Self {
        Self {
            burst: burst.get(),
            ..self
        }
    }

    /// Time for an empty bucket to refill completely.
    fn full_refill(&self) -> Duration {
        Duration::from_secs_f64(f64::from(self.burst) / self.refill_per_sec)
    }
}

/// Outcome of a rate-limit check.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Decision {
    /// The request may proceed.
    Allowed {
        /// Whole tokens left in the bucket after this request.
        remaining: u32,
    },
    /// The request must be rejected (HTTP 429).
    Limited {
        /// When enough tokens will be available; maps to `Retry-After`.
        /// `Duration::MAX` if the cost can never fit in the bucket.
        retry_after: Duration,
    },
}

impl Decision {
    /// Returns `true` if the request may proceed.
    #[must_use]
    pub fn is_allowed(&self) -> bool {
        matches!(self, Self::Allowed { .. })
    }
}

#[derive(Debug, Clone)]
struct Bucket {
    tokens: f64,
    updated: Instant,
}

impl Bucket {
    fn full(quota: &Quota, now: Instant) -> Self {
        Self {
            tokens: f64::from(quota.burst),
            updated: now,
        }
    }

    fn refill(&mut self, quota: &Quota, now: Instant) {
        let elapsed = now.saturating_duration_since(self.updated).as_secs_f64();
        self.tokens = (self.tokens + elapsed * quota.refill_per_sec).min(f64::from(quota.burst));
        self.updated = now;
    }

    fn try_take(&mut self, quota: &Quota, now: Instant, cost: u32) -> Decision {
        self.refill(quota, now);
        let cost = f64::from(cost);
        if self.tokens >= cost {
            self.tokens -= cost;
            Decision::Allowed {
                remaining: self.tokens.floor() as u32,
            }
        } else {
            let deficit = cost - self.tokens;
            Decision::Limited {
                retry_after: Duration::from_secs_f64(deficit / quota.refill_per_sec),
            }
        }
    }
}

/// A thread-safe set of token buckets, one per key.
#[derive(Debug)]
pub struct RateLimiter<K, C = SystemClock> {
    quota: Quota,
    clock: C,
    buckets: Mutex<HashMap<K, Bucket>>,
}

impl<K: Eq + Hash> RateLimiter<K, SystemClock> {
    /// Creates a limiter that uses the system clock.
    #[must_use]
    pub fn new(quota: Quota) -> Self {
        Self::with_clock(quota, SystemClock)
    }
}

impl<K: Eq + Hash, C: Clock> RateLimiter<K, C> {
    /// Creates a limiter with an injected clock.
    pub fn with_clock(quota: Quota, clock: C) -> Self {
        Self {
            quota,
            clock,
            buckets: Mutex::new(HashMap::new()),
        }
    }

    /// Consumes one token for `key`.
    pub fn check(&self, key: K) -> Decision {
        self.check_n(key, 1)
    }

    /// Consumes `cost` tokens for `key`, e.g. to weight expensive endpoints.
    pub fn check_n(&self, key: K, cost: u32) -> Decision {
        if cost > self.quota.burst {
            return Decision::Limited {
                retry_after: Duration::MAX,
            };
        }
        let now = self.clock.now();
        // A panic in another thread can't leave a bucket half-updated, so a
        // poisoned lock is safe to keep using.
        let mut buckets = self.buckets.lock().unwrap_or_else(PoisonError::into_inner);
        buckets
            .entry(key)
            .or_insert_with(|| Bucket::full(&self.quota, now))
            .try_take(&self.quota, now, cost)
    }

    /// Forgets keys whose buckets have refilled completely. A forgotten key
    /// behaves exactly like a full bucket, so this only reclaims memory. Call
    /// it periodically to keep memory bounded under high key cardinality.
    pub fn evict_idle(&self) -> usize {
        let now = self.clock.now();
        let full_after = self.quota.full_refill();
        let mut buckets = self.buckets.lock().unwrap_or_else(PoisonError::into_inner);
        let before = buckets.len();
        buckets.retain(|_, b| now.saturating_duration_since(b.updated) < full_after);
        before - buckets.len()
    }

    /// Number of keys currently tracked.
    pub fn len(&self) -> usize {
        self.buckets
            .lock()
            .unwrap_or_else(PoisonError::into_inner)
            .len()
    }

    /// Returns `true` if no keys are tracked.
    pub fn is_empty(&self) -> bool {
        self.len() == 0
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::thread;

    struct ManualClock(Mutex<Instant>);

    impl ManualClock {
        fn new() -> Arc<Self> {
            Arc::new(Self(Mutex::new(Instant::now())))
        }
        fn advance(&self, d: Duration) {
            *self.0.lock().unwrap() += d;
        }
    }

    impl Clock for ManualClock {
        fn now(&self) -> Instant {
            *self.0.lock().unwrap()
        }
    }

    fn nz(n: u32) -> NonZeroU32 {
        NonZeroU32::new(n).unwrap()
    }

    #[test]
    fn allows_burst_then_limits() {
        let clock = ManualClock::new();
        let limiter = RateLimiter::with_clock(Quota::per_second(nz(5)), clock);

        for expected_remaining in (0..5).rev() {
            assert_eq!(
                limiter.check("k"),
                Decision::Allowed {
                    remaining: expected_remaining
                }
            );
        }
        assert!(!limiter.check("k").is_allowed());
    }

    #[test]
    fn retry_after_matches_refill_rate() {
        let clock = ManualClock::new();
        let limiter = RateLimiter::with_clock(Quota::per_second(nz(2)), clock.clone());
        limiter.check("k");
        limiter.check("k");

        match limiter.check("k") {
            Decision::Limited { retry_after } => {
                assert_eq!(retry_after, Duration::from_millis(500));
            }
            Decision::Allowed { .. } => panic!("expected to be limited"),
        }

        clock.advance(Duration::from_millis(500));
        assert!(limiter.check("k").is_allowed());
    }

    #[test]
    fn refill_is_capped_at_burst() {
        let clock = ManualClock::new();
        let quota = Quota::per_second(nz(1)).with_burst(nz(3));
        let limiter = RateLimiter::with_clock(quota, clock.clone());
        limiter.check("k");

        clock.advance(Duration::from_secs(3600));
        assert_eq!(limiter.check("k"), Decision::Allowed { remaining: 2 });
    }

    #[test]
    fn keys_are_isolated() {
        let limiter = RateLimiter::with_clock(Quota::per_minute(nz(1)), ManualClock::new());
        assert!(limiter.check("alice").is_allowed());
        assert!(!limiter.check("alice").is_allowed());
        assert!(limiter.check("bob").is_allowed());
    }

    #[test]
    fn weighted_cost_and_oversized_requests() {
        let limiter = RateLimiter::with_clock(Quota::per_second(nz(10)), ManualClock::new());
        assert_eq!(limiter.check_n("k", 7), Decision::Allowed { remaining: 3 });
        assert!(!limiter.check_n("k", 4).is_allowed());
        assert_eq!(
            limiter.check_n("k", 11),
            Decision::Limited {
                retry_after: Duration::MAX
            }
        );
    }

    #[test]
    fn evicts_only_fully_refilled_buckets() {
        let clock = ManualClock::new();
        let limiter = RateLimiter::with_clock(Quota::per_second(nz(10)), clock.clone());
        limiter.check("old");
        clock.advance(Duration::from_secs(2));
        limiter.check("fresh");

        assert_eq!(limiter.evict_idle(), 1);
        assert_eq!(limiter.len(), 1);
    }

    #[test]
    fn is_thread_safe_and_never_over_admits() {
        let limiter = Arc::new(RateLimiter::with_clock(
            Quota::per_minute(nz(100)),
            ManualClock::new(),
        ));
        let handles: Vec<_> = (0..8)
            .map(|_| {
                let limiter = Arc::clone(&limiter);
                thread::spawn(move || {
                    (0..50)
                        .filter(|_| limiter.check("shared").is_allowed())
                        .count()
                })
            })
            .collect();
        let admitted: usize = handles.into_iter().map(|h| h.join().unwrap()).sum();
        assert_eq!(admitted, 100);
    }
}
