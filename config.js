export const configFields = [
	{
		type: 'static-text',
		id: 'info',
		width: 12,
		label: 'NeoL ePowerSwitch 4',
		value:
			'Configure the connection to your NeoL ePowerSwitch 4. Status is read from the hidden status page and actions are sent via the hidden control interface.',
	},
	{
		type: 'textinput',
		id: 'prefix',
		label: 'Base URL',
		tooltip: 'Example: http://10.3.0.235:2550',
		width: 12,
		default: '',
	},
	{
		type: 'textinput',
		id: 'hiddenPath',
		label: 'Hidden page path',
		tooltip: 'Default: /hidden.htm',
		width: 12,
		default: '/hidden.htm',
	},
	{
		type: 'number',
		id: 'statusPollInterval',
		label: 'Status poll interval (ms)',
		width: 6,
		min: 250,
		max: 60000,
		default: 1000,
	},
]
