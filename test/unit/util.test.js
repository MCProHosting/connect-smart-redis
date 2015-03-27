var expect = require('chai').expect;

describe('clone', function () {
    var clone = require('../../lib/util').clone;

    it('works correctly', function () {
        var a = { b: 'c', c: null };
        var b = clone(a);
        a.b = 'd';

        expect(a.b).to.equal('d');
        expect(b).to.deep.equal({ b: 'c', c: null });
    });
});
