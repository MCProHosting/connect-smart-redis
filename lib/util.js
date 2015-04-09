var util = module.exports = {};

/**
 * Performs a fast clone of the given data. Assumes no strings created
 * via an object constructor, no dates, or anything like that.
 * @param  {Object} data
 * @return {Object}
 */
util.clone = function (data) {
    if (Array.isArray(data)) {
        return data.slice();
    } else if (data == null || typeof data !== 'object') { // jshint ignore:line
        return data;
    } else {
        var output = {};
        for (var key in data) {
            output[key] = util.clone(data[key]);
        }
        return output;
    }
};

/**
 * Binds the context of a function and returns it.
 * @param  {*}   self
 * @param  {Function} fn
 * @return {Function}
 */
util.bind = function (self, fn) {
    return function () {
        fn.apply(self, arguments);
    };
};
