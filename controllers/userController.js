const mongoose = require('mongoose');
const Store = mongoose.model('Store');
const User = mongoose.model('User'); // we can grab this because we imported in start.js
const promisify = require('es6-promisify');

exports.loginForm = (req, res) => {
  res.render('login', { title: 'Login' });
};

exports.registerForm = (req, res) => {
  res.render('register', { title: 'Register' });
};

// server side checks - prevent malicious attempts
exports.validateRegister = (req, res, next) => {
  // make sure they didn't enter any scripts into the name field
  req.sanitizeBody('name'); // expressValidator in app.js - adds validation methods to every request
  req.checkBody('name', 'You must supply a name!').notEmpty();
  req.checkBody('email', 'That email is not valid!').isEmail();
  req.sanitizeBody('email').normalizeEmail({
    remove_dots: false,
    remove_extension: false,
    gmail_remove_subaddress: false
  });
  req.checkBody('password', 'Password cannot be blank!').notEmpty();
  req.checkBody('password-confirm', 'Confirmed password cannot be blank!').notEmpty();
  req.checkBody('password-confirm', 'Oops! Your passwords do not match!').equals(req.body.password);

  const errors = req.validationErrors();
  if (errors) {
    req.flash('error', errors.map(err => err.msg));
    // if error, re-render the form while retaining inputs
    res.render('register', { title: 'Register', body: req.body, flashes: req.flash() });
    return;
  }
  next(); // there were no errors
};

exports.register = async (req, res, next) => {
  const user = new User({ email: req.body.email, name: req.body.name });
  /* .register comes from passport-local-mongoose in user.js
   * User.register(user, req.body.password, function(e, user) { ..callback });
   * the above line uses passport-local-mongoose's .register method, which doesn't
   * return a promise. This is a problem because we're registering with our
   * database (requires async/await), so we're using es6-promisify as a workaround
   *
   * When using es6-promisify, if you pass a method that lives within an
   * object, you must pass in the entire object as the 2nd param so it
   * knows where to bind itself to.
   */
  const registerWithPromise = promisify(User.register, User);
  /*
   * What will happen:
   * Stores the email, name, and a HASH of the password (golden rule of thumb)
   *
   * Ex. of hashing password:
   * dog124 --> 9asfjskdu8797asf = what you see as the password in the DB
   *
   * This works by a hashing algorithm. passport runs a user entered password
   * through an algorithm, which outputs a hash. This hash will always be
   * the same as long as the user's inputted password remains the same.
   */
  await registerWithPromise(user, req.body.password);
  next(); // pass to authController.login in routes
};

exports.account = (req, res) => {
  res.render('account', { title: 'Edit your account' });
};

exports.updateAccount = async (req, res) => {
  const updates = {
    name: req.body.name,
    email: req.body.email
  };

  // must pull id from request, becuase user could fuck with it if you ask for their id
  const query = { _id: req.user._id };
  // takes updates and sets it upon whatever exists on the user
  const update = { $set: updates };
  /*
   * (runValidators: true) if user is trying to fuck around, it will run them
   * through all the validation steps
   * (new: true) returns the actual new user
   * (context: 'query') required by mongoDB to actually do the query properly
   */
  const options = { new: true, runValidators: true, context: 'query' };
  // findOneAndUpdate is a mongoDB method
  const user = await User.findOneAndUpdate(query, update, options);

  res.flash('success', 'Updated AF ☃️')
  res.redirect('back'); // sends back to url immediately before POST
};
