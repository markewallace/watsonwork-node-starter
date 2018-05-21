import express from 'express';
import bodyParser from 'body-parser';
import crypto from 'crypto';

const appId = process.env.CLIENT_ID;
const appSecret = process.env.CLIENT_SECRET;
const webhookSecret = process.env.WEBHOOK_SECRET;

const respondOk = (res) => {
  res.status(200).end();
}

const handleVerificationRequest = (req, res) => {
  const bodyToSend = {
    response: req.body.challenge
  };

  // Create a HMAC-SHA256 hash of the recieved body, using the webhook secret
  // as the key, to confirm webhook endpoint.
  const hashToSend =
    crypto.createHmac('sha256', webhookSecret)
    .update(JSON.stringify(bodyToSend))
    .digest('hex');
  console.log('X-OUTBOUND-TOKEN' + hashToSend);

  res.set('X-OUTBOUND-TOKEN', hashToSend);
  res.send(bodyToSend).end();
};

const validateRequest = (req, res, next) => {
  const processRequest = {
    'verification': handleVerificationRequest,
    'message-created': () => next()
  };

  return (processRequest[req.body.type]) ?
    processRequest[req.body.type](req, res) : respondOk(res);
};

const app = express();

app.use(bodyParser.json());

app.get('/', (req, res) => {
  res.send('IBM Watson Workspace Node Starter');
});

app.post('/webhook', validateRequest, (req, res) => {
  console.log('BODY: ' + JSON.stringify(req.body));
  respondOk(res);
});

var port = process.env.PORT || 3000
app.listen(port, function() {
    console.log('To view your app, open this link in your browser: http://localhost:' + port);
});
