module.exports.policies = ["isLoggedIn"]
module.exports.routes = {
	/**
	 * Test endpoint to see if controller loaded correctly
	 * @route {GET} /Test/v0.1/hello
	 */
	"GET /hello": {
		querystring: {
			name: { type: "number" },
		},
		policies: ["test"],
		handler: async (request, reply) => {
			console.log(typeof request.query.name)
			reply.send({
				ok: true,
				message: "Hello world!",
			})
		},
	},
}
