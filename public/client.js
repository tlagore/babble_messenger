
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

	$('#view-messages').prepend(formatted_message);

	display_message(user, timestamp);
    });

    socket.on('user_joined', function(msg){
	let name = msg.user_name;
	let color = msg.user_color;
	
	if(!$('#'+name).length){
	    $('#view-users').append('<h4 style="color:' + color + ';" id=' + name + '>' + name + '</h4>');
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
	
	$('#whoami').html('You are: <b id="me-' + name + '" style="color:' + color + '">' + name + '</b>');
    });

    socket.on('name_changed', function(msg){
	let old_name = msg.old_name;
	let new_name = msg.new_name;
	let color = msg.user_color;
	let server_color = msg.server_color;

	let timestamp = new Date().getTime();

	let formatted_message = '<div id=server' + timestamp + 
	    ' style="opacity:0.1; color:' + server_color +'" class="message-content">'
	    + '<i style="color:' + color + '">' + old_name + '</i> changed nickname to '
	    + '<i style="color:' + color + '">' + new_name + '</i></div>';
	
	$('#view-messages').prepend(formatted_message);
	display_message("server", timestamp);
    });

    socket.on('change_name', function(msg){
	let name = msg.old_name;
	let new_name = msg.new_name;
	let color = msg.user_color;

	if($('#'+name).length){
	    $('#'+name).remove();
	    $('#view-users').append('<h4 style="color:' + color + ';" id=' + new_name + '>' + new_name + '</h4>');
	}
    });
    
    $('#input-msg').keydown(function(event){	
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
		localStorage.setItem("history_count", count.toString());
	    }
	}else if(event.keyCode == 40){

	    //down arrow
	    if (count < history.chat_history.length - 1){
		$('#input-msg').val(history.chat_history[count + 1].toString());
		count ++;
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
	' style="opacity:0.1; color:' + color +'" class="message-content">' + msg + '</div>'
}

function generate_message(user, timestamp, msg, utc, color){
    if (user == "server"){
	return server_message(utc, msg, color)
    }else{
	let message = msg;
	if($('#me-'+user).html() == user){
	    message = '<i><font style="color:#b2f3f7">' + msg + '</font></i>';
	}

	return '<div id=' + user + utc + 
	    ' style="opacity:0.1;" class="message">' +
	    '<div class="message-header">' +
	    '<div class="message-user" style="color: ' + color + '">' + user + '</div>' + 
	    '<div class="message-time">' + timestamp + '</div>' +
	    '</div><div class="message-content">'+ message + '</div></div>';
    }
}
