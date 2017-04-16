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
    var isChrome = !!window.chrome && !!window.chrome.webstore;
    if(isChrome){
	$('#user-pms').css('overflow', 'auto');
	$('.pm-message-wrapper').css('overflow', 'hidden');
    }
    

});

let API_KEY;
let call;
var recorder = null;

//Make sure we're using the correct getUserMedia for our browser
navigator.getUserMedia = (navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mediaDevices.getUserMedia || navigator.msGetUserMedia || navigator.mozGetUserMedia);

/*
navigator.getUserMedia = navigator.getUserMedia ||
    navigator.webkitGetUserMedia || navigator.mozGetUserMedia;
*/

//load media device- audio. Asks user for permission to use microphone
$(function(){
    /*
    navigator.getUserMedia({ audio: true }).then(
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
    */
});


/* Setup our socket to handle events */
$(function(){
    $(window).click(function(){
	$('#menu-item').remove();
    });
    
    //$('#user-pms').prepend(generate_message("User 1", new Date().toUTCString(), "huehuheuheu"));
    var peer_me;
    
    var audio_stream;
    var socket = io();
    var whoami = "";
    var owner = "";
    var mychannel = "";
    socket.on("join_server", function(data){
	owner = data.owner;
	$('#server-name').html(data.owner + "'s server");
	var server_socket = io("/" + data.server);

	/* INSERTING PEERJS  */
	/*
	server_socket.on('peerjsInit',function(data){
	    API_KEY = data.apiKey;
	    //peerJsInit();
	})*/

	/*
	server_socket.on('call_peer', function(data){
	    API_KEY = data.apiKey;
	    call = data.call;
	});
	*/

	/* DONE PEERJS */

	function initAudio(stream){
	    //console.log("got here");
	    audio_stream = stream;	    
	}
	
	server_socket.on('startup', function(data){
	    whoami = data.whoami;
	    peer_me = new Peer(whoami, {key: data.peerJsKey});
	    /*
	    peer_me.on('connection', function(conn){
		conn.on('data', function(data){
		    console.log(data);
		});
	    });
	    */
	    peer_me.on('call', function(call){
		navigator.mediaDevices.getUserMedia({ audio: true }).then(function(stream) {
		    /* use the stream */
		    call.answer(stream);
		    call.on('stream', function(remoteStream){

			var audio = $('<audio autoplay />').appendTo('body');
			audio[0].src = (URL || webkitURL || mozURL).createObjectURL(remoteStream);			
			console.log("received stream");
		    });
		}).catch(function(err) {
		    /* handle the error */
		});		    
	    });
	    

	    //navigator.getUserMedia({ audio: true }, initAudio, function(){});			  
	    
	    mychannel = data.channels[0][0];
	    $('.channel').remove();
	    $('.channel-user').remove();
	    
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
	    $('#channel-' + mychannel).css('color', 'white');
	    
	});

	server_socket.on("channel_text_message", function(data){
	    let user = data.user;
	    let time = data.time;
	    let msg = data.msg;

	    //can add a check to see if user has voice to text on
	    //responsiveVoice.speak(msg);

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
		/*
		var conn = peer_me.connect(data.user);
		conn.on('open', function(){
		    conn.send('please work');
		});*/

		
		navigator.mediaDevices.getUserMedia({ audio: true }).then(function(stream) {
		    /* use the stream */
		    console.log('call');
		    var call = peer_me.call(data.user, stream);
		    call.on('stream', function(remoteStream){
			console.log("good stuff going on");		    
		    });
		}).catch(function(err) {
		    /* handle the error */
		    console.log(err);
		});		    
		
		
		/*call.on('stream', function(remoteStream){
		    console.log('eyyyyyyyyy');
		});
		*/
		
		formattedChannelUser(data.user).insertAfter($('#channel-' + data.channel));
		responsiveVoice.speak(data.user + " has joined the server.");
	    }

	    //Use this to see a list of possible voice types
	    //alert(JSON.stringify(responsiveVoice.getVoices()));
	});

	server_socket.on("add_channel", function(data){
	    formattedChannel(data.channel).insertBefore($('#channels-end'));
	});

	server_socket.on("display_error", function(data){
	    let error = data.error;
	    let msg = data.msg;
	    displayMessage(error, msg);
	});

	server_socket.on("channel_changed_name", function(data){
	    let old_name = data.old_channel;
	    let new_name = data.new_channel;
	    $channel = $('#channel-' + old_name);
	    
	    $channel.html(new_name);
	    $channel.attr('id', 'channel-' + new_name);
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

	    $('#channel-' + mychannel).css('color', '#a4a6a8');
	    mychannel = channel;
	    $('#channel-' + mychannel).css('color', 'White');

	    for(let i = 0; i < messages.length; i++){
		let timestamp = messages[i].timestamp;
		let message_user = messages[i].user;
		let content = messages[i].content;
		
		let message = generate_message(message_user, timestamp, content);
		message.appendTo('#view-messages');
	    }
	});

	server_socket.on('delete_channel', function(data){
	    let channel = data.channel;
	    $('#channel-'+ channel).remove();
	});

	server_socket.on('user_changed_channel', function(data){
	    let user = data.user;
	    let channel = data.channel;	    

	    $('#' + user).insertAfter('#channel-' + channel);


	});

	server_socket.on('generate_private_messages', function(data){
	    let messages = data.messages;

	    for(let i = 0; i < messages.length; i ++){
		let $msg = generate_message(messages[i].user, messages[i].timestamp, messages[i].content);
		$('#user-pms').prepend($msg);
	    }
	});

	server_socket.on('pm_successful', function(data){
	    let me = data.sender;
	    let target = data.target;
	    let time = data.time;
	    let msg = data.msg;

	    //make sure current pm window for this pm acknowledgement is active
	    if(target == $('#pm-cur-user').html()){
		$message = generate_message(me, time, msg);
		$('#user-pms').prepend($message);
	    }
	});
	
	server_socket.on('private_message', function(data){
	    let sender = data.sender;
	    let time = data.time;
	    let msg = data.msg;
	    let $user;

	    if($('#pm-' + sender).length == 0){
		$user = createPM(sender);
	    }else{
		$user = $('#pm-' + sender);
	    }
	    
	    if(sender != $('#pm-cur-user').html()){
		$.playSound("/static/sounds/communication-channel");
		let counterDiv = $('#pm-' + sender + '-counter');
		if(counterDiv.html() == '0'){
		    counterDiv.html('1');
		}else{
		    let counter = parseInt(counterDiv.html());
		    counterDiv.html(counter++);
		}
	    }else{
		$message = generate_message(sender, time, msg);
		$('#user-pms').prepend($message);
	    }

	    if($('#private-messages').css('display') == 'none'){
		let counter = parseInt($('#pm-counter').html());

		if (counter == 0 || isNaN(counter)){
		    $('#pm-counter').html('1');
		}else{
		    counter = counter + 1;
		    $('#pm-counter').html(counter);
		}
	    }
	});

	function animateUser($user){
	    
	}

	function createPM(user){
	    let $user = $('<div>',{
		'class': 'private-message-user',
		'id': 'pm-' + user,
		'html': '<div>' + user + '</div>'
	    });	    

	    let $msg_counter = $('<div>', {
		'id': 'pm-' + user + '-counter',
		'class': 'pm-counter',
		'html' : '0'
	    });

	    $user.append($msg_counter);

	    $user.click(function(e){
		//make click populate pms
		$('.private-message-users .private-message-user').css('background-color', '#333333');
		$user.css('background-color', 'black');
		clearPMWindow();
		$('#pm-cur-user').html(user);
		$('#pm-send-message').css('visibility', 'visible');
		$('#pm-' + user + '-counter').html('');
		server_socket.emit('request_pms', { 'target' : user });
	    });

	    $('#private-message-users').prepend($user);
	    return $user;
	}

	function clearPMWindow(){
	    $('#user-pms').empty();
	}

	$('#exit-pms').click(function(event){
	    $('#private-messages').css('display', 'none');
	});
	
	$('#new-pm').click(function(event){
	    let user = prompt("Enter a user's name");

	    if(user == whoami){
		displayMessage("Invalid Name", "You can't send messages to yourself!");
	    }else if(user){
		$.ajax({
		    url: '/check_user',
		    data: { "user" : user },
		    type: "POST",
		    success: function(data){
			if(data.exists && data.online){
			    if($('#pm-' + user).length == 0){
				let $user = createPM(user);
				$user.click();
			    }else
				$('#pm-' + user).click();
			}else{
			    displayMessage("Not Found", "That user is not online.");
			}
		    },
		    error: function(xhr, status, error){
			//do nothing
		    }
		});
	    }
	});

	$('#pm-send-message').keydown(function(event){
	    let target = $('#pm-cur-user').html();
	    
	    if(event.keyCode  == 27){
		event.preventDefault();
		$(this).val('');
	    }else if(event.keyCode == 13){		
		let msg = $(this).val();

		if(msg != ''){
		    $(this).val('');
		    server_socket.emit('private_message', {
			'target': target,
			'msg': msg});
		}
	    }

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

		    server_socket.emit("channel_text_message", { 'message' : msg });
		}
		
		$('#input-msg').val('');
	    }
	});

	function generateUserMenu(div, user_name){
	    div.click(function(e){
		e.preventDefault();
	    });
	}

	function generateChannelMenu(div, channel_name){
	    div.click(function(e){
		e.preventDefault();
	    });

	    function event(e){
		$('#menu-item').remove();
		var x = e.pageX + 'px';
		var y = e.pageY + 'px';
		var $menuItem = $('<div>', {
		    'id': 'menu-item',
		    'class': 'menu-item'
		}).css({
		    'left': x,
		    'top': y		    
		});

		var $header = $('<div>', {
		    'class': 'generic-header',
		    'text': channel_name
		});

		var $delete = $('<div>', {
		    'class': 'menu-item-btn',
		    'text': 'Delete Channel'
		});
		
		var $rename = $('<div>', {
		    'class': 'menu-item-btn',
		    'text': 'Rename Channel'
		});
		
		$delete.click(function(){		    
		    server_socket.emit('delete_channel', {'channel': channel_name});
		});

		$rename.click(function(){
		    //TODO implement
		    //renameChannel();
		    let rename = prompt("Please enter a new channel name");
		    if(rename){
			server_socket.emit('rename_channel', {
			    'old_name': channel_name,
			    'new_name': rename
			});
		    }
		});

		$menuItem.append($header);
		$menuItem.append($rename);
		$menuItem.append($delete);
			       
		$(document.body).append($menuItem);        

		//stop right click menu from showing up
		e.preventDefault();
	    }

	    //android support
	    function longPress(div){
		var pressTimer;
		
		div.on('mousedown', function(e){
		    pressTimer = window.setTimeout(function(){
			event(e);
		    }, 1000);
		});
		
		div.on('mouseup', function(e){
		    clearTimeout(pressTimer);
		});
	    }

	    if (isMobile()){
		longPress(div);		
	    }else{
		div.contextmenu(event);
	    }
	}


	function formattedChannelUser(user, color){
	    let $div = $('<div>', {
		'id': user,
		'class': 'channel-user',
		'text': user
	    });


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

	    if(owner == whoami){
		generateChannelMenu($div, channel_name);
	    }
	    
	    $div.on('click', function(){
		changeChannel($div);
	    });
	    
	    return $div;
	}	
    });

    function displayMessage(header, msg){
	$overlay = $('<div>', {
	    'class': 'notification-overlay',
	    'id': 'notification-overlay'
	});

	$overlay.click(function(){
	    $(this).remove();
	});	 

	$dialog = $('<div>', {
	    'class': 'user-dialog',
	});

	$header = $('<div>', {
	    'class': 'dialog-header',
	    'text': header
	});

	$message = $('<div>', {
	    'class': 'dialog-message',
	    'text': msg
	});

	$okay = $('<input>', {
	    'type': 'submit',
	    'value': 'Okay'
	}).css({
	    'margin-bottom': '5%'
	});

	$dialog.append($header);
	$dialog.append($message);
	$dialog.append($okay);
	$overlay.append($dialog);
	$(document.body).append($overlay);
	
    }

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

	if (user == whoami){
	    $user.css('color', '#00e2e6');
	}

	$user.appendTo($header);
	$timestamp.appendTo($header);

	$header.appendTo($message);
	$contents.appendTo($message);

	return $message;
    }

    $('#pm-toggle').click(function(){
	let pms = $('#private-messages');
	let pmCounter = $('#pm-counter');
	if(pms.css('display') == "flex"){
	    pms.css('display', 'none');
	}else{
	    pms.css('display', 'flex');
	    pmCounter.html('0');
	}	   
    });
    
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
			displayMessage(data.error, data.message);
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

function isMobile(){
    if( /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ) {
	return true;
    }

    return false;
}

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


////////////////////////////////////////////////////////
///////////////Pure JS Initialization///////////////////
////////////////////////////////////////////////////////

/*
// State
var me = {};
var myStream;
var peers = {};

// Call PureJS
//init();

function init() {
  if (!navigator.getUserMedia) return unsupported();

  getLocalAudioStream(function(err, stream) {
    if (err || !stream) return;

      connectToPeerJS(callId, function(err) {
	  if (err) return;
	  
	  registerIdWithServer(me.id);
	  display(call.peers.length);
	  if (call.peers.length) callPeers();
	  else displayShareMessage();
	  
      });
  });
}

////////////////////////////////////////////////////////
/////////////End Pure JS Initialization/////////////////
////////////////////////////////////////////////////////

/////////////////////////////////////////////////
///////////////// PEER JS ///////////////////////
/////////////////////////////////////////////////
// Connect to PeerJS and get an ID
function connectToPeerJS(callId, cb) {
    display('Connecting to PeerJS...');
    me = new Peer({key: API_KEY});
    
    me.on('call', handleIncomingCall);
    
    me.on('open', function() {
	display('Connected.');
	display('ID: ' + me.id);
	cb && cb(null, me);
    });
    
    me.on('error', function(err) {
	display(err);
	cb && cb(err);
    });
}

// Add our ID to the list of PeerJS IDs for this call
function registerIdWithServer() {
    display('Registering ID with server...');

    $.ajax({
    url: '/add_peer',
    async: false,
    data: {
        "peerid": me.id,
        "id" : call.id
    },
    type: 'POST', //can change method type
    success: function(data){
        //ajax call returned successfully
        if(data.success){

           call = data.call;
           
        }else{
        }
    },
    error: function(xhr, status, error){
        //ajax call failed - no server response
    },
    });
}

// Remove our ID from the call's list of IDs
function unregisterIdWithServer() {
  // $.post('/' + call.id + '/removepeer/' + me.id);
}

// Call each of the peer IDs using PeerJS
function callPeers() {
  call.peers.forEach(callPeer);
}

function callPeer(peerId) {
  display('Calling ' + peerId + '...');
  var peer = getPeer(peerId);
  peer.outgoing = me.call(peerId, myStream);

  peer.outgoing.on('error', function(err) {
    display(err);
  });

  peer.outgoing.on('stream', function(stream) {
    display('Connected to ' + peerId + '.');
    addIncomingStream(peer, stream);
  });
}

// When someone initiates a call via PeerJS
function handleIncomingCall(incoming) {
  display('Answering incoming call from ' + incoming.peer);
  var peer = getPeer(incoming.peer);
  peer.incoming = incoming;
  incoming.answer(myStream);
  peer.incoming.on('stream', function(stream) {
    addIncomingStream(peer, stream);
  });
}

// Add the new audio stream. Either from an incoming call, or
// from the response to one of our outgoing calls
function addIncomingStream(peer, stream) {
  display('Adding incoming stream from ' + peer.id);
  peer.incomingStream = stream;
  playStream(stream);
}

// Create an <audio> element to play the audio stream
function playStream(stream) {
  var audio = $('<audio autoplay />').appendTo('body');
  audio[0].src = (URL || webkitURL || mozURL).createObjectURL(stream);
}

// Get access to the microphone
function getLocalAudioStream(cb) {
  display('Trying to access your microphone. Please click "Allow".');

  navigator.getUserMedia (
    {video: false, audio: true},

    function success(audioStream) {
      display('Microphone is open.');
      myStream = audioStream;
      if (cb) cb(null, myStream);
    },

    function error(err) {
      display('Couldn\'t connect to microphone. Reload the page to try again.');
      if (cb) cb(err);
    }
  );
}



////////////////////////////////////
// Helper functions
function getPeer(peerId) {
  return peers[peerId] || (peers[peerId] = {id: peerId});
}

function displayShareMessage() {
  display('Give someone this URL to chat.');
  display('<input type="text" value="' + location.href + '" readonly>');

  $('#display input').click(function() {
    this.select();
  });
}

function unsupported() {
  display("Your browser doesn't support getUserMedia.");
}

function display(message) {
  // $('<div />').html(message).appendTo('#display');
  console.log(message);
}

/////////////////////////////////////////////////
///////////////END PEER JS //////////////////////
/////////////////////////////////////////////////
*/
