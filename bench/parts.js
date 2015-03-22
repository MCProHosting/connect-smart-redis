var Benchmark = require('benchmark');
var Store = require('../')({ session: { Store: function () {} }});
var Session = require('../lib/session');

var client = {
    GET: function (args, cb) { cb(undefined, '{"a":1,"b":3,"c":[1,2,3]}'); },
    SET: function (args, cb) { cb(undefined, 'OK'); }
};
var store = new Store({ client: client, ttl: 60 });

var s1 = new Session({ a: 1, b: 3,c: [1,2,3] });
var s2 = new Session({ a: 1, b: 3,c: [1,2,3] });
s2.a = 2;
s1.hasChanged();

function noop () {}

new Benchmark.Suite()
    .add('Locking', function () {
        setResult = 'OK';
        store.lock('foo', noop);
    })
    .add('Session retrieval', function () {
        store.get('foo', noop);
    })
    .add('Session to object', function () {
        s1.toObject();
    })
    .add('Has Changed', function () {
        s2._.patch = null;
        s2.hasChanged();
    })
    .add('Apply Changes', function () {
        s1.applyChanges(s2);
    })
    .on('cycle', function(event) {
      console.log(String(event.target));
    })
    .run();
