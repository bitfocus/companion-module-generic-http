import test from 'node:test'
import assert from 'node:assert/strict'
import GenericHttpInstance from '../src/index.js'

/**
 * Build a bare instance without running InstanceBase's constructor, so that
 * processResponse can be exercised in isolation.
 */
function makeInstance() {
	const self = Object.create(GenericHttpInstance.prototype)
	self.logs = []
	self.log = (level, message) => self.logs.push({ level, message })
	self.updateStatus = () => {}
	return self
}

function makeContext() {
	const writes = []
	return {
		writes,
		setCustomVariableValue: (name, value) => writes.push({ name, value }),
	}
}

const okResponse = { ok: true, statusCode: 200, statusMessage: 'OK', body: '{"a":1}' }

test('does not write any custom variable when both response variable options are unset', () => {
	const instance = makeInstance()
	const context = makeContext()

	instance.processResponse(context, { actionId: 'get', options: {} }, okResponse)

	assert.deepEqual(context.writes, [])
	assert.equal(
		instance.logs.some((l) => l.level === 'error'),
		false,
		'no errors should be logged when no result variable is configured',
	)
})

test('does not write a variable literally named "undefined"', () => {
	const instance = makeInstance()
	const context = makeContext()

	instance.processResponse(
		context,
		{ actionId: 'post', options: { statusCodeVariable: undefined, jsonResultDataVariable: undefined } },
		okResponse,
	)

	assert.equal(
		context.writes.some((w) => w.name === 'undefined' || w.name === undefined),
		false,
	)
	assert.deepEqual(context.writes, [])
})

test('empty string options are treated as unset', () => {
	const instance = makeInstance()
	const context = makeContext()

	instance.processResponse(
		context,
		{ actionId: 'put', options: { statusCodeVariable: '', jsonResultDataVariable: '' } },
		okResponse,
	)

	assert.deepEqual(context.writes, [])
})

test('writes the status code when a status code variable is configured', () => {
	const instance = makeInstance()
	const context = makeContext()

	instance.processResponse(context, { actionId: 'get', options: { statusCodeVariable: 'my_status' } }, okResponse)

	assert.deepEqual(context.writes, [{ name: 'my_status', value: 200 }])
})

test('writes parsed json result data when a result variable is configured', () => {
	const instance = makeInstance()
	const context = makeContext()

	instance.processResponse(context, { actionId: 'get', options: { jsonResultDataVariable: 'my_result' } }, okResponse)

	assert.deepEqual(context.writes, [{ name: 'my_result', value: { a: 1 } }])
})

test('writes the raw body when stringify is enabled', () => {
	const instance = makeInstance()
	const context = makeContext()

	instance.processResponse(
		context,
		{ actionId: 'get', options: { jsonResultDataVariable: 'my_result', result_stringify: true } },
		okResponse,
	)

	assert.deepEqual(context.writes, [{ name: 'my_result', value: '{"a":1}' }])
})

test('does not attempt to parse the body when no result variable is configured (issue #110 third error)', () => {
	const instance = makeInstance()
	const context = makeContext()

	// "Store result as text" unchecked + a non-JSON body: previously this reached
	// JSON.parse via the truthy "undefined" variable name and logged a parse error.
	instance.processResponse(
		context,
		{ actionId: 'get', options: { result_stringify: false } },
		{ ok: true, statusCode: 200, statusMessage: 'OK', body: 'not json' },
	)

	assert.deepEqual(context.writes, [])
	assert.deepEqual(
		instance.logs.filter((l) => l.level === 'error'),
		[],
	)
})

test('warns but still writes the raw body when the response is not JSON', () => {
	const instance = makeInstance()
	const context = makeContext()

	instance.processResponse(
		context,
		{ actionId: 'get', options: { jsonResultDataVariable: 'my_result', result_stringify: false } },
		{ ok: true, statusCode: 200, statusMessage: 'OK', body: 'not json' },
	)

	// Non-fatal: the raw body is still stored, so this must not be logged as an error.
	assert.deepEqual(context.writes, [{ name: 'my_result', value: 'not json' }])
	assert.deepEqual(
		instance.logs.filter((l) => l.level === 'error'),
		[],
	)
	const warnings = instance.logs.filter((l) => l.level === 'warn')
	assert.equal(warnings.length, 1)
	assert.match(warnings[0].message, /storing it as text/)
})
