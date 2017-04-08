/*
//ajax call format
$.ajax({
    url: '/method_name',
    data: {
    "data1_name": "data1",
    "data2_name": "data2"
    },
    type: 'POST', //can change method type
    success: function(data){
        //ajax call returned successfully
    },
    error: function(xhr, status, error){
        //ajax call failed - no server response
    },
});

*/



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


/* Generic startup stuff */
$(function(){
    var socket = io();
    var whoami = "";
    socket.on("join_server", function(data){

	$('#server-name').html(data.owner + "'s server");
	var server_socket = io("/" + data.server);
	
	server_socket.on('startup', function(data){
	    //alert(data.message) - a general purpose message from the server

	    whoami = data.whoami;
	    
	    for(let i = data.channels.length - 1; i >= 0; i--){
		$('#channel-wrapper').prepend(formattedChannel(data.channels[i]));
	    }	   
	});

	server_socket.on("user_joined", function(data){
	    //data.user - user who joined the server
	    //data.channel - channel to put the user in
	    formattedChannelUser(data.channel, data.user).insertAfter($('#channel-' + data.channel));

	    if (data.user != whoami)
		responsiveVoice.speak(data.user + " has joined the server.");

	    //Use this to see a list of possible voice types
	    //alert(JSON.stringify(responsiveVoice.getVoices()));
	});

	server_socket.on("add_channel", function(data){
	    $('#channel-wrapper').prepend(formattedChannel(data.channel));
	});
    });

    function formattedChannelUser(channel, user){
	let $div = $('<div>', {
	    'id': channel + '-' + user,
	    'class': 'channel-user',
	    'text': user
	});

	return $div;
    }

    function formattedChannel(channel_name){
	let $div = $('<div>',{
	    'id' : 'channel-' + channel_name,
	    'class': 'channel-header',
	    'text': channel_name
	});

	return $div;
    }

    
    $("#sens_slider").slider({
        orientation: "horizontal",
        range: false,
        min: 0,
        max: 100,
        value: 50,
        step: 1,
        animate: true,
        slide: function (event, ui) {
            $("#sens_slider_txt").text(ui.value);
        }
    });
    
    $("#vol_slider").slider({
        orientation: "horizontal",
        range: false,
        min: 0,
        max: 100,
        value: 50,
        step: 1,
        animate: true,
        slide: function (event, ui) {
            $("#vol_slider_txt").text(ui.value);
        }
    });

    $('#settings-btn').click(function(){
	var winWidth = $(window).width() + "px";
	var settingsPanel = $('#settings-panel');

	if (settingsPanel.css('left') == winWidth){
	    settingsPanel.animate({
		left: '50%'
	    }, 500, function(){});
	}else{
	    settingsPanel.animate({
		left: '100%'
	    }, 500, function(){});
	}
    });

    $('#add-channel').click(function(){
	var channelName = prompt("Please enter a channel name");
	
	if(channelName != null){
	    $.ajax({
		url: '/add_channel',
		data: {
		    "channel_name": channelName
		},
		type: 'POST', //can change method type
		success: function(data){
		    //ajax call returned successfully
		    if(data.success){

		    }else{
			alert(data.message);
		    }
		},
		error: function(xhr, status, error){
		    //ajax call failed - no server response
		
		},
	    });
	}
    });

    $('#save-settings').click(function(){
	alert('Save settings.');
    });
    
    $('#user-message').hide();

    //user clicked the x on the message
    $('#tag-remove-message').click(function(){
	$('#user-message').hide();
    });
});


function showMessage(msg){
    var user_message = $('#user-message');
    var user_message_content = $('#user-message-content');

    user_message.show();
    user_message_content.html(msg);
    user_message.animate(
	{
	    top: '0%'
	},
	{
	    duration: 1000,
	    queue: false
	})
	.delay(5000)
	.animate({ top: '-10%' }, 1000,
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
