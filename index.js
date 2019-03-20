'use strict';

const createApplication = require('./server');
const simpleOauthModule = require('..');
const request = require('request');

createApplication(({ app, callbackUrl }) => {
  const oauth2 = simpleOauthModule.create({
    client: {
      id: 'client2.id',
      secret: 'client2.Secret',
    },
    auth: {
      tokenHost: 'http://localhost:8080',
      tokenPath: '/oauth2/token',
      authorizePath: '/oauth2/authorization',
    },
  });

  // Authorization uri definition
  const authorizationUri = oauth2.authorizationCode.authorizeURL({
    redirect_uri: 'http://localhost:3000/callback',
    scope: '',
    state: '3(#0/!~',
  });

  // Initial page redirecting to Github
  app.get('/auth', (req, res) => {
    console.log(authorizationUri);
    res.redirect(authorizationUri);
  });

  // Callback service parsing the authorization token and asking for the access token
  app.get('/callback', async (req, res) => {
    const code = req.query.code;
    const options = {
      code,
    };

    try {
      const result = await oauth2.authorizationCode.getToken(options);

      console.log('The resulting token: ', result.access_token);

      const token = oauth2.accessToken.create(result);

      request.get(
        {
          uri: 'http://localhost:8080/oauth2/secure',
          timeout: 15 * 1000,
          rejectUnauthorized: false,
          maxAttempts: 3,
          retryDelay: 2000,
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${result.access_token}`,
          },
          json: true,
        },
        (error, response, body) => {
          if (error) {
            console.log('error', error);
            return res.status(500).json('Authentication failed');
          }
          const obj = { profile_response: body, oauth_response: result };
          console.log('completeInfo response ok, ', body);
          return res.status(200).json(obj);
        }
      );
    } catch (error) {
      console.error('Access Token Error', error.message);
      return res.status(500).json('Authentication failed');
    }
  });

  app.get('/', (req, res) => {
    res.send('Bienvenido <br><a href="/auth">Log in con Seguros Falabella</a>');
  });
});
