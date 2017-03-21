var express = require('express');
const argon2 = require('argon2');
//this is our config file - includes database info to connect. See definition
//for values.
var config = require('./config');
var queries = require('./queries');

var sqlite3 = require('sqlite3').verbose();
var db = new sqlite3.Database('babble.db');

//var mysql = require('mysql');
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


function testInsert(){
    //insert a row
    var stmt = db.prepare("INSERT INTO user (user, password, salt) values ('helllooo22', 'fun', 'stuff')")
    stmt.run();
    stmt.finalize();

    //select all rows
    db.each("SELECT * FROM user;",
	    function(err, row){
		console.log(row);
	    });
}


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
    
    let query = "SELECT password FROM user WHERE user = ?";
    db.get(query, req.body.user, function(error, row){
	if(error){
	    
	}else{
	    var success = false;
	    
	    //verify that hash we had in the database is a 
	    argon2.verify(row.password, req.body.password).then(match => {
		if(match){
		    console.log("Good password!");
		    success = true;
		}else{
		    console.log(":(");
		}
		res.send({'success': success});
	    });

	    /*
	    argon2.hash(req.body.password, salt, {
		type: argon2.argon2d
	    }).then(hash => {
		var success = false;

		console.log(hash);
		console.log(row.password);

		//verify that hash we had in the database is 
		argon2.verify(row.password, req.body.password).then(match => {
		    if(match){
			console.log("Good password!");
			success = true;
		    }else{
			console.log(":(");
		    }
		    res.send({'success': success});
		});

	    });
	    */
	}
    });
    /*
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
    */
});

//stub for register - try to register user and log in DB.
app.post("/register", function(req, res){
    let msg = '';
    
    if(req.body.password && req.body.password.length > 6){
	//generate salt generates a 16 byte salt
	argon2.generateSalt().then(salt => {

	    argon2.hash(req.body.password, salt, {
		type: argon2.argon2d
	    }).then(hash => {
		let query = "INSERT INTO user (user, password) values (?, ?)";
		db.run(query, req.body.user, hash, function(err, results){
		    if(err){
			console.log("error...");
			console.log(err);
			res.send({'success': false, 'message': msg});
		    }else{
			//good insert
			console.log("Good username");
			res.send({'success': true, 'message': msg});
		    }
		});

		console.log("raw password: " + req.body.password);
		console.log("salt: " + parseInt(salt.join()) + " hash: " + hash);
		
		added = true;
	    }).catch(err => {
		console.log("failure..." + err);
		//failure
		
	    })});
    }
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
