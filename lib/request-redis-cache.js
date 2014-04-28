// Load in dependencies
var assert = require('assert');
var EventEmitter = require('events').EventEmitter;
var util = require('util');
var errs = require('errs');

// Define our cache constructor
function RequestRedisCache(options) {
  // Run the EventEmitter constructor
  EventEmitter.call(this, options);

  // Assert redis is provided
  this.redis = options.redis;
  assert(this.redis, 'RequestRedisCache expected `options.redis` to be defined but it was not found');

  // Add fallbacks for custom serializer/parsers
  this.stringify = options.stringify || JSON.stringify;
  this.parse = options.parse || JSON.parse;
}
util.inherits(RequestRedisCache, EventEmitter);
RequestRedisCache.prototype.get = function (params, cb) {
  // Assert we received everything we need
  var cacheKey = params.cacheKey;
  assert(cacheKey, '`RequestRedisCache#get` requires `params.cacheKey` but none was provided');
  var cacheTtl = params.cacheTtl;
  assert(cacheTtl, '`RequestRedisCache#get` requires `params.cacheTtl` but none was provided');
  var uncachedGet = params.uncachedGet;
  assert(uncachedGet, '`RequestRedisCache#get` requires `params.uncachedGet` but none was provided');

  // Attempt to look up the item in our cache
  var that = this;
  that.redis.get(cacheKey, function handleCacheGet (err, infoStr) {
    // Define fresh get function
    function freshGet() {
      params.uncachedGet(params.requestOptions, function handleUncachedRead (err, info) {
        // If there was an error, callback with it
        if (err) {
          return cb(err);
        }

        // Save the original response
        var infoStr = that.stringify(info);
        that.redis.setex(cacheKey, cacheTtl, infoStr, function handleCacheSet (err) {
          // If there was an error, emit it
          if (err) {
            // Clone the error and add our properties
            // DEV: node-redis reuses errors when it is offline so we must clone it =/
            // https://github.com/mranney/node_redis/blob/master/index.js#L139-L142
            var niceErr = errs.merge(err, {
              action: 'RequestRedisCache#get: Could not save fresh data to redis',
              cacheKey: cacheKey,
              infoStr: infoStr
            });
            that.emit('error', niceErr);
          }

          // Callback with the info from uncached get
          return cb(null, info);
        });
      });
    }

    // If there was an error
    if (err) {
      // Emit the error
      var niceErr = errs.merge(err, {
        action: 'RequestRedisCache#get: Could not get cached data from redis',
        cacheKey: cacheKey
      });
      that.emit('error', niceErr);

      // and run the normal uncached get
      return freshGet();
    // Otherwise, if the item exists
    } else if (infoStr) {
      // Attempt to parse the cache
      var info;
      try {
        info = that.parse(infoStr);
      // If we cannot parse the cache
      } catch (err) {
        // Emit the error
        var niceErr = errs.merge(err, {
          action: 'RequestRedisCache#get: Could not parse cached data from redis',
          cacheKey: cacheKey,
          infoStr: infoStr
        });
        that.emit('error', niceErr);

        // Invalidate the cache
        that.redis.del(cacheKey, function handleCacheInvalidation (err) {
          // If there was an error, emit it
          if (err) {
            var niceErr = errs.merge(err, {
              action: 'RequestRedisCache#get: Could not delete un-parsable cached data on redis',
              cacheKey: cacheKey,
              infoStr: infoStr
            });
            that.emit('error', niceErr);
          }

          // Continue to uncached get
          return freshGet();
        });
        return;
      }

      // Send back the parsed cache information
      return cb(null, info);
    // Otherwise, request the normal item via fresh get
    } else {
      return freshGet();
    }
  });
};

// Export our RequestRedisCache constructor
module.exports = RequestRedisCache;
