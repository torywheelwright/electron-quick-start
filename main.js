const { app, net } = require('electron');
const { exec } = require('child_process');

const SERVER_STARTUP_TIME_S = 2; // Give the server some time to start listening for connections
const SERVER_PORT = 8888;

const startServer = (username, password) => exec(`../server.py ${SERVER_PORT} ${username}:${password}`, { cwd: `${__dirname}/pub` });

const runTest = (username, password) => new Promise(resolve => {
  console.log(`beginning test with username '${username}' and password '${password}'. `
              + `waiting ${SERVER_STARTUP_TIME_S} seconds for server to start`);

  // Start the server to which we will attempt to auth
  const serverProcess = startServer(username, password);

  // Give it some time to start listening for requests
  setTimeout(() => {
    // Make a request to the server
    console.log('making request');
    const req = net.request(`http://localhost:${SERVER_PORT}`);

    // Handle the expected basic-auth request
    req.on('login', (authInfo, callback) => {
      console.log('handling login event');
      callback(username, password);
    });

    // We do not expect any error events.
    req.on('error', err => console.log('error:', err));

    // Handle the response and print the status code. We expect 200, but this bug appears to
    // treat an empty string username or password as the cancellation of the login request,
    // which is done by calling the callback with no arguments, as described here:
    // https://electronjs.org/docs/api/client-request#event-login
    req.on('response', response => {
      console.log(`got response status code '${response.statusCode}'`);

      // Kill the server process
      console.log('killing server');
      serverProcess.on('exit', () => {
        console.log('server dead');
        console.log();
        resolve();
      });
      serverProcess.kill();
    });

    req.end();
  }, SERVER_STARTUP_TIME_S * 1000);
});

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', () => {
  // Run the test for every combination of empty and nonempty username and password.

  //////////////////////////////////////////////////////////////////////////////////
  // TODO: for some reason that I don't understand in the slightest, once you have
  // authed successfuly one time, all requests will return 200. This will continue
  // EVEN IF THE SERVER ISNT STARTED DURING THE TEST until you choose a new port.
  // But I can't curl against that port, so it doesn't seem that anything is running
  // there. I have no idea what is going on.
  // This can be verified by choosing a random port and commenting the first element
  // of the array below.
  [
    ['username', 'password'],
    ['username', ''],
    ['', 'password'],
    ['', ''],
  ].reduce((promise, creds) => promise.then(() => runTest(...creds)), Promise.resolve())
    .then(app.quit);
});
