
// document ready calls
$(function(){
    var socket = io();
    localStorage.setItem("history", JSON.stringify({'chat_history': []}));
    localStorage.setItem("history_count", "0");
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
    
    $('#input-msg').keydown(function(event){
	//alert(localStorage.getItem("history"));
	
	let history = JSON.parse(localStorage.getItem("history"));
	let count = parseInt(localStorage.getItem("history_count"));
	if(event.keyCode  == 27){
	    event.preventDefault();
	    $('#input-msg').val('');
	    
	}else if(event.keyCode == 38){
	    //up arrow
	    if(count > 0){
		$('#input-msg').val(history.chat_history[count - 1].toString());
		count --;
		if(count <= 0){
		    count = history.chat_history.length;
		}
		localStorage.setItem("history_count", count.toString());
	    }
	    
	}else if(event.keyCode == 13){
	    let msg = $('#input-msg').val();
	    
	    if(msg != ''){
		count++;
		history.chat_history.push(msg);
		localStorage.setItem("history", JSON.stringify(history));
		localStorage.setItem("history_count", count.toString());
		
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
