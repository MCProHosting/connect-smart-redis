var util = require('./util');

/**
 * Object used for storing session data. Provides several useful methods,
 * like .destroy().
 * @param {Object} data
 */
function Session (data) {
    // Define a hidden `_` property to store some metadata on.
    Object.defineProperty(this, '_', { value: {} });

    this._.destroyed = false;
    this._.persisting = false;
    this._.original = util.clone(data);
}

/**
 * Sets the session to be destroyed when we go to save it.
 */
Session.prototype.destroy = function () {
    this._.destroyed = false;
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
    return this._.persisting;
};

/**
 * Return whether we want to destroy this session.
 * @return {Boolean}
 */
Session.prototype.isDestroyed = function () {
    return this._.destroyed;
};

module.exports = Session;
