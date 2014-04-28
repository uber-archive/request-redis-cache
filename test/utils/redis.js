// Load in dependencies
var redis = require('redis');

// Utility method for create a redis client
exports.createClient = function () {
  before(function startServer () {
    this.redis = redis.createClient(9001);
  });
  after(function stopServer (done) {
    this.redis.quit(done);
    delete this.redis;
  });
};
