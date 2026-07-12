## Generic HTTP Requests Module

Generic modules are only for use with custom applications. If you use this module to control a device or software on the market that more than you are using, <strong>PLEASE let us know</strong> about this software, so we can make a proper module for it. If we already support this and you use this to trigger a feature our module doesn't support, please let us know. We want Companion to be as easy as possible to use for anyone.

**Available commands**

- POST
- GET
- PUT
- PATCH
- DELETE

### HTTP Response Parser (Insecure Parser)

By default this module uses Node.js's strict HTTP parser. Some non-compliant
devices return malformed responses (for example headers ending in bare `LF`
instead of `CRLF`), which the strict parser rejects with errors such as
`HPE_CR_EXPECTED` — meaning the response body is never returned.

Setting **HTTP Response Parser** to **Insecure / lenient** forwards Node's
`insecureHTTPParser` option, allowing these malformed responses through.

> ⚠️ **Security warning.** Strict parsing protects against HTTP request
> smuggling and response-splitting attacks. Enabling the insecure parser
> disables that protection for this connection. Only use it with a fully
> trusted device on a trusted network, and never across the public internet or
> an untrusted proxy. Prefer fixing the device. Use at your own risk.
