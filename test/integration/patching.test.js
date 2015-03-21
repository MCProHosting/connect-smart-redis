var expect = require('chai').expect;

describe('destruction', function () {
    var foo1, foo2;

    beforeEach(function (done) {
        var self = this;
        this.redis.SET(['session:foo', '{"a":1,"b":2,"c":[1,2,3]}'], function () {
            self.store.get('foo', function (err, f) {
                foo1 = f;
                self.store.get('foo', function (err, f) {
                    foo2 = f;
                    done();
                });
            });
        });
    });

    it('sets a single difference', function (done) {
        var self = this;
        foo1.b = 3;
        this.store.set('foo', foo1, function () {
            self.redis.GET('session:foo', function (err, result) {
                expect(result).to.equal('{"a":1,"b":3,"c":[1,2,3]}');
                done();
            });
        });
    });

    it('sets multiple differences, locks', function (done) {
        var self = this;
        foo1.b = 3;
        foo2.c.push(4);

        self.store.set('foo', foo1, cb);
        self.store.set('foo', foo2, cb);

        var calls = 2;
        function cb () {
            if (--calls === 0) {
                self.redis.GET('session:foo', function (err, result) {
                    expect(result).to.equal('{"a":1,"b":3,"c":[1,2,3,4]}');
                    done();
                });
            }
        }
    });
});
