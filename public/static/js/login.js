$(function(){
    var valid_char_check = function(event){
	if(event.which == 127 || event.which == 8 || event.which == 0)
	    return;
	
	if((event.which < 48 || event.which > 57) &&
	   (event.which < 65 || event.which > 122)){
	    event.preventDefault();
	}
    };

    $('#my-server').click(function(){
	window.location.replace("chat/0");
    });

    $('#register_user').on("input", function(){
	var timeOut = setTimeout(checkUser, 500);
	$('#register_user').css('background-image', 'url(/static/glyphicons/glyphicons-541-hourglass.png)');
    });

    $('#register_user').focus(function(){
	$('#register_user').css('border-width', '0px');
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
	    data: {
		"login_user": $('#login_user').val(),
		"login_password": $('#login_password').val()
	    },
	    type: 'POST',
	    success: function(data){
		console.log(data);
		if(data.success){
		    // handle next steps - user is authenticated
		    
		    $('#login-wrapper').animate(
			{
			    left: "112%"
			}, 500, function(){

			    window.location.replace("chat/" + data.server_id);
			});
			
		}else{
		    showAuthenticationMessage($('#login_message'), "Invalid user name or password.");
		}
	    },
	    error: function(xhr, status, error){
	    },
	});
    });
    

    /* handle register sub*/
    $('#register_submit').click(function(){
	let psw1 = $('#register_password').val();
	let psw2 = $('#register_confirm_password').val();
	
	if($('#register_user').val() == ''){
	    $('#register_user').css('border-width', '1');
	}else if (psw1 !== psw2){
	    showAuthenticationMessage($('#register_message'), "Passwords do not match");
	}else if(psw1.length < 6){
	    showAuthenticationMessage($('#register_message'), "Password must be 6 characters or longer");
	}else{    
	    //do form validation first
	    $.ajax({
		url: '/register',
		data: { "user": $('#register_user').val(),
			"password": $('#register_password').val()},
		type: 'POST',
		success: function(data){
		    if(data.success){
			showAuthenticationMessage($('#register_message'),
						  "Successfully registered as " + $('#register_user').val() + ". Please log in");
			clearRegisterFields();
		    }else{
			showAuthenticationMessage($('#register_message'),
						  "Server rejected registration. Username may be taken.");
		    }
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
