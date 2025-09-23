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
			{ id: 'text/csv', label: 'text/csv' },
			{ id: 'text/xml', label: 'text/xml' },
			{ id: 'multipart/form-data', label: 'multipart/form-data' },
			{ id: 'application/octet-stream', label: 'application/octet-stream' },
			{ id: 'application/javascript', label: 'application/javascript' },
			{ id: 'application/pdf', label: 'application/pdf' },
			{ id: 'application/zip', label: 'application/zip' },
			{ id: 'image/png', label: 'image/png' },
			{ id: 'image/jpeg', label: 'image/jpeg' },
			{ id: 'image/svg+xml', label: 'image/svg+xml' },
			{ id: 'application/ld+json', label: 'application/ld+json' },
			{ id: 'application/vnd.api+json', label: 'application/vnd.api+json' },
			{ id: 'application/x-yaml', label: 'application/x-yaml' },
			{ id: 'application/graphql', label: 'application/graphql' },
		],
	},

	PollInterval: {
		type: 'number',
		label: 'Poll Interval (ms) (0 to disable)',
		id: 'interval',
		default: 0,
		min: 0,
	},

	JsonResponseVariable: {
		type: 'custom-variable',
		label: 'JSON Response Data Variable',
		id: 'jsonResultDataVariable',
		default: '',
	},

	JsonStringify: {
		type: 'checkbox',
		label: 'JSON Stringify Result',
		id: 'result_stringify',
		default: true,
	},

}
