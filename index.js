import { InstanceBase, runEntrypoint, InstanceStatus } from '@companion-module/base'
import got from 'got'
import { configFields } from './config.js'
import { upgradeScripts } from './upgrade.js'
import { FIELDS } from './fields.js'

class GenericHttpInstance extends InstanceBase {
	configUpdated(config) {
		this.config = config

		this.initActions()
	}

	init(config) {
		this.config = config

		this.updateStatus(InstanceStatus.Ok)

		this.initActions()
	}

	// Return config fields for web config
	getConfigFields() {
		return configFields
	}

	// When module gets deleted
	async destroy() {
		// Nothing to do
	}

	async prepareQuery(action, includeBody) {
		let url = await this.parseVariablesInString(action.options.url || '')
		if (url.substring(0, 4) !== 'http') {
			if (this.config.prefix && this.config.prefix.length > 0) {
				url = `${this.config.prefix}${url.trim()}`
			}
		}

		let body = {}
		if (includeBody && action.options.body && action.options.body.trim() !== '') {
			body = await this.parseVariablesInString(action.options.body || '')

			if (action.options.contenttype === 'application/json') {
				//only parse the body if we are explicitly sending application/json
				try {
					body = JSON.parse(body)
				} catch (e) {
					this.log('error', `HTTP ${action.action.toUpperCase()} Request aborted: Malformed JSON Body (${e.message})`)
					this.updateStatus(InstanceStatus.UnknownError, e.message)
					return
				}
			}
		}

		let headers = {}
		if (action.options.header.trim() !== '') {
			const headersStr = await this.parseVariablesInString(action.options.header || '')

			try {
				headers = JSON.parse(headersStr)
			} catch (e) {
				this.log('error', `HTTP ${action.action.toUpperCase()} Request aborted: Malformed JSON Header (${e.message})`)
				this.updateStatus(InstanceStatus.UnknownError, e.message)
				return
			}
		}

		if (includeBody && action.options.contenttype) {
			headers['Content-Type'] = action.options.contenttype
		}

		const options = {
			https: {
				rejectUnauthorized: this.config.rejectUnauthorized,
			},

			headers,
		}

		if (includeBody) {
			if (typeof body === 'string') {
				options.body = body
			} else if (body) {
				options.json = body
			}
		}

		return {
			url,
			options,
		}
	}

	initActions() {
		const urlLabel = this.config.prefix ? 'URI' : 'URL'

		this.setActionDefinitions({
			post: {
				name: 'POST',
				options: [FIELDS.Url(urlLabel), FIELDS.Body, FIELDS.Header, FIELDS.ContentType],
				callback: async (action) => {
					const { url, options } = await this.prepareQuery(action, true)

					try {
						await got.post(url, options)

						this.updateStatus(InstanceStatus.Ok)
					} catch (e) {
						this.log('error', `HTTP GET Request failed (${e.message})`)
						this.updateStatus(InstanceStatus.UnknownError, e.code)
					}
				},
			},
			get: {
				name: 'GET',
				options: [
					FIELDS.Url(urlLabel),
					FIELDS.Header,
					{
						type: 'custom-variable',
						label: 'JSON Response Data Variable',
						id: 'jsonResultDataVariable',
					},
					{
						type: 'checkbox',
						label: 'JSON Stringify Result',
						id: 'result_stringify',
						default: true,
					},
				],
				callback: async (action) => {
					const { url, options } = await this.prepareQuery(action, false)

					try {
						const response = await got.get(url, options)

						// store json result data into retrieved dedicated custom variable
						const jsonResultDataVariable = action.options.jsonResultDataVariable
						if (jsonResultDataVariable) {
							this.log('debug', `Writing result to ${jsonResultDataVariable}`)

							let resultData = response.body

							if (!action.options.result_stringify) {
								try {
									resultData = JSON.parse(resultData)
								} catch (error) {
									//error stringifying
								}
							}

							this.setCustomVariableValue(jsonResultDataVariable, resultData)
						}

						this.updateStatus(InstanceStatus.Ok)
					} catch (e) {
						this.log('error', `HTTP GET Request failed (${e.message})`)
						this.updateStatus(InstanceStatus.UnknownError, e.code)
					}
				},
			},
			put: {
				name: 'PUT',
				options: [FIELDS.Url(urlLabel), FIELDS.Body, FIELDS.Header, FIELDS.ContentType],
				callback: async (action) => {
					const { url, options } = await this.prepareQuery(action, true)

					try {
						await got.put(url, options)

						this.updateStatus(InstanceStatus.Ok)
					} catch (e) {
						this.log('error', `HTTP GET Request failed (${e.message})`)
						this.updateStatus(InstanceStatus.UnknownError, e.code)
					}
				},
			},
			patch: {
				name: 'PATCH',
				options: [FIELDS.Url(urlLabel), FIELDS.Body, FIELDS.Header, FIELDS.ContentType],
				callback: async (action) => {
					const { url, options } = await this.prepareQuery(action, true)

					try {
						await got.patch(url, options)

						this.updateStatus(InstanceStatus.Ok)
					} catch (e) {
						this.log('error', `HTTP GET Request failed (${e.message})`)
						this.updateStatus(InstanceStatus.UnknownError, e.code)
					}
				},
			},
			delete: {
				name: 'DELETE',
				options: [FIELDS.Url(urlLabel), FIELDS.Body, FIELDS.Header],
				callback: async (action) => {
					const { url, options } = await this.prepareQuery(action, true)

					try {
						await got.delete(url, options)

						this.updateStatus(InstanceStatus.Ok)
					} catch (e) {
						this.log('error', `HTTP GET Request failed (${e.message})`)
						this.updateStatus(InstanceStatus.UnknownError, e.code)
					}
				},
			},
		})
	}
}

runEntrypoint(GenericHttpInstance, upgradeScripts)
