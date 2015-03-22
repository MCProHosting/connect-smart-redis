# Connect Smart Redis

[![Build Status](https://travis-ci.org/MCProHosting/connect-smart-redis.svg)](https://travis-ci.org/MCProHosting/connect-smart-redis) [![Coverage Status](https://coveralls.io/repos/MCProHosting/connect-smart-redis/badge.svg)](https://coveralls.io/r/MCProHosting/connect-smart-redis)

connect-smart-redis is inspired by [connect-redis](http://github.com/tj/connect-redis). It's fast, light, and (you guessed it) smart!

## Why?

Connect-redis is great, but it was missing several features necessary for some production environments (like ours!). Several improvements were necessary, including:

 * **Update as Needed.** The original middleware updated redis at the end of every single request, regardless of whether or not the session was actually updated.
 * **Locking.** As our traffic increased, race conditions appeared where sessions to one request would get overwritten by a request that was happening in parallel. We use the Redlock algorithim to ensure there's only one update at a time. With that:
 * **Smart Updates.** Only changed properties are updated. This goes well with locking -- there's less a chance of one request stepping on another's feet.
 * **Smart Deletions.** As a result of the race conditions, we were having difficulty destroying sessions because it would get re-set right over again! Using locking we delete things as expected.

## Options/Usage

Use this just like any other session middleware. It takes the following options:

 * `ttl` Time in seconds sessions should last for
 * `client` a node-redis (or compatible) client
 * `prefix=session:` The prefix for redis sessions
 * `lockExpiry=5000` Time in milliseconds session locks should last for.
 * `retryTime=100` Time we should wait if we did no acquire a session lock.
 * `deleteExpiry=5000` - The length of a DESTROYED session record should last. This should be at least as long as your longest API request (but does not need to be longer).

# Performance

Non-trival parts of the code have been optimized for performance, and of course the middleware itself is built to be a "lazy" as possible. Based on data from our benchmark (using a fake Redis client) the middleware has an overhead of about 0.07 millseconds per transaction. Comparatively, connect-redis ran an overhead of 0.03 milliseconds per transaction.

```
$ node bench\head-to-head.js
connect-redis x 385,026 ops/sec ±0.25% (100 runs sampled)
connect-smart-redis x 146,042 ops/sec ±0.23% (98 runs sampled)
```

All in all, smart-redis has about twice the overhead of its predecessor. However, if the you aren't updating client sessions in every request, the saved Redis queries will far eclipse the hundredths of a millisecond difference. And if you are, it may be a good idea to use smart-redis anyway due to its mitigation of race conditions!

# Caveats

There is a race condition if two requests simultaneously edit the same attribute of the session. In this event, the request which acquires the lock last will take precedence. There is no way to effectively mitigate this; this is a situation you should bear in mind when building your application.

Additionally, due to the locking, it's possible that if you get very many requests which all edit the session during the same time interval, requests for the particular user may take an unusually long time.

# License

This software is MIT licensed, copyright 2015 by Beam LLC.
