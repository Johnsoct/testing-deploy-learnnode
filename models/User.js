const mongoose = require('mongoose');
const Schema = mongoose.Schema;
mongoose.Promise = global.Promise;
const md5 = require('md5'); // hasing algorithm used by Gravatar
const validator = require('validator');
const mongodbErrorHandler = require('mongoose-mongodb-errors');
const passportLocalMongoose = require('passport-local-mongoose');

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    unique: true,
    lowercase: true,
    trim: true,
    validate: [validator.isEmail, 'Invalid email address!'],
    required: 'Please supply an email address'
  },
  name: {
    type: String,
    required: 'Please supply a name',
    trim: true
  },
  resetPasswordToken: String,
  resetPasswordExpires: Date,
  hearts: [ // an array of id's related to the Store
    { type: mongoose.Schema.ObjectId, ref: 'Store' }
  ]
});

// virtual fields are generated fields | generated field = cheaper than storing in DB
userSchema.virtual('gravatar').get(function() {
  const hash = md5(this.email); // get the user's email (hashed = secure)
  return `https://gravatar.com/avatar/${hash}?s=200`; // ?s=200 query param = size = 200
});

// adds all the passport-local authentication methods to our scheme to login
userSchema.plugin(passportLocalMongoose, { usernameField: 'email' });
// userScheme.email unique: true + validate = ugly errors, mongodbErrorHandler beautifies them
userSchema.plugin(mongodbErrorHandler);

module.exports = mongoose.model('User', userSchema);
