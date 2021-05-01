module.exports.policies = ["isLoggedIn"]
module.exports.routes = {
	/**
	 * Test endpoint to see if controller loaded correctly
	 * @route {GET} /Test/v0.1/hello
	 */
	"GET /hello": {
		body: {
			type: "object",
			required: ["requiredKey"],
			properties: {
				someKey: { type: "string" },
				someOtherKey: { type: "number" },
				requiredKey: {
					type: "array",
					maxItems: 3,
					items: { type: "integer" },
				},
				nullableKey: { type: ["number", "null"] },
				multipleTypesKey: { type: ["boolean", "number"] },
				multipleRestrictedTypesKey: {
					oneOf: [
						{ type: "string", maxLength: 5 },
						{ type: "number", minimum: 10 },
					],
				},
				enumKey: {
					type: "string",
					enum: ["John", "Foo"],
				},
				notTypeKey: {
					not: { type: "array" },
				},
			},
		},
		policies: ["test"],
		handler: async (request, reply) => {
			console.log(request.body.name)
			reply.send({
				ok: true,
				message: "Hello world!",
			})
		},
	},
}
