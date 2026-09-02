## Generic HTTP Requests Module

Generic modules are only for use with custom applications. If you use this module to control a device or software on the market that more than you are using, <strong>PLEASE let us know</strong> about this software, so we can make a proper module for it. If we already support this and you use this to trigger a feature our module doesn't support, please let us know. We want Companion to be as easy as possible to use for anyone.

This module lets you send arbitrary HTTP requests (GET / POST / PUT / PATCH / DELETE) to any HTTP or HTTPS endpoint, optionally store parts of the response into custom variables, and display a remote image on a button.

---

## Configuration

These options are set once per connection in the connection's config page.

### Base URL

An optional starting URL that is prepended to the URL/URI entered in each action, e.g. `http://server.url/path/`. This is convenient when every action targets the same host.

- If an action's URL is a full URL (starts with `http://` or `https://`), the Base URL is **ignored** for that action.
- When a Base URL is set, the URL field in actions and feedbacks is labelled **URI** (the part appended to the base) rather than **URL**.

### Proxy Address

Optional. Routes all requests through an HTTP/HTTPS proxy. Include credentials in the URL if the proxy requires them, e.g. `http://username:password@proxy-server:8080`.

### Authentication

Optional credentials that are sent with every request this connection makes, including the image feedback.

- **None** (default) — no credentials are added.
- **Basic** — the username and password are sent with every request, base64 encoded but not otherwise protected. Only use this over HTTPS.
- **Digest** — [HTTP Digest access authentication](https://en.wikipedia.org/wiki/Digest_access_authentication) as defined by RFC 2617 and RFC 7616. The password itself is never sent; the module answers the server's challenge with a hash.

The password is stored in Companion's secrets store, so it is not included in configuration exports.

**How Digest behaves.** The first request to a host is sent without credentials, the server answers `401` with a challenge, and the module immediately repeats the request with an `Authorization: Digest ...` header. The challenge is then cached per host, so later requests are authenticated straight away without the extra round trip. If the server expires the nonce it simply challenges again and the module recovers on the next request.

Supported algorithms are `MD5`, `MD5-sess`, `SHA-256`, `SHA-256-sess`, `SHA-512-256` and `SHA-512-256-sess`, with `qop=auth`, `qop=auth-int` and the older qop-less RFC 2069 form. When a server offers several challenges the strongest supported one is used. The RFC 7616 `userhash` and `username*` extensions are handled as well.

If an action or feedback sets its own `Authorization` header, that header wins and no credentials are added for that request.

### Unauthorized Certificates

Controls TLS certificate validation for HTTPS requests. By default the module **rejects** invalid server certificates (expired, wrong host, untrusted root, or self-signed).

Set this to **Accept** only if you must connect to a host with a self-signed or otherwise invalid certificate. Doing so disables an important security protection, so use it at your own risk.

### HTTP Response Parser (Insecure Parser)

By default this module uses Node.js's strict HTTP parser. Some non-compliant devices return malformed responses (for example headers ending in bare `LF` instead of `CRLF`), which the strict parser rejects with errors such as `HPE_CR_EXPECTED` — meaning the response body is never returned.

Setting **HTTP Response Parser** to **Insecure / lenient** allows these malformed responses through.

> ⚠️ **Security warning.** Strict parsing protects against HTTP request smuggling and response-splitting attacks. Enabling the insecure parser disables that protection for this connection. Only use it with a fully trusted device on a trusted network, and never across the public internet or an untrusted proxy. Prefer fixing the device. Use at your own risk.

---

## Actions

All request actions share a common set of options. Not every option applies to every method (see the table below).

| Action     | Body | Header | Content Type | Response variables |
| ---------- | :--: | :----: | :----------: | :----------------: |
| **GET**    |  —   |   ✓    |      —       |         ✓          |
| **POST**   |  ✓   |   ✓    |      ✓       |         ✓          |
| **PUT**    |  ✓   |   ✓    |      ✓       |         ✓          |
| **PATCH**  |  ✓   |   ✓    |      ✓       |         ✓          |
| **DELETE** |  ✓   |   ✓    |      —       |         —          |

### Common options

- **URL / URI** — the target address. Supports variables. If a Base URL is configured, enter only the path/URI to append (unless you provide a full `http(s)://` URL, which overrides the Base URL).
- **Body** — the request payload for POST/PUT/PATCH/DELETE. Supports variables. Literal `\n` sequences in a string body are converted to real newlines. If the Content Type is `application/json` and the value is an object, it is sent as JSON.
- **Header** — extra request headers as a JSON object, e.g. `{"Authorization": "Bearer token"}`. Supports variables. Must be valid JSON or the request is aborted with an error.
- **Content Type** — sets the `Content-Type` header for methods that send a body (POST/PUT/PATCH). A range of common types is available, including `application/json`, `application/x-www-form-urlencoded`, `application/xml`, `text/plain`, `multipart/form-data`, and more.

### Storing the response

GET, POST, PUT and PATCH can write parts of the response into custom variables:

- **JSON Response Data Variable** — a custom variable to receive the response body.
- **JSON Stringify Result** — when enabled (default), the body is stored as a raw string. When disabled, the body is parsed as JSON and the resulting object is stored (useful for referencing nested fields). If parsing fails, an error is logged.
- **Response Status Code Variable** — a custom variable to receive the numeric HTTP status code (e.g. `200`, `404`).

> Note: DELETE does not expose the status-code option and does not report a non-2xx response as a connection error.

### Connection status

A request that returns a non-success status code (or fails outright) sets the connection status to an error state and logs the reason. A successful request sets the status back to OK.

---

## Feedbacks

### Image from URL

Fetches an image from a URL and displays it on the button. Options:

- **URL / URI** — the image source. Supports variables.
- **Header** — extra request headers as JSON, as above.
- **Poll Interval (ms)** — how often to re-fetch the image. Set to `0` to disable polling (the image is fetched once when the feedback is evaluated). Changing the interval restarts the poll timer.

The fetched image is scaled to fit the button. If the request fails, the error is logged and nothing is drawn.

---

## Available commands

- GET
- POST
- PUT
- PATCH
- DELETE
