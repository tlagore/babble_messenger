var express = require('express');
var cookie_parser = require('cookie-parser');
var socketIoCookieParser = require("socket.io-cookie-parser");
var app = express();
var http = require('http').createServer(app);
var io = require('socket.io')(http);
var port = process.env.PORT || 3000;

app.use(cookie_parser());
io.use(socketIoCookieParser());

var users = {};
var taken_names = {};
var message_log = [];

http.listen( port, function () {
    console.log('listening on port', port);
});



app.get("/", function(req, res, next){
   // var ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
    var cookie = req.cookies.user_hash;
    console.log(cookie);
    
    if (cookie === undefined){
	let user_hash = Math.floor(Math.random() * 1000000);

	name = generate_username();

	users[user_hash] = { 'user_name': name, 'user_color': '#00ace6' };
	console.log("new user: " + name);
	//1 hour expiration on cookie
	res.cookie("user_hash", user_hash, { maxAge: 1000 * 60 * 60, httpOnly: true});
    }else{
	if (!(cookie in users)){
	    console.log("Cookie wasnt in users...");
	    users[cookie] = { 'user_name': generate_username(), 'user_color': '#00ace6' };
	}
	console.log("existing user: " + cookie);
    }
    next();
});

app.use(express.static(__dirname + '/public'));

// listen to 'chat' messages
io.on('connection', function(socket){
    let user = socket.request.cookies.user_hash;

    if(user != undefined){
	console.log("Known user: " + user);
    }else{
	console.log("New user");
    }

    socket.on('loaded', function(){
	//console.log(socket.id);
	console.log(users);
	if(users[user] != undefined){
	    users[user].connected = true;
	}else{
	    console.log("Undefined...");
	    users[user] = {'name': generate_username(),
			   'user_color':'#00ace6',
			   'connected':true};
	}
	
	socket.emit('user_name', users[user].user_name);

	message = {'user' : 'server',
		   'timestamp':new Date().getTime(),
		   'color': '#76d65e',
		   'contents': users[user].user_name + " has joined the server."};

	io.emit('chat', message);

	for(let message of message_log){
	    socket.emit('chat', message);
	}

	for(let key in users){
	    if (users[key].connected){
		io.emit('user_joined', users[key].user_name);
	    }
	}
    });

    socket.on('disconnect', function(msg){
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
    
    socket.on('chat', function(msg){
	let date = new Date();
	let message = { 'user' : users[user].user_name,
			'timestamp': date.getTime(),
			'color': users[user].user_color,
			'contents' : msg };


	if (message_log.length >= 300){
	    shift(message_log);
	}

	message_log.push(message);
	
	io.emit('chat', { 'user' : users[user].user_name,
			  'timestamp': date.getTime(),
			  'contents' : msg });
    });

});


/*
  Attempt to generate a name from preset names. If 20 iterations occur without a name chosen,
  the current name will be given, appended by 3 random numbers
*/
function generate_username(){
    let first_names = ['skilled', 'willful', 'angry', 'pretty', 'standard', 'plain', 'princess', 'prince', 'butternut'];
    let middle_names = ['toad', 'hamster', 'jock', 'skillet', 'cake', 'pie', 'rock', 'turtle', 'cube', 'pork', 'panzy'];
    let last_names = ['herder', 'lumberjack', 'smither', 'miner', 'clown', 'baker', 'chef', 'teacher'];
    let i = 0;
    let name = undefined;

    first = first_names[Math.floor(Math.random() * first_names.length)];
    middle = middle_names[Math.floor(Math.random() * middle_names.length)];
    last = last_names[Math.floor(Math.random() * last_names.length)];

    name = first + "_" + middle + "_" + last;

    while (i < 20 && (name in taken_names)){
	first = first_names[Math.floor(Math.random() * first_names.length)];
	middle = middle_names[Math.floor(Math.random() * middle_names.length)];
	last = last_names[Math.floor(Math.random() * last_names.length)];
	
	name = first + "_" + middle + "_" + last;
	i++;
    }

    if(i == 20){
	name += Math.random().toString().substring(2, 5);
    }

    return name;
}
