var express = require('express');
const crypto = require('crypto');
//this is our config file - includes database info to connect. See definition
//for values.
var config = require('./config');
var mysql = require('mysql');
var cookie_parser = require('cookie-parser');
var socketIoCookieParser = require("socket.io-cookie-parser");
var bodyParser = require("body-parser");
var app = express();
var http = require('http').createServer(app);
var io = require('socket.io')(http);
var port = process.env.PORT || 3000;
var fs = require('fs');

app.use(cookie_parser());
app.use(bodyParser.urlencoded({ extended: true }));
io.use(socketIoCookieParser());

var users = {};
var taken_names = {};
var message_log = [];
var database = mysql.createConnection(config.database);
database.connect();


//Test query - connects to mysql :>
database.query('SHOW TABLES;', function(error, results){
    if (error)
	console.log("error :(   -   ", error.stack);
    else
	console.log('the solution is: ', results[0].Tables_in_babble);
});

http.listen( port, function () {
    console.log('listening on port', port);
});

var ss = require('socket.io-stream');
var path = require('path');

app.get("/", function(req, res, next){
    //do stuff on home get request
    next();
});

//stub for login - check that password == user password in DB.
app.post("/login", function(req, res){
    console.log(req.body);
    res.send({'success': true});
});

//stub for register - try to register user and log in DB.
app.post("/register", function(req, res){
    console.log(req.body);
    res.send({'success': true});
});

app.use(express.static(__dirname + '/public'));

io.of('/').on('connection', function(socket){
    ss(socket).on('write-file', function(stream, data){
	console.log("in here");
	console.log(stream);
	var filename = path.basename(data.name);
	stream.pipe(fs.createWriteStream(filename));
    })
});

// listen to 'chat' messages
/*io.on('connection', function(socket){
    let user = socket.request.cookies.user_hash;
    
    if(users[user] != undefined){
	console.log("Known user: " + user);
    }else{
	console.log("New user");
	name = generate_username();
	users[user] = { 'user_name': name, 'user_color': '#00ace6' };
    }

    socket.on('disconnect', function(){
	if (users[user] != undefined){
	    let message = { 'user': 'server',
			    'timestamp':new Date().getTime(),
			    'color': '#e24646',
			    'contents':users[user].user_name + " has left the server." };
	    
	    users[user].connected = false;
	    
	    io.emit('chat', message);
	    io.emit('user_left', users[user].user_name);
	}		     
    });

    socket.on('loaded', function(){
	console.log("loaded");
	if(users[user] != undefined){
	    console.log("Known user. " + users[user].user_name + " logged in.");
	    users[user].connected = true;
	}else{
	    console.log("Undefined...");
	    users[user] = {'name': generate_username(),
			   'user_color':'#00ace6',
			   'connected':true};
	}
	
	socket.emit('user_name', { 'user_name': users[user].user_name,
				   'user_color': users[user].user_color });


	for(let message of message_log){
	    socket.emit('chat', message);
	}

	for(let key in users){
	    if(users[key].connected){
		io.emit('user_joined', {'user_name': users[key].user_name,
					'user_color': users[key].user_color });
	    }
	}

	message = {'user' : 'server',
		   'timestamp':new Date().getTime(),
		   'color': '#76d65e',
		   'contents': users[user].user_name + " has joined the server."};

	io.emit('chat', message);

	message = {'user' : 'server',
		   'timestamp':new Date().getTime(),
		   'color': '#e24646',
		   'contents': 'Type /help to see a list of commands'};
	
	socket.emit('chat', message);	    
    });
    
    socket.on('chat', function(msg){

	if(users[user] != undefined){
	    let date = new Date();

	    // need to get user from here, message could be a command

	    let msg_contents = parse_message(msg, socket, user);

	    let user_name = msg_contents.user

	    console.log(user_name);
	    user_name = user_name == undefined ? users[user].user_name : user_name;
	    
	    let contents = msg_contents.message;
	    let color = msg_contents.color;
	    color = color == undefined ? users[user].user_color : color;

	    //did the parse of the message change the user who is sending it
	    //if not, keep it as the user who sent it - regular message

	    console.log('sending message from ' + user_name);
	    
	    let message = { 'user' : user_name,
			    'timestamp': date.getTime(),
			    'color': color,
			    'contents' : contents };

	    console.log('contents: ' + contents);
	    //if server message, only send to person who sent message, not everyone
	    if(user_name == 'server'){
		socket.emit('chat', message);
	    }else{
		console.log("Shouldnt be server: " + user);
		if (message_log.length >= 300){
		    shift(message_log);
		}
		message_log.push(message);
		io.emit('chat', message);
	    }
	}
    }); 

});*/
