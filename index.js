var instance_skel = require('../../instance_skel')
var debug
var log

function instance(system, id, config) {
	var self = this

	// super-constructor
	instance_skel.apply(this, arguments)

	self.actions() // export actions

	return self
}

instance.GetUpgradeScripts = function () {
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
				this.rejectUnauthorized = true
				updated = true
			}
		},
	]
}

instance.prototype.updateConfig = function (config) {
	var self = this

	self.config = config

	if (self.config.prefix !== undefined && self.config.prefix.length > 0) {
		self.FIELD_URL.label = 'URI'
	} else {
		self.FIELD_URL.label = 'URL'
	}

	self.actions()
}

instance.prototype.init = function () {
	var self = this

	if (self.config.prefix !== undefined && self.config.prefix.length > 0) {
		self.FIELD_URL.label = 'URI'
	} else {
		self.FIELD_URL.label = 'URL'
	}

	self.status(self.STATE_OK)

	debug = self.debug
	log = self.log
}

// Return config fields for web config
instance.prototype.config_fields = function () {
	var self = this
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
instance.prototype.destroy = function () {
	var self = this
	debug('destroy')
}

instance.prototype.FIELD_URL = {
	type: 'textwithvariables',
	label: 'URL',
	id: 'url',
	default: '',
}

instance.prototype.FIELD_BODY = {
	type: 'textwithvariables',
	label: 'Body',
	id: 'body',
	default: '{}',
}

instance.prototype.FIELD_HEADER = {
	type: 'textwithvariables',
	label: 'header input(JSON)',
	id: 'header',
	default: '',
}

instance.prototype.FIELD_CONTENTTYPE = {
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

instance.prototype.actions = function (system) {
	var self = this

	self.setActions({
		post: {
			label: 'POST',
			options: [self.FIELD_URL, self.FIELD_BODY, self.FIELD_HEADER, self.FIELD_CONTENTTYPE],
		},
		get: {
			label: 'GET',
			options: [self.FIELD_URL, self.FIELD_HEADER],
		},
		put: {
			label: 'PUT',
			options: [self.FIELD_URL, self.FIELD_BODY, self.FIELD_HEADER, self.FIELD_CONTENTTYPE],
		},
		patch: {
			label: 'PATCH',
			options: [self.FIELD_URL, self.FIELD_BODY, self.FIELD_HEADER, self.FIELD_CONTENTTYPE],
		},
		delete: {
			label: 'DELETE',
			options: [self.FIELD_URL, self.FIELD_BODY, self.FIELD_HEADER],
		},
	})
}

instance.prototype.action = function (action) {
	var self = this
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
	var errorHandler = function (e, result) {
		if (e !== null) {
			self.log('error', `HTTP ${action.action.toUpperCase()} Request failed (${result.error})`)
			self.status(self.STATUS_ERROR, result.error.toString())
		} else {
			self.status(self.STATUS_OK)
		}
	}
	var options = {
		connection: {
			rejectUnauthorized: self.config.rejectUnauthorized,
		},
	}

	self.system.emit('variable_parse', action.options.url, function (value) {
		cmd = value
	})

	if (action.options.url.substring(0, 4) !== 'http') {
		if (self.config.prefix.length > 0) {
			cmd = `${self.config.prefix}${cmd.trim()}`
		}
	}

	if (action.options.body && action.options.body.trim() !== '') {
		self.system.emit('variable_parse', action.options.body, function (value) {
			body = value
		})

		if (action.options.contenttype && action.options.contenttype === 'application/json') {
			//only parse the body if we are explicitly sending application/json
			try {
				body = JSON.parse(body)
			} catch (e) {
				self.log('error', `HTTP ${action.action.toUpperCase()} Request aborted: Malformed JSON Body (${e.message})`)
				self.status(self.STATUS_ERROR, e.message)
				return
			}
		}
	}

	if (action.options.header.trim() !== '') {
		self.system.emit('variable_parse', action.options.header, function (value) {
			header = value
		})

		try {
			header = JSON.parse(header)
		} catch (e) {
			self.log('error', `HTTP ${action.action.toUpperCase()} Request aborted: Malformed JSON Header (${e.message})`)
			self.status(self.STATUS_ERROR, e.message)
			return
		}
	}

	if (restCmd === 'rest_get') {
		self.system.emit(restCmd, cmd, errorHandler, header, options)
	} else {
		if (action.options.contenttype) {
			header['Content-Type'] = action.options.contenttype
		}
		self.system.emit(restCmd, cmd, body, errorHandler, header, options)
	}
}

instance_skel.extendedBy(instance)
exports = module.exports = instance
