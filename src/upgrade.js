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
					action.options.contenttype = { isExpression: false, value: 'application/json' }
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

	function v3_1_0(context, props) {
		const result = {
			updatedConfig: null,
			updatedActions: [],
			updatedFeedbacks: [],
		}

		if (props.config && props.config.insecureHTTPParser === undefined) {
			props.config.insecureHTTPParser = false
			result.updatedConfig = props.config
		}

		return result
	},

	function v3_2_0(context, props) {
		const result = {
			updatedConfig: null,
			updatedActions: [],
			updatedFeedbacks: [],
		}

		if (props.config && props.config.authType === undefined) {
			props.config.authType = 'none'
			result.updatedConfig = props.config
		}

		// Leave any pre-secrets `authPassword` in config. Upgrade scripts cannot
		// create a secrets-store entry, so the instance falls back to that value
		// until the user saves a password in the new secret field.

		return result
	},
]
