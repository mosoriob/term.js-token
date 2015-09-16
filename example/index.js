#!/usr/bin/env node

/**
 * term.js
 * Copyright (c) 2012-2013, Christopher Jeffrey (MIT License)
 */

var http = require('http')
  , express = require('express')
  , io = require('socket.io')
  , pty = require('pty.js')
  , terminal = require('../');

/**
 * term.js
 */

process.title = 'term.js';

/**
 * Dump
 */

var stream;
if (process.argv[2] === '--dump') {
  stream = require('fs').createWriteStream(__dirname + '/dump.log');
}

/**
 * Open Terminal
 */

var buff = []
  , socket
  , term;

term = pty.fork(process.env.SHELL || 'sh', [], {
  name: require('fs').existsSync('/usr/share/terminfo/x/xterm-256color')
    ? 'xterm-256color'
    : 'xterm',
  cols: 80,
  rows: 24,
  cwd: process.env.HOME
});

term.on('data', function(data) {
  if (stream) stream.write('OUT: ' + data + '\n-\n');
  return !socket
    ? buff.push(data)
    : socket.emit('data', data);
});

console.log(''
  + 'Created shell with pty master/slave'
  + ' pair (master: %d, pid: %d)',
  term.fd, term.pid);

/**
 * App & Server
 */

var app = express()
  , server = http.createServer(app);

app.get('/', function (req, res, next) {
	var async = require('async');
	global.state = true;
  next();
		
	});

function check_token(fnCallback) {
      async.series([
      function(callback) {
            var token = req.query.token;
            var request = require('request-json');
            var client = request.newClient('http://10.91.11.19:8000/');
            var user=req.query.user + ".json"
	    console.log(user)
            var auth=client.get('token/'+ token + '/' + user, function (err, res, body) {
                    global.state = body.success;
                    return console.log("Cliente: "+ global.state);
            });

            callback();
          },

          function(callback) {
            setTimeout(callback, 1000);
          },
      ], function(err, results) {
          fnCallback();
      });
}


});


app.use(function(req, res, next) {
		var setHeader = res.setHeader;
  		res.setHeader = function(name) {
  	  	switch (name) {
     			case 'Cache-Control':
      			case 'Last-Modified':
     			case 'ETag':
        			return;
    		}
    		return setHeader.apply(res, arguments);
		};
 		next();

});

/*app.use(express.basicAuth(function(user, pass, next) {
  if (user !== 'foo' || pass !== 'bar') {
    return next(true);
  }
  return next(null, user);
}));
*/
app.use(express.static(__dirname));
app.use(terminal.middleware());

if (!~process.argv.indexOf('-n')) {
  server.on('connection', function(socket) {
    var address = socket.remoteAddress;
  });
}

server.listen(3131);

/**
 * Sockets
 */

io = io.listen(server, {
  log: false
});

io.sockets.on('connection', function(sock) {
  socket = sock;

  socket.on('data', function(data) {
    if (stream) stream.write('IN: ' + data + '\n-\n');
    term.write(data);
  });

  socket.on('disconnect', function() {
    socket = null;
  });

  while (buff.length) {
    socket.emit('data', buff.shift());
  }
});
