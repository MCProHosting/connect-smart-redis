var expect = require('chai').expect;

describe('destruction', function () {
    var foo1, foo2;

    beforeEach(function (done) {
        var self = this;
        this.redis.SET(['session:foo', '{"a":1}'], function () {
            self.store.get('foo', function (err, f) {
                foo1 = f;
                self.store.get('foo', function (err, f) {
                    foo2 = f;
                    done();
                });
            });
        });
    });

    it('gets and destroys a single session', function (done) {
        var self = this;
        foo1.destroy();
        this.store.set('foo', foo1, function () {
            self.redis.GET('session:foo', function (err, result) {
                expect(result).to.equal('DESTROYED');
                done();
            });
        });
    });

    it('persists destruction', function (done) {
        var self = this;

        self.store.get('foo', function (err, foo2) {
            foo1.destroy();
            foo2.a = 3;

            self.store.set('foo', foo1, function () {
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

        foo1.destroy();
        self.store.set('foo', foo1, function () {
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

    it('aborts when saving over locked destruction', function (done) {
        var self = this;

        foo1.destroy();
        foo2.a = 3;

        self.store.set('foo', foo1, function () {});

        setImmediate(function () {
            self.store.set('foo', foo2, function () {
                self.redis.GET('session:foo', function (err, result) {
                    expect(result).to.equal('DESTROYED');
                    done();
                });
            });
        });
    });

    it('locks destruction to prevent races', function (done) {
        var self = this;

        foo1.destroy();
        foo2.a = 3;

        self.store.set('foo', foo2, function () {});

        setImmediate(function () {
            self.store.set('foo', foo1, function () {
                self.redis.GET('session:foo', function (err, result) {
                    expect(result).to.equal('DESTROYED');
                    done();
                });
            });
        });
    });
});
