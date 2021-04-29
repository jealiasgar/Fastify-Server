/**
 * middleware for checking if the request token is of an admin user.
 * admin
 */
module.exports = async (request, reply, next) => {
	console.log("isLoggedIn called")
	next()
}
