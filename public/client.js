
// document ready calls
$(function(){
    var socket = io();
    socket.emit('loaded');

    socket.on('chat', function(msg){
	user = msg.user;
	timestamp = msg.timestamp;
	message = msg.contents;
	color = msg.color;
	
	let formatted_message = generate_message(user, new Date(timestamp).toUTCString(), message, timestamp, color);

	$('#messages').prepend(formatted_message);
	display_message(user, timestamp);
    });

    socket.on('user_joined', function(msg){
	let name = msg.user_name;
	let color = msg.user_color;
	
	if(!$('#'+name).length){
	    $('#users').append('<h4 style="color:' + color + ';" id=' + name + '>' + name + '</h4>');
	}
    });

    socket.on('user_left', function(name){
	if($('#'+name).length){
	    $('#'+name).remove();
	}
    });

    socket.on('user_name', function(user){
	let name = user.user_name;
	let color = user.user_color;
	
	$('#whoami').html('You are: <b style="color:' + color + '">' + name + '</b>');
    });
    
    $('#input-msg').keypress(function(event){
	//escape
	if(event.which  === 0){
	    $('#input-msg').val('');
	}else if(event.which == 13){
	    let msg = $('#input-msg').val();
	    
	    if(msg != ''){
		socket.emit('chat', msg);
	    }

	    $('#input-msg').val('');
	}
    });
    
    $('#submit-message').click(function(){
	let msg = $('#input-msg').val()

	if (msg != ''){
	    socket.emit('chat', msg);
	}

	$('#input-msg').val('');
    });
});



/* functions */ 
function display_message(user, timestamp){
    let id = '#' + user + timestamp;
    $(id).animate({
	opacity: 1.0
    }, 750, function(){ //animation finish
    });
}

function server_message(utc, msg, color){
    return mesg = '<div id=server' + utc + 
	' style="opacity:0.0;" class="message">' +
	'<div class="message-content" style="color:' + color +'">' + msg + '</div></div>'
}

function generate_message(user, timestamp, msg, utc, color){
    if (user == "server"){
	return server_message(utc, msg, color)
    }else{
	return '<div id=' + user + utc + 
	    ' style="opacity:0.0;" class="message">' +
	    '<div class="message-header">' +
	    '<div class="message-user" style="color: ' + color + '">' + user + '</div>' + 
	    '<div class="message-time">' + timestamp + '</div>' +
	    '</div><div class="message-content">' + msg + '</div></div>'
    }
}
