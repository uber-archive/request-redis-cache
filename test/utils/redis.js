// Load in dependencies
var spawn = require('child_process').spawn;
var redis = require('redis');

// Utility method for create a redis client
exports.run = function () {
  // Start a server
  var server;
  before(function startServer (done) {
    // Start a server at 9001, callback when it is listening
    server = spawn('redis-server', ['--port', '9001']);
    server.stdout.once('data', function handleServerListen (buff) {
      setTimeout(done, 100);
    });

    // Collect output in case the server terminates prematurely
    var output = '';
    server.stdout.on('data', function collectOutput (buff) {
      output += buff;
    });
    server.on('exit', function (code) {
      console.error('Unpredicted redis exit. Code: ' + code + '. Output: ' + output);
    });
  });

  // Connect a client
  before(function createClient () {
    this.redis = redis.createClient(9001);
  });

  // Teardown client and server
  after(function exitClient (done) {
    this.redis.quit(done);
    delete this.redis;
  });
  after(function stopServer (done) {
    // Kill the server and callback when dead
    server.on('exit', function (code) {
      done();
    });
    server.kill();
  });
};
