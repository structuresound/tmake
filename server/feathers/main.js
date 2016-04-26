const feathers = require('feathers');
const rest = require('feathers-rest');
const socketio = require('feathers-socketio');
const hooks = require('feathers-hooks');
const memory = require('feathers-memory');
const authentication = require('feathers-authentication');
const bodyParser = require('body-parser');
const handler = require('feathers-errors/handler');
var MongoClient = require('mongodb').MongoClient;
const service = require('feathers-mongodb');
const configuration = require('feathers-configuration')

// A Feathers app is the same as an Express app
const app = feathers();

// Parse HTTP JSON bodies
app.use(bodyParser.json());
// Parse URL-encoded params
app.use(bodyParser.urlencoded({
  extended: true
}));
// Register hooks module
app.configure(hooks());
// Add REST API support
app.configure(rest());
// Configure Socket.io real-time APIs
app.configure(socketio());
// Register our authentication plugin
app.configure(authentication({
  idField: 'id'
}));

var start = function(db) {
  // Register our memory "users" service
  app.use('/users', memory());

  // Register a nicer error handler than the default Express one
  app.use(handler());

  // Register a before hook to hash passwords
  app.service('users').before({
    create: authentication.hooks.hashPassword()
  });

  // Create a test user
  app.service('users').create({
    email: 'admin@feathersjs.com',
    password: 'admin'
  });

  app.use('/messages', service({
    Model: db.collection('messages'),
    paginate: {
      default: 2,
      max: 4
    }
  }));

  app.service('messages').create({
    title: 'admin message',
    description: 'u know it'
  });

  // Start the server
  var server = app.listen(80);
  server.on('listening', function() {
    console.log('Feathers Message MongoDB service running on 127.0.0.1');
  });
}

var connectWithRetry = function() {
  // Connect to your MongoDB instance(s)
  MongoClient.connect('mongodb://mongo:27017/feathers').then(function(db) {
    start(db);
  }).catch(function(error) {
    console.error('Failed to connect to mongo on startup - retrying in 1 sec', error);
    setTimeout(connectWithRetry, 1000);
  });
};
connectWithRetry();
