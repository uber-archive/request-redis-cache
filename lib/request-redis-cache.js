// Load in dependencies
var assert = require('assert');
var async = require('async');

// Define our cache constructor
function RequestCache(options) {
  // Assert redis and logger are provided
  this.redis = options.redis;
  assert(this.redis, 'RequestCache expected `options.redis` to be defined but it was not found');
  this.logger = options.logger;
  assert(this.logger, 'RequestCache expected `options.logger` to be defined but it was not found');
}
RequestCache.prototype = {
  get: function (params, cb) {
    // Assert we received everything we need
    var cacheKey = params.cacheKey;
    assert(cacheKey, '`RequestCache#get` requires `params.cacheKey` but none was provided');
    var cacheTtl = params.cacheTtl;
    assert(cacheTtl, '`RequestCache#get` requires `params.cacheTtl` but none was provided');
    var uncachedGet = params.uncachedGet;
    assert(uncachedGet, '`RequestCache#get` requires `params.uncachedGet` but none was provided');
    var requestOptions = params.requestOptions;
    assert(requestOptions, '`RequestCache#get` requires `params.requestOptions` but none was provided');

    // Attempt to look up the item in our cache
    var that = this;
    that.redis.get(cacheKey, function handleCacheGet (err, json) {
      // Define fresh get function
      function freshGet() {
        params.uncachedGet(requestOptions, function handleUncachedRead (err, info) {
          // If there was an error, callback with it
          if (err) {
            return cb(err);
          }

          // Save the original response
          var json = JSON.stringify(info);
          that.redis.setex(cacheKey, cacheTtl, json, function handleCacheSet (err) {
            // If there was an error, log it
            if (err) {
              that.logger.error('RequestCache#get: Could not save fresh data to redis', {
                err: err,
                cacheKey: cacheKey,
                json: json
              });
            }

            // Callback with the info from uncached get
            return cb(null, info);
          });
        });
      }

      // If there was an error, invalidate the cache and callback
      if (err) {
        // Log the error
        that.logger.error('RequestCache#get: Could not retrieve cached data from redis', {
          err: err,
          cacheKey: cacheKey
        });

        // and run the normal uncached get
        return freshGet();
      // Otherwise, if the item exists
      } else if (json) {
        // Attempt to parse the cache
        var info;
        try {
          info = JSON.parse(json);
        // If we cannot parse the cache
        } catch (err) {
          // Log the error
          that.logger.error('RequestCache#get: Could not parse cached data from redis', {
            err: err,
            cacheKey: cacheKey,
            json: json
          });

          // Invalidate the cache
          that.redis.del(cacheKey, function handleCacheInvalidation (err) {
            // If there was an error, log it
            if (err) {
              that.logger.error('RequestCache#get: Could not delete un-parsable cached data on redis', {
                err: err,
                cacheKey: cacheKey,
                json: json
              });
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
  },
  del: function (pattern, callback) {
    return this.delAll([pattern], callback);
  },
  delAll: function (patterns, callback) {
    // For each of the patterns
    var that = this;
    async.forEach(patterns, function deleteKeyPattern (pattern, cb) {
      // Get its keys
      that.redis.keys(pattern, function handleKeys (err, keys) {
        // If there was an error, callback with it
        if (err) {
          return cb(err);
        }

        // If there are keys, delete then
        if (keys.length) {
          // DEV: There is a bit of a delay between get/delete but it is unavoidable
          that.redis.del(keys, cb);
        // Otherwise, return immediately (we are already async)
        } else {
          cb();
        }
      });
    // Callback with result
    }, callback);
  }
};

// Export our RequestCache constructor
module.exports = RequestCache;
