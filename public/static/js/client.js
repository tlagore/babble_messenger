
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

//let API_KEY;
//let call;
//var recorder = null;

//Make sure we're using the correct getUserMedia for our browser
navigator.getUserMedia = (navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mediaDevices.getUserMedia || navigator.msGetUserMedia || navigator.mozGetUserMedia);


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

	function initAudio(stream){
	    //console.log("got here");
	    audio_stream = stream;	    
	}
	
	server_socket.on('startup', function(data){
	    whoami = data.whoami;
	    peer_me = new Peer(whoami, {key: data.peerJsKey});

	    peer_me.on('call', function(call){
		navigator.mediaDevices.getUserMedia({ audio: true }).then(function(stream) {
		    /* use the stream */
		    call.answer(stream);
		    call.on('stream', function(remoteStream){
			console.log("connected to " + this.peer);
			var audio = $('<audio id="audio-' + this.peer + '" autoplay />').appendTo('body');
			audio[0].src = (URL || webkitURL || mozURL).createObjectURL(remoteStream);			
		    });
		}).catch(function(err) {
		    console.log(err);
		    /* handle the error */
		});		    
	    });	   
	    
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
	    $('#audio-' + data.user).remove();
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
		if(data.channel == mychannel){
		    //clear any possible streams we had from that user from disconnecting/reconnecting
		    $('#audio-'+data.user).remove();
		    navigator.mediaDevices.getUserMedia({ audio: true }).then(function(stream) {
			/* use the stream */
			var call = peer_me.call(data.user, stream);
			console.log(call);
			call.on('stream', function(remoteStream){
			    console.log('connected to ' + this.peer);
			    var audio = $('<audio id="audio-' + this.peer + '" autoplay />').appendTo('body');
			    audio[0].src = (URL || webkitURL || mozURL).createObjectURL(remoteStream);			
			});
		    }).catch(function(err) {
			/* handle the error */
			console.log(err);
		    });
		    //connectToPeer(data.user);
		    
		}
		
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

	    mychannel = channel;

	    $('#' + user).insertAfter('#channel-' + channel);
	    $('#view-messages').empty();

	    $('.channel-header').css('color', '#a4a6a8');
	    mychannel = channel;
	    $('#channel-' + mychannel).css('color', 'White');

	    $('audio').remove();

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

	    if(channel == mychannel){
		navigator.mediaDevices.getUserMedia({ audio: true }).then(function(stream) {
		    /* use the stream */
		    var call = peer_me.call(data.user, stream);
		    console.log(call);
		    call.on('stream', function(remoteStream){
			console.log('connected to ' + this.peer);
			var audio = $('<audio id="audio-' + this.peer + '" autoplay />').appendTo('body');
			audio[0].src = (URL || webkitURL || mozURL).createObjectURL(remoteStream);			
		    });
		}).catch(function(err) {
		    /* handle the error */
		    console.log(err);
		});
		connectToPeer(user);
	    }else{
		$('#audio-' + data.user).remove();
	    }
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

		$.playSound("/static/sounds/communication-channel");

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

	$('#logout-btn').click(function(event){
	    server_socket.emit("logout");
	    server_socket.disconnect();
	    window.location.replace("/");
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
	    $user.css('color', "LightGray");// '#00e2e6');
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
	var left = $('#settings-panel').css('width');
	left = parseInt(left.replace('px',''))/$(window).width() * 100;
	left = left + "%";
	
	if (settingsPanel.css('left') == winWidth){
	    settingsPanel.animate({
		left: left
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

/*
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
*/

//scroll to bottom of messages
function scrollToBottom(){
    var messages = document.getElementById("message-wrapper");
    messages.scrollTop = messages.scrollHeight;
}
