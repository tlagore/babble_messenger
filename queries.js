
var queries = {
    //note user is assumed to have been escaped here, therefore no
    //single quotes surround it.
    insert_user: function(user, salt, password){
	return "INSERT INTO user (user, password, salt) values (" + user + ", '" + password + "', '" + salt + "');";
    },
    get_user_hash: function(user){
	return "SELECT u.salt, u.password FROM user AS u WHERE u.user = " + user + ";" 
    }
};

module.exports = queries;
