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


/* Setup our socket to handle events */
$(function(){

    //let message = generate_message("User 1", new Date().toUTCString(), "huehuheuehue");
    $('#user-pms').prepend(generate_message("User 1", new Date().toUTCString(), "huehuheuheu"));
    
    var socket = io();
    var whoami = "";
    var mychannel = "";
    socket.on("join_server", function(data){

	$('#server-name').html(data.owner + "'s server");
	var server_socket = io("/" + data.server);
	
	server_socket.on('startup', function(data){
	    //alert(data.message) - a general purpose message from the server

	    //might be useful for client to know who they are and channel they are in
	    whoami = data.whoami;
	    mychannel = data.channels[0][0];
	    $('.channel').remove();
	    $('.channel-user').remove();
	   
	    console.log(data.channels[0][1].join());
	    
	    for(let i = data.channels.length - 1; i >= 0; i--){
		let channel = formattedChannel(data.channels[i][0]);
		$('#channel-wrapper').prepend(channel);
		
		for(let j = 0; j < data.channels[i][1].length; j++){
		    let color = undefined;

		    if (data.channels[i][1][j] == whoami){
			color = '#00c7e6';
		    }
		    //user = formattedChannelUser(data.channels[i][1][j], color);

		    formattedChannelUser(data.channels[i][1][j], color).insertAfter(channel);
		}
	    }
	});

	server_socket.on("channel_text_message", function(data){
	    let user = data.user;
	    let time = data.time;
	    let msg = data.msg;

	    let formatted_msg = generate_message(user, time, msg);
	    $('#view-messages').prepend(formatted_msg);
	});

	//the server 
	server_socket.on("channel_message", function(data){
	    //messages specific to the users channel will arrive here
	});

	server_socket.on("user_left", function(data){
	    $('#' + data.user).remove();
	});

	server_socket.on("user_joined", function(data){
	    //data.user - user who joined the server
	    //data.channel - channel to put the user in
	    if (data.user != whoami){	    
		formattedChannelUser(data.user).insertAfter($('#channel-' + data.channel));
		responsiveVoice.speak(data.user + " has joined the server.");
	    }

	    //Use this to see a list of possible voice types
	    //alert(JSON.stringify(responsiveVoice.getVoices()));
	});

	server_socket.on("add_channel", function(data){
	    formattedChannel(data.channel).insertBefore($('#channels-end'));
	});

	function changeChannel(channel){
	    server_socket.emit('change_channel', { 'channel': channel.html() });
	}

	server_socket.on('channel_change_successful', function(data){
	    let user = data.user;
	    let channel = data.channel;
	    let messages = data.messages;

	    $('#' + user).insertAfter('#channel-' + channel);
	    $('#view-messages').empty();

	    for(let i = 0; i < messages.length; i++){
		let timestamp = messages[i].timestamp;
		let message_user = messages[i].user;
		let content = messages[i].content;
		
		let message = generate_message(message_user, timestamp, content);
		message.appendTo('#view-messages');
	    }
	});

	server_socket.on('user_changed_channel', function(data){
	    let user = data.user;
	    let channel = data.channel;

	    $('#' + user).insertAfter('#channel-' + channel);
	});

	$('#input-msg').keydown(function(event){	
	    //let history = JSON.parse(localStorage.getItem("history"));
	    //let count = parseInt(localStorage.getItem("history_count"));
	
	    if(event.keyCode  == 27){
		event.preventDefault();
		$('#input-msg').val('');
		
	    }else if(event.keyCode == 38){
		//up arrow
	    }else if(event.keyCode == 40){
		//down arrow
	    }else if(event.keyCode == 13){
		let msg = $('#input-msg').val();
		
		if(msg != ''){
		    //just a joke for now because I'm going crazy, need some fun
		    responsiveVoice.speak(msg);
		    server_socket.emit("channel_text_message", { 'message' : msg });
		}
		
		$('#input-msg').val('');
	    }
	});

	function formattedChannelUser(user, color){
	    let $div = $('<div>', {
		'id': user,
		'class': 'channel-user',
		'text': user
	    });
	    /*
	    $div.click(function(){
		let pos = $(this).position();
		let width = $(this).outerWidth();
		let box = $('<div>',{
		    position: "absolute",
		    top: pos.top + "px",
		    left: (width + pos.left) + "px",
		    width: "100%",
		    height: "200px",
		    text: "A generated div",
		    css: {
			"background-color":"#404040",
			"color":"white"
		    }
		});

		box.insertAfter($(this));
	    });
	    */

	    if (color != undefined && color != null){
		$div.css('color', color);
	    }
	    
	    return $div;
	}
	
	function formattedChannel(channel_name){
	    let $div = $('<div>',{
		'id' : 'channel-' + channel_name,
		'class': 'channel-header',
		'text': channel_name
	    });
	    
	    $div.on('click', function(){
		changeChannel($div);
	    });
	    
	    return $div;
	}

	
    });

    function generate_message(user, timestamp, msg){
	let $message = $('<div>', {
	    'class' : 'message',		
	});

	let $header = $('<div>', {
	    'class' : 'message-header',
	});

	let $user = $('<div>', {
	    'class' : 'message-user',		
	    'text' : user
	});
	
	let $timestamp = $('<div>', {
	    'class' : 'message-time',
	    'text' : timestamp
	});

	let $contents = $('<div>', {
	    'class' : 'message-content',
	    'html' : msg
	});

	$user.appendTo($header);
	$timestamp.appendTo($header);

	$header.appendTo($message);
	$contents.appendTo($message);

	return $message;
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
	let channelName = prompt("Please enter a channel name");
	
	if(channelName != null){
	    $.ajax({
		url: '/add_channel',
		data: {
		    "channel_name": channelName
		},
		type: 'POST', //can change method type
		success: function(data){
		    //ajax was successful, but server is 
		    if(!data.success){
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
    */
    
    /*
    
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
/*
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
*/
