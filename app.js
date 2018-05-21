import express from 'express';
import bodyParser from 'body-parser';
import crypto from 'crypto';
import request from 'request';

const appId = process.env.CLIENT_ID;
const appSecret = process.env.CLIENT_SECRET;
const webhookSecret = process.env.WEBHOOK_SECRET;

const watsonworkUrl = 'https://api.watsonwork.ibm.com';

const createTargetedMessage = (conversationId, targetUserId, targetDialogId) => {
  //return `mutation {createTargetedMessage(input: {conversationId: "${conversationId}", targetUserId: "${targetUserId}", targetDialogId: "${targetDialogId}", attachments: [{type: CARD, cardInput: {type: INFORMATION, informationCardInput: {title: "File it?", subtitle: "tests", text: "test message", date: "1526046506357", buttons: [{text: "Yes", payload: "yes", style: PRIMARY}]}}}]}) {successful}}`;
  return `mutation {
    createTargetedMessage(input: {
      conversationId: "${conversationId}",
      targetUserId: "${targetUserId}",
      targetDialogId: "${targetDialogId}",
      attachments: [
        {
          type: CARD,
          cardInput: {
            type: INFORMATION,
            informationCardInput: {
              title: "Card Title",
              subtitle: "Card Subtitle",
              text: "Card Text",
              date: "1526046506357",
              buttons: [
                {
                  text: "Button Text",
                  payload: "Button Payload",
                  style: PRIMARY
                }
              ]
            }
          }
        }
      ]
    }) {
      successful
    }
  }`;
}

const authenticateApp = (callback) => {
  const authenticationOptions = {
    'method': 'POST',
    'url': 'https://api.watsonwork.ibm.com/oauth/token',
    'auth': {
      'user': appId,
      'pass': appSecret
    },
    'form': {
      'grant_type': 'client_credentials'
    }
  };

  request(authenticationOptions, (err, response, body) => {
    if (response.statusCode != 200) {
      console.log('Error authentication application. Exiting.');
      process.exit(1);
    }
    callback(JSON.parse(body).access_token);
  });
};

const sendMessage = (req) => {
  const annotationPayload = JSON.parse(req.body.annotationPayload);
  const conversationId = annotationPayload.conversationId;
  const targetDialogId = annotationPayload.targetDialogId;
  const targetUserId = req.body.userId;

  const messageData = createTargetedMessage(conversationId, targetUserId, targetDialogId);
  console.log('TARGETED MESSAGE: ' + JSON.stringify(messageData));

  authenticateApp( (jwt) => {

    const sendMessageOptions = {
      'method': 'POST',
      'url': 'https://api.watsonwork.ibm.com/graphql',
      'headers': {
        'Authorization': `Bearer ${jwt}`,
        'Content-Type': 'application/graphql',
        'x-graphql-view': 'PUBLIC, BETA'
      },
      'body': messageData
    };

    request(sendMessageOptions, (err, response, body) => {
      if(response.statusCode != 200) {
        console.log('Error creating targeted message.');
        console.log(response.statusCode);
        console.log(err);
        console.log(body);
      }
    });
  });
};

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

  res.set('X-OUTBOUND-TOKEN', hashToSend);
  res.send(bodyToSend).end();
};

const validateRequest = (req, res, next) => {
  const processRequest = {
    'verification': handleVerificationRequest,
    'message-annotation-added': () => next()
  };

  console.log('TYPE: ' + JSON.stringify(req.body.type));
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

  sendMessage(req);
});

var port = process.env.PORT || 3000
app.listen(port, function() {
    console.log('To view your app, open this link in your browser: http://localhost:' + port);
});
