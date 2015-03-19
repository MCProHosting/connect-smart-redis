var Session = require('./session');

module.exports = function (connect) {
    /**
     * Store instance for managing Redis sessions.
     *
     * @param {Object} options
     * @param {Number} options.ttl The time in seconds sessions should be
     *                             stored for.
     * @param {Object} options.client The node_redis client instance the the
     *                                middleware should use.
     * @param {String} [options.prefix=session:] The key prefix we use
     *                                           for storing items in redis.
     */
    function Store (options) {
        var opts = options || {};
        connect.session.Store.call(this, opts);
        this.ttl = opts.ttl;
        this.client = opts.client;
        this.prefix = opts.prefix || 'session:';
    }

    Store.prototype = Object.create(connect.session.Store);

    /**
     * Returns a redis key corresponding to the session id.
     * @param  {String} id
     * @return {String}
     */
    Store.prototype.getKey = function (id) {
        return this.prefix + id;
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
            if (err) return fn(err);

            // If there was data in Redis, try to decode it to JSON.
            // If we can't decode it, then just use the empty object.
            var results = {};
            if (data) {
                try {
                    results = JSON.parse(data);
                } catch (e) {}
            }

            callback(undefined, new Session(results));
        });
    };

  /**
   * Destroy the session associated with the given id.
   *
   * @param {String} id
     * @param {Function} callback
   */
  RedisStore.prototype.destroy = function (id, callback){
    this.client.DEL([ this.getKey(id) ], callback);
  };
};
