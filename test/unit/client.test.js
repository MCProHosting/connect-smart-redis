var expect = require('chai').expect;
var assert = require('chai').assert;
var sinon = require('sinon');

describe('client', function () {
    var Session = require('../../lib/session');
    var connect = { Store: function () {} };
    var Store = require('../../lib/index')(connect);
    var store, client;

    beforeEach(function () {
        client = {};
        store = new Store({ client: client, ttl: 42 });
    });

    it('generates the redis key', function () {
        expect(store.getKey('foo')).to.equal('session:foo');
    });

    it('generates the redis lock key', function () {
        expect(store.getLockKey('foo')).to.equal('session:foo:lock');
    });

    it('destroys the session', function (done) {
        var end = sinon.spy();
        client.SETEX = sinon.spy();
        sinon.stub(store, 'lock');

        store.destroy('foo', function () {
            expect(end.called).to.be.true;
            done();
        });

        expect(store.lock.calledWith('foo')).to.be.true;
        store.lock.yieldOn(store, null, end);

        expect(client.SETEX.calledWith(['session:foo', 5000, 'DESTROYED'])).to.be.true;
        client.SETEX.yield();
    });

    describe('session get', function () {
        var cb;

        beforeEach(function () {
            client.GET = sinon.stub();
        });

        it('pulls existing data from redis', function (done) {
            store.get('foo', function (err, session) {
                expect(err).not.to.be.defined;
                expect(session.toObject()).to.deep.equal({ foo: 'bar' });
                expect(session.isFromDestroyed()).to.be.false;
                done();
            });

            expect(client.GET.calledWith(['session:foo'])).to.be.true;
            client.GET.yield(undefined, '{"foo":"bar"}');
        });

        it('works even without data', function (done) {
            store.get('foo', function (err, session) {
                expect(err).not.to.be.defined;
                expect(session.toObject()).to.deep.equal({});
                expect(session.isFromDestroyed()).to.be.false;
                done();
            });

            client.GET.yield(undefined, null);
        });

        it('should respect destroyed sessions', function (done) {
            store.get('foo', function (err, session) {
                expect(err).not.to.be.defined;
                expect(session.toObject()).to.deep.equal({});
                expect(session.isFromDestroyed()).to.be.true;
                done();
            });

            client.GET.yield(undefined, 'DESTROYED');
        });

        it('should not fail if we have random data', function (done) {
            store.get('foo', function (err, session) {
                expect(err).not.to.be.defined;
                expect(session.toObject()).to.deep.equal({});
                expect(session.isFromDestroyed()).to.be.false;
                done();
            });

            client.GET.yield(undefined, 'adsfasdfasdf');
        });

        it('should throw an error', function (done) {
            store.get('foo', function (err, session) {
                expect(err).to.equal('err!');
                expect(session).not.to.be.defined;
                done();
            });

            client.GET.yield('err!', '{"foo":"bar"}');
        });
    });

    describe('locking', function () {

        beforeEach(function () {
            client.SET = sinon.stub();
            client.GET = sinon.stub();
            client.DEL = sinon.stub();
        });

        it('works on first try', function (done) {
            store.lock('foo', function (err, str) {
                done();
            });

            expect(client.SET.called).to.be.true;
            client.SET.yield(undefined, 'OK');
        });

        it('retry until works', function () {
            var clock = sinon.useFakeTimers();

            store.lock('foo', assert.fail);
            sinon.stub(store, 'lock');
            expect(store.lock.called).to.be.false;

            client.SET.yield(undefined, null);
            clock.tick(101);

            expect(store.lock.calledWith('foo')).to.be.true;

            clock.restore();
        });

        it('unlocks when it is our own lock', function () {
            store.unlock('foo', 'bar');

            expect(client.GET.calledWith(['session:foo:lock'])).to.be.true;
            client.GET.yield(null, 'bar');
            expect(client.DEL.calledWith(['session:foo:lock'])).to.be.true;
        });

        it('does not unlock another lock', function () {
            store.unlock('foo', 'bar');

            expect(client.GET.calledWith(['session:foo:lock'])).to.be.true;
            client.GET.yield(null, 'blah');
            expect(client.DEL.called).to.be.false;
        });
    });

    describe('save updates', function () {
        beforeEach(function () {
            client.SETEX = sinon.stub();
            sinon.stub(store, 'get');
        });

        it('does not save when session has been destroyed', function (done) {
            var a = new Session({}, false);
            var b = new Session({}, true);

            store.saveUpdates('foo', a, function (err) {
                expect(err).not.to.be.defined;
                expect(client.SETEX.called).to.be.false;
                done();
            });

            store.get.yield(null, b);
        });

        it('does when both destroyed', function (done) {
            var a = new Session({}, true);
            var b = new Session({}, true);

            store.saveUpdates('foo', a, function (err) {
                expect(err).not.to.be.defined;
                expect(client.SETEX.calledWith([ 'session:foo', 42, '{}'])).to.be.true;
                done();
            });

            store.get.yield(null, b);
            client.SETEX.yield();
        });

        it('does on new, applies changes', function (done) {
            var a = new Session({ foo: 1, bar: 2 }, false);
            var b = new Session({ foo: 1, bar: 2 }, false);
            a.bar = 4;
            b.foo = 2;

            store.saveUpdates('foo', a, function (err) {
                expect(err).not.to.be.defined;
                expect(client.SETEX.calledWith([ 'session:foo', 42, '{"foo":2,"bar":4}'])).to.be.true;
                done();
            });

            store.get.yield(null, b);
            client.SETEX.yield();
        });
    });

    describe('set', function () {
        var session;

        beforeEach(function () {
            sinon.stub(store, 'lock');
            sinon.stub(store, 'saveUpdates');
            sinon.stub(store, 'unlock');
            sinon.stub(store, 'destroy');
            session = new Session({ foo: 'bar' });
        });

        it('does not update when unchanged', function (done) {
            store.set('foo', session, function () {
                expect(store.lock.called).to.be.false;
                done();
            });
        });
        it('does not update when forgotten', function (done) {
            session.a = 'b';
            session.forget();

            store.set('foo', session, function () {
                expect(store.lock.called).to.be.false;
                done();
            });
        });

        it('calls destroy when destroyed', function (done) {
            session.destroy();

            store.set('foo', session, function () {
                expect(store.destroy.calledWith('foo')).to.be.true;
                done();
            });

            store.destroy.yield();
        });

        it('updates when new', function (done) {
            var end = sinon.spy();

            store.set('foo', { foo: 'bar' }, function (err) {
                expect(err).to.be.undefined;
                expect(end.called).to.be.true;
                done();
            });
            expect(store.lock.calledWith('foo')).to.be.true;
            store.lock.yieldOn(store, null, end);
            expect(store.saveUpdates.called).to.be.true;
            store.saveUpdates.yield();
        });

        it('updates when changed', function (done) {
            var end = sinon.spy();

            session.foo = 1;
            store.set('foo', session, function (err) {
                expect(err).to.be.undefined;
                expect(end.called).to.be.true;
                done();
            });
            expect(store.lock.calledWith('foo')).to.be.true;
            store.lock.yieldOn(store, null, end);
            expect(store.saveUpdates.called).to.be.true;
            store.saveUpdates.yield();
        });

        it('unlocks even when there is an error in saving updates', function (done) {
            var end = sinon.spy();

            session.foo = 1;
            store.set('foo', session, function (err) {
                expect(err).to.be.defined;
                expect(end.called).to.be.true;
                done();
            });
            expect(store.lock.calledWith('foo')).to.be.true;
            store.lock.yieldOn(store, null, end);
            expect(store.saveUpdates.called).to.be.true;
            store.saveUpdates.yield('err!');
        });
    });
});
