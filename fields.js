export const FIELDS = {
	Url: (label) => ({
		type: 'textinput',
		label: label,
		id: 'url',
		default: '',
		useVariables: true,
	}),

	Body: {
		type: 'textinput',
		label: 'Body',
		id: 'body',
		default: '{}',
		useVariables: true,
	},

	Header: {
		type: 'textinput',
		label: 'header input(JSON)',
		id: 'header',
		default: '',
		useVariables: true,
	},

	ContentType: {
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
	},

	PollInterval: {
		type: 'number',
		label: 'Poll Interval (0 to disable)',
		id: 'interval',
		default: 0,
		min: 0,
	},
}
