export const configFields = [
	{
		type: 'static-text',
		id: 'info',
		width: 12,
		label: 'Information',
		value:
			"PLEASE READ THIS! Generic modules is only for use with custom applications. If you use this module to control a device or software on the market that more than you are using, PLEASE let us know about this software, so we can make a proper module for it. If we already support this and you use this to trigger a feature our module doesnt support, please let us know. We want companion to be as easy as possible to use for anyone.Use the 'Base URL' field below to define a starting URL for the instance's commands: e.g. 'http://server.url/path/'.  This field will be ignored if a command uses a full URL.",
	},
	{
		type: 'textinput',
		id: 'prefix',
		label: 'Base URL',
		width: 12,
		default: '',
	},
	{
		type: 'textinput',
		id: 'proxyAddress',
		label: 'Proxy Address',
		tooltip: 'E.g. http://username:password@proxy-server:8080',
		width: 12,
		default: '',
	},
	{
		type: 'static-text',
		id: 'rejectUnauthorizedInfo',
		width: 12,
		value: `
					
					WARNING
					This module rejects server certificates considered invalid for the following reasons:
					
						Certificate is expired
						Certificate has the wrong host
						Untrusted root certificate
						Certificate is self-signed
					
					
						We DO NOT recommend turning off this option. However, if you NEED to connect to a host
						with a self-signed certificate you will need to set Unauthorized Certificates
						to Accept.
					
					USE AT YOUR OWN RISK!
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
