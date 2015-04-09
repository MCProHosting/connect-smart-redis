var Session = require('./session');

module.exports = function (connect) {

    var ConnectStore = connect.Store || connect.session.Store;

    /**
     * Key where we attach the Session object on the plain session literal.
     * @type {String}
     */
    var attachKey = '_';

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

        ConnectStore.call(this, opts);

        this.ttl = opts.ttl;
        this.client = opts.client;
        this.prefix = opts.prefix || 'session:';
        this.lockExpiry = opts.lockExpiry || 5000;
        this.retryTime = opts.retryTime || 100;
        this.deleteExpiry = opts.deleteExpiry || 5000;
    }

    Store.prototype = new ConnectStore();

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

            // Add the session object into the results.
            Session.attach(results, data === Store.DESTROYED);
            callback(undefined, results);
        });
    };

    /**
     * Tries to get a lock on the Redis session, using the Redlock
     * algorithim. After it does, callback is run with an unlock
     * function that should be called after completion.
     *
     * @param  {String}   id
     * @param  {Function} callback
     */
    Store.prototype.lock = function (id, fn) {
        var random = Math.random().toString();
        var self = this;

        this.client.SET([this.getLockKey(id), random, 'NX', 'PX', this.lockExpiry], function (err, result) {
            if (err) return fn(err);

            // If the result is OK, we got the lock successfully!
            // Otherwise another process was using it. Retry setting later.
            if (result === 'OK') {
                fn.call(self, undefined, unlock);
            } else {
                setTimeout(lock, self.retryTime);
            }
        });

        // Helper bound unlock function. Because .bind is slow!
        function unlock () {
            self.unlock(id, random);
            self = random = null;
        }

        // Helper bound unlock function.
        function lock () {
            self.lock(id, fn);
            self = random = null;
        }
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
     * were made locally, then sends it to be saved in Redis.
     * @param  {String}   id
     * @param  {Session}  session
     * @param  {Function} callback
     */
    Store.prototype.saveUpdates = function (id, session, callback) {
        var self = this;

        this.get(id, function (err, result) {
            if (err) return callback(err);
            var other = result[attachKey];

            // If what we got most recently was destroyed, but the original
            // session was not from a destroyed session, then the session
            // was just destroyed and we should not persist data.
            if (other.isFromDestroyed() && !session.isFromDestroyed()) {
                return callback();
            }

            self.setex(id, other.applyChanges(session), callback);
        });
    };

    /**
     * Saves the session straight into Redis.
     * @param  {String}   id
     * @param  {Object}   data
     * @param  {Function} callback
     */
    Store.prototype.setex = function (id, data, callback) {
        this.client.SETEX([ this.getKey(id), this.ttl, JSON.stringify(data) ], callback);
    };

    /**
     * Persists the session into Redis.
     * @param {String}   id
     * @param {Session}   session
     * @param {Function} callback
     */
    Store.prototype.set = function (id, data, callback) {
        // If we don't find an attached session, just save it if there's
        // anything worth saving.
        var session = data._;
        if (!session) {
            data = Session.prototype.trim(data);
            if (Object.keys(data).length > 0) {
                return this.setex(id, data, callback);
            } else {
                return callback();
            }
        }

        // Set the original data to compare to.
        session.setAgainst(data);

        // Send of "destroyed" sessions to the destroy method.
        if (session.isDestroyed()) {
            return this.destroy(id, callback);
        }

        // Don't do anything for sessions that aren't persisted,
        // or have not changed.
        if (session.isForgotten() || !session.hasChanged(data)) {
            return callback();
        }

        // Otherwise, acquire a lock and run the update.
        this.lock(id, function (err, done) {
            if (err) return callback(err);

            this.saveUpdates(id, session, function (err) {
                done();
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
        this.lock(id, function (err, done) {
            this.client.SETEX([ this.getKey(id), this.deleteExpiry, Store.DESTROYED ], function (err) {
                done();
                callback(err);
            });
        });
    };

    // Constants for use in Redis.
    Store.DESTROYED = 'DESTROYED';

    return Store;
};
