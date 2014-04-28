// Load in dependencies
var express = require('express');

exports.run = function (fn) {
  var _app;
  before(function startServer () {
    var app = express();
    var that = this;
    this.callCount = 0;
    app.use(function callCounter (req, res, next) {
      that.callCount += 1;
      next();
    });
    app.use(fn);
    _app = app.listen(1337);
  });
  after(function stopServer (done) {
    _app.close(done);
    delete this.callCount;
  });
};
