var Benchmark = require('benchmark');

var client = {
    GET: function (args, cb) { cb(undefined, '{"a":1,"b":3,"c":[1,2,3]}'); },
    get: function (args, cb) { cb(undefined, '{"a":1,"b":3,"c":[1,2,3]}'); },
    SET: function (args, cb) { cb(undefined, 'OK'); },
    set: function (args, cb) { cb(undefined, 'OK'); },
    setex: function (a, b, c, cb) { cb(undefined, 'OK'); },
    on: function () {}
};

var SmartStore = require('../')({ Store: function () {} });
var CRStore = require('connect-redis')({ Store: function () {} });
var crstore = new CRStore({ client: client, ttl: 60 });
var smartstore = new SmartStore({ client: client, ttl: 60 });

var session = new (require('../lib/session'))({ a: 1, b: 3,c: [1,2,3] });

function noop () {}
        crstore.get('foo', noop);
        crstore.set('foo', { cookie: {}, a: 1, b: 3,c: [1,2,3] }, noop);

new Benchmark.Suite()
    .add('connect-redis', function () {
        crstore.get('foo', noop);
        crstore.set('foo', { cookie: {}, a: 1, b: 3,c: [1,2,3] }, noop);
    })
    .add('connect-smart-redis', function () {
        smartstore.get('foo', noop);
        smartstore.set('foo', session, noop);
    })
    .on('cycle', function(event) {
      console.log(String(event.target));
    })
    .run();
