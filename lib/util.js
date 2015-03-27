var util = module.exports = {};

/**
 * Performs a fast clone of the given data. Assumes no strings created
 * via an object constructor, no dates, or anything like that.
 * @param  {Object} data
 * @return {Object}
 */
util.clone = function (data) {
    if (data == null || typeof data !== 'object') { // jshint ignore:line
        return data;
    } else {
        var output = {};
        for (var key in data) {
            output[key] = util.clone(data[key]);
        }
        return output;
    }
};
