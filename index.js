var express = require('express');
const argon2 = require('argon2');
//this is our config file - includes database info to connect. See definition
//for values.
var config = require('./config');

var sqlite3 = require('sqlite3').verbose();
var db = new sqlite3.Database('babble.db');

//date library
var moment = require('moment');

//escapes html for message passing
var escaper = require('escape-html');

var cookie_parser = require('cookie-parser');
var socketIoCookieParser = require("socket.io-cookie-parser");
var bodyParser = require("body-parser");
var app = express();
var http = require('http').createServer(app);
var io = require('socket.io')(http);
var port = process.env.PORT || 3000;
var fs = require('fs');
var validator = require('validator');
var ss = require('socket.io-stream');
var path = require('path');

app.use(cookie_parser());
app.use(bodyParser.urlencoded({ extended: true }));
io.use(socketIoCookieParser());
/*
  user format:
  indexed by user id (their name - which is unqiue)
  {
      "server": "server_id" //the server that the user is logged into
      "channel": "channel_id" //the channel on that server the user is in
  }
*/
var users = {};

/* IMPORTANT */
//ensure the database is enforcing foreign key restraints

/* temporarily disabling till I can figure out why sqlite is throwing a foreign key mismatch */
//db.run("PRAGMA foreign_keys = ON;", function(err){});

/* server format:
   indexed by serverId
   {
        "server": socket //the namespace of the server, generated using io.of("/" + serverId)
	"channels" : [ ["channel name", [ channel users ]] ]
	"owner" : string name of the owner who owns the cahnnel
   }
*/
var servers = {};

http.listen( port, function () {
    console.log('listening on port', port);
});


////////////////////////////////////////////
///////////sessions stuffs//////////////////
////////////////////////////////////////////

//var mysql = require('mysql');
var sessions = require('express-session')({
    cookieName: 'session',
    //32 byte secret
    secret: genSecret(32),
    duration: 30 * 60 * 1000, //session expires in 30 minutes
    activeDuration: 1000 * 60 * 5, //if session has not expired and user shows activity, extend session for 5 minutes.
    resave: false,
    saveUninitialized: false
});
//var ios = require('socket.io-express-session');
var sharedsession = require('express-socket.io-session');
app.use(sessions);
io.use(sharedsession(sessions));

//////////////////////////////////////////////////////
///////////   end session stuffs /////////////////////
//////////////////////////////////////////////////////



////////////////////////////////////////////////////////
//////////////// generic middleware ////////////////////
////////////////////////////////////////////////////////

//ensures that all requests are revalidated - particularly when using the back and
//forward navigation to ensure that socket reconnects
app.use(function(req, res, next){
    res.header('Cache-Control', 'no-cache, private, no-store, must-revalidate, max-stale=0, post-check=0, pre-check=0');
    next();
});


////////////////////////////////////////////////
///////          socket stuffs          ////////
////////////////////////////////////////////////


io.on("connection", function(socket){
    if(socket.handshake.session.user){
	//console.log(socket.handshake.session.user);
	let server = users[socket.handshake.session.user].server;
	socket.emit("join_server", {
	    'server': server,
	    'owner': servers[server].owner
	});
    }else{
	socket.emit("redirect", { 'location' : '/' });
    }
});

////////////////////////////////////////////////
///////          end socket stuffs     /////////
////////////////////////////////////////////////


//////////////////////////////////////////////////////////////////////////////////////
//                               Login Logic                                        //
//////////////////////////////////////////////////////////////////////////////////////

app.post("/check_user", function(req, res){
    let query = "SELECT user FROM user WHERE user = ?";
    db.get(query, req.body.user, function(error, row){
	if(error){
	    console.log(error);
	}else{
	    if(row == undefined)
		res.send({ "available": true});
	    else
		res.send({"avaialble": false});
	    console.log(row);
	}
    });
});

// login request. Check if user and pass are good.
app.post("/login", function(req, res){
    let query = "SELECT password, server_id FROM user WHERE user = ?";
    db.get(query, req.body.login_user, function(error, row){
	if(error){
	    console.log(error);
	}else{
	    var success = false;
	    if(row){
		//verify that hash we had in the database is a match
		argon2.verify(row.password, req.body.login_password).then(match => {
		    if(match){
			console.log("Successful login for " + req.body.login_user);
			success = true;
			req.session.user = req.body.login_user;
			users[req.body.login_user] = { "server": undefined,
						       "channel": undefined };
		    }else{
			console.log("Failed login attempt for " + req.body.login_user);
		    }
		    /*res.redirect("/chat/" + row.server_id);*/		    
		    res.send({ 'success': success,
			       'server_id': row.server_id});
		    
		});
	    }else
		res.send({ 'success': success });
	}
    });
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
		let query = "INSERT INTO user (user, password, server_id) values (?, ?, ?)";
		let secret = genSecret(6);
		db.run(query, req.body.user, hash, secret, function(err, results){
		    if(err){
			console.log("error...");
			console.log(err);
			res.send({'success': false, 'message': msg});
		    }else{
			//good insert
			let chan_query = "INSERT INTO channels (server_id, channel_name) values (?, ?);"
			//insert default channel into user
			db.run(chan_query, secret, "DefaultChannel", function(err, results){
			    if (err){
				console.log("error...");
				console.log(err);
				res.send({'success': false, 'message': msg});
			    }
			});

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
//////////////////////////////////////////////////////////////////////////////////////
//                            End login logic                                       //
//////////////////////////////////////////////////////////////////////////////////////


//////////////////////////////////////////////////////////////////////////////////////
//                            Start channel logic                                   //
//////////////////////////////////////////////////////////////////////////////////////

app.post("/add_channel", function(req, res){
    let channel = req.body.channel_name;
    let server = users[req.session.user].server;

    let query = "SELECT user FROM user WHERE server_id = ?";
    let num_channels = "SELECT COUNT(channel_name) AS channel_count FROM channels WHERE server_id = ?";
    let channels = "SELECT channel_name FROM channels WHERE server_id = ? and channel_name = ?";

    db.get(query, server, function(error, row){
	if(error){

	}else{
	    if(row && row.user == req.session.user){
		let goodChannel = false;
		if(validator.isAlphanumeric(channel)){
		    db.get(num_channels, server, function(error, row){
			if (error){
			    //handle error
			}else{

			    //ensure server doesn't already have 10 channels 
			    if (row.channel_count < 10){
				 db.get(channels, server, channel, function(error, row){
				     if (error){
					 //something went wrong with query
				     }else{
					 //server does not already have a channel named 'channel'
					 if (!row){				
					     insertChannel(server, channel);
					     console.log("good channel name: " + channel);
					     servers[server].server.emit("add_channel", { "channel": channel });
					 }else{
					     console.log("A channel with that name already exists on this server.")
					     res.send({ 'success':false,
							'message':
							'That channel already exists.' });
					 }
				     }
				 });				
			    }else{
				res.send({ 'success':false,
					   'message':
					   'Server already has 10 channels. Delete one first.' });
			    }
			}
		    });
		    
		   		 
		}else{
		    console.log("bad channel name: " + channel);
		    res.send({ 'success':false,
			       'message':
			       'Channel name must be alphanumeric (no spaces).' });
		}
	    }else{
		res.send({ 'success': false,
			   'message': "You're not the owner of this server." });
	    }
	}
    });
});

function insertChannel(serverId, channel){
    let query = "INSERT INTO channels (server_id, channel_name) VALUES (?, ?);";
    db.run(query, serverId, channel, function(error, row){
	if (error){
	    console.log('Error inserting channel ' + channel + ' for server ' + server);
	}else{
	    //update server state of the server
	    servers[serverId].channels.push([channel, []]);
	}
    });
}

//////////////////////////////////////////////////////////////////////////////////////
//                            End channel logic                                     //
//////////////////////////////////////////////////////////////////////////////////////


//////////////////////////////////////////////////////////////////////////////////////
//                            Start chat logic                                      //
//////////////////////////////////////////////////////////////////////////////////////
//handle a get request directly to chat
app.get("/chat/:serverId", function(req, res){
    let serverId = req.params.serverId;
    let server_query = "SELECT server_id, user FROM user WHERE server_id = ?";
    let user = req.session.user;

    console.log ('get  ....');
    //if user is logged in...
    if(user){
	console.log(user + " requested server: " + serverId);

	//ensure good server request
	db.get(server_query, serverId, function(error, row){
	    if (error){
		res.status(500).send("Internal server error.");
	    }else{
		if (row == undefined){
		    res.status(404).send("Chat server not found.");
		}else{
		    console.log(user +  " joined server " + serverId);
		    //set the server on the users session so that the user on to know where to communicate 

		    //if they were on a server previously, remove them from that channel

		    console.log(users[user].channel);
		    if(users[user].channel != undefined){
			updateChannelUsers(users[user].server, users[user].channel, null, user);
			users[user].channel = undefined;
			console.log("went in here :::: ");
			console.log(servers[users[user].server].channels);
		    }

		    
		    users[user].server = serverId;
		    // we haven't seen this server yet, no users are on it, set up
		    // server namespace. (to which the clients of that server will talk to)
		    if (servers[serverId] == undefined){
			servers[serverId] = {};
			console.log('new server, settings up namespace');
			servers[serverId].server = io.of("/" + serverId);
			servers[serverId].owner = row.user;
			
			setupServer(servers[serverId].server, serverId);
		    }
		    
		    res.sendFile(path.join(__dirname, "public/chat.html"));	    
		}
	    }
	});
    }else{
	//user is not logged in, redirect to login.
	res.redirect("/");
    }
});


/* Updates the channel users on server side. If newChannel is null, user disconnected, 
   simply remove them from new list.*/
function updateChannelUsers(server, oldChannel, newChannel, user){
    /*
      channels format is 
      [  
      [channel name, [list of users]]
      ]
    */

    //console.log ("in updateChannelUsers, server channels BEFORE = ");
    //console.log(servers[server].channels);
    //console.log (" ---------------------------------------");
    let oChannel = []
    let nChannel = []
    
    let channels = servers[server].channels;
    for(let i = 0; i < channels.length; i++){
	if(oldChannel == channels[i][0]){
	    oChannel = channels[i][1];
	}else if (newChannel == channels[i][0]){
	    nChannel = channels[i][1];
	}
    }

    for(let i = 0; i < oChannel.length; i++){
	if(oChannel[i] == user){
	    oChannel.splice(i, 1);
	    if(newChannel != null)
		nChannel.push(user);
	    break;
	}
    }

    //console.log ("in updateChannelUsers, server channels = ");
    //console.log(servers[server].channels);
    //console.log (" ---------------------------------------");
}



function setupServer(namespace, serverId){
    namespace.use(sharedsession(sessions));

    /*
      channels format is 
      [  
          [channel name, [list of users]]
      ]
     */
    servers[serverId].channels = [];
    
    let channel_query = "SELECT channel_name FROM channels WHERE server_id = ?";
    db.all(channel_query, serverId, function(error, rows){
	if (error){
	}else{
	    if (rows != undefined){
		for (let i = 0; i < rows.length; i++){
		    //channels holds a tuple [channel_name, [list of users]]
		    let channel = rows[i].channel_name
		    servers[serverId].channels.push([channel, []]);
		}
	    }
	}
    });
    
    namespace.on('connection', function(socket){
	users[socket.handshake.session.user].socket = socket;

	let user = socket.handshake.session.user;
	
	users[user].channel = "DefaultChannel";
	servers[serverId].channels[0][1].push(user);

	socket.emit('startup', { 'message': 'user joined',
				 'channels': servers[serverId].channels,
				 'whoami' : socket.handshake.session.user,
			       });


	//join the user to DefaultChannel.
	socket.join(users[user].channel);

	updateUserChannelChat(user, users[user].server, users[user].channel, socket);

	//broadcasts to all sockets except 'socket'
	socket.broadcast.emit('user_joined', {
	    'user': user,
	    channel: users[user].channel
	});

	socket.on("channel_text_message", function(data){
	    let user = this.handshake.session.user;
	    //for storage in the db
	    let timestamp = new Date().getTime();
	    let date = moment(timestamp).format("LLLL");
	    let msg = escaper(data.message);

	    saveMessage(users[user].server, users[user].channel, user, timestamp, msg);

	    namespace.to(users[user].channel).emit('channel_text_message', {
		'user' : user,
		'time' : date,
		'msg' : msg
	    });
	});

	socket.on("change_channel", function(data){
	    let user = this.handshake.session.user;
	    let server = users[user].server;
	    let channelQuery = "SELECT channel_name FROM channels WHERE server_id = ? AND " +
		"channel_name = ?;";

	    console.log(user + " wants to change to channel " + data.channel);

	    let messageQuery = "SELECT user, timestamp, content FROM messages WHERE " +
		"server_id = ? AND channel_name = ?";
	    
	    //ensure user isn't already in that channel
	    if(users[user].channel != data.channel){
		//make sure requested channel exists
		db.get(channelQuery, server, data.channel,function(err, row){
		    if (err){
			//handle error
		    }else{
			if (row != undefined){
			    //channel exists

			    updateChannelUsers(server, users[user].channel, data.channel, user);
			    
			    socket.leave(users[user].channel);			
			    users[user].channel = data.channel;		    
			    socket.join(users[user].channel);
			    socket.broadcast.emit('user_changed_channel', {
				'user' : user,
				'channel' : data.channel
			    });

			    updateUserChannelChat(user, server, data.channel, socket);
			}
		    }
		});
	    }	    
	});

	// setup events for that socket
	socket.on('disconnect', function(){
	    let user = this.handshake.session.user;

	    //updateChannelUsers(users[user].server, users[user].channel, null, user);    	   
	    //users[user].server = undefined;
	    
	    console.log(user + ' left');
	    namespace.emit('user_left', {
		'user': user
	    });
	});
    });

    function saveMessage(server, channel, user, utc, msg){
	let query = "INSERT INTO messages (server_id, channel_name, user, timestamp, content) " +
	    "VALUES (?, ?, ?, ?, ?);";
	db.run(query, server, channel, user, utc, msg, function(err){
	    console.log("Error inserting message");
	    console.log(server + " " + channel + " " + user + " " + utc + " " + msg);
	    console.log(err);
	});
    }


    function updateUserChannelChat(user, server, channel, socket){
	getMessages(server, channel, function(messages){
	    //query complete
	    socket.emit('channel_change_successful', {
		'user': user,
		'channel': channel,
		//need to include messages from the channel they are joining
		//for client to display
		'messages' : messages
	    });
	});
    }
    
    function getMessages(server, channel, callback){
	let messageQuery = "SELECT user, timestamp, content FROM messages WHERE " +
	    "server_id = ? AND channel_name = ? ORDER BY timestamp DESC";	
	
	let messages = [];
	db.each(messageQuery, server, channel, function(err, row){
	    if (err){
		//handle error
	    }else{
		if(row != undefined){
		    let msg_user = row.user;
		    let msg_time = row.timestamp;
		    let msg_content = row.content;
		    
		    messages.push({
			'user': msg_user,
			'timestamp': moment(msg_time).format("LLLL"),
			'content': msg_content
		    });
		}
	    }
	}, function(){
	    callback(messages)
	});
    }


    //
    function userInChannel(user, channel){
	console.log(channel);
	let userExists  = false;
	for(let i = 0; i < channel[1].length; i++){
	    if(user == channel[1][i]){
		userExists = true;
		break;
	    }
	}

	return userExists;
    }
    /*
      db.all(channels, serverId, function(error, rows){
	if(error){
	
	}else{
	    for (row in rows){
		let channel = namespace.sockets.in(row.channel_name);
		//channel.on('leave')
	    }
	}
    });
    */
}




app.use(express.static(__dirname + '/public'));
/*
io.of('/').on('connection', function(socket){
    ss(socket).on('write-file', function(stream, data){
	console.log("in here");
	console.log(stream);
	var filename = path.basename(data.name);
	stream.pipe(fs.createWriteStream(filename));
    })
});

*/

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

function genSecret(size){
    var text = "";
    let validChars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

    for(var i = 0; i < size; i++){
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
