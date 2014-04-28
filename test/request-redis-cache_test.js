// Load in our dependencies
var expect = require('chai').expect;
var redisUtils = require('./utils/redis');
var RequestRedisCache = require('../');

// Define helpers for interacting with cache
var cacheUtils = {
  // Method to create a new client
  create: function () {
    before(function createCache () {
      this.cache = new RequestRedisCache({
        redis: this.redis
      });
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
          uncachedGet: function (options, cb) {
            // DEV: This symbolizes any kind of response (e.g. api client response, HTTP response)
            that.callCount += 1;
            cb(null, {hello: 'world'});
          },
          requestOptions: {}
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
          uncachedGet: function (options, cb) {
            that.callCount += 1;
            cb(null, {count: that.callCount});
          },
          requestOptions: {}
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
describe.only('A RequestRedisCache retrieving from a downed redis instance', function () {
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
      uncachedGet: function (options, cb) {
        cb(null, {hello: 'world'});
      },
      requestOptions: {}
    }, function (err, data) {
      that.data = data;
      done(err);
    });
  });

  it('emits a descriptive error', function () {
    expect(this.errors.length).to.be.at.least(1);
    expect(this.errors[0]).to.have.property('cacheKey', 'redisless-data');
    expect(this.errors[0].action).to.contain('Could not get cached data from redis');
    expect(this.errors[1].action).to.contain('Could not save fresh data to redis');
  });

  it('grabs fresh data', function () {
    expect(this.data).to.deep.equal({hello: 'world'});
  });
});

describe.skip('A RequestRedisCache with malformed data', function () {
  it('emits a descriptive error', function () {

  });

  it('invalidates the cached data', function () {

  });

  it('grabs fresh data', function () {

  });
});

// DEV: This verifies `redis.get` and `redis.setex` degrades nicely
// TODO: We cannot think of a test case for verifying error handling with `del`
describe.skip('A RequestRedisCache caching fresh data with a bad key', function () {
  it('emits an error about the get from cache', function () {

  });

  it('emits an error about the set to cache', function () {

  });

  it('returns fresh data', function () {

  });
});
