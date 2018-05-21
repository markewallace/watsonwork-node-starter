import express from 'express';
import bodyParser from 'body-parser';

const app = express();

app.use(bodyParser.json());

app.get('/', (req, res) => {
  res.send('IBM Watson Workspace Node Starter');
});

var port = process.env.PORT || 3000
app.listen(port, function() {
    console.log('To view your app, open this link in your browser: http://localhost:' + port);
});
