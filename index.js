import { InstanceBase, runEntrypoint, InstanceStatus } from '@companion-module/base'
import got from 'got'
import { HttpProxyAgent, HttpsProxyAgent } from 'hpagent'
import { configFields } from './config.js'
import { upgradeScripts } from './upgrade.js'
import { FIELDS } from './fields.js'
import JimpRaw from 'jimp'

// Webpack makes a mess..
const Jimp = JimpRaw.default || JimpRaw

class GenericHttpInstance extends InstanceBase {
	configUpdated(config) {
		this.config = config

		this.initActions()
		this.initFeedbacks()
	}

	init(config) {
		this.config = config

		this.updateStatus(InstanceStatus.Ok)

		this.initActions()
		this.initFeedbacks()
	}

	// Return config fields for web config
	getConfigFields() {
		return configFields
	}

	// When module gets deleted
	async destroy() {
		// Stop any running feedback timers
		for (const timer of Object.values(this.feedbackTimers)) {
			clearInterval(timer)
		}
	}

	async prepareQuery(context, action, includeBody) {
		let url = await context.parseVariablesInString(action.options.url || '')
		if (url.substring(0, 4) !== 'http') {
			if (this.config.prefix && this.config.prefix.length > 0) {
				url = `${this.config.prefix}${url.trim()}`
			}
		}

		let body = {}
		if (includeBody && action.options.body && action.options.body.trim() !== '') {
			body = await context.parseVariablesInString(action.options.body || '')

			if (action.options.contenttype === 'application/json') {
				//only parse the body if we are explicitly sending application/json
				try {
					body = JSON.parse(body)
				} catch (e) {
					this.log('error', `HTTP ${action.actionId.toUpperCase()} Request aborted: Malformed JSON Body (${e.message})`)
					this.updateStatus(InstanceStatus.UnknownError, e.message)
					return
				}
			}
		}

		let headers = {}
		if (action.options.header.trim() !== '') {
			const headersStr = await context.parseVariablesInString(action.options.header || '')

			try {
				headers = JSON.parse(headersStr)
			} catch (e) {
				this.log('error', `HTTP ${action.actionId.toUpperCase()} Request aborted: Malformed JSON Header (${e.message})`)
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
				body = body.replace(/\\n/g, '\n')
				options.body = body
			} else if (body) {
				options.json = body
			}
		}

		if(this.config.proxyAddress && this.config.proxyAddress.length > 0) {
			options.agent = {
				http: new HttpProxyAgent({
					proxy: this.config.proxyAddress
				}),
				https: new HttpsProxyAgent({
					proxy: this.config.proxyAddress
				})
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
				options: [FIELDS.Url(urlLabel),
					  FIELDS.Body,
					  FIELDS.Header,
					  FIELDS.ContentType,
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
					}
				],
				callback: async (action, context) => {
					const { url, options } = await this.prepareQuery(context, action, true)

					try {
						const response = await got.post(url, options)

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
						this.log('error', `HTTP POST Request failed (${e.message})`)
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
				callback: async (action, context) => {
					const { url, options } = await this.prepareQuery(context, action, false)

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
				callback: async (action, context) => {
					const { url, options } = await this.prepareQuery(context, action, true)

					try {
						await got.put(url, options)

						this.updateStatus(InstanceStatus.Ok)
					} catch (e) {
						this.log('error', `HTTP PUT Request failed (${e.message})`)
						this.updateStatus(InstanceStatus.UnknownError, e.code)
					}
				},
			},
			patch: {
				name: 'PATCH',
				options: [FIELDS.Url(urlLabel), FIELDS.Body, FIELDS.Header, FIELDS.ContentType],
				callback: async (action, context) => {
					const { url, options } = await this.prepareQuery(context, action, true)

					try {
						await got.patch(url, options)

						this.updateStatus(InstanceStatus.Ok)
					} catch (e) {
						this.log('error', `HTTP PATCH Request failed (${e.message})`)
						this.updateStatus(InstanceStatus.UnknownError, e.code)
					}
				},
			},
			delete: {
				name: 'DELETE',
				options: [FIELDS.Url(urlLabel), FIELDS.Body, FIELDS.Header],
				callback: async (action, context) => {
					const { url, options } = await this.prepareQuery(context, action, true)

					try {
						await got.delete(url, options)

						this.updateStatus(InstanceStatus.Ok)
					} catch (e) {
						this.log('error', `HTTP DELETE Request failed (${e.message})`)
						this.updateStatus(InstanceStatus.UnknownError, e.code)
					}
				},
			},
		})
	}

	feedbackTimers = {}

	initFeedbacks() {
		const urlLabel = this.config.prefix ? 'URI' : 'URL'

		this.setFeedbackDefinitions({
			imageFromUrl: {
				type: 'advanced',
				name: 'Image from URL',
				options: [FIELDS.Url(urlLabel), FIELDS.Header, FIELDS.PollInterval],
				subscribe: (feedback) => {
					// Ensure existing timer is cleared
					if (this.feedbackTimers[feedback.id]) {
						clearInterval(this.feedbackTimers[feedback.id])
						delete this.feedbackTimers[feedback.id]
					}

					// Start new timer if needed
					if (feedback.options.interval) {
						this.feedbackTimers[feedback.id] = setInterval(() => {
							this.checkFeedbacksById(feedback.id)
						}, feedback.options.interval)
					}
				},
				unsubscribe: (feedback) => {
					// Ensure timer is cleared
					if (this.feedbackTimers[feedback.id]) {
						clearInterval(this.feedbackTimers[feedback.id])
						delete this.feedbackTimers[feedback.id]
					}
				},
				callback: async (feedback, context) => {
					try {
						const { url, options } = await this.prepareQuery(context, feedback, false)

						const res = await got.get(url, options)

						// Scale image to a sensible size
						const img = await Jimp.read(res.rawBody)
						const png64 = await img
							.scaleToFit(feedback.image?.width ?? 72, feedback.image?.height ?? 72)
							.getBase64Async('image/png')

						return {
							png64,
						}
					} catch (e) {
						// Image failed to load so log it and output nothing
						this.log('error', `Failed to fetch image: ${e}`)
						return {}
					}
				},
			},
		})
	}
}

runEntrypoint(GenericHttpInstance, upgradeScripts)
