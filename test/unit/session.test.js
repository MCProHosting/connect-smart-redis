var expect = require('chai').expect;

describe('session', function () {
    var Session = require('../../lib/session');
    var session;

    beforeEach(function () {
        session = new Session({ foo: 'bar', bin: 'baz' });
    });

    it('has data', function () {
        expect(session.foo).to.equal('bar');
        expect(session.bin).to.equal('baz');
    });

    it('sets destroyed', function () {
        expect(session.isDestroyed()).to.be.false;
        session.destroy();
        expect(session.isDestroyed()).to.be.true;
    });

    it('sets forgotten', function () {
        expect(session.isForgotten()).to.be.false;
        session.forget();
        expect(session.isForgotten()).to.be.true;
    });

    it('does not say it is changed when it is not', function () {
        expect(session.hasChanged()).to.be.false;
    });

    it('says it changed when it has', function () {
        session.foo = 42;
        expect(session.hasChanged()).to.be.true;
    });

    it('gets the changes that have been made', function () {
        session.foo = 42;
        expect(session.getChanges()).to.deep.equal([
            { op: 'replace', path: '/foo', value: 42 }
        ]);
    });

    it('caches the changes', function () {
        expect(session.getChanges()).to.deep.equal([]);
        session.foo = 42;
        expect(session.getChanges()).to.deep.equal([]);
    });

    it('returns a plain object', function () {
        expect(session.toObject()).to.deep.equal({ foo: 'bar', bin: 'baz' });
        expect(session.toObject()).not.to.be.an.instanceof(Session);
    });

    it('records when from destroyed', function () {
        expect(session.isFromDestroyed()).to.be.false;
        session = new Session({}, true);
        expect(session.isFromDestroyed()).to.be.true;
    });

    describe('apply changes', function () {
        var a, b;

        beforeEach(function () {
            a = new Session({ foo: 'bar', bin: 'baz' });
            b = new Session({ foo: 'bar', bin: 'baz' });
        });
        it('applies changes single', function () {
            a.foo = 'ay';
            expect(a.applyChanges(b)).to.deep.equal({ foo: 'ay', bin: 'baz' });
        });
        it('applies changes multiple', function () {
            a.foo = 'ay';
            b.bin = 'oo';

            expect(a.applyChanges(b)).to.deep.equal({ foo: 'ay', bin: 'oo' });
        });
    });
});
