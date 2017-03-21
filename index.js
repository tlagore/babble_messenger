var express = require('express');
const argon2 = require('argon2');
//this is our config file - includes database info to connect. See definition
//for values.
var config = require('./config');
var queries = require('./queries');

var mysql = require('mysql');
var sessions = require('client-sessions');
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

var connection = mysql.createConnection(config.database);
connection.connect();

//////////////////////////////////////////////////////////
// remove this when done with it
//Test query - connects to mysql :>
connection.query('SHOW TABLES;', function(error, results){
    if (error)
	console.log("error :(   -   ", error.stack);
    else
	console.log('the solution is: ', results[0].Tables_in_babble);
});
/////////////////////////////////////////////////////////

http.listen( port, function () {
    console.log('listening on port', port);
});

var ss = require('socket.io-stream');
var path = require('path');

app.use(sessions({
    cookieName: 'session',
    secret: genNonce(32),
    duration: 30 * 60 * 1000, //session expires in 30 minutes
    activeDuration: 1000 * 60 * 5 //if session has not expired and user shows activity, extend session for 5 minutes.
}));

app.get("/", function(req, res, next){
    if(req.session.observed){
	//user has been observed - dont make them log in (unless they haven't
	//if the session has been seen, check if they are logged in.
	console.log("I think I've seen you before...");
    }else{
	req.session.observed = true;
	console.log("You're new! Gotta log in...");
    }
    //do stuff on home get request
    next();
});

//stub for login - check that password == user password in DB.
app.post("/login", function(req, res){
    let user = req.body.user;
    let psw = req.body.password;

    console.log(psw);
    
    let query = queries.get_user_hash(connection.escape(user));

    console.log(query);
    
    connection.query(query, function(error, result){
	if (error){
	    console.log(error);
	}else{
	    let salt = parseInt(result[0].password.join());
	    
	    argon2.hash(req.body.password, salt, {
		type: argon2.argon2d
	    }).then(hash => {
		var success = false;
		
		argon2.verify(hash, psw).then(match => {
		    if(match){
			console.log("Good password!");
			success = true;
		    }else{
			console.log(":(");
		    }
		    res.send({'success': success});
		});

	    });
	}	   
    });
});

//stub for register - try to register user and log in DB.
app.post("/register", function(req, res){
    let added = false;
    let msg = '';
    
    if(req.body.password && req.body.password.length > 6){
	//generate salt generates a 16 byte salt
	argon2.generateSalt().then(salt => {
	    console.log("salt: " + salt);
	    
	    argon2.hash(req.body.password, salt, {
		type: argon2.argon2d
	    }).then(hash => {
		console.log("HASH SHOULD BE THIS: " + hash);
	    }).catch(err => {
		console.log(err);
	    });;

	    console.log(toType(salt));
	    
	    argon2.hash(req.body.password, salt, {
		type: argon2.argon2d
	    }).then(hash => {
		let query = queries.insert_user(connection.escape(req.body.user),
						salt,
						hash);
		
		console.log("raw password: " + req.body.password);
		console.log("salt: " + parseInt(salt.join()) + " hash: " + hash);
		connection.query(query, function(error, results){
		    if(error){
			console.log(error);
			console.log("error");
		    }else{
			console.log("no error");
			console.log(results);
		    }
		});
		
		added = true;
	    }).catch(err => {
		console.log("failure..." + err);
		//failure
		
	    })});
    }

    res.send({'success': true, 'message': msg });
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

var toType = function(obj) {
  return ({}).toString.call(obj).match(/\s([a-zA-Z]+)/)[1].toLowerCase()
}

function logResponse(connection, query){
    connection.query(query, function(error, results){
	if(error){
	    console.log("error: ");
	    console.log(error);
	}else{
	    console.log(results);
	}
    });
}

function genNonce(size){
    var text = "";
    let validChars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

    for(var i = 0; i <= size; i++){
	text += validChars.charAt(Math.floor(Math.random() * validChars.length));
    }

    return text;
}
       
	
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
