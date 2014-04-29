// Generate a new cache
var redis = require('redis');
var RequestRedisCache = require('../');
var redisClient = redis.createClient();
var cache = new RequestRedisCache({
  redis: redisClient
});

// Fetch some data from a fake client
cache.get({
  cacheKey: 'hello-world',
  cacheTtl: 100, // seconds
  // Dynamic `options` to pass to our `uncachedGet` call
  requestOptions: {},
  // Action to use when we cannot retrieve data from cache
  uncachedGet: function (options, cb) {
    // Simulate data coming back from an API client (should be already parsed)
    cb(null, {hello: 'world'});
  }
}, function handleData (err, data) {
  // Look at the data in our cache, '{"hello":"world"}'
  redisClient.get('hello-world', console.log);

  // Re-retrieve the data
  cache.get({
    cacheKey: 'hello-world',
    cacheTtl: 100,
    requestOptions: {},
    uncachedGet: function (options, cb) {
      cb(new Error('This will not be reached since the data is cached'));
    }
  }, console.log); // {hello: 'world'}
});
