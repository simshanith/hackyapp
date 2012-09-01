// USAGE:
// if you have foreman (you should!) set you .env file with
// SINGLY_CLIENT_ID and SINGLY_CLIENT_SECRET and then run:
//
// foreman start
//
// otherwise set SINGLY_CLIENT_ID and SINGLY_CLIENT_SECRET and run:
//
// node app

var express = require('express');
var querystring = require('querystring');
var request = require('request');
var sprintf = require('sprintf').sprintf;

// The port that this express app will listen on
var port = process.env.PORT || 7464;

// Your client ID and secret from http://dev.singly.com/apps
var clientId = process.env.SINGLY_CLIENT_ID;
var clientSecret = process.env.SINGLY_CLIENT_SECRET;

var hostBaseUrl = (process.env.HOST || 'http://localhost:') + port;
var apiBaseUrl = process.env.API_HOST || 'https://api.singly.com';

// require and initialize the singly module
var singly = require('singly')(clientId, clientSecret, hostBaseUrl + '/callback');


// Pick a secret to secure your session storage
var sessionSecret = '42';

var usedServices = [
   'Facebook',
   'foursquare',
   'Instagram',
   'Tumblr',
   'Twitter',
   'LinkedIn',
   'FitBit',
   'WordPress',
   'GContacts',
   'GitHub',
   'Gmail',
   'Dropbox',
   'Google',
   'RunKeeper'
];

// Given the name of a service and the array of profiles, return a link to that
// service that's styled appropriately (i.e. show a link or a checkmark).
function getLink(prettyName, profiles, token) {
  var service = prettyName.toLowerCase();

  // If the user has a profile authorized for this service
  if (profiles && profiles[service] !== undefined) {
    // Return a unicode checkmark so that the user doesn't try to authorize it again
    return sprintf('<span class="check">&#10003;</span> <a href="%s/services/%s?access_token=%s">%s</a>', apiBaseUrl, service, token, prettyName);
  }

  return '<a href="' + singly.getAuthorizeURL(service) + '">' + prettyName + "</a>";
}

// Create an HTTP server
var app = express.createServer();

// Setup for the express web framework
app.configure(function() {
  app.use(express.logger());
  app.use(express.static(__dirname + '/public'));
  app.use(express.bodyParser());
  app.use(express.cookieParser());
  app.use(express.session({
    secret: sessionSecret
  }));
  app.use(app.router);
});

// We want exceptions and stracktraces in development
app.configure('development', function() {
  app.use(express.errorHandler({
    dumpExceptions: true,
    showStack: true
  }));
});

// Use ejs instead of jade because HTML is easy
app.set('view engine', 'ejs');

app.get('/', function(req, res) {
  var i;
  var services = [];

  // For each service in usedServices, get a link to authorize it
  for (i = 0; i < usedServices.length; i++) {
    services.push({
      name: usedServices[i],
      link: getLink(usedServices[i], req.session.profiles, req.session.access_token)
    });
  }

  // Render out views/index.ejs, passing in the array of links and the session
  res.render('index', {
    services: services,
    session: req.session
  });
});

// this is experimental so you can ignore it, see https://singly.com/write
app.get('/apiauth', function(req, res) {
  if(!req.session || !req.session.profiles) return res.send("not logged in, temp dead end, TODO",400);
   res.render('apiauth', {
     callback: req.query.callback,
     account: req.session.profiles.id,
     validation: require('crypto').createHash('md5').update(clientSecret+req.session.profiles.id).digest('hex'),
     session: req.session
   });
});

app.get('/callback', function(req, res) {
  var code = req.param('code');
  // Exchange the OAuth2 code for an access_token
  singly.getAccessToken(code, function (err, accessToken) {
    // Save the access_token for future API requests
    req.session.access_token = accessToken;

    // Fetch the user's service profile data
    singly.apiCall('/profiles', {access_token:accessToken}, function(err, profiles) {
      req.session.profiles = profiles;

      res.redirect('/');
    });
  });
});

app.listen(port);

console.log(sprintf('Listening at %s using API endpoint %s.', hostBaseUrl, apiBaseUrl));
