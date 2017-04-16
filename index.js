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

/*
const options = {
  key: fs.readFileSync('keys/server.key'),
  cert: fs.readFileSync('keys/server.crt')
};
*/
//var http = require('https').createServer(options, app);


var users = {};

/* IMPORTANT */
//ensure the database is enforcing foreign key restraints

/* temporarily disabling till I can figure out why sqlite is throwing a foreign key mismatch */
db.run("PRAGMA foreign_keys = ON;", function(err){});

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
	    if(row == undefined){
		res.send({ "exists": false });
	    }else{
		let online = users[row.user] != undefined;		
		res.send({"exists": true,
			  "online": online });
	    }
	}
    });
});

// login request. Check if user and pass are good.
app.post("/login", function(req, res){
    let query = "SELECT password, server_id FROM user WHERE user = ?;";

    // might want to have next logicx
    let next = req.query.next;
    let server = req.body.login_server;
    console.log(server);
    
    if(users[req.body.login_user] && users[req.body.login_user].socket.connected){
	res.send({'success': false,
		  'message': 'That user is already logged in.'});
    }else{    
	db.get(query, req.body.login_user, function(error, row){
	    if(error){
		console.log(error);
	    }else{
		var success = false;
		var message = "";
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
			    message = "Invalid user name or password";
			}
			/*res.redirect("/chat/" + row.server_id);*/
			
			//update to actually redirect
			if(next){
			    res.redirect(next);
			}else{
			    redirectServer(server, function(server){
				res.send({ 'success': success,
					   'server_id': server,
					   'message': message });				
			    }, function(){
				res.send({ 'success': success,
					   'server_id': row.server_id,
					   'message': message });
			    });
			}
			
		    });
		}else
		    res.send({ 'success': success,
			       'message': "Invalid user name or password."
			     });
	    }
	});
    }
});

function redirectServer(server, success, fail){
    //for some reason this function sometimes doesnt work even though the server exists
    let serverQuery = "SELECT server_id FROM user WHERE server_id = ?;";
    
    db.get(serverQuery, server, function(err, row){
	if(err){
	    fail();
	}else{
	    if(row){
		success(server);
	    }else{
		fail();
	    }
	}
    });
}

app.get("/", function(req, res, next){
    if(req.session.user){
	res.redirect("/chat/"+ users[req.session.user].server);
    }else{
	next();
    }
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
					     servers[server].server.emit("add_channel", { "channel": channel });
					 }else{
					     console.log("A channel with that name already exists on this server.")
					     res.send({ 'success':false,
							'error': 'Channel Exits',
							'message':
							'That channel already exists. Channel names must be unique' });
					 }
				     }
				 });				
			    }else{
				res.send({ 'success':false,
					   'error': 'Too many channels',
					   'message': 
					   'Server already has 10 channels. Delete one first.' });
			    }
			}
		    });
		    
		   		 
		}else{
		    console.log("bad channel name: " + channel);
		    res.send({ 'success':false,
			       'error': 'Bad Channel Name',
			       'message':
			       'Channel name must be alphanumeric (no spaces).' });
		}
	    }else{
		res.send({ 'success': false,
			   'error': 'Insufficient Privileges',
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

    if(users[user] == undefined){
	users[user] = {};
    }
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
		    if(users[user].channel != undefined){
			updateChannelUsers(users[user].server, users[user].channel, null, user);
			users[user].channel = undefined;
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
	res.redirect("/?next=/chat/" + serverId);
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
				 'peerJsKey': config.peerjs.key
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
	    let date = moment(timestamp).calendar();//format("LLLL");
	    let msg = escaper(data.message);

	    saveMessage(users[user].server, users[user].channel, user, timestamp, msg);

	    namespace.to(users[user].channel).emit('channel_text_message', {
		'user' : user,
		'time' : date,
		'msg' : msg
	    });
	});

	socket.on('request_pms', function(data){
	    let target = data.target;
	    let user = this.handshake.session.user;
	    let sckt = this;
	    let query = "SELECT sender, timestamp, message FROM private_messages " +
		" WHERE (sender = ? AND receiver = ?) OR (sender = ? AND receiver = ?) " +
		" ORDER BY timestamp ASC; ";

	    let messages = [];
	    
	    db.each(query, target, user, user, target, function(err, row){
		if (err){
		    //handle error
		}else{
		    if(row){
			let sender = row.sender;
			let timestamp = row.timestamp;
			let content = row.message;

			messages.push({
			    'user': sender,
			    'timestamp': moment(timestamp).calendar(),//format("LLLL"),
			    'content': content
			});
		    }
		}
	    }, function(){
		//query complete
		sckt.emit('generate_private_messages', { 'messages' : messages });
	    });
	});

	socket.on('private_message', function(data){
	    let target = data.target;
	    let msg = data.msg;
	    let time = new Date().getTime();
	    let formatted_time = moment(time).calendar();
	    let sender = this.handshake.session.user;
	    let insertQuery = "INSERT INTO private_messages (sender, receiver, timestamp, message) " +
		" VALUES (?, ?, ?, ?);";

	    //ensure target is logged and not sending a pm to themselves
	    if(users[target] != undefined && sender != target){
		db.run(insertQuery, sender, target, time, msg, function(err){
		    if(err){
			console.log("Error inserting private message into database");
		    }
		});
		
		users[target].socket.emit('private_message',{
		    'sender': sender,
		    'time' : formatted_time,
		    'msg' : msg
		});
		this.emit('pm_successful', {
		    'sender': sender,
		    'time' : formatted_time,
		    'target': target,
		    'msg': msg
		});
	    }	    
	});

	socket.on("delete_channel", function(data){
	    let user = this.handshake.session.user;
	    let channel = data.channel;
	    let server = users[user].server;
	    let query = "SELECT u.user FROM channels AS c JOIN user AS u ON " +
		" u.server_id = c.server_id WHERE c.channel_name = ? " +
		" AND c.server_id = ?;"

	    let delete_channel = "DELETE FROM channels WHERE channel_name = ? and server_id = ?;";

	    let this_socket = this;

	    if (channel == "DefaultChannel"){
		this_socket.emit('display_error', {
		    'error': 'Protected Channel',
		    'msg': 'You cannot delete the default channel.' });
	    }else{
		db.get(query, channel, server, function(error, row){
		    if(error || row == undefined){
			console.log("Error retrieving owner of server, ignoring channel delete command.");
		    }else{
			let owner = row.user;
			if (owner == user){
			    if(getChannelUsersByName(channel, server).length != 0){
				this_socket.emit('display_error', {
				    'error': 'People in channel',
				    'msg': 'You cannot delete a channel with users in it.' });
			    }else{
				db.run(delete_channel, channel, server, function(error){
				    if (error){
					console.log("failed to delete channel");
				    }else{
					deleteChannelByName(channel, server);
					this_socket.emit("delete_channel", { 'channel' : channel });					
				    }
				});
			    }
			}else{

			}
			//else do nothing - someone is trying to delete someone elses channel
		    }
		});
	    }
	});

	function renameChannel(old_name, new_name, server){	   
	    for(let i = 0; i < servers[server].channels.length; i++){
		if(servers[server].channels[i][0] == old_name){
		    servers[server].channels[i][0] = new_name;
		}
	    }	    
	}
	
	socket.on('rename_channel', function(data){
	    let user = this.handshake.session.user;
	    let server = users[user].server;
	    
	    let channel = data.new_name;
	    let old_channel = data.old_name;
	    let checkName = "SELECT channel_name FROM channels WHERE channel_name = ? AND server_id = ?;";

	    let renameChannelQuery = "UPDATE channels SET channel_name = ? WHERE channel_name = ? " +
		" AND server_id = ?;";

	    let sckt = this;

	    if(user == servers[server].owner){
		if(old_channel == "DefaultChannel"){
		    sckt.emit('display_error', {
			'error': 'Protected Channel',
			'msg': 'Cannot rename DefaultChannel'
		    });
		}else if(validator.isAlphanumeric(channel)){
		    db.get(checkName, channel, server, function(err, row){
			if(err){
			    //handle error
			    sckt.emit('display_error',{
				'error': 'Internal Error',
				'msg': 'Unable to rename channel'
			    });
			}else{
			    if(row){
				sckt.emit('display_error',{
				    'error': 'Channel Exists',
				    'msg': 'Unable to rename channel, that channel already exists.'
				});			    
			    }else{
				db.run(renameChannelQuery, channel, old_channel, server, function(err){
				    if(err){
					sckt.emit('display_error',{
					    'error': 'Internal Error',
					    'msg': 'Unable to rename channel'
					});
				    }else{
					renameChannel(old_channel, channel, server);

					servers[server].server.emit('channel_changed_name', {
					    'old_channel' : old_channel,
					    'new_channel' : channel
					});
				    }
				});
			    }
			}
		    });
		}else{
		    sckt.emit('display_error', {
			'error': 'Bad channel name',
			'msg': 'Channel name must be alphanumeric (no spaces)'
		    });
		}
	    }else{
		//not server owner
		sckt.emit('display_error', {
		    'error': 'Insufficient Privilege',
		    'msg': 'You are not the owner of this server.'
		});
	    }
	});

	
	function deleteChannelByName(channel, server){
	    for(let i = 0; i < servers[server].channels.length; i++){
		if(servers[server].channels[i][0] == channel){
		    servers[server].channels.splice(i, 1);
		}
	    }
	}

	function getChannelUsersByName(channel, server){
	    let channels = servers[server].channels;
	    for(let i = 0; i < channels.length; i++){
		if(channels[i][0] == channel)
		    return channels[i][1];		   
	    }
	}

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

	socket.on('logout', function(){
	    updateChannelUsers(users[user].server, users[user].channel, null, user);
	    this.handshake.session.destroy();

	    console.log(user + ' logged out.');
	    namespace.emit('user_left', {
		'user': user
	    });
	});

	// setup events for that socket
	socket.on('disconnect', function(){
	    if(this.handshake.session){
		let user = this.handshake.session.user;

		updateChannelUsers(users[user].server, users[user].channel, null, user);
		console.log(user + ' left')
		
		namespace.emit('user_left', {
		    'user': user
		});
	    }
	});
    });

    function saveMessage(server, channel, user, utc, msg){
	let query = "INSERT INTO messages (server_id, channel_name, user, timestamp, content) " +
	    "VALUES (?, ?, ?, ?, ?);";
	db.run(query, server, channel, user, utc, msg, function(err){
	    if(err){
		console.log("Error inserting message");
		console.log(server + " " + channel + " " + user + " " + utc + " " + msg);
		console.log(err);
	    }
	});
    }


    function updateUserChannelChat(user, server, channel, socket){
	getMessages(server, channel, function(messages){
	    //query complete

	    let callId = server + channel;
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
			'timestamp': moment(msg_time).calendar(),//format("LLLL"),
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
	let userExists  = false;
	for(let i = 0; i < channel[1].length; i++){
	    if(user == channel[1][i]){
		userExists = true;
		break;
	    }
	}

	return userExists;
    }
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

//Doesnt look like we're using this function
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


//////////////////////////////////////////////////////////////////////////////////////
//                            Start audio logic                                     //
//////////////////////////////////////////////////////////////////////////////////////
/*
app.post("/add_peer", function(req, res){
    let id = req.body.id;
    let peerid = req.body.peerid;
    
    let user = req.session.user;
    users[user].call_id = id;
    
    console.log(id);
    
    var call = Call.get(id);
    if (!call){
	res.send({ 'success': false});
    }
    
    call.addPeer(peerid);
    res.send({ 'success': true, 'call' : call.toJSON()});

});
*/
//////////////////////////////////////////////////////////////////////////////////////
//                            end audio logic                                      //
//////////////////////////////////////////////////////////////////////////////////////
