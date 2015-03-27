var expect = require('chai').expect;

describe('clone', function () {
    var clone = require('../../lib/util').clone;

    it('works correctly', function () {
        var a = { b: 'c', c: null, d: [1, 2] };
        var b = clone(a);
        a.b = 'd';
        a.d.push(3);

        expect(a).to.deep.equal({ b: 'd', c: null, d: [1, 2, 3] });
        expect(b).to.deep.equal({ b: 'c', c: null, d: [1, 2] });
    });
});
