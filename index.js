import { InstanceBase, runEntrypoint, InstanceStatus } from '@companion-module/base'
import got from 'got'
import { HttpProxyAgent, HttpsProxyAgent } from 'hpagent'
import { configFields } from './config.js'
import { upgradeScripts } from './upgrade.js'
import { FIELDS } from './fields.js'
import { ImageTransformer } from '@julusian/image-rs'

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
		if (includeBody && action.options.body !== undefined && action.options.body !== null) {
			// Handle the body value - it could be a string, boolean, number, etc.
			let bodyValue = action.options.body
			
			// If it's a string, parse variables and check if it's empty
			if (typeof bodyValue === 'string') {
				bodyValue = await context.parseVariablesInString(bodyValue || '')
				if (bodyValue.trim() === '') {
					bodyValue = undefined
				}
			} else {
				try {
					bodyValue = await context.parseVariablesInString(bodyValue)
				} catch (e) {
					// If parsing fails, use the original value
					bodyValue = action.options.body
				}
			}

			if (bodyValue !== undefined && bodyValue !== null) {
				
				if (action.options.contenttype === 'application/json') {
					// For JSON content type, handle different input types
					if (typeof bodyValue === 'string') {
						// If it's a string, try to parse it as JSON
						try {
							body = JSON.parse(bodyValue)
						} catch (e) {
							this.log('error', `HTTP ${action.actionId.toUpperCase()} Request aborted: Malformed JSON Body (${e.message})`)
							this.updateStatus(InstanceStatus.UnknownError, e.message)
							return
						}
					} else {
						// If it's already a non-string value (boolean, number, object, array), use it directly
						body = bodyValue
					}
				} else {
					// For non-JSON content types, convert to string
					body = String(bodyValue)
				}
			}
		}

		let headers = {}
		if (action.options.header !== undefined && action.options.header !== null) {
			// Handle the header value - it could be a string, boolean, number, etc.
			let headerValue = action.options.header
			
			// If it's a string, parse variables and check if it's empty
			if (typeof headerValue === 'string') {
				headerValue = await context.parseVariablesInString(headerValue || '')
				if (headerValue.trim() === '') {
					headerValue = undefined
				}
			} else {
				// For non-string values, parse variables if possible
				try {
					headerValue = await context.parseVariablesInString(headerValue)
				} catch (e) {
					// If parsing fails, use the original value
					headerValue = action.options.header
				}
			}

			if (headerValue !== undefined && headerValue !== null) {
				try {
					headers = JSON.parse(headerValue)
				} catch (e) {
					this.log('error', `HTTP ${action.actionId.toUpperCase()} Request aborted: Malformed JSON Header (${e.message})`)
					this.updateStatus(InstanceStatus.UnknownError, e.message)
					return
				}
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
			} else if (body !== undefined && body !== null) {
				if (action.options.contenttype === 'application/json') {
					options.json = body
				} else {
					options.body = String(body)
				}
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

	processResponse(action, response) {
		// store JSON result data into retrieved dedicated custom variable
		const jsonResultDataVariable = action.options.jsonResultDataVariable
		if (jsonResultDataVariable) {
			this.log('debug', `Writing result body to ${jsonResultDataVariable}`)

			let resultData = response.body

			if (!action.options.result_stringify) {
				try {
					resultData = JSON.parse(resultData)
				} catch (e) {
					//error stringifying
					this.log('error', `HTTP ${action.actionId.toUpperCase()} Response: Failed to parse JSON result data (${e.message})`)
				}
			}

			this.setCustomVariableValue(jsonResultDataVariable, resultData)
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
					  FIELDS.JsonResponseVariable,
					  FIELDS.JsonStringify,
				],
				callback: async (action, context) => {
					const { url, options } = await this.prepareQuery(context, action, true)

					try {
						const response = await got.post(url, {...options, hooks: {beforeRequest: [
							(options) => {
								console.log('=BEFORE REQUEST=', options)
							}
						]}})

						this.processResponse(action, response)

						this.updateStatus(InstanceStatus.Ok)
					} catch (e) {
						this.log('error', `HTTP POST Request failed (${e.message})`)
						this.updateStatus(InstanceStatus.UnknownError, e.code)
					}
				},
			},
			get: {
				name: 'GET',
				options: [FIELDS.Url(urlLabel),
					  FIELDS.Header,
					  FIELDS.JsonResponseVariable,
					  FIELDS.JsonStringify,
				],
				callback: async (action, context) => {
					const { url, options } = await this.prepareQuery(context, action, false)

					try {
						const response = await got.get(url, options)

						this.processResponse(action, response)

						this.updateStatus(InstanceStatus.Ok)
					} catch (e) {
						this.log('error', `HTTP GET Request failed (${e.message})`)
						this.updateStatus(InstanceStatus.UnknownError, e.code)
					}
				},
			},
			put: {
				name: 'PUT',
				options: [FIELDS.Url(urlLabel),
					  FIELDS.Body,
					  FIELDS.Header,
					  FIELDS.ContentType,
					  FIELDS.JsonResponseVariable,
					  FIELDS.JsonStringify,
				],
				callback: async (action, context) => {
					const { url, options } = await this.prepareQuery(context, action, true)

					try {
						const response = await got.put(url, options)

						this.processResponse(action, response)

						this.updateStatus(InstanceStatus.Ok)
					} catch (e) {
						this.log('error', `HTTP PUT Request failed (${e.message})`)
						this.updateStatus(InstanceStatus.UnknownError, e.code)
					}
				},
			},
			patch: {
				name: 'PATCH',
				options: [FIELDS.Url(urlLabel),
					  FIELDS.Body,
					  FIELDS.Header,
					  FIELDS.ContentType,
					  FIELDS.JsonResponseVariable,
					  FIELDS.JsonStringify,
				],
				callback: async (action, context) => {
					const { url, options } = await this.prepareQuery(context, action, true)

					try {
						const response = await got.patch(url, options)

						this.processResponse(action, response)

						this.updateStatus(InstanceStatus.Ok)
					} catch (e) {
						this.log('error', `HTTP PATCH Request failed (${e.message})`)
						this.updateStatus(InstanceStatus.UnknownError, e.code)
					}
				},
			},
			delete: {
				name: 'DELETE',
				options: [FIELDS.Url(urlLabel),
					  FIELDS.Body,
					  FIELDS.Header,
					  FIELDS.JsonResponseVariable,
					  FIELDS.JsonStringify,
				],

				callback: async (action, context) => {
					const { url, options } = await this.prepareQuery(context, action, true)

					try {
						const response = await got.delete(url, options)

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
						const png64 = await ImageTransformer.fromEncodedImage(res.rawBody)
							.scale(feedback.image?.width ?? 72, feedback.image?.height ?? 72, 'Fit')
							.toDataUrl('png')

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
