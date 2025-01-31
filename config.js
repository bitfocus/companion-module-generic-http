export const configFields = [
	{
		type: 'static-text',
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
