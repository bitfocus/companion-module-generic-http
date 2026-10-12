import crypto from 'node:crypto'

/**
 * Digest algorithms from RFC 2617 / RFC 7616, mapped to their node crypto hash name.
 * Ordered strongest first; that order decides which challenge to answer when a server
 * offers several.
 */
const ALGORITHMS = [
	{ name: 'SHA-512-256-sess', hash: 'sha512-256', sess: true },
	{ name: 'SHA-512-256', hash: 'sha512-256', sess: false },
	{ name: 'SHA-256-sess', hash: 'sha256', sess: true },
	{ name: 'SHA-256', hash: 'sha256', sess: false },
	{ name: 'MD5-sess', hash: 'md5', sess: true },
	{ name: 'MD5', hash: 'md5', sess: false },
]

function findAlgorithm(name) {
	const wanted = (name || 'MD5').trim().toLowerCase()
	return ALGORITHMS.find((a) => a.name.toLowerCase() === wanted)
}

/**
 * Split a header value on commas which are not inside a quoted string.
 * @param {string} value
 * @returns {string[]}
 */
function splitOutsideQuotes(value) {
	const parts = []
	let current = ''
	let inQuotes = false

	for (let i = 0; i < value.length; i++) {
		const char = value[i]

		if (inQuotes) {
			if (char === '\\' && i + 1 < value.length) {
				current += char + value[++i]
				continue
			}
			if (char === '"') inQuotes = false
			current += char
		} else if (char === '"') {
			inQuotes = true
			current += char
		} else if (char === ',') {
			parts.push(current)
			current = ''
		} else {
			current += char
		}
	}

	parts.push(current)
	return parts
}

function unquote(value) {
	const trimmed = value.trim()
	if (trimmed.length >= 2 && trimmed.startsWith('"') && trimmed.endsWith('"')) {
		return trimmed.slice(1, -1).replace(/\\(.)/g, '$1')
	}
	return trimmed
}

const TOKEN = `[A-Za-z0-9!#$%&'*+\\-.^_\`|~]+`
const SCHEME_AND_PARAM = new RegExp(`^(${TOKEN})[ \\t]+(${TOKEN})[ \\t]*=[ \\t]*([\\s\\S]*)$`)
const PARAM_ONLY = new RegExp(`^(${TOKEN})[ \\t]*=[ \\t]*([\\s\\S]*)$`)
const SCHEME_ONLY = new RegExp(`^(${TOKEN})[ \\t]*([\\s\\S]*)$`)

/**
 * Parse a `WWW-Authenticate` header into its challenges.
 *
 * The header may hold several challenges (`Digest ..., Basic ...`) and each challenge holds
 * comma separated parameters, so the two are only tellable apart by looking for a scheme name
 * in front of a parameter.
 *
 * @param {string | string[] | undefined} header
 * @returns {Array<{scheme: string, params: Record<string, string>}>}
 */
export function parseWwwAuthenticate(header) {
	if (!header) return []

	const raw = Array.isArray(header) ? header.join(', ') : String(header)
	const challenges = []
	let current = null

	for (const rawPart of splitOutsideQuotes(raw)) {
		const part = rawPart.trim()
		if (!part) continue

		const schemeAndParam = SCHEME_AND_PARAM.exec(part)
		if (schemeAndParam) {
			current = { scheme: schemeAndParam[1], params: {} }
			current.params[schemeAndParam[2].toLowerCase()] = unquote(schemeAndParam[3])
			challenges.push(current)
			continue
		}

		const paramOnly = PARAM_ONLY.exec(part)
		if (paramOnly && current) {
			current.params[paramOnly[1].toLowerCase()] = unquote(paramOnly[2])
			continue
		}

		// A scheme with no parameters, or with a single base64 token (e.g. `Negotiate`)
		const schemeOnly = SCHEME_ONLY.exec(part)
		if (schemeOnly) {
			current = { scheme: schemeOnly[1], params: {} }
			challenges.push(current)
		}
	}

	return challenges
}

/**
 * Pick the Digest challenge we can answer best, or null if there is none.
 * @param {Array<{scheme: string, params: Record<string, string>}>} challenges
 */
export function pickDigestChallenge(challenges) {
	const digestChallenges = challenges.filter(
		(c) => c.scheme.toLowerCase() === 'digest' && findAlgorithm(c.params.algorithm),
	)
	if (digestChallenges.length === 0) return null

	digestChallenges.sort((a, b) => {
		const indexOf = (c) => ALGORITHMS.indexOf(findAlgorithm(c.params.algorithm))
		return indexOf(a) - indexOf(b)
	})

	return digestChallenges[0]
}

function quoted(value) {
	return `"${String(value).replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`
}

/**
 * Build the value of an `Authorization: Digest ...` header.
 *
 * @param {object} args
 * @param {{params: Record<string, string>}} args.challenge The challenge sent by the server
 * @param {string} args.username
 * @param {string} args.password
 * @param {string} args.method HTTP method, uppercase
 * @param {string} args.uri The request target, i.e. path + query string
 * @param {number} args.nc Nonce count, starting at 1 for each new server nonce
 * @param {string} args.cnonce Client nonce
 * @param {string | Buffer} [args.body] Only used when the server insists on `qop=auth-int`
 * @returns {string}
 */
export function buildDigestAuthorization({ challenge, username, password, method, uri, nc, cnonce, body }) {
	const params = challenge.params
	const algorithm = findAlgorithm(params.algorithm)
	if (!algorithm) throw new Error(`Unsupported digest algorithm "${params.algorithm}"`)

	const hash = (value) => crypto.createHash(algorithm.hash).update(value).digest('hex')

	const realm = params.realm ?? ''
	const nonce = params.nonce ?? ''

	// Prefer plain `auth`: `auth-int` additionally hashes the body, which some servers get wrong.
	const offeredQop = (params.qop ?? '')
		.split(',')
		.map((q) => q.trim().toLowerCase())
		.filter(Boolean)
	const qop = offeredQop.includes('auth') ? 'auth' : offeredQop.includes('auth-int') ? 'auth-int' : undefined

	let ha1 = hash(`${username}:${realm}:${password}`)
	if (algorithm.sess) {
		ha1 = hash(`${ha1}:${nonce}:${cnonce}`)
	}

	const ha2 = qop === 'auth-int' ? hash(`${method}:${uri}:${hash(body ?? '')}`) : hash(`${method}:${uri}`)

	const ncValue = nc.toString(16).padStart(8, '0')
	const response = qop ? hash(`${ha1}:${nonce}:${ncValue}:${cnonce}:${qop}:${ha2}`) : hash(`${ha1}:${nonce}:${ha2}`)

	// RFC 7616: the server may ask for the username to be hashed, or for a non-ASCII username
	// to be sent percent encoded in the `username*` parameter instead.
	const fields = []
	if (params.userhash === 'true') {
		fields.push(`username=${quoted(hash(`${username}:${realm}`))}`, 'userhash=true')
	} else if (/^[\x20-\x7e]*$/.test(username)) {
		fields.push(`username=${quoted(username)}`)
	} else {
		fields.push(`username*=UTF-8''${encodeURIComponent(username)}`)
	}

	fields.push(`realm=${quoted(realm)}`, `nonce=${quoted(nonce)}`, `uri=${quoted(uri)}`)

	if (params.algorithm) fields.push(`algorithm=${params.algorithm}`)
	if (qop) fields.push(`qop=${qop}`, `nc=${ncValue}`, `cnonce=${quoted(cnonce)}`)

	fields.push(`response=${quoted(response)}`)

	if (params.opaque !== undefined) fields.push(`opaque=${quoted(params.opaque)}`)

	return `Digest ${fields.join(', ')}`
}

function hasAuthorizationHeader(headers) {
	return Object.keys(headers ?? {}).some((key) => key.toLowerCase() === 'authorization')
}

function requestTarget(url) {
	if (!url) return '/'
	const parsed = url instanceof URL ? url : new URL(String(url))
	return `${parsed.pathname}${parsed.search}`
}

function bodyForAuthInt(options) {
	if (typeof options.body === 'string' || Buffer.isBuffer(options.body)) return options.body
	if (options.json !== undefined) return JSON.stringify(options.json)
	return ''
}

/**
 * Digest access authentication (RFC 2617 / RFC 7616) for got.
 *
 * Servers answer an unauthenticated request with `401` and a challenge, which we answer by
 * retrying the request with an `Authorization` header. The challenge is cached per origin so
 * that later requests can be authenticated straight away without the extra round trip.
 */
export class DigestAuth {
	/** @type {Map<string, {challenge: object, nc: number}>} */
	#sessions = new Map()

	/** Forget every cached challenge, e.g. because the credentials changed. */
	reset() {
		this.#sessions.clear()
	}

	/**
	 * Install the got hooks which perform digest authentication on a request.
	 *
	 * @param {object} options A got options object, as built by `prepareQuery`
	 * @param {string} username
	 * @param {string} password
	 */
	applyToOptions(options, username, password) {
		// A hand written Authorization header in the action always wins over the config
		if (hasAuthorizationHeader(options.headers)) return

		options.hooks = {
			beforeRequest: [(requestOptions) => this.#authenticateFromCache(requestOptions, username, password)],
			afterResponse: [
				(response, retryWithMergedOptions) =>
					this.#answerChallenge(response, retryWithMergedOptions, username, password),
			],
		}
	}

	#authorizationFor(origin, challenge, options, username, password) {
		const session = this.#sessions.get(origin)
		const nc = session && session.challenge.params.nonce === challenge.params.nonce ? session.nc + 1 : 1
		this.#sessions.set(origin, { challenge, nc })

		return buildDigestAuthorization({
			challenge,
			username,
			password,
			method: String(options.method ?? 'GET').toUpperCase(),
			uri: requestTarget(options.url),
			nc,
			cnonce: crypto.randomBytes(16).toString('hex'),
			body: bodyForAuthInt(options),
		})
	}

	#authenticateFromCache(options, username, password) {
		if (hasAuthorizationHeader(options.headers)) return

		const url = options.url instanceof URL ? options.url : undefined
		if (!url) return

		const session = this.#sessions.get(url.origin)
		if (!session) return

		try {
			options.headers.authorization = this.#authorizationFor(url.origin, session.challenge, options, username, password)
		} catch {
			// Unusable cached challenge; drop it and let the 401 handler start over
			this.#sessions.delete(url.origin)
		}
	}

	async #answerChallenge(response, retryWithMergedOptions, username, password) {
		if (response.statusCode !== 401) return response

		const challenge = pickDigestChallenge(parseWwwAuthenticate(response.headers['www-authenticate']))
		if (!challenge) return response

		const options = response.request.options
		const url = options.url instanceof URL ? options.url : new URL(String(options.url))

		// got drops this hook once we retry, so this can only happen once per request
		const authorization = this.#authorizationFor(url.origin, challenge, options, username, password)

		return retryWithMergedOptions({ headers: { authorization } })
	}
}
