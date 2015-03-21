var Session = require('./session');

module.exports = function (connect) {
    /**
     * Store instance for managing Redis sessions.
     *
     * @param {Object} options
     * @param {Number} options.ttl
     *        The time in seconds sessions should be stored for.
     * @param {Object} options.client
     *        The node_redis client instance the the middleware should use.
     * @param {String} [options.prefix=session:]
     *        The key prefix we use for storing items in redis.
     * @param {Number} [options.lockExpiry=5000]
     *        Time in milliseconds session locks should last for.
     * @param {Number} [options.retryTime=100]
     *        Time we should wait if we did no acquire a session lock.
     * @param {Number} [options.deleteExpiry=5000]
     *        The length of a DESTROYED session record should last. This
     *        should be at least as long as your longest API request (but
     *        does not need to be longer).
     */
    function Store (options) {
        var opts = options || {};

        connect.session.Store.call(this, opts);

        this.ttl = opts.ttl;
        this.client = opts.client;
        this.prefix = opts.prefix || 'session:';
        this.lockExpiry = opts.lockExpiry || 5000;
        this.retryTime = opts.retryTime || 100;
        this.deleteExpiry = opts.deleteExpiry || 5000;
    }

    Store.prototype = new connect.session.Store();

    /**
     * Returns a redis key corresponding to the session id.
     * @param  {String} id
     * @return {String}
     */
    Store.prototype.getKey = function (id) {
        return this.prefix + id;
    };


    /**
     * Returns the Redis key used for locking.
     * @param  {String} id
     * @return {String}
     */
    Store.prototype.getLockKey = function (id) {
        return this.getKey(id) + ':lock';
    };

    /**
     * Looks up a session by the given ID, calling back with a
     * result object or an error.
     *
     * @param {String} id
     * @param {Function} callback
     */
    Store.prototype.get = function (id, callback) {
        var ttl = this.ttl;

        this.client.GET([ this.getKey(id) ], function (err, data) {
            if (err) return callback(err);

            // If there was data in Redis, try to decode it to JSON.
            // If we can't decode it, then just use the empty object.
            var results = {};
            if (data && data !== Store.DESTROYED) {
                try {
                    results = JSON.parse(data);
                } catch (e) {}
            }

            var session = new Session(results, data === Store.DESTROYED);
            session.cookie.expires = Date.now() + ttl;

            callback(undefined, session);
        });
    };

    /**
     * Tries to get a lock on the Redis session, using the Redlock
     * algorithim. After it does, callback is run with the random string
     * that we should verify again later.
     * @param  {String}   id
     * @param  {Function} callback
     */
    Store.prototype.lock = function (id, callback) {
        var random = Math.random().toString();
        var self = this;

        this.client.SET([this.getLockKey(id), random, 'NX', 'PX', this.lockExpiry], function (err, result) {
            if (err) return callback(err);

            // If the result is OK, we got the lock successfully!
            // Otherwise another process was using it. Retry setting later.
            if (result === 'OK') {
                callback(undefined, random);
            } else {
                setTimeout(self.lock.bind(self, id, callback), self.retryTime);
            }
        });
    };

    /**
     * Removes a lock set by this session store.
     * @param  {String} lock
     */
    Store.prototype.unlock = function (id, lock) {
        var key = this.getLockKey(id);
        var self = this;

        this.client.GET([key], function (err, result) {
            if (err || result === lock) {
                self.client.DEL([key]);
            }
        });
    };

    /**
     * Re-retrieves the session from Redis, applies the changes that
     * were made locally, then saves the session back into Redis.
     * @param  {String}   id
     * @param  {Session}  session
     * @param  {Function} callback
     */
    Store.prototype.saveUpdates = function (id, session, callback) {
        var self = this;

        this.get(id, function (err, result) {
            if (err) return callback(err);

            // If what we got most recently was destroyed, but the original
            // session was not from a destroyed session, then the session
            // was just destroyed and we should not persist data.
            if (result.isFromDestroyed() && !session.isFromDestroyed()) {
                return callback();
            }

            var toSave = JSON.stringify(result.applyChanges(session));
            self.client.SETEX([ self.getKey(id), self.ttl, toSave ], callback);
        });
    };

    /**
     * Persists the session into Redis.
     * @param {String}   id
     * @param {Session}   session
     * @param {Function} callback
     */
    Store.prototype.set = function (id, session, callback) {
        if (session.isDestroyed()) {
            return this.destroy(id, callback);
        }

        if (!session.hasChanged()) {
            return callback();
        }

        var self = this;
        this.lock(id, function (err, lock) {
            if (err) return callback(err);

            self.saveUpdates(id, session, function (err) {
                self.unlock(id, lock);
                callback(err);
            });
        });
    };

    /**
     * Destroy the session associated with the given id.
     *
     * @param {String} id
     * @param {Function} callback
     */
    Store.prototype.destroy = function (id, callback){
        this.client.SETEX([ this.getKey(id), this.deleteExpiry, Store.DESTROYED ], callback);
    };

    // Constants for use in Redis.
    Store.DESTROYED = 'DESTROYED';

    return Store;
};
