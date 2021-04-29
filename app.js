const fastify = require("fastify")
const fs = require("fs")
const colors = require("colors/safe")
const serveStatic = require("serve-static")

let deepFreeze = require("deep-freeze")
require("draftlog").into(console).addLineListener(process.stdin)

const appDir = require("path").dirname(require.main.filename)
const connectors = {
	...require("@orderstack/mongo-connector"),
	...require("@orderstack/postgres-connector"),
}

let _runtime = {}
let ObjectID = require("mongodb").ObjectID
const { policies } = require("./app/controllers/Test")
let logbeauty = {
	SHORTHR: "_______________________________________________________",
	LONGHR:
		"___________________________________________________________________",
}
let config = {}
Object.defineProperties(global, {
	projectDir: { value: appDir, writable: false },
})

let lights = {}
// // let log = null
let ilog
let _log

process.on("unhandledRejection", (error) => {
	if (lights.log) {
		lights.log.e("unhandledRejection : ", error)
	} else {
		console.log("unhandledRejection : ", error)
	}
})

let prefixDate = function () {
	return require("moment-timezone")().tz("Asia/Kolkata").toLocaleString()
}

let loadLights = () => {
	// lights.lighters = _runtime
	lights.appDir = appDir
	lights.Controllers = {}
	lights.Listeners = []
	lights.Services = {}
	lights.Policies = {}
	lights.Models = {}
	lights.db = "yet_to_connect"
	/* util functions */

	lights.log = {
		d: logFunction(colors.bgCyan("Application |"), config.logs.app),
		e: logFunction(colors.red("Error       |"), config.logs.error, "error"),
		l: logFunction(colors.cyan("Lighters | "), true),
	}
	_log = lights.log.l
	ilog = logFunction(colors.cyan("Internal | "))
}

let loadConfig = () => {
	config = require(appDir + "/config/env/run")
	config.enum = require(appDir + "/config/enumerables") || {}
	config.CONSTANTS = require(appDir + "/config/constants") || {}
	Object.defineProperties(global, {
		config: { value: config, writable: false, enumerable: true },
	})
}

let loadMiddleWare = () => {
	let http = require(appDir + "/config/http")

	for (let item in http) {
		_runtime.app.use(item)
	}
	for (let item in http.static) {
		_runtime.app.use(item, serveStatic(appDir + http.static[item]))
	}
}

let loadServices = () => {
	dirIterator(appDir + "/app/services", (name, file) => {
		lights.Services[name] = require(file)
	})
}

let loadPolicies = () => {
	dirIterator(appDir + "/app/policies", (name, file) => {
		lights.Policies[name] = require(file)
	})
}

let loadControllers = () => {
	var verbExpr = /^(all|get|post|put|delete|trace|options|connect|patch|head)\s+/i
	let routesConfig = require(appDir + "/config/routes")
	dirIterator(appDir + "/app/controllers", (name, file) => {
		const ctrl = (lights.Controllers[name] = require(file).routes)
		const policiesToBeEnforced = require(file).policies || []
		for (let item in ctrl) {
			let verbs = item.match(verbExpr)
			if (verbs && verbs.length) {
				let verb = verbs[verbs.length - 1]
				let routeIndex = item.indexOf("/")
				let route = item.substring(routeIndex)
				let version = item.substring(verb.length, routeIndex).trim()
				if (version.indexOf("v") < 0) {
					version = routesConfig.versions.default
				} else {
					let versionValidity = 0
					let i = 0
					for (i = 0; i < routesConfig.versions.all.length; i++) {
						let rx1 = routesConfig.versions.all[i]
						let y = rx1.match(version)
						if (y && y.length == 1) {
							version = y[0]
							versionValidity = 1
							break
						} else if (y && y.length > 1 && y.index >= routeIndex) {
							let err =
								"malformed Uri in controller: " +
								name +
								" -> " +
								item +
								'\n This must be in form of "VERB version /route/to/resource"  \n\t ex: GET v1.0 /cars/all'
							throw err
						}
					}
					if (versionValidity === 0) {
						let err =
							"undeclared route version : Controllers/" +
							name +
							".js-> " +
							item +
							" -> " +
							version +
							"\n Please declate this in config/routes.js "
						throw err
					}
				}
				route = "/" + name + "/" + version + route
				_log("Route | ", verb)
				_log("Added | \t " + route)
				_log(colors.grey(logbeauty.SHORTHR))
				let handler = ctrl[item]
				let localPoliciesToBeEnforced = []
				if (
					typeof ctrl[item] === "object" &&
					ctrl[item].hasOwnProperty("policies") &&
					ctrl[item].hasOwnProperty("handler")
				) {
					if (!Array.isArray(ctrl[item].policies)) {
						throw (
							"local controller level policies should be an array" +
							name +
							" -> " +
							item
						)
					}
					handler = ctrl[item].handler
					localPoliciesToBeEnforced = ctrl[item].policies.map((e) => {
						if (lights.Policies[e]) {
							return lights.Policies[e]
						} else {
							throw (
								`local policy '${e}' does not exist ` +
								name +
								" -> " +
								item
							)
						}
					})
				}

				let querystring = ctrl[item].hasOwnProperty("querystring")
					? ctrl[item].querystring
					: {}
				let totalPolicies = policiesToBeEnforced.map((item) => {
					if (lights.Policies[item]) {
						return lights.Policies[item]
					} else {
						throw (
							`policy '${e}' does not exist ` +
							name +
							" -> " +
							item
						)
					}
				})

				totalPolicies = totalPolicies.concat(localPoliciesToBeEnforced)
				switch (verb) {
					case "GET": {
						_runtime.app.route({
							method: verb,
							url: route,
							schema: {
								querystring,
							},
							preHandler: totalPolicies,
							handler,
						})
						break
					}
					case "POST": {
						_runtime.app.route({
							method: verb,
							// schema,
							url: route,
							preHandler: totalPolicies,
							handler,
						})
						break
					}
					case "PUT": {
						_runtime.app.route({
							method: verb,
							// schema,
							url: route,
							preHandler: totalPolicies,
							handler,
						})
						break
					}
					case "PATCH": {
						_runtime.app.route({
							method: verb,
							// schema,
							url: route,
							preHandler: totalPolicies,
							handler,
						})
						break
					}
					case "DELETE": {
						_runtime.app.route({
							method: verb,
							// schema,
							url: route,
							preHandler: totalPolicies,
							handler,
						})
						break
					}
					default: {
						throw "Route Verb " + verb + " is not supported yet"
					}
				}
			} else {
				let err = "route defined unproperly: " + name + " -> " + item
				throw err
			}
		}
	})
}

let loadListeners = () => {
	// Loading Listeners...
	dirIterator(appDir + "/app/listeners", (name, file) => {
		//lights.Listeners['/' + name.toLowercase()] = require(file)
		let listener = require(file)
		listener._name = "/" + name.toLowerCase()
		lights.Listeners.push(listener)
	})
}

let loadModels = async function () {
	let connections = require(appDir + "/config/databases")
	for (let item in connections) {
		switch (connections[item].dbms) {
			case "mongodb": {
				Object.defineProperty(lights.Models, item, {
					value: {
						client: await connectors.mongo(connections[item]),
						_type: "mongodb",
					},
					writable: false,
					enumerable: true,
				})
				break
			}
			case "postgres": {
				Object.defineProperty(lights.Models, item, {
					value: {
						client: await connectors.postgres(connections[item]),
						_type: "postgres",
					},
					writable: false,
					enumerable: true,
				})
				break
			}
			default: {
				throw 'only following dbms are supported : ["mongodb","postgres"]'
			}
		}
	}
	await dirIterator2(appDir + "/app/models", async (name, file) => {
		if (connections[name]) {
			let model = require(file)
			let db = lights.Models[name]
			for (let item of model.collections) {
				switch (lights.Models[name]._type) {
					case "mongodb": {
						Object.defineProperty(db, item, {
							value: db.client.collection(item),
							writable: false,
							enumerable: true,
						})
						let ixs = model.indexes && model.indexes[item]
						if (ixs) {
							for (let ekIndex of ixs) {
								if (ekIndex.length > 0) {
									let y = await db[item].createIndex(
										ekIndex[0],
										ekIndex[1] || {}
									)
									ilog("creation of index: ", y)
								}
							}
						}
						break
					}
					case "postgres": {
						if (
							!model.schema ||
							Object.keys(model.schema).length === 0 ||
							!model.schema[item]
						)
							throw "Table schema not found"

						let columns = []
						for (let col in model.schema[item]) {
							columns.push(col + " " + model.schema[item][col])
						}
						columns = columns.join(",")
						try {
							await db.client.query(
								`CREATE TABLE IF NOT EXISTS ${item} (${columns})`
							)
						} catch (e) {
							console.error(e.stack)
							throw (
								"Postgres column assertion error: " + e.message
							)
						}

						try {
							if (model.indexes[item]) {
								for (let indexDef of model.indexes[item]) {
									if (
										typeof indexDef !== "object" ||
										!indexDef.hasOwnProperty("expression")
									) {
										throw "Invalid index expression"
									}
									if (indexDef.unique) {
										await db.client.query(
											`CREATE UNIQUE INDEX ${indexDef.expression}`
										)
									} else {
										await db.client.query(
											`CREATE INDEX ${indexDef.expression}`
										)
									}
								}
							}
						} catch (e) {
							console.error(e.stack)
							throw (
								"Postgres indexes assertion error: " + e.message
							)
						}
						break
					}
					default: {
						throw 'only following dbms are supported : ["mongodb","postgres"]'
					}
				}
			}
			if (connections[name].primary) {
				lights.db = db
			}
		} else {
			let er = "Database " + name + " not present in /config/databases.js"
			throw er
		}
	})
	return
}

let load = async () => {
	fs.existsSync(appDir + "/tmp") ? "" : fs.mkdirSync(appDir + "/tmp")

	loadConfig()
	loadLights()

	// load policies in lights
	loadPolicies()

	// load middlewares and statics
	loadMiddleWare()

	// load services
	loadServices()

	// load routes + controllers bind
	// laod and bind policies to controllers
	loadControllers()

	loadListeners()

	// load db connections
	// load database models
	await loadModels()

	//require external modules
	let CronManagerClass = require("@orderstack/cron-manager")
	let CronManager = new CronManagerClass()
	let fsasy = deepFreeze(require("@orderstack/fsasy"))

	//freeze global properties
	deepFreeze(global.config)
	deepFreeze(lights.log)
	deepFreeze(lights.Controllers)
	deepFreeze(lights.Listeners)
	deepFreeze(lights.Services)
	deepFreeze(lights.Policies)

	// Expose the lights object
	Object.defineProperties(global, {
		appDir: { value: lights.appDir, writable: false, enumerable: true },
		Controllers: {
			value: lights.Controllers,
			writable: false,
			enumerable: true,
		},
		Listeners: {
			value: lights.Listeners,
			writable: false,
			enumerable: true,
		},
		Services: { value: lights.Services, writable: false, enumerable: true },
		Policies: { value: lights.Policies, writable: false, enumerable: true },
		Models: { value: lights.Models, writable: false, enumerable: true },
		db: { value: lights.db, writable: false, enumerable: true },

		/* utils */
		log: { value: lights.log, writable: false, enumerable: true },
		ObjectID: { value: ObjectID, writable: false, enumerable: true },
		CronManager: { value: CronManager, writable: false, enumerable: true },
		EscapeString: {
			value: function (string) {
				return string.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&")
			},
			writable: false,
			enumerable: true,
		},
		moment: {
			value: (date) =>
				require("moment-timezone")(date).tz("Asia/Kolkata"),
			writable: false,
			enumerable: true,
		},
		fsasy: { value: fsasy, writable: false, enumerable: true },
		QueueClass: {
			value: require("@orderstack/in-memory-queue"),
			writable: false,
			enumerable: true,
		},
	})
}

const glow = async (next) => {
	require("dotenv").config({ path: projectDir + "/config/env/.env" })
	_runtime.app = fastify({ logger: true })
	await _runtime.app.register(require("fastify-express"))
	await load()
	let port = config.port || 1337
	_runtime.app.listen(port, function (err, address) {
		_log(
			colors.yellow("\n" + logbeauty.LONGHR),
			colors.yellow("\n\n\t\t\tGlowing on port "),
			colors.yellow(port + ""),
			colors.yellow("\n" + logbeauty.LONGHR)
		)
		if (next) next()
	})
	if (process.send) {
		process.send("ready")
	}
}

/* utils */

let dirIterator = (dir, f) => {
	let list = fs.readdirSync(dir)
	list.forEach(function (file) {
		let name = file
		file = dir + "/" + file
		let stat = fs.statSync(file)
		let extension = name.split(".")
		if (stat && !stat.isDirectory() && extension.length > 1) {
			name = extension[0]
			extension = extension[extension.length - 1]
			if (extension === "js") {
				f(name, file)
			}
		}
	})
}

let dirIterator2 = async (dir, f) => {
	let list = fs.readdirSync(dir)
	for (let file of list) {
		let name = file
		file = dir + "/" + file
		let stat = fs.statSync(file)
		let extension = name.split(".")
		if (stat && !stat.isDirectory() && extension.length > 1) {
			name = extension[0]
			extension = extension[extension.length - 1]
			if (extension === "js") {
				await f(name, file)
			}
		}
	}
}

let logFunction = function (prefix, enable, type = "log") {
	if (console && console[type]) {
		if (enable) {
			return function () {
				Array.prototype.unshift.call(arguments, prefix)
				Array.prototype.unshift.call(
					arguments,
					colors.blue(`[${prefixDate()}]`)
				)
				console[type].apply(this, arguments)
			}
		} else {
			return function () {}
		}
	}
}

glow()
