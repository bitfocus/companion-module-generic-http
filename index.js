const instance_skel = require('../../instance_skel')
let debug = () => {}
let log
var jp = require('jsonpath');

class instance extends instance_skel {
	/**
	 * Create an instance of the module
	 *
	 * @param {EventEmitter} system - the brains of the operation
	 * @param {string} id - the instance ID
	 * @param {Object} config - saved user configuration parameters
	 * @since 1.0.0
	 */
	constructor(system, id, config) {
		super(system, id, config)

		// Custom Variables Handling
		this.customVariables = {}
		system.emit('custom_variables_get', (variables) => {
			this.customVariables = variables
		})
		system.on('custom_variables_update', (variables) => {
			this.customVariables = variables
			this.actions()
		})
		
		this.actions() // export actions
	}

	static GetUpgradeScripts() {
		return [
			function v1_1_4(context, config, actions) {
				let updated = false

				actions.forEach((action) => {
					// set default content-type on older actions
					if (['post', 'put', 'patch'].includes(action.action)) {
						if (action.options.contenttype === undefined) {
							action.options.contenttype = 'application/json'
							updated = true
						}
					}
				})

				return updated
			},

			function v1_1_6(context, config) {
				if (config.rejectUnauthorized === undefined) {
					config.rejectUnauthorized = true
					updated = true
				}
			},
		]
	}

	updateConfig(config) {
		this.config = config

		if (this.config.prefix !== undefined && this.config.prefix.length > 0) {
			this.FIELD_URL.label = 'URI'
		} else {
			this.FIELD_URL.label = 'URL'
		}

		this.actions()
	}

	init() {
		if (this.config.prefix !== undefined && this.config.prefix.length > 0) {
			this.FIELD_URL.label = 'URI'
		} else {
			this.FIELD_URL.label = 'URL'
		}

		this.status(this.STATE_OK)

		debug = this.debug
		log = this.log
	}

	// Return config fields for web config
	config_fields() {
		return [
			{
				type: 'text',
				id: 'info',
				width: 12,
				label: 'Information',
				value:
					"<strong>PLEASE READ THIS!</strong> Generic modules is only for use with custom applications. If you use this module to control a device or software on the market that more than you are using, <strong>PLEASE let us know</strong> about this software, so we can make a proper module for it. If we already support this and you use this to trigger a feature our module doesnt support, please let us know. We want companion to be as easy as possible to use for anyone.<br /><br />Use the 'Base URL' field below to define a starting URL for the instance's commands: e.g. 'http://server.url/path/'.  <b>This field will be ignored if a command uses a full URL.</b>",
			},
			{
				type: 'textinput',
				id: 'prefix',
				label: 'Base URL',
				width: 12,
			},
			{
				type: 'text',
				id: 'rejectUnauthorizedInfo',
				width: 12,
				value: `
					<hr />
					<h5>WARNING</h5>
					This module rejects server certificates considered invalid for the following reasons:
					<ul>
						<li>Certificate is expired</li>
						<li>Certificate has the wrong host</li>
						<li>Untrusted root certificate</li>
						<li>Certificate is self-signed</li>
					</ul>
					<p>
						We DO NOT recommend turning off this option. However, if you NEED to connect to a host
						with a self-signed certificate you will need to set <strong>Unauthorized Certificates</strong>
						to <strong>Accept</strong>.
					</p>
					<p><strong>USE AT YOUR OWN RISK!<strong></p>
				`,
			},
			{
				type: 'dropdown',
				id: 'rejectUnauthorized',
				label: 'Unauthorized Certificates',
				width: 6,
				default: true,
				choices: [
					{ id: true, label: 'Reject' },
					{ id: false, label: 'Accept - Use at your own risk!' },
				],
			},
		]
	}

	// When module gets deleted
	destroy() {
		debug('destroy')
		this.system.removeListener('custom_variables_update')
	}

	FIELD_URL = {
		type: 'textwithvariables',
		label: 'URL',
		id: 'url',
		default: '',
	}

	FIELD_BODY = {
		type: 'textwithvariables',
		label: 'Body',
		id: 'body',
		default: '{}',
	}

	FIELD_HEADER = {
		type: 'textwithvariables',
		label: 'header input(JSON)',
		id: 'header',
		default: '',
	}

	FIELD_CONTENTTYPE = {
		type: 'dropdown',
		label: 'Content Type',
		id: 'contenttype',
		default: 'application/json',
		choices: [
			{ id: 'application/json', label: 'application/json' },
			{ id: 'application/x-www-form-urlencoded', label: 'application/x-www-form-urlencoded' },
			{ id: 'application/xml', label: 'application/xml' },
			{ id: 'text/html', label: 'text/html' },
			{ id: 'text/plain', label: 'text/plain' },
		],
	}

	FIELD_JSON_PATH = {
		type: 'textwithvariables',
		label: 'Path (like $.age)',
		id: 'jsonPath',
		default: '',
	}

	FIELD_JSON_DATA_VARIABLE = null

	actions(system) {

        this.FIELD_JSON_DATA_VARIABLE = {
			type: 'dropdown',
			label: 'JSON Response Data Variable',
			id: 'jsonResultDataVariable',
			default: '',
			choices: Object.entries(this.customVariables).map(([id, info]) => ({
				id: id,
				label: id,
			})),
		}
		this.FIELD_JSON_DATA_VARIABLE.choices.unshift({id:'', label:'<NONE>'})

        this.FIELD_TARGET_VARIABLE = {
			type: 'dropdown',
			label: 'Target Variable',
			id: 'targetVariable',
			default: '',
			choices: Object.entries(this.customVariables).map(([id, info]) => ({
				id: id,
				label: id,
			})),
		}
		this.FIELD_TARGET_VARIABLE.choices.unshift({id:'', label:'<NONE>'})				

		this.setActions({
			post: {
				label: 'POST',
				options: [this.FIELD_URL, this.FIELD_BODY, this.FIELD_HEADER, this.FIELD_CONTENTTYPE],
			},
			get: {
				label: 'GET',
				options: [this.FIELD_URL, this.FIELD_HEADER, this.FIELD_JSON_DATA_VARIABLE],
			},
			put: {
				label: 'PUT',
				options: [this.FIELD_URL, this.FIELD_BODY, this.FIELD_HEADER, this.FIELD_CONTENTTYPE],
			},
			patch: {
				label: 'PATCH',
				options: [this.FIELD_URL, this.FIELD_BODY, this.FIELD_HEADER, this.FIELD_CONTENTTYPE],
			},
			delete: {
				label: 'DELETE',
				options: [this.FIELD_URL, this.FIELD_BODY, this.FIELD_HEADER],
			},
			setvar: {
				label: 'SETVAR',
				options: [this.FIELD_JSON_DATA_VARIABLE, this.FIELD_JSON_PATH, this.FIELD_TARGET_VARIABLE],
			},
		})
	}

	action(action) {
		let cmd = ''
		let body = {}
		let header = {}
		let restCmds = {
			post: 'rest',
			get: 'rest_get',
			put: 'rest_put',
			patch: 'rest_patch',
			delete: 'rest_delete',
		}
		let restCmd = restCmds[action.action]
		let errorHandler = (e, result) => {
			if (e !== null) {
				this.log('error', `HTTP ${action.action.toUpperCase()} Request failed (${e.message})`)
				this.status(this.STATUS_ERROR, result.error.code)
			} else {
				this.status(this.STATUS_OK)
			}
		}

		let jsonResultDataHandler = (e, result) => {
			if (e !== null) {
				this.log('error', `HTTP ${action.action.toUpperCase()} Request failed (${e.message})`)
				this.status(this.STATUS_ERROR, result.error.code)
			} else {
				// store json result data into retrieved dedicated custom variable
				let jsonResultDataVariable = action.options.jsonResultDataVariable
				if (jsonResultDataVariable !== '') {
					debug('jsonResultDataVariable', jsonResultDataVariable)
					let jsonResultData = JSON.stringify(result.data)
					this.system.emit('custom_variable_set_value', jsonResultDataVariable, jsonResultData)
				}
				this.status(this.STATUS_OK)
			}
		}		

		let options = {
			connection: {
				rejectUnauthorized: this.config.rejectUnauthorized,
			},
		}

		//TODO: consider moving the setvar-action to companion-module-bitfocus-companion

		// extract value from the stored json response data, assign to target variable		
		if (action.action === 'setvar') {

			// get the json response data from the custom variable that holds the data
			let jsonResultData = ''
			let variableName = `custom_${action.options.jsonResultDataVariable}`
			this.system.emit('variable_get', 'internal', variableName, (value) => {
				jsonResultData = value
				debug('jsonResultData', jsonResultData)				
			})

			// recreate a json object from stored json result data string
			let objJson = ''
			try {
				objJson = JSON.parse(jsonResultData)
			} catch (e) {
				this.log('error', `HTTP ${action.action.toUpperCase()} Cannot create JSON object, malformed JSON data (${e.message})`)
				this.status(self.STATUS_ERROR, e.message)
				return
			}

			// extract the value via the given standard JSONPath expression
			let valueToSet = ''
			try {
				valueToSet = jp.query(objJson, action.options.jsonPath)
			} catch (error) {
				this.log('error', `HTTP ${action.action.toUpperCase()} Cannot extract JSON value (${e.message})`)
				this.status(this.STATUS_ERROR, error.message)
				return		
			}

			this.system.emit('custom_variable_set_value', action.options.targetVariable, valueToSet)			

			this.status(this.STATUS_OK)
			return
		}		

		this.system.emit('variable_parse', action.options.url, (value) => {
			cmd = value
		})

		if (action.options.url.substring(0, 4) !== 'http') {
			if (this.config.prefix.length > 0) {
				cmd = `${this.config.prefix}${cmd.trim()}`
			}
		}

		if (action.options.body && action.options.body.trim() !== '') {
			this.system.emit('variable_parse', action.options.body, (value) => {
				body = value
			})

			if (action.options.contenttype && action.options.contenttype === 'application/json') {
				//only parse the body if we are explicitly sending application/json
				try {
					body = JSON.parse(body)
				} catch (e) {
					this.log('error', `HTTP ${action.action.toUpperCase()} Request aborted: Malformed JSON Body (${e.message})`)
					this.status(this.STATUS_ERROR, e.message)
					return
				}
			}
		}

		if (action.options.header.trim() !== '') {
			this.system.emit('variable_parse', action.options.header, (value) => {
				header = value
			})

			try {
				header = JSON.parse(header)
			} catch (e) {
				this.log('error', `HTTP ${action.action.toUpperCase()} Request aborted: Malformed JSON Header (${e.message})`)
				this.status(this.STATUS_ERROR, e.message)
				return
			}
		}

		if (restCmd === 'rest_get') {
			this.system.emit(restCmd, cmd, jsonResultDataHandler, header, options)
		} else {
			if (action.options.contenttype) {
				header['Content-Type'] = action.options.contenttype
			}
			this.system.emit(restCmd, cmd, body, errorHandler, header, options)
		}
	}
}
exports = module.exports = instance
