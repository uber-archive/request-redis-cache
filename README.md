# request-redis-cache [![Build status](https://travis-ci.org/uber/request-redis-cache.png?branch=master)](https://travis-ci.org/uber/request-redis-cache)

Make requests and cache them in [Redis][]

This was built along side [backbone-api-client][] to make caching responses from API clients easier. However, it is generic enough to use with any request mechanism.

[Redis]: http://redis.io/
[backbone-api-client]: https://github.com/uber/backbone-api-client

## Getting Started
Install the module with: `npm install request-redis-cache`

```js
// Generate a new cache
var redis = require('redis');
var RequestRedisCache = require('request-redis-cache');
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
```

## Documentation
_(Coming soon)_

## Examples
_(Coming soon)_

## Contributing
In lieu of a formal styleguide, take care to maintain the existing coding style. Add unit tests for any new or changed functionality. Lint via [grunt](https://github.com/gruntjs/grunt) and test via `npm test`.

## License
Copyright (c) 2014 Uber Technologies, Inc.

Licensed under the MIT license.
