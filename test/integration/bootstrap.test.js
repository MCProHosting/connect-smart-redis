var redis = require('redis');
var Store = require('../../')({ session: { Store: function () {} }});

before(function (done) {
    this.redis = redis.createClient();
    this.redis.on('ready', done);
});

beforeEach(function (done) {
    this.redis.DEL(['foo', 'bar'], done);
    this.store = new Store({ client: this.redis, ttl: 1 });
});

after(function () {
    this.redis.end();
});
