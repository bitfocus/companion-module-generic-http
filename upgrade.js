export const upgradeScripts = [
	function v1_1_4(context, props) {
		const result = {
			config: null,
			actions: [],
			feedbacks: [],
		}

		for (const action of props.actions) {
			// set default content-type on older actions
			if (['post', 'put', 'patch'].includes(action.actionId)) {
				if (action.options.contenttype === undefined) {
					action.options.contenttype = 'application/json'
					result.actions.push(action)
				}
			}
		}

		return result
	},

	function v1_1_6(context, props) {
		const result = {
			config: null,
			actions: [],
			feedbacks: [],
		}

		if (props.config && props.config.rejectUnauthorized === undefined) {
			props.config.rejectUnauthorized = true
			result.config = props.config
		}

		return result
	},
]
