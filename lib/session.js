var patcher = require('fast-json-patch');
var util = require('./util');

/**
 * List of method names that will be "hoisted" at attached to the main
 * session object when it's created.
 * @type {String[]}
 */
var hoist = ['destroy', 'forget'];

/**
 * List of keys to exclude from session savings.
 * @type {String[]}
 */
var exclude = hoist.concat(['_', 'cookie']);

/**
 * Object used for storing session data. We copy it as an original
 * object as well as provide several useful methods, like "destroy".
 * @param {Object} data
 * @param {Boolean} fromDestroyed Whether the session was created when the
 *                                key was set to DESTROYED
 */
function Session (data, fromDestroyed) {
    this.fromDestroyed = !!fromDestroyed;
    this.destroyed = false;
    this.persisting = true;
    this.original = fromDestroyed ? {} : util.clone(data);
    this.patch = null;
    this.against = null;

    for (var i = 0; i < hoist.length; i++) {
        data[hoist[i]] = util.bind(this, this[hoist[i]]);
    }

    data.cookie = {};
    data._ = this;
}

var methods = {};

/**
 * Sets the session to be destroyed when we go to save it.
 */
methods.destroy = function () {
    this.destroyed = true;
};

/**
 * Does not persist changes made to the session.
 */
methods.forget = function () {
    this.persisting = false;
};

/**
 * Returns if the session is "forgotten"
 * @return {Boolean}
 */
methods.isForgotten = function () {
    return !this.persisting;
};

/**
 * Return whether we want to destroy this session.
 * @return {Boolean}
 */
methods.isDestroyed = function () {
    return this.destroyed;
};

/**
 * Return whether the session was DESTROYED when this one was created.
 * @return {Boolean}
 */
methods.isFromDestroyed = function () {
    return this.fromDestroyed;
};

/**
 * Returns the original data the session was loaded with.
 * @return {Object}
 */
methods.getOriginal = function () {
    return this.original;
};

/**
 * Gets the changes made in the data against the original session
 * information stored on this object.
 *
 * Note: this function is stateful and should only be called when
 * we're done and ready to save the session.
 *
 * @param {Object} against The data to compare against
 * @return {Boolean}
 */
methods.getChanges = function () {
    var patch = this.patch;

    if (patch === null) {
        patch = this.patch = patcher.compare(this.original, this.against);
    }

    return patch;
};

/**
 * Sets the updated session to compare against at the end of the
 * lifecycle.
 *
 * Note: this function is stateful and should only be called when
 * we're done and ready to save the session.
 *
 * @param {Object} against
 */
methods.setAgainst = function (against) {
    this.against = this.trim(against);
};

/**
 * Returns whether any changes were made to the session.
 *
 * Note: this function is stateful and should only be called when
 * we're done and ready to save the session.
 *
 * @return {Boolean}
 */
methods.hasChanged = function () {
    return this.isFromDestroyed() || this.getChanges().length > 0;
};

/**
 * Returns a plain object without methods or helpers, for the session data.
 * @param {Object} data
 * @return {Object}
 */
methods.trim = function (data) {
    var output = {};

    for (var key in data) {
        // Exclude things from the prototype and additional helper functions
        // that various middleware attach.
        if (exclude.indexOf(key) === -1 && typeof data[key] !== 'function') {
            output[key] = data[key];
        }
    }

    return output;
};

/**
 * Applies the changes made in this session to another one. It's expected that
 * prior to calling this method, hasChanged was called.
 * @param  {Session} session
 * @return {Session}
 */
methods.applyChanges = function (session) {
    var changes = session.getChanges();
    var output = this.trim(this.original);

    patcher.apply(output, changes);

    return output;
};

// Define the methods to be non-enumerable, so that if the session gets
// cloned these are kept clean and away.
for (var key in methods) {
    Object.defineProperty(Session.prototype, key, {
        value: methods[key]
    });
}

/**
 * Wrapper method that attaches a new Session to the results plain object.
 * @param  {Object} data
 * @param  {Bool} fromDestroyed
 * @return {Object}
 */
Object.defineProperty(Session, 'attach', {
    value: function (data, fromDestroyed) {
        new Session(data, fromDestroyed);
        return data;
    }
});

module.exports = Session;
