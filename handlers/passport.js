// handler to configure actual passport
const passport = require('passport');
const mongoose = require('mongoose');
const User = mongoose.model('User');

passport.use(User.createStrategy());

// each request, asks passport what to do with user now that they're properly logged in
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());