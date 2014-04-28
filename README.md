# request-redis-cache [![Build status](https://travis-ci.org/uber/request-redis-cache.png?branch=master)](https://travis-ci.org/uber/request-redis-cache)

Make requests and cache them in [Redis][]

This was built along side [backbone-api-client][] to make caching responses from API clients easier. However, it is generic enough to use with any request mechanism.

[Redis]: http://redis.io/
[backbone-api-client]: https://github.com/uber/backbone-api-client

## Getting Started
Install the module with: `npm install request-redis-cache`

```js
var request_redis_cache = require('request-redis-cache');
request_redis_cache.awesome(); // "awesome"
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
