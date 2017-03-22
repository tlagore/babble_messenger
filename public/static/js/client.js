
// document ready calls
/* This disgusting hack of a function fixes the firefox bug without killing scrolling on 
   chrome. Took like 3 hours to figure out.
*/
$(function(){
    /*var isChrome = !!window.chrome && !!window.chrome.webstore;
    if(isChrome){
	$('#view-messages').css('overflow', 'auto');
    }
    */

});

var recorder = null;

//Make sure we're using the correct getUserMedia for our browser
navigator.getUserMedia = navigator.getUserMedia ||
    navigator.webkitGetUserMedia


//load media device- audio. Asks user for permission to use microphone
$(function(){
    navigator.mediaDevices.getUserMedia({ audio: true }).then(
	function(stream){
	    //recorder = new Recorder();
	    
	}
    ).catch(
	//didn't get stream, show error message
	function(err){
	    showMessage("If you do not allow microphone access, you cannot use the " +
			"voice functionality of this site. " +
		       "You can enable microphone in settings.");
	}
    );
});


//user clicked the x on the message
$(function(){
    $('#tag-remove-message').click(function(){
	$('#user-message').hide();
    });
});


function showMessage(msg){
    var user_message = $('#user-message');
    var user_message_content = $('#user-message-content');
    user_message_content.html(msg);
    user_message.animate(
	{
	    height: '5%'
	},
	{
	    duration: 1000,
	    queue: false
	})
	.delay(5000)
	.animate({ height: '0px' }, 1000,
		 function(){
		     $(this).hide();
		 });
}


/*
function readFile(file) {
    alert(file.name);
    var reader = new FileReader();
    reader.onload = readSuccess;                                            
    function readSuccess(evt) { 
        var field = document.getElementById('view-messages');                        
        field.innerHTML = evt.target.result;                                
    };
    reader.readAsText(file);                                              
} 
*/

$(function(){
    var valid_char_check = function(event){
	if(event.which == 127 || event.which == 8 || event.which == 0)
	    return;
	
	if((event.which < 48 || event.which > 57) &&
	   (event.which < 65 || event.which > 122)){
	    event.preventDefault();
	}
    };

    $('#register_user').on("input", function(){
	var timeOut = setTimeout(checkUser, 500);
	$('#register_user').css('background-image', 'url(/static/glyphicons/glyphicons-541-hourglass.png)');
    });
			  
    
    $('#login_user').keypress(function(event){
	valid_char_check(event);
    });

    $('#register_user').keypress(function(event){
	valid_char_check(event);
    });
    
    $('#login_submit').click(function(){
	$.ajax({
	    url: '/login',
	    data: { "user": $('#login_user').val(),
		    "password": $('#login_password').val()},
	    type: 'POST',
	    success: function(data){
		if(data.success){		  
		    $('#login-wrapper').animate({
			left: "5%"
		    }, 250, function(){
			$('#login-wrapper').animate({
			    left: "110%"
			}, 1000);
		    });
		}else{
		    showAuthenticationMessage($('#login_message'), "Invalid user name or password.");
		}
	    },
	    error: function(xhr, status, error){
		alert('error');
	    },
	});
    });

    /* handle register sub*/
    $('#register_submit').click(function(){
	if($('#register_user').val() == ''){
	    $('#register_user').css('border', '1px solid red');
	}else if ($('#register_password').val() != $('#register_confirm_password').val()){
	    showAuthenticationMessage($('#register_message'), "Passwords do not match");
	}else{    
	    //do form validation first
	    $.ajax({
		url: '/register',
		data: { "user": $('#register_user').val(),
			"password": $('#register_password').val()},
		type: 'POST',
		success: function(data){
		    showAuthenticationMessage($('#register_message'),
					      "Successfully registered as " + $('#register_user').val() + ". Please log in");
		    clearRegisterFields();
		},
		error: function(xhr, status, error){
		    alert('error');
		},
	    });
	}
    });
});

function showAuthenticationMessage(element, message){
    element.html(message);
    element.animate({ width: "90%" }, 100, function(){
	element.animate({ opacity: ".5" }, 300, function(){
	    element.animate({ opacity: "1.0" }, 300, function(){
	    })		   
	})
    });
/*	.delay(100);

    element.css('background-color', 'feab19');
/*	element.animate({ backgroundColor: "#fe7419" }, 100, function(){
	    element.animate({ backgroundColor: "#FEAB19" }, 100, function(){});
	});
    });*/
}

function checkUser(user){
    if($('#register_user').val() != ''){
	$.ajax({
	    url: '/check_user',
	    data: { "user" : $('#register_user').val() },
	    type: "POST",
	    success: function(data){
		if(data.available){
		    $('#register_user').css('background-image', 'url(/static/glyphicons/glyphicons-153-check.png)');
		}else{
		    $('#register_user').css('background-image', 'url(/static/glyphicons/glyphicons-79-warning-sign.png)');
		}
	    },
	    error: function(xhr, status, error){
		//do nothing
	    }
	});
    }else{
	$('#register_user').css('background-image', '');
    }
}

$(function(){
    //var io = require('socket.io-client');
    //var ss = require('socket.io-stream');


    var socket = io.connect('/');

    
    $('#selectedFile').change(function(e){
	var file = e.target.files[0];
	var stream = ss.createStream();

	ss(socket).emit('write-file', stream, { name: file.name });
	ss.createBlobReadStream(file).pipe(stream);	
    });
    
    
    /*
    document.getElementById('selectedFile').onchange = function(e) {
	let file = document.getElementById('selectedFile').files[0];
	var reader = new FileReader();
	reader.onload = readSuccess;                                            
	function readSuccess(evt) { 
            var field = document.getElementById('view-messages');                        
            field.innerHTML = evt.target.result;                                
	};

	ss(socket).emit('write-file', stream, { name: file.name });
	ss.createBlobReadStream().pipe(stream);
    };*/

    /*

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

	if(user == "server" || $('#me-'+user).html() == user)
	    scrollToBottom();
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

	}
    });

    socket.on('user_name', function(user){
	let name = user.user_name;
	let color = user.user_color;
	
	$('#whoami').html('You are: <b id="me-' + name + '" style="color:' + color + '">' + name + '</b>');
    });

    socket.on('color_changed', function(msg){
	let name = msg.user_name;
	let color = msg.user_color;

	if($('#'+name).length){
	    $('#'+name).css('color', color);
	}
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

		
		if(msg.startsWith("/nickcolor")){
		    let goodColor =  verifyColor(msg);
		    if (goodColor){
			socket.emit('chat', msg);
		    }else{
			send_server_message("Bad color. Try another css color. (lower case)");
		    }
		}else{
		    if(msg != ''){
			socket.emit('chat', msg);
		    }
		}
	    }

	    $('#input-msg').val('');
	}
    });
    
    $('#submit-message').click(function(){
	let msg = $('#input-msg').val()

	if(msg.startsWith("/nickcolor")){
	    let goodColor =  verifyColor(msg);
	    if (goodColor){
		socket.emit('chat', msg);
	    }else{
		send_server_message("Bad color. Try another css color. (lower case)");
	    }
	}else{
	    if (msg != ''){
		socket.emit('chat', msg);
		scrollToBottom();
	    }
	}
	$('#input-msg').val('');
    });
    */
});

function clearRegisterFields(){
    $('#register_user').val('');
    $('#register_email').val('');
    $('#register_password').val('');
    $('#register_confirm_password').val('');
    $('#register_user').css('background-image', '');

    $('#register_user').trigger('blur');
    $('#register_email').trigger('blur');
    $('#register_password').trigger('blur');
    $('#register_confirm_password').trigger('blur');
}

//scroll to bottom of messages
function scrollToBottom(){
    var messages = document.getElementById("message-wrapper");
    messages.scrollTop = messages.scrollHeight;
}


function send_server_message(msg){
    let timestamp = new Date().getTime();
    let formatted_message = server_message(timestamp, msg, "#e24646");
    $('#view-messages').prepend(formatted_message);
    display_message(user, timestamp);
}
    

//function taken from stackoverflow answer
//http://stackoverflow.com/questions/6386090/validating-css-color-names
function checkColorString(stringToTest){
    let rgb = $c.name2rgb(stringToTest).RGB;
    let rgb_digits = rgb.split(", ")
    return(!isNaN(rgb[0]));    
}


/* animate the message appearing */ 
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
