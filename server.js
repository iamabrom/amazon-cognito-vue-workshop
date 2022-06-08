// init project
//const AmazonCognitoIdentity = require('amazon-cognito-identity-js');
//require('dotenv');
const express = require('express');
//const cookieParser = require('cookie-parser');
//const hbs = require('hbs');
const authn = require('./src/libs/authn');
//const helmet = require('helmet');
const app = express();
//app.use(helmet());

//app.use(cookieParser());
app.use(express.json());
app.use(express.static('public'));

app.use((req, res, next) => {
  if (req.get('x-forwarded-proto') &&
     (req.get('x-forwarded-proto')).split(',')[0] !== 'https') {
    return res.redirect(301, `https://${req.get('host')}`);
  }
  req.schema = 'https';
  next();
});

app.use('/authn', authn);

// listen for req :)
const port = 8081;
const listener = app.listen(port, () => {
  console.log('Your app is listening on port ' + listener.address().port);
});
