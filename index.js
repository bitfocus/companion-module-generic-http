import { InstanceBase, runEntrypoint, InstanceStatus } from '@companion-module/base'
import got from 'got'
import { configFields } from './config.js'
import { upgradeScripts } from './upgrade.js'

class EPowerSwitchInstance extends InstanceBase {
	configUpdated(config) {
		// Ensure we always have defaults so the instance can be 'running' immediately
		this.config = {
			prefix: '',
			hiddenPath: '/hidden.htm',
			statusPollInterval: 1000,
			...(config || {}),
		}

		this.updateStatus(InstanceStatus.Ok)

		this.initActions()
		this.initFeedbacks()
		this.initVariables()
		this.startPolling()
	}

	init(config) {
		// Ensure we always have defaults so the instance can 'run' even before user config is set
		this.config = {
			prefix: '',
			hiddenPath: '/hidden.htm',
			statusPollInterval: 1000,
			...(config || {}),
		}

		this.updateStatus(InstanceStatus.Ok)

		this.initActions()
		this.initFeedbacks()
		this.initVariables()
		this.startPolling()
	}

	// Return config fields for web config
	getConfigFields() {
		return configFields
	}

	// When module gets deleted
	async destroy() {
		this.stopPolling()
	}


	initActions() {
		this.setActionDefinitions({
			toggle_outlet_hidden: {
				name: 'ePowerSwitch: Toggle outlet (via hidden.htm)',
				description: 'Sends /hidden.htm?M0:O{n}=ON/OFF depending on current state (polled from hidden.htm)',
				options: [
					{
						type: 'dropdown',
						id: 'outlet',
						label: 'Outlet',
						width: 6,
						default: 1,
						choices: [
							{ id: 1, label: 'Outlet 1' },
							{ id: 2, label: 'Outlet 2' },
							{ id: 3, label: 'Outlet 3' },
							{ id: 4, label: 'Outlet 4' },
						],
					},
					{
						type: 'dropdown',
						id: 'mode',
						label: 'Mode',
						width: 6,
						default: 'toggle',
						choices: [
							{ id: 'toggle', label: 'Toggle (auto)' },
							{ id: 'on', label: 'Force ON' },
							{ id: 'off', label: 'Force OFF' },
						],
					},
				],
				callback: async (action) => {
					try {
						const outlet = Number(action.options.outlet ?? 1)
						const mode = String(action.options.mode ?? 'toggle')

						let cmd
						if (mode === 'on') cmd = 'ON'
						else if (mode === 'off') cmd = 'OFF'
						else cmd = this.outletStates[outlet] ? 'OFF' : 'ON'

						let base = (this.config.prefix || '').trim()
						const path = (this.config.hiddenPath || '/hidden.htm').trim()
						if (!base) {
							this.updateStatus(InstanceStatus.BadConfig, 'Base URL (prefix) is empty')
							return
						}
						if (!/^https?:\/\//i.test(base)) base = `http://${base}`

						let url = base
						if (path) {
							if (url.endsWith('/') && path.startsWith('/')) url = url.slice(0, -1)
							url = `${url}${path}`
						}

						url = `${url}?M0:O${outlet}=${cmd}`

						const res = await got.get(url, {
							throwHttpErrors: false,
							timeout: { request: 5000 },
						})

						if (res.statusCode < 200 || res.statusCode >= 300) {
							this.updateStatus(InstanceStatus.UnknownError, `HTTP ${res.statusCode}`)
							this.log('error', `Hidden toggle failed: HTTP ${res.statusCode}`)
							return
						}

						this.updateStatus(InstanceStatus.Ok)
						// Let polling update the state; optionally trigger an early refresh
						this.pollStatus().catch(() => {})
					} catch (e) {
						this.updateStatus(InstanceStatus.UnknownError, e?.message ?? String(e))
						this.log('error', `Hidden toggle error: ${e?.message ?? e}`)
					}
				},
			},
		})
	}


	pollTimer = null
	outletStates = { 1: false, 2: false, 3: false, 4: false }

	initVariables() {
		this.setVariableDefinitions([
			{ variableId: 'outlet_1', name: 'Outlet 1 (On/Off)' },
			{ variableId: 'outlet_1_cmd', name: 'Outlet 1 toggle cmd (ON/OFF)' },
			{ variableId: 'outlet_2', name: 'Outlet 2 (On/Off)' },
			{ variableId: 'outlet_2_cmd', name: 'Outlet 2 toggle cmd (ON/OFF)' },
			{ variableId: 'outlet_3', name: 'Outlet 3 (On/Off)' },
			{ variableId: 'outlet_3_cmd', name: 'Outlet 3 toggle cmd (ON/OFF)' },
			{ variableId: 'outlet_4', name: 'Outlet 4 (On/Off)' },
			{ variableId: 'outlet_4_cmd', name: 'Outlet 4 toggle cmd (ON/OFF)' },
		])
	}

	stopPolling() {
		if (this.pollTimer) {
			clearInterval(this.pollTimer)
			this.pollTimer = null
		}
	}

	startPolling() {
		this.stopPolling()

		const interval = Number(this.config.statusPollInterval ?? 1000)
		if (!interval || interval < 250) return

		// poll once immediately
		this.pollStatus().catch(() => {})

		this.pollTimer = setInterval(() => {
			this.pollStatus().catch(() => {})
		}, interval)
	}

	async pollStatus() {
		try {
			let base = (this.config.prefix || '').trim()
			const path = (this.config.hiddenPath || '/hidden.htm').trim()

			if (!base) {
				this.updateStatus(InstanceStatus.BadConfig, 'Base URL (prefix) is empty')
				return
			}

			if (!/^https?:\/\//i.test(base)) base = `http://${base}`

			let url = base
			if (path) {
				if (url.endsWith('/') && path.startsWith('/')) url = url.slice(0, -1)
				url = `${url}${path}`
			}

			const res = await got.get(url, {
				throwHttpErrors: false,
				timeout: { request: 5000 },
			})
			const body = res.body ?? ''

			if (res.statusCode < 200 || res.statusCode >= 300) {
				this.updateStatus(InstanceStatus.UnknownError, `HTTP ${res.statusCode}`)
				this.log('error', `Polling failed: HTTP ${res.statusCode}`)
				return
			}

			const re = /M0:O([1-4])=(On|Off)/g
			let m
			const next = { 1: false, 2: false, 3: false, 4: false }
			let found = 0
			while ((m = re.exec(body)) !== null) {
				const o = Number(m[1])
				next[o] = m[2] === 'On'
				found++
			}

			if (found === 0) {
				this.updateStatus(InstanceStatus.UnknownError, 'No outlet states found in hidden.htm')
				this.log('error', 'Polling succeeded but no M0:O*=On/Off lines were found')
				return
			}

			this.outletStates = next

			this.setVariableValues({
				outlet_1: next[1] ? 'On' : 'Off',
				outlet_1_cmd: next[1] ? 'OFF' : 'ON',
				outlet_2: next[2] ? 'On' : 'Off',
				outlet_2_cmd: next[2] ? 'OFF' : 'ON',
				outlet_3: next[3] ? 'On' : 'Off',
				outlet_3_cmd: next[3] ? 'OFF' : 'ON',
				outlet_4: next[4] ? 'On' : 'Off',
				outlet_4_cmd: next[4] ? 'OFF' : 'ON',
			})

			this.updateStatus(InstanceStatus.Ok)
			this.checkFeedbacks()
		} catch (e) {
			this.updateStatus(InstanceStatus.UnknownError, e?.message ?? String(e))
			this.log('error', `Polling error: ${e?.message ?? e}`)
		}
	}

	initFeedbacks() {
		this.setFeedbackDefinitions({
			outletStateFromHidden: {
				type: 'boolean',
				name: 'ePowerSwitch: Outlet ON',
				description: 'Uses shared polling of /hidden.htm and checks whether a selected outlet is ON',
				options: [
					{
						type: 'dropdown',
						id: 'outlet',
						label: 'Outlet',
						width: 6,
						default: 1,
						choices: [
							{ id: 1, label: 'Outlet 1' },
							{ id: 2, label: 'Outlet 2' },
							{ id: 3, label: 'Outlet 3' },
							{ id: 4, label: 'Outlet 4' },
						],
					},
				],
				defaultStyle: {
					bgcolor: 0x00ff00,
					color: 0x000000,
				},
				callback: async (feedback) => {
					const outlet = Number(feedback.options.outlet ?? 1)
					return this.outletStates[outlet] === true
				},
			},
		})
	}
}

runEntrypoint(EPowerSwitchInstance, upgradeScripts)
