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
	{
		type: 'static-text',
		id: 'insecureHTTPParserInfo',
		width: 12,
		value: `
					<hr />
					<h5>⚠️ DANGER — Insecure HTTP Parser</h5>
					<p>
						Companion normally uses Node.js's <strong>strict</strong> HTTP parser. Strict parsing is a
						<strong>security feature</strong>: it exists to block HTTP request smuggling and response-splitting
						attacks (e.g. CVE-2019-15605 / CVE-2019-15606). Enabling the insecure parser <strong>disables these
						protections</strong> for this connection.
					</p>
					<p>Only enable this if <strong>all</strong> of the following are true:</p>
					<ul>
						<li>You control or fully trust the target device, and it is on a trusted/isolated network.</li>
						<li>The device emits technically non-compliant HTTP (e.g. bare-LF line endings) that you
							<strong>cannot</strong> get the vendor to fix.</li>
						<li>You accept that responses may be parsed loosely, incorrectly, or in ways that can be abused by
							a malicious or compromised host, and that this can lead to unexpected behaviour or instability.</li>
					</ul>
					<p>
						<strong>Do NOT enable this for connections that traverse the public internet, shared networks, or any
						proxy/intermediary you do not control.</strong> When in doubt, leave it set to <strong>Strict</strong>
						and fix the device instead.
					</p>
					<p><strong>USE ENTIRELY AT YOUR OWN RISK.</strong></p>
				`,
	},
	{
		type: 'dropdown',
		id: 'insecureHTTPParser',
		label: 'HTTP Response Parser',
		width: 6,
		default: false,
		choices: [
			{ id: false, label: 'Strict (secure) — recommended' },
			{ id: true, label: 'Insecure / lenient — Use at your own risk!' },
		],
	},
]
