var patcher = require('fast-json-patch');
var util = require('./util');

/**
 * Object used for storing session data. Provides several useful methods,
 * like .destroy().
 * @param {Object} data
 * @param {Boolean} fromDestroyed Whether the session was created when the
 *                                key was set to DESTROYED
 */
function Session (data, fromDestroyed) {
    // Define a `_` property to store some metadata on.
    this._ = {
        fromDestroyed: !!fromDestroyed,
        destroyed: false,
        persisting: true,
        original: util.clone(data),
        patch: null
    };

    this.cookie = {};

    for (var key in data) {
        this[key] = data[key];
    }
}

/**
 * Sets the session to be destroyed when we go to save it.
 */
Session.prototype.destroy = function () {
    this._.destroyed = true;
};

/**
 * Does not persist changes made to the session.
 */
Session.prototype.forget = function () {
    this._.persisting = false;
};

/**
 * Returns if the session is "forgotten"
 * @return {Boolean}
 */
Session.prototype.isForgotten = function () {
    return !this._.persisting;
};

/**
 * Return whether we want to destroy this session.
 * @return {Boolean}
 */
Session.prototype.isDestroyed = function () {
    return this._.destroyed;
};

/**
 * Return whether the session was DESTROYED when this one was created.
 * @return {Boolean}
 */
Session.prototype.isFromDestroyed = function () {
    return this._.fromDestroyed;
};

/**
 * Returns the original data the session was loaded with.
 * @return {Object}
 */
Session.prototype.getOriginal = function () {
    return this._.original;
};

/**
 * Returns whether this session's data has been
 * modified since it was created.
 *
 * Note: calling this will cause further changes to not be recorded;
 * it should only be called when we're done and ready to save the session.
 *
 * @return {Boolean}
 */
Session.prototype.getChanges = function () {
    var patch = this._.patch;
    if (patch === null) {
        patch = this._.patch = patcher.compare(this.getOriginal(), this.toObject());
    }

    return patch;
};

/**
 * Returns whether any changes were made to the session.
 *
 * Note: calling this will cause further changes to not be recorded;
 * it should only be called when we're done and ready to save the session.
 *
 * @return {Boolean}
 */
Session.prototype.hasChanged = function () {
    return this.isFromDestroyed() || this.getChanges().length > 0;
};

/**
 * Returns a plain object without methods or helpers, for the current
 * session data.
 * @return {Object}
 */
Session.prototype.toObject = function () {
    var output = {};
    for (var key in this) {
        if (key !== '_' && key !== 'cookie' && this.hasOwnProperty(key)) {
            output[key] = this[key];
        }
    }

    return output;
};

/**
 * Applies the changes made in another session onto this one.
 * @param  {Session} session
 * @return {Session}
 */
Session.prototype.applyChanges = function (session) {
    var changes = session.getChanges();
    var output = this.toObject();

    patcher.apply(output, changes);

    return output;
};

module.exports = Session;
