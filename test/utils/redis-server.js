// Load in dependencies
var spawn = require('child_process').spawn;

// Utility method for starting/stopping a redis server
exports.run = function () {
  var server;
  before(function startServer (done) {
    // Start a server at 9001, callback when it is listening
    server = spawn('redis-server', ['--port', '9001']);
    server.stdout.once('data', function handleServerListen (buff) {
      done();
    });
  });
  after(function stopServer (done) {
    // Kill the server and callback when dead
    server.on('exit', function (code) {
      done();
    });
    server.kill();
  });
};
