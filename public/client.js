
// document ready calls
$(function(){
   var socket = io();
    
    socket.on('chat', function(msg){
	user = msg.user;
	timestamp = msg.timestamp;
	message = msg.contents;

	let formatted_message = generate_message(user, new Date(timestamp).toUTCString(), message, timestamp);
	$('#messages').prepend(formatted_message);
	display_message(user, timestamp);
    });
    
    $('#input-msg').keypress(function(event){
	//escape
	if(event.which  === 0){
	    $('#input-msg').val('');
	}else if(event.which == 13){
	    let msg = $('#input-msg').val();
	    if(msg != ''){
		$('#input-msg').val('');
		socket.emit('chat', msg);
	    }	    
	}
    });
    
    $('#submit-message').click(function(){
	let msg = $('#input-msg').val()
	if (msg != ''){
	    socket.emit('chat', msg);
	}
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

function generate_message(user, timestamp, msg, utc){
    let mesg = '<div id=' + user + utc + 
	' style="opacity:0.0;" class="message">' +
	'<div class="message-header">' +
	'<div class="message-user">' + user + '</div>' + 
	'<div class="message-time">' + timestamp + '</div>' +
	'</div><div class="message-content">' + msg + '</div></div>'
    
    return mesg;
}

function recv_message(msg, callback){
    
}
