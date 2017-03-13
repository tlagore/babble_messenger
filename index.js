var express = require('express');
var app = express();
var http = require('http').createServer(app);
var io = require('socket.io')(http);
var port = process.env.PORT || 3000;

http.listen( port, function () {
    console.log('listening on port', port);
});


app.get("/", function(req, res, next){
    var ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
    console.log(ip);
    next();
});

app.use(express.static(__dirname + '/public'));

/*app.get("/", function(req, res){
    console.log("in here.");
});*/

// listen to 'chat' messages
io.on('connection', function(socket){
    socket.on('chat', function(msg){
	let date = new Date();
	io.emit('chat', { 'user' : 'Bob',
			  'timestamp': date.getTime(),
			  'contents' : msg });
    });
});
