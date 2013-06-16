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

var jade_locals = require('./jade_locals.js');
var _ = require('lodash/dist/lodash.underscore');
var when = require("promised-io/promise");
var Deferred = when.Deferred;

// The port that this express app will listen on
var port = process.env.PORT || 7464;

// Your client ID and secret from http://dev.singly.com/apps
var clientId = process.env.SINGLY_CLIENT_ID;
var clientSecret = process.env.SINGLY_CLIENT_SECRET;

var hostBaseUrl = (process.env.HOST || 'http://localhost:' + port);
var apiBaseUrl = process.env.SINGLY_API_HOST || 'https://api.singly.com';

var singly = require('singly')(clientId, clientSecret, hostBaseUrl+'/callback');

var embedly = require('embedly');
var EMBEDLY_KEY = process.env.EMBEDLY_KEY;

// Create an HTTP server
var app = express();

// Require and initialize the singly module
var expressSingly = require('express-singly')(app, clientId, clientSecret,
  hostBaseUrl, hostBaseUrl + '/callback');

// Pick a secret to secure your session storage
var sessionSecret = '42';

// Jade Locals Middleware wrapper.
function jadeMiddleware(req, res, next) {
  res.locals = wrapJadeLocals(res.locals);
  next();
}

function wrapJadeLocals(locals) {
  function wrapped(obj){
    var extended = _.extend({}, locals(obj));
    var withLocals =  _.defaults(extended, jade_locals);
    return withLocals;
  }

  return _.extend(wrapped, locals);
}

// Setup for the express web framework
app.configure(function() {

  app.set('view engine', 'jade');
  app.use(jadeMiddleware);


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

app.get('/dashboard', function(req, res) {
  res.render('dashboard', {});
});

app.get('/singly/videos', function(req, res) {
  var token = req.session.accessToken;
  if(token) {
    singly.get('/types/videos', {limit: 25, access_token: token}, function(err, singlyResp, body) {
      if(err){
        console.log('Singly Video Error:', err);
        res.redirect('/');
        return;
      }
      var videos = _.compact(_.map(body, function(videoEntry) {
        return videoEntry.data && videoEntry.oembed.url;
      }));

      console.log('VIDEOS::::',videos);

      var deferreds = _.map(videos, returnDeferred);
      var videosDeferred = when.all(deferreds);

      new embedly({key: EMBEDLY_KEY}, function(err, api) {
        _.each(videos, function(videoUrl, i, videos) {
          api.oembed({url:videoUrl, maxwidth: 600}, function(err, oEmbedResp) {
            if(err) {
              deferreds[i].reject(err);
            } else {
              deferreds[i].resolve(oEmbedResp);
            }
          });
        });
      });

      videosDeferred.then(function(results) {

        var html = _.map(results, function(videoEntry) {
          var obj = _.first(videoEntry);
          return obj && obj.html;
        });
        html = _.compact(html);
        res.render('oembed', {oEmbeddedContent: html.join('\n')});
      });

      function returnDeferred() {
        return new Deferred();
      }

    });
  } else {
    res.redirect('/');
  }
});

app.listen(port);

console.log(sprintf('Listening at %s using API endpoint %s.', hostBaseUrl,
  apiBaseUrl));
