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
 * `deleteExpiry=50001 The length of a DESTROYED session record should last. This should be at least as long as your longest API request (but does not need to be longer).

# License

This software is MIT licensed, copyright 2015 by Beam LLC.
