const { app, net } = require('electron');
const { exec } = require('child_process');

const USERNAME = '';
const PASSWORD = 'password';

const SERVER_PORT = 8888;

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', () => {
  // Make a request to the server
  console.log('making request');
  const req = net.request(`http://localhost:${SERVER_PORT}`);

  // Handle the expected basic-auth request
  req.on('login', (authInfo, callback) => {
    console.log('handling login event');
    callback(USERNAME, PASSWORD);
  });

  // We do not expect any error events.
  req.on('error', err => console.log('error:', err));

  // Handle the response and print the status code. We expect 200, but this bug appears to
  // treat an empty string username or password as the cancellation of the login request,
  // which is done by calling the callback with no arguments, as described here:
  // https://electronjs.org/docs/api/client-request#event-login
  req.on('response', response => {
    console.log(`got response status code '${response.statusCode}'`);
    app.quit();
  });

  req.end();
});
