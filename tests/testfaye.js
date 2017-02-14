const faye = require('faye')
var Extensions = require('websocket-extensions'),
    deflate    = require('permessage-deflate');
var client = new faye.Client("http://127.0.0.1:8880/faye")
client.addWebsocketExtension(deflate)
//client.disable('autodisconnect')
client.connect();
var subscription = client.subscribe('/users/*', function(message) {
  console.log("ws message ", message)
});

subscription.then(function() {
    console.log('Subscription is now active!');
});

subscription.callback(function() {
  console.log('[SUBSCRIBE SUCCEEDED]');
});
subscription.errback(function(error) {
  console.log('[SUBSCRIBE FAILED]', error);
});
client.bind('transport:down', function() {
  console.log('[CONNECTION DOWN]');
});
client.bind('transport:up', function() {
  console.log('[CONNECTION UP]');
});
    client.bind('error', function(e) {
  console.log('[CONNECTION err]', e);
});