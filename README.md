# openid-client

![build][actions-image] [![codecov][codecov-image]][codecov-url]

openid-client is a server side [OpenID][openid-connect] Relying Party (RP, Client) implementation for
Node.js runtime, supports [passport][passport-url].

## Implemented specs & features

The following client/RP features from OpenID Connect/OAuth2.0 specifications are implemented by
openid-client.

- [OpenID Connect Core 1.0][feature-core]
  - Authorization Callback
    - Authorization Code Flow
    - Implicit Flow
    - Hybrid Flow
  - UserInfo Request
  - Fetching Distributed Claims
  - Unpacking Aggregated Claims
  - Offline Access / Refresh Token Grant
  - Client Credentials Grant
  - Client Authentication
    - none
    - client_secret_basic
    - client_secret_post
    - client_secret_jwt
    - private_key_jwt
- [RFC8414 - OAuth 2.0 Authorization Server Metadata][feature-oauth-discovery] and [OpenID Connect Discovery 1.0][feature-discovery]
  - Discovery of OpenID Provider (Issuer) Metadata
  - Discovery of OpenID Provider (Issuer) Metadata via user provided inputs (see [WebFinger](#webfinger-discovery))
- [OpenID Connect Dynamic Client Registration 1.0][feature-registration]
  - Dynamic Client Registration request
  - Client initialization via registration client uri
- [RFC7009 - OAuth 2.0 Token revocation][feature-revocation]
  - Client Authenticated request to token revocation
- [RFC7662 - OAuth 2.0 Token introspection][feature-introspection]
  - Client Authenticated request to token introspection
- [draft-ietf-oauth-mtls - OAuth 2.0 Mutual TLS Client Authentication and Certificate-Bound Access Tokens][feature-mtls]
  - Mutual TLS Client Certificate-Bound Access Tokens
  - Metadata for Mutual TLS Endpoint Aliases
  - Client Authentication
    - tls_client_auth
    - self_signed_tls_client_auth

## Certification
[<img width="184" height="96" align="right" src="https://cdn.jsdelivr.net/gh/panva/node-openid-client@38cf016b0837e6d4116de3780b28d222d5780bc9/OpenID_Certified.png" alt="OpenID Certification">][openid-certified-link]  
Filip Skokan has [certified][openid-certified-link] that [openid-client][npm-url]
conforms to the RP Basic, RP Implicit, RP Hybrid, RP Config, RP Dynamic and RP Form Post profiles
of the OpenID Connect™ protocol.


## Sponsor

[<img width="65" height="65" align="left" src="https://avatars.githubusercontent.com/u/2824157?s=75&v=4" alt="auth0-logo">][sponsor-auth0] If you want to quickly add OpenID Connect authentication to Node.js apps, feel free to check out Auth0's Node.js SDK and free plan at [auth0.com/overview][sponsor-auth0].<br><br>

## Support

If you or your business use openid-client, please consider becoming a [sponsor][support-sponsor] so I can continue maintaining it and adding new features carefree.


## Documentation

The library exposes what are essentially steps necessary to be done by a relying party consuming
OpenID Connect Authorization Server responses or wrappers around requests to its endpoints. Aside
from a generic OpenID Connect [passport][passport-url] strategy it does not expose neither express
or koa middlewares. Those can however be built using the exposed API.

- [openid-client API Documentation][documentation]
  - [Issuer][documentation-issuer]
  - [Client][documentation-client]
  - [Customizing][documentation-customizing]
  - [TokenSet][documentation-tokenset]
  - [Strategy][documentation-strategy]
  - [generators][documentation-generators]
  - [errors][documentation-errors]

## Quick start

Discover an Issuer configuration using its published .well-known endpoints
```js
const { Issuer } = require('openid-client');
Issuer.discover('https://accounts.google.com') // => Promise
  .then(function (googleIssuer) {
    console.log('Discovered issuer %s %O', googleIssuer.issuer, googleIssuer.metadata);
  });
```

### Authorization Code Flow

Authorization Code flow is for obtaining Access Tokens (and optionally Refresh Tokens) to use with
third party APIs securely as well as Refresh Tokens. In this quick start your application also uses
PKCE instead of `state` parameter for CSRF protection.

Create a Client instance for that issuer's authorization server intended for Authorization Code
flow.

**See the [documentation][documentation] for full API details.**

```js
const client = new googleIssuer.Client({
  client_id: 'zELcpfANLqY7Oqas',
  client_secret: 'TQV5U29k1gHibH5bx1layBo0OSAvAbRT3UYW3EWrSYBB5swxjVfWUa1BS8lqzxG/0v9wruMcrGadany3',
  redirect_uris: ['http://localhost:3000/cb'],
  response_types: ['code'],
  // id_token_signed_response_alg (default "RS256")
  // token_endpoint_auth_method (default "client_secret_basic")
}); // => Client
```

When you want to have your end-users authorize you need to send them to the issuer's
`authorization_endpoint`. Consult the web framework of your choice on how to redirect but here's how
to get the authorization endpoint's URL with parameters already encoded in the query to redirect
to.

```js
const { generators } = require('openid-client');
const code_verifier = generators.codeVerifier();
// store the code_verifier in your framework's session mechanism, if it is a cookie based solution
// it should be httpOnly (not readable by javascript) and encrypted.

const code_challenge = generators.codeChallenge(verifier);

client.authorizationUrl({
  scope: 'openid email profile',
  resource: 'https://my.api.example.com/resource/32178',
  code_challenge,
  code_challenge_method: 'S256',
});
```

When end-users are redirected back to your `redirect_uri` your application consumes the callback and
passes in the `code_verifier` to include it in the authorization code grant token exchange.
```js
const params = client.callbackParams(req);
client.callback('https://client.example.com/callback', params, { code_verifier }) // => Promise
  .then(function (tokenSet) {
    console.log('received and validated tokens %j', tokenSet);
    console.log('validated ID Token claims %j', tokenSet.claims());
  });
```

You can then call the `userinfo_endpoint`.
```js
client.userinfo(access_token) // => Promise
  .then(function (userinfo) {
    console.log('userinfo %j', userinfo);
  });
```

And later refresh the tokenSet if it had a `refresh_token`.
```js
client.refresh(refresh_token) // => Promise
  .then(function (tokenSet) {
    console.log('refreshed and validated tokens %j', tokenSet);
    console.log('refreshed ID Token claims %j', tokenSet.claims());
  });
```

### Implicit ID Token Flow

Implicit `response_type=id_token` flow is perfect for simply authenticating your end-users, assuming
the only job you want done is authenticating the user and then relying on your own session mechanism
with no need for accessing any third party APIs with an Access Token from the Authorization Server.

Create a Client instance for that issuer's authorization server intended for ID Token implicit flow.

**See the [documentation][documentation] for full API details.**
```js
const client = new googleIssuer.Client({
  client_id: 'zELcpfANLqY7Oqas',
  redirect_uris: ['http://localhost:3000/cb'],
  response_types: ['id_token'],
  // id_token_signed_response_alg (default "RS256")
}); // => Client
```

When you want to have your end-users authorize you need to send them to the issuer's
`authorization_endpoint`. Consult the web framework of your choice on how to redirect but here's how
to get the authorization endpoint's URL with parameters already encoded in the query to redirect
to.

```js
const { generators } = require('openid-client');
const nonce = generators.nonce();
// store the nonce in your framework's session mechanism, if it is a cookie based solution
// it should be httpOnly (not readable by javascript) and encrypted.

client.authorizationUrl({
  scope: 'openid email profile',
  response_mode: 'form_post',
  nonce,
});
```

When end-users hit back your `redirect_uri` with a POST (authorization request included `form_post`
response mode) your application consumes the callback and passes the `nonce` in to include it in the
ID Token verification steps.
```js
// assumes req.body is populated from your web framework's body parser
const params = client.callbackParams(req);
client.callback('https://client.example.com/callback', params, { nonce }) // => Promise
  .then(function (tokenSet) {
    console.log('received and validated tokens %j', tokenSet);
    console.log('validated ID Token claims %j', tokenSet.claims());
  });
```

## Electron Support

Electron v6.x runtime is supported to the extent of the crypto engine BoringSSL feature parity with
standard Node.js OpenSSL.

## FAQ

#### Semver?

**Yes.** Everything that's [documented][documentation] is subject to
[Semantic Versioning 2.0.0](https://semver.org/spec/v2.0.0.html). The rest is to be considered
private API and is subject to change between any versions.

#### How do I use it outside of Node.js

It is **only built for ^10.13.0 || >=12.0.0 Node.js** environment - including openid-client in
transpiled browser-environment targeted projects is not supported and may result in unexpected
results.

#### What's new in 3.x?

- Simplified API which consumes a lot of the common configuration issues
- New [documentation][documentation]
- Added support for mutual-TLS client authentication
- Added support for any additional token exchange parameters to support specifications such as
  Resource Indicators
- Typed [errors][documentation-errors]

#### How to make the client send client_id and client_secret in the body?

See [Client Authentication Methods][documentation-methods].


[actions-image]: https://github.com/panva/node-openid-client/workflows/Continuous%20Integration/badge.svg
[codecov-image]: https://img.shields.io/codecov/c/github/panva/node-openid-client/master.svg
[codecov-url]: https://codecov.io/gh/panva/node-openid-client
[openid-connect]: https://openid.net/connect/
[feature-core]: https://openid.net/specs/openid-connect-core-1_0.html
[feature-discovery]: https://openid.net/specs/openid-connect-discovery-1_0.html
[feature-oauth-discovery]: https://tools.ietf.org/html/rfc8414
[feature-registration]: https://openid.net/specs/openid-connect-registration-1_0.html
[feature-revocation]: https://tools.ietf.org/html/rfc7009
[feature-introspection]: https://tools.ietf.org/html/rfc7662
[feature-mtls]: https://tools.ietf.org/html/draft-ietf-oauth-mtls-14
[openid-certified-link]: https://openid.net/certification/
[passport-url]: http://passportjs.org
[npm-url]: https://www.npmjs.com/package/openid-client
[sponsor-auth0]: https://auth0.com/overview?utm_source=GHsponsor&utm_medium=GHsponsor&utm_campaign=openid-client&utm_content=auth
[support-sponsor]: https://github.com/users/panva/sponsorship
[documentation]: https://github.com/panva/node-openid-client/blob/master/docs/README.md
[documentation-issuer]: https://github.com/panva/node-openid-client/blob/master/docs/README.md#issuer
[documentation-client]: https://github.com/panva/node-openid-client/blob/master/docs/README.md#client
[documentation-customizing]: https://github.com/panva/node-openid-client/blob/master/docs/README.md#customizing
[documentation-tokenset]: https://github.com/panva/node-openid-client/blob/master/docs/README.md#tokenset
[documentation-strategy]: https://github.com/panva/node-openid-client/blob/master/docs/README.md#strategy
[documentation-errors]: https://github.com/panva/node-openid-client/blob/master/docs/README.md#errors
[documentation-generators]: https://github.com/panva/node-openid-client/blob/master/docs/README.md#generators
[documentation-methods]: https://github.com/panva/node-openid-client/blob/master/docs/README.md#client-authentication-methods
