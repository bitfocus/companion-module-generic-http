export const upgradeScripts = [
	function v1_1_4(context, props) {
		const result = {
			updatedConfig: null,
			updatedActions: [],
			updatedFeedbacks: [],
		}

		for (const action of props.actions) {
			// set default content-type on older actions
			if (['post', 'put', 'patch'].includes(action.actionId)) {
				if (action.options.contenttype === undefined) {
					action.options.contenttype = 'application/json'
					result.updatedActions.push(action)
				}
			}
		}

		return result
	},

	function v1_1_6(context, props) {
		const result = {
			updatedConfig: null,
			updatedActions: [],
			updatedFeedbacks: [],
		}

		if (props.config && props.config.rejectUnauthorized === undefined) {
			props.config.rejectUnauthorized = true
			result.updatedConfig = props.config
		}

		return result
	},
]
