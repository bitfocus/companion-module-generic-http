const instance_skel = require('../../instance_skel')
let debug = () => {}
let log


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
		this.actions() // export actions
	}

	GetUpgradeScripts() {
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
		]
	}

	// When module gets deleted
	destroy() {
		debug('destroy')
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

	actions(system) {
		this.setActions({
			post: {
				label: 'POST',
				options: [this.FIELD_URL, this.FIELD_BODY, this.FIELD_HEADER, this.FIELD_CONTENTTYPE],
			},
			get: {
				label: 'GET',
				options: [this.FIELD_URL, this.FIELD_HEADER],
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
		})
	}

	action(action) {
		var cmd = ''
		var body = {}
		var header = {}
		var restCmds = {
			post: 'rest',
			get: 'rest_get',
			put: 'rest_put',
			patch: 'rest_patch',
			delete: 'rest_delete',
		}
		var restCmd = restCmds[action.action]
		var errorHandler = (e, result) => {
			if (e !== null) {
				this.log('error', `HTTP ${action.action.toUpperCase()} Request failed (${e.message})`)
				this.status(this.STATUS_ERROR, result.error.code)
			} else {
				this.status(this.STATUS_OK)
			}
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
			this.system.emit(restCmd, cmd, errorHandler, header)
		} else {
			if (action.options.contenttype) {
				header['Content-Type'] = action.options.contenttype
			}
			this.system.emit(restCmd, cmd, body, errorHandler, header)
		}
	}
}
exports = module.exports = instance
