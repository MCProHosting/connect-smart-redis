# Connect Smart Redis

connect-smart-redis is inspired by [connect-redis](http://github.com/tj/connect-redis).

## Why?

Connect-redis is great, but it was missing several features necessary for some production environments (like ours!). Several improvements were necessary, including:

 * **Update as Needed.** The original middleware updated redis at the end of every single request, regardless of whether or not the session was actually updated.
 * **Locking.** As our traffic increased, race conditions appeared where sessions to one request would get overwritten by a request that was happening in parallel. We use locking to ensure there's only one update at a time. With that:
 * **Smart Updates.** Only changed properties are updated. This goes well with locking -- there's less a chance of one request stepping on another's feet.
 * **Smart Deletions.** As a result of the race conditions, we were having difficulty destroying sessions because it would get re-set right over again! Using locking we delete things as expected.

## Installation/Options/Usage

TBD

# License

This software is MIT licensed, copyright 2015 by Beam LLC.
