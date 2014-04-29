// Load in our dependencies
var expect = require('chai').expect;
var extend = require('obj-extend');
var redisUtils = require('./utils/redis');
var RequestRedisCache = require('../');

// Define helpers for interacting with cache
var cacheUtils = {
  // Method to create a new client
  create: function (options) {
    before(function createCache () {
      this.cache = new RequestRedisCache(extend({
        redis: this.redis
      }, options));
    });
    after(function cleanupCache () {
      delete this.cache;
    });
  },
  // Method to collect errors as they occur
  collectErrors: function () {
    before(function () {
      this.errors = [];
      var that = this;
      this.cache.on('error', function (error) {
        that.errors.push(error);
      });
    });
    after(function cleanupErrors () {
      delete this.errors;
    });
  }
};

// Start tests
describe('A RequestRedisCache', function () {
  redisUtils.run();
  cacheUtils.create();

  describe('fetching fresh data', function () {
    before(function setupCallCount () {
      this.callCount = 0;
    });
    function getFreshData() {
      before(function (done) {
        var that = this;
        this.cache.get({
          cacheKey: 'fresh-data',
          cacheTtl: 1000,
          requestOptions: {},
          uncachedGet: function (options, cb) {
            // DEV: This symbolizes any kind of response (e.g. api client response, HTTP response)
            that.callCount += 1;
            cb(null, {hello: 'world'});
          }
        }, function (err, data) {
          that.data = data;
          done(err);
        });
      });
    }
    getFreshData();

    it('retrieves our data', function () {
      expect(this.data).to.deep.equal({hello: 'world'});
    });

    describe('when fetched again', function () {
      getFreshData();

      it('does not double request', function () {
        expect(this.callCount).to.equal(1);
      });

      it('retrieves our data', function () {
        expect(this.data).to.deep.equal({hello: 'world'});
      });
    });
  });

  describe('with expired data', function () {
    before(function setupCallCount () {
      this.callCount = 0;
    });
    function getExpiredData() {
      before(function (done) {
        var that = this;
        this.cache.get({
          cacheKey: 'expired-data',
          cacheTtl: 1, // seconds
          requestOptions: {},
          uncachedGet: function (options, cb) {
            that.callCount += 1;
            cb(null, {count: that.callCount});
          }
        }, function (err, data) {
          that.data = data;
          done(err);
        });
      });
    }
    getExpiredData();
    before(function waitForExpiration (done) {
      setTimeout(done, 1100);
    });

    describe('when requested', function () {
      getExpiredData();

      it('grabs the fresh data', function () {
        expect(this.data).to.deep.equal({count: 2});
      });
    });
  });
});

// Edge cases for verifying we handle errors nicely
// TODO: We cannot think of a test case for verifying error handling with `del`
describe('A RequestRedisCache retrieving from a downed redis instance', function () {
  redisUtils.createClient();
  before(function swallowClientErrors () {
    this.redis.on('error', function noop () {});
  });
  cacheUtils.create();
  cacheUtils.collectErrors();
  before(function (done) {
    var that = this;
    this.cache.get({
      cacheKey: 'redisless-data',
      cacheTtl: 1000,
      requestOptions: {},
      uncachedGet: function (options, cb) {
        cb(null, {hello: 'world'});
      }
    }, function (err, data) {
      that.data = data;
      done(err);
    });
  });

  it('emits descriptive errors', function () {
    expect(this.errors.length).to.be.at.least(1);
    expect(this.errors[0]).to.have.property('cacheKey', 'redisless-data');
    expect(this.errors[0].action).to.contain('Could not get cached data from redis');
    expect(this.errors[1].action).to.contain('Could not save fresh data to redis');
  });

  it('grabs fresh data', function () {
    expect(this.data).to.deep.equal({hello: 'world'});
  });
});

describe('A RequestRedisCache with malformed data', function () {
  redisUtils.run();
  cacheUtils.create();
  cacheUtils.collectErrors();
  before(function saveBadData (done) {
    this.redis.set('malformed-data', '{"wat}', done);
  });
  before(function makeRequest (done) {
    var that = this;
    this.cache.get({
      cacheKey: 'malformed-data',
      cacheTtl: 1000,
      requestOptions: {},
      uncachedGet: function (options, cb) {
        cb(null, {hello: 'world'});
      }
    }, function (err, data) {
      that.data = data;
      done(err);
    });
  });
  before(function getBadDataTtl (done) {
    var that = this;
    this.redis.ttl('malformed-data', function (err, ttl) {
      that.ttl = ttl;
      done(err);
    });
  });

  it('emits a descriptive error', function () {
    expect(this.errors.length).to.be.at.least(1);
    expect(this.errors[0]).to.have.property('cacheKey', 'malformed-data');
    expect(this.errors[0].action).to.contain('Could not parse cached data from redis');
  });

  it('invalidates the cached data', function () {
    expect(this.ttl).to.equal(1000);
  });

  it('grabs fresh data', function () {
    expect(this.data).to.deep.equal({hello: 'world'});
  });
});

describe('A RequestRedisCache saving malformed data', function () {
  redisUtils.run();
  cacheUtils.create({
    stringify: function (data) {
      data.some.nonexistent.property;
      return JSON.stringify(data);
    }
  });
  cacheUtils.collectErrors();
  before(function makeRequest (done) {
    var that = this;
    this.cache.get({
      cacheKey: 'cannot-save-data',
      cacheTtl: 1000,
      requestOptions: {},
      uncachedGet: function (options, cb) {
        cb(null, {hello: 'world'});
      }
    }, function (err, data) {
      that.data = data;
      done(err);
    });
  });

  it('emits a descriptive error', function () {
    expect(this.errors.length).to.be.at.least(1);
    expect(this.errors[0]).to.have.property('cacheKey', 'cannot-save-data');
    expect(this.errors[0].action).to.contain('Could not stringify');
  });

  it('grabs fresh data', function () {
    expect(this.data).to.deep.equal({hello: 'world'});
  });
});
