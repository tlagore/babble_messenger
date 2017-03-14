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
	//console.log(socket.id);
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

	message = {'user' : 'server',
		   'timestamp':new Date().getTime(),
		   'color': '#76d65e',
		   'contents': users[user].user_name + " has joined the server."};

	io.emit('chat', message);

	for(let message of message_log){
	    socket.emit('chat', message);
	}

	for(let key in users){
	    if(users[key].connected){
		io.emit('user_joined', {'user_name': users[key].user_name,
					    'user_color': users[key].user_color });
	    }
	}
    });
    
    socket.on('chat', function(msg){
	let date = new Date();

	// need to get user from here, message could be a command
	let msg_contents = parse_message(msg);

	let user_name = msg_contents.user

	console.log(user_name);
	user_name = user_name == undefined ? users[user].user_name : user_name;

	console.log(user_name);
	
	let contents = msg_contents.message;
	let color = msg_contents.color;
	color = color == undefined ? users[user].user_color : color;

	//did the parse of the message change the user who is sending it
	//if not, keep it as the user who sent it - regular message
	
	let message = { 'user' : user_name,
			'timestamp': date.getTime(),
			'color': color,
			'contents' : contents };

	if (message_log.length >= 300){
	    shift(message_log);
	}
	
	message_log.push(message);

	//if server message, only send to person who sent message, not everyone
	if(user == 'server'){
	    socket.emit('chat', message);
	}else{
	    io.emit('chat', message);
	}
    }); 
});

function parse_message(msg){
    let user = undefined;
    let color = undefined;
    
    if (msg[0] === '/'){
	msgParts = msg.split(" ");
	message = parse_command(msgParts);
	user = "server";
	color = "#e24646";
    }
    else if (msg == ''){
	message = undefined;
    }else{
	message = msg;
    }
    
    return {'message': message, 'user': user, 'color': color };
}

function parse_command(msgParts){
    msg = undefined;
    
    if (msgParts[0] == "/nick"){
	newNick = msgParts[1];
	if (newNick != undefined && msgParts.length == 2){
	    msg = msg[1];
	}else{
	    timestamp = new Date().getTime();
	    msg = "Invalid usage, correct usage is /nick [new_nickname]. Name must not contain spaces.";	    
	}
    }

    return msg;
}


/*
  Attempt to generate a name from preset names. If 20 iterations occur without a name chosen,
  the current name will be given, appended by 3 random numbers
*/
function generate_username(){
    let first_names = ['skilled', 'willful', 'angry',
		       'pretty', 'standard', 'plain',
		       'princess', 'prince', 'butternut'];
    let middle_names = ['toad', 'hamster', 'jock',
			'skillet', 'cake', 'pie',
			'rock', 'turtle', 'cube',
			'pork', 'panzy'];
    let last_names = ['herder', 'lumberjack', 'smither',
		      'miner', 'clown', 'baker', 'chef',
		      'teacher', 'samurai', 'master'];
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
