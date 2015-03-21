var expect = require('chai').expect;

describe('clone', function () {
    var clone = require('../../lib/util').clone;

    it('works correctly', function () {
        var a = { b: 'c' };
        var b = clone(a);
        a.b = 'd';

        expect(a.b).to.equal('d');
        expect(b.b).to.equal('c');
    });
});
