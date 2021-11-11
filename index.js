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

instance.prototype.updateConfig = function (config) {
	var self = this

	self.config = config

	self.actions()
}

instance.prototype.init = function () {
	var self = this

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
	]
}

// When module gets deleted
instance.prototype.destroy = function () {
	var self = this
	debug('destroy')
}

instance.prototype.actions = function (system) {
	var self = this
	var urlLabel = 'URL'

	if (self.config.prefix !== undefined) {
		if (self.config.prefix.length > 0) {
			urlLabel = 'URI'
		}
	}

	self.setActions({
		post: {
			label: 'POST',
			options: [
				{
					type: 'textwithvariables',
					label: urlLabel,
					id: 'url',
					default: '',
				},
				{
					type: 'textwithvariables',
					label: 'Body(JSON)',
					id: 'body',
					default: '{}',
				},
				{
					type: 'textwithvariables',
					label: 'header input(JSON)',
					id: 'header',
					default: '',
				},
			],
		},
		get: {
			label: 'GET',
			options: [
				{
					type: 'textwithvariables',
					label: urlLabel,
					id: 'url',
					default: '',
				},
				{
					type: 'textwithvariables',
					label: 'header input(JSON)',
					id: 'header',
					default: '',
				},
			],
		},
		put: {
			label: 'PUT',
			options: [
				{
					type: 'textwithvariables',
					label: urlLabel,
					id: 'url',
					default: '',
				},
				{
					type: 'textwithvariables',
					label: 'Body(JSON)',
					id: 'body',
					default: '{}',
				},
				{
					type: 'textwithvariables',
					label: 'header input(JSON)',
					id: 'header',
					default: '',
				},
			],
		},
		patch: {
			label: 'PATCH',
			options: [
				{
					type: 'textwithvariables',
					label: urlLabel,
					id: 'url',
					default: '',
				},
				{
					type: 'textwithvariables',
					label: 'Body(JSON)',
					id: 'body',
					default: '{}',
				},
				{
					type: 'textwithvariables',
					label: 'header input(JSON)',
					id: 'header',
					default: '',
				},
			],
		},
		delete: {
			label: 'DELETE',
			options: [
				{
					type: 'textwithvariables',
					label: urlLabel,
					id: 'url',
					default: '',
				},
				{
					type: 'textwithvariables',
					label: 'Body(JSON)',
					id: 'body',
					default: '{}',
				},
				{
					type: 'textwithvariables',
					label: 'header input(JSON)',
					id: 'header',
					default: '',
				},
			],
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
	var errorHandler = function (err, result) {
		if (err !== null) {
			self.log('error', `HTTP ${action.action.toUpperCase()} Request failed (${e.message})`)
			self.status(self.STATUS_ERROR, result.error.code)
		} else {
			self.status(self.STATUS_OK)
		}
	}

	self.system.emit('variable_parse', action.options.url, function (value) {
		cmd = value
	})

	if (action.options.url.substring(0, 4) !== 'http') {
		if (self.config.prefix.length > 0) {
			cmd = `${self.config.prefix}${cmd.trim()}`
		}
	}

	if (action.options.body.trim() !== '') {
		self.system.emit('variable_parse', action.options.body, function (value) {
			body = value
		})

		try {
			body = JSON.parse(body)
		} catch (e) {
			self.log('error', `HTTP ${action.action.toUpperCase()} Request aborted: Malformed JSON Body (${e.message})`)
			self.status(self.STATUS_ERROR, e.message)
			return
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

	if (cmd === 'rest_get') {
		self.system.emit(restCmd, cmd, errorHandler, header)
	} else {
		self.system.emit(restCmd, cmd, body, errorHandler, header)
	}
}

instance_skel.extendedBy(instance)
exports = module.exports = instance
