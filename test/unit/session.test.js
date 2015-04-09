var expect = require('chai').expect;

describe('session', function () {
    var Session = require('../../lib/session');
    var session;

    beforeEach(function () {
        session = Session.attach({ foo: 'bar', bin: 'baz' });
    });

    it('has data', function () {
        expect(session.foo).to.equal('bar');
        expect(session.bin).to.equal('baz');
    });

    it('sets destroyed', function () {
        expect(session._.isDestroyed()).to.be.false;
        session.destroy();
        expect(session._.isDestroyed()).to.be.true;
    });

    it('sets forgotten', function () {
        expect(session._.isForgotten()).to.be.false;
        session.forget();
        expect(session._.isForgotten()).to.be.true;
    });

    it('does not say it is changed when it is not', function () {
        session._.setAgainst(session);
        expect(session._.hasChanged()).to.be.false;
    });

    it('says it changed when it has', function () {
        session.foo = 42;
        session._.setAgainst(session);
        expect(session._.hasChanged()).to.be.true;
    });

    it('gets the changes that have been made', function () {
        session.foo = 42;
        session._.setAgainst(session);
        expect(session._.getChanges(session)).to.deep.equal([
            { op: 'replace', path: '/foo', value: 42 }
        ]);
    });

    it('caches the changes', function () {
        session._.setAgainst(session);
        expect(session._.getChanges(session)).to.deep.equal([]);
        session.foo = 42;
        expect(session._.getChanges(session)).to.deep.equal([]);
    });

    it('returns a plain object', function () {
        session.cookie = {};
        session.helper = function () {};
        expect(session._.trim(session)).to.deep.equal({ foo: 'bar', bin: 'baz' });
    });

    it('records when from destroyed', function () {
        expect(session._.isFromDestroyed()).to.be.false;
        Session.attach(session, true);
        expect(session._.isFromDestroyed()).to.be.true;
    });

    describe('apply changes', function () {
        var a, b;

        beforeEach(function () {
            a = Session.attach({ foo: 'bar', bin: 'baz' });
            b = Session.attach({ foo: 'bar', bin: 'baz' });
        });
        it('applies changes single', function () {
            b.foo = 'ay';
            b._.setAgainst(b);
            expect(a._.applyChanges(b._)).to.deep.equal({ foo: 'ay', bin: 'baz' });
        });
        it('applies changes multiple', function () {
            a._.original.foo = 'ay';
            b.bin = 'oo';

            b._.setAgainst(b);
            expect(a._.applyChanges(b._)).to.deep.equal({ foo: 'ay', bin: 'oo' });
        });
    });
});
