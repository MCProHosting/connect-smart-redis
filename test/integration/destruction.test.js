var expect = require('chai').expect;

describe('destruction', function () {
    var foo, bar;

    beforeEach(function (done) {
        var self = this;
        this.redis.MSET(['session:foo', '{"a":1}', 'session:bar', '{"b":2}'], function () {
            self.store.get('foo', function (err, f) {
                foo = f;
                self.store.get('bar', function (err, b) {
                    bar = b;
                    done();
                });
            });
        });
    });

    it('actually gets them correctly', function () {
        expect(foo.a).to.equal(1);
        expect(bar.b).to.equal(2);
    });

    it('gets and destroys a single session', function (done) {
        var self = this;
        foo.destroy();
        this.store.set('foo', foo, function () {
            self.redis.GET('session:foo', function (err, result) {
                expect(result).to.equal('DESTROYED');
                done();
            });
        });
    });

    it('persists destruction', function (done) {
        var self = this;

        self.store.get('foo', function (err, foo2) {
            foo.destroy();
            foo2.a = 3;

            self.store.set('foo', foo, function () {
                self.store.set('foo', foo2, function () {
                    self.redis.GET('session:foo', function (err, result) {
                        expect(result).to.equal('DESTROYED');
                        done();
                    });
                });
            });
        });
    });

    it('saves new over destruction', function (done) {
        var self = this;

        foo.destroy();
        self.store.set('foo', foo, function () {
            self.store.get('foo', function (err, foo2) {
                foo2.a = 3;
                self.store.set('foo', foo2, function () {
                    self.redis.GET('session:foo', function (err, result) {
                        expect(result).to.equal('{"a":3}');
                        done();
                    });
                });
            });
        });
    });
});
