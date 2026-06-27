require('dotenv').config();
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
var session = require('express-session');
var MySQLStore = require('express-mysql-session')(session);

var indexRouter = require('./routes/index');
const dashboardRouter = require('./routes/dashboard');
const apiRouter = require('./routes/api');
const surveyMitraRouter = require('./routes/surveyMitra');
const { notFoundHandler, errorHandler } = require('./middlewares/error');

var app = express();


app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

app.use(logger('dev'));
app.use((req, res, next) => {
  const fs = require('fs');
  console.log('[REQ START]', req.method, req.url);
  fs.appendFileSync('requests.log', `[REQ START] ${req.method} ${req.url}\n`);
  res.on('finish', () => {
    console.log('[REQ FINISH]', req.method, req.url);
    fs.appendFileSync('requests.log', `[REQ FINISH] ${req.method} ${req.url}\n`);
  });
  next();
});
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));


const sessionStore = new MySQLStore({
  host: process.env.DB_HOST || '127.0.0.1',
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'facultyware',
});

app.use(session({
  key: 'session_cookie_name',
  secret: process.env.SESSION_SECRET || 'secret',
  store: sessionStore,
  resave: false,
  saveUninitialized: false,
  cookie: {
    maxAge: 1000 * 60 * 60 * 24 
  }
}));

app.use('/', indexRouter);
app.use('/admin', dashboardRouter);
app.use('/api', apiRouter);
app.use('/survey-mitra', surveyMitraRouter);


app.use(notFoundHandler);


app.use(errorHandler);

module.exports = app;
