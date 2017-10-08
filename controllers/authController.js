const passport = require('passport');
const crypto = require('crypto'); // built in node - provides crypto strings
const mongoose = require('mongoose');
const User = mongoose.model('User');
const promisify = require('es6-promisify');
const mail = require('../handlers/mail');

// passport strategy
exports.login = passport.authenticate('local', {
  failureRedirect: '/login', // if fail, where to go
  failureFlash: 'Failed Login!', // if fail, what to flash
  successRedirect: '/', // if success, where to go
  successFlash: 'You are now logged in!' // if success, what to flash
});

exports.logout = (req, res) => {
  req.logout();
  req.flash('success', 'You are now logged out! 😀');
  res.redirect('/');
};

// creating middleware to check if user is logged in
exports.isLoggedIn = (req, res, next) => {
  // first check if user is authenticated
  if (req.isAuthenticated()) { // passport method
    next(); // carry on! they are logged in
    return;
  }
  req.flash('error', 'Yo, you have to be logged in! 😡');
  res.redirect('/login');
}

exports.forgot = async (req, res) => {
  // 1. see if a user with that email exists
  const user = await User.findOne({ email: req.body.email });
  if (!user) {
    /*
    * security issue: if someone with a large email list wanted to
    * find out if [...] emails signed up on this site, this error would tell
    * them which were valid emails
    *
    * Could change the error message if it's not critical to security/privacy
    */
    req.flash('error', 'No account with that email exists');
    res.redirect('/login');
  }
  // 2. set reset tokens and expiry on their account
  // .resetPassword[Token, Expires] don't exist on our Schema, so we have
  // to go create them (at time of developing) DONE
  user.resetPasswordToken = crypto.randomBytes(20).toString('hex');
  user.resetPasswordExpires = Date.now() + 3600000; // 1 hour from now
  await user.save();
  // 3. Send them an email with the token
  // req.headers.host = domain name site is running at (localhost, as well)
  const resetURL = `http://${req.headers.host}/account/reset/${user.resetPasswordToken}`;
  await mail.send({
    user,
    subject: 'Password reset',
    resetURL,
    filename: 'password-reset'
  });
  req.flash('success', 'You have been emailed a password reset link!');
  // 4. Redirect to login page after token sent
  res.redirect('/login');
}

exports.reset = async (req, res) => {
  // A: is there someone with this token
  const user = await User.findOne({
    resetPasswordToken: req.params.token,
    resetPasswordExpires: { $gt: Date.now() } // $gt = mongoDB for greater than
  });
  // B: if there isn't someone with this token or token expired
  if (!user) {
    req.flash('error', 'Password reset is invalid or has expired');
    return res.redirect('/login');
  }
  // if there was a user, show the reset password form
  res.render('reset', { title: 'Reset your password' });
};

exports.confirmPasswords = (req, res, next) => {
  if (req.body.password === req.body['password-confirm']) {
    next(); // keep it going - goes to authController.update
    return;
  }
  req.flash('error', 'Passwords do not match!');
  res.redirect('back');
};

exports.update = async (req, res) => {
  // ensure someone doesn't open page, leave it open, and come back after expire
  const user = await User.findOne({
    resetPasswordToken: req.params.token,
    resetPasswordExpires: { $gt: Date.now() } // $gt = mongoDB for greater than
  });

  if (!user) {
    req.flash('error', 'Password reset is invalid or has expired');
    return res.redirect('/login');
  }

  const setPassword = promisify(user.setPassword, user); // method of passport-local in user.js
  // sets new password, hashes and does all the passport behind-the-scenes
  await setPassword(req.body.password);
  // need to get rid of resetPasswordToken & resetPasswordExpires fields
  user.resetPasswordToken = undefined; // queue to the DB
  user.resetPasswordExpires = undefined; // queue to the DB
  const updatedUser = await user.save(); // runs to DB and does ↑
  await req.login(updatedUser); // passport method - auto logs user in
  req.flash('success', "🙌 Holy shit! Your password has finally been reset! We comped your login, as well. You're. Welcome.");
  res.redirect('/');
};
