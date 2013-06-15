// USAGE:
//
// If you have foreman (you should!) set you .env file with
// SINGLY_CLIENT_ID and SINGLY_CLIENT_SECRET and then run:
//
// $ foreman start
//
// Otherwise set SINGLY_CLIENT_ID and SINGLY_CLIENT_SECRET and run:
//
// $ node app

var express = require('express');
var querystring = require('querystring');
var request = require('request');
var sprintf = require('sprintf').sprintf;
var oembed = require('oembed');
var jade_locals = require('./jade_locals.js');
var _ = require('lodash/dist/lodash.underscore');

oembed.EMBEDLY_KEY = process.env.EMBEDLY_KEY;

// The port that this express app will listen on
var port = process.env.PORT || 7464;

// Your client ID and secret from http://dev.singly.com/apps
var clientId = process.env.SINGLY_CLIENT_ID;
var clientSecret = process.env.SINGLY_CLIENT_SECRET;

var hostBaseUrl = (process.env.HOST || 'http://localhost:' + port);
var apiBaseUrl = process.env.SINGLY_API_HOST || 'https://api.singly.com';

// Create an HTTP server
var app = express();

// Require and initialize the singly module
var expressSingly = require('express-singly')(app, clientId, clientSecret,
  hostBaseUrl, hostBaseUrl + '/callback');

// Pick a secret to secure your session storage
var sessionSecret = '42';

// Jade Locals Middleware wrapper.
function wrapJadeLocals(req, res, next) {
  _.defaults(res.locals, jade_locals);
  next();
}

// Setup for the express web framework
app.configure(function() {
  app.set('view engine', 'jade');
  app.use(wrapJadeLocals);
  app.use(require('stylus').middleware({ src: __dirname + '/public' }));
  app.use(express.logger());
  app.use(express['static'](__dirname + '/public'));
  app.use(express.bodyParser());
  app.use(express.cookieParser());
  app.use(express.session({
    secret: sessionSecret
  }));
  expressSingly.configuration();
  app.use(app.router);
});

expressSingly.routes();

// We want exceptions and stracktraces in development
app.configure('development', function() {
  app.use(express.errorHandler({
    dumpExceptions: true,
    showStack: true
  }));
});

app.get('/', function(req, res) {
  // Render out views/index.jade, passing in the session
  res.render('index', {
    session: req.session
  });
});

app.listen(port);

console.log(sprintf('Listening at %s using API endpoint %s.', hostBaseUrl,
  apiBaseUrl));
