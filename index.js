const express = require('express');
const session = require('express-session');
const path = require('path');
const WebSocket = require('ws');
const { createServer } = require('http');

const jwt = require('jsonwebtoken');

//
// We need the same instance of the session parser in express and
// WebSocket server.
//
const sessionParser = session({
  saveUninitialized: false,
  secret: '$eCuRiTy',
  resave: false
});

const app = express();
app.use(sessionParser);
// app.use(express.static(path.join(__dirname, '/public')));

const server = createServer(app);
const wss = new WebSocket.Server({ server });

server.on('upgrade', function(request, socket, head) {
  console.log('Parsing session from request...');

  sessionParser(request, {}, () => {
    if (!request.session.userId) {
      // socket.destroy();
      return;
    }

    console.log('Session is parsed!');

    wss.handleUpgrade(request, socket, head, function(ws) {
      wss.emit('connection', ws, request);
    });
  });
});

wss.on('connection', function(ws, request) {
  const id = setInterval(function() {
    const data = JSON.stringify(process.memoryUsage());
    ws.send(data, function() {
      //
      // Ignore errors.
      //
      console.log('sending data=>', data);
    });
  }, 100);
  console.log('started client interval');

  ws.on('close', function() {
    console.log('stopping client interval');
    clearInterval(id);
  });

  ws.on('message', function(message) {
    console.log(
      `\n\nReceived message ${message} from user ${request.session.userId}\n\n`
    );
    if (typeof message === 'string') {
      try {
        const privateKey = 'node-websocket-jwt-example';
        const data = JSON.parse(message);
        console.log('data=>', data);
        // if (data.id) {
        //   request.session.userId = data.id;
        // }
        if (data.username && data.password) {
          const token = jwt.sign({
            username: data.username,
            password: data.password,
          }, privateKey);
          ws.send(JSON.stringify({ token }));
        } else {
          ws.send('received message ', data);
        }
      } catch (error) {
        if (error.message.includes('Unexpected token')) {
          ws.send('received message ', error);
        }
      }
    }
  });
});

server.listen(8080, function() {
  console.log('Listening on http://localhost:8080');
});