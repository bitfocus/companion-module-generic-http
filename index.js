var instance_skel = require('../../instance_skel');
var debug;
var log;

function instance(system, id, config) {
	var self = this;

	// super-constructor
	instance_skel.apply(this, arguments);

	self.actions(); // export actions

	return self;
}

instance.prototype.updateConfig = function(config) {
	var self = this;

	self.config = config;

	self.actions();
}

instance.prototype.init = function() {
	var self = this;

	self.status(self.STATE_OK);

	debug = self.debug;
	log = self.log;
}

// Return config fields for web config
instance.prototype.config_fields = function () {
	var self = this;
	return [
		{
			type: 'text',
			id: 'info',
			width: 12,
			label: 'Information',
			value: '<strong>PLEASE READ THIS!</strong> Generic modules is only for use with custom applications. If you use this module to control a device or software on the market that more than you are using, <strong>PLEASE let us know</strong> about this software, so we can make a proper module for it. If we already support this and you use this to trigger a feature our module doesnt support, please let us know. We want companion to be as easy as possible to use for anyone.<br /><br />Use the \'Base URL\' field below to define a starting URL for the instance\'s commands: e.g. \'http://server.url/path/\'.  <b>This field will be ignored if a command uses a full URL.</b>'
		},
		{
			type: 'textinput',
			id: 'prefix',
			label: 'Base URL',
			width: 12
		}
	]
}

// When module gets deleted
instance.prototype.destroy = function() {
	var self = this;
	debug("destroy");
}

instance.prototype.actions = function(system) {
	var self = this;
	var urlLabel = 'URL';

	if ( self.config.prefix !== undefined ) {
		if ( self.config.prefix.length > 0 ) {
			urlLabel = 'URI';
		}
	}

	self.setActions({
		'post': {
			label: 'POST',
			options: [
				{
					type: 'textinput',
					label: urlLabel,
					id: 'url',
					default: ''
				},
				{
					type: 'textinput',
					label: 'Body(JSON)',
					id: 'body',
					default: '{}'
				},
				{
					type: 'textinput',
					label: 'header input(JSON)',
					id: 'header',
					default: '',
				}
			]
		},
		'get': {
			label: 'GET',
			options: [
				{
					type: 'textinput',
					label: urlLabel,
					id: 'url',
					default: '',
				},
				{
					type: 'textinput',
					label: 'header input(JSON)',
					id: 'header',
					default: '',
				}
			]
		},
		'put': {
			label: 'PUT',
			options: [
				{
					type: 'textinput',
					label: urlLabel,
					id: 'url',
					default: ''
				},
				{
					type: 'textinput',
					label: 'Body(JSON)',
					id: 'body',
					default: '{}'
				},
				{
					type: 'textinput',
					label: 'header input(JSON)',
					id: 'header',
					default: '',
				}
			]
		},
	});
}

instance.prototype.action = function(action) {
	var self = this;
	var cmd;

	if ( self.config.prefix !== undefined && action.options.url.substring(0,4) != 'http' ) {
		if ( self.config.prefix.length > 0 ) {
			cmd = self.config.prefix + action.options.url;
		}
		else {
			cmd = action.options.url;
		}
	}
	else {
		cmd = action.options.url;
	}

	if (action.action == 'post') {
		var body;
		var header;
		try {
			body = JSON.parse(action.options.body);
		} catch(e){
			self.log('error', 'HTTP POST Request aborted: Malformed JSON Body (' + e.message+ ')');
			self.status(self.STATUS_ERROR, e.message);
			return
		}
		if(!!action.options.header) {
			try {
				header = JSON.parse(action.options.header);
			} catch(e){
				self.log('error', 'HTTP POST Request aborted: Malformed JSON header (' + e.message+ ')');
				self.status(self.STATUS_ERROR, e.message);
				return
			}
			self.system.emit('rest', cmd, body, function (err, result) {
				if (err !== null) {
					self.log('error', 'HTTP POST Request failed (' + result.error.code + ')');
					self.status(self.STATUS_ERROR, result.error.code);
				}
				else {
					self.status(self.STATUS_OK);
				}
			}, header);
		} else {
			self.system.emit('rest', cmd, body, function (err, result) {
				if (err !== null) {
					self.log('error', 'HTTP POST Request failed (' + result.error.code + ')');
					self.status(self.STATUS_ERROR, result.error.code);
				}
				else {
					self.status(self.STATUS_OK);
				}
			});
		}
	}
	else if (action.action == 'get') {
		var header;
		if(!!action.options.header) {
			try {
				header = JSON.parse(action.options.header);
			} catch(e){
				self.log('error', 'HTTP POST Request aborted: Malformed JSON header (' + e.message+ ')');
				self.status(self.STATUS_ERROR, e.message);
				return
			}
			self.system.emit('rest_get', cmd, function (err, result) {
				if (err !== null) {
					self.log('error', 'HTTP GET Request failed (' + result.error.code + ')');
					self.status(self.STATUS_ERROR, result.error.code);
				}
				else {
					self.status(self.STATUS_OK);
				}
			}, header);
		} else {
			self.system.emit('rest_get', cmd, function (err, result) {
				if (err !== null) {
					self.log('error', 'HTTP GET Request failed (' + result.error.code + ')');
					self.status(self.STATUS_ERROR, result.error.code);
				}
				else {
					self.status(self.STATUS_OK);
				}
			});
		}
	}
	else if (action.action == 'put') {
		var body;
		var header;
		try {
			body = JSON.parse(action.options.body);
		} catch(e){
			self.log('error', 'HTTP PUT Request aborted: Malformed JSON Body (' + e.message+ ')');
			self.status(self.STATUS_ERROR, e.message);
			return
		}
		if(!!action.options.header) {
			try {
				header = JSON.parse(action.options.header);
			} catch(e){
				self.log('error', 'HTTP POST Request aborted: Malformed JSON header (' + e.message+ ')');
				self.status(self.STATUS_ERROR, e.message);
				return
			}
			self.system.emit('rest_put', cmd, body, function (err, result) {
				if (err !== null) {
					self.log('error', 'HTTP PUT Request failed (' + result.error.code + ')');
					self.status(self.STATUS_ERROR, result.error.code);
				}
				else {
					self.status(self.STATUS_OK);
				}
			}, header);
		} else {
			self.system.emit('rest_put', cmd, body, function (err, result) {
				if (err !== null) {
					self.log('error', 'HTTP PUT Request failed (' + result.error.code + ')');
					self.status(self.STATUS_ERROR, result.error.code);
				}
				else {
					self.status(self.STATUS_OK);
				}
			});
		}
	}
}

instance_skel.extendedBy(instance);
exports = module.exports = instance;
