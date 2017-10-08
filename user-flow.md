# Users:
## Model
1. Email
  1. string
  1. unique
  1. lowercase
  1. trim
  1. validate using validator node module
  1. required
1. Name
  1. string
  1. required
  1. trim
1. Reset password token
1. Reset password expiry
1. userSchema virtual field for Gravatar
1. userSchema passport-strategy plugin
1. userSchema mongodbErrorHandler plugin

## Actions:
1. Register
  1. Register form
    1. Render form
  1. Validate registration data
    1. Ensure user didn't enter scripts into form inputs (expressValidator)
      1. sanitizeBody (name)
      1. checkBody (name) notEmpty
      1. sanitizeBody (email) normalizeEmail
        1. remove_dots (chris.johnson@gmail.com)
        1. remove_extension
        1. gmail_remove_subaddress
      1. checkBody (email) notEmpty
      1. checkBody (password)  notEmpty
      1. checkBody (password-confirm) notEmpty
      1. checkBody (password-confirm) equals req.body.password
      1. Store errors (req.validationErrors)
      1. If errors:
        1. Flash error
        1. Re-render register form with: (retain user inputs except password)
          1. title: 'register'
          1. body: req.body
          1. flashes: req.flash()
          1. Return
      1. Next
  1. Register user (async)
    1. Create new User (user model) with email and name values
    1. Wrap User.register (passport) in es6-promisify to work with async/await with DB
    1. Using newly promise returning User.register, register user
    1. Next
  1. Login user
    1. Use passport.authenticate('strategy') to login user

1. Login
  1. Login form
  1. Use passport.authenticate('strategy') to login user
    1. Redirect:
      1. Failure: '/login'
      1. Success: '/'

1. Logout
  1. Logout using .logout() (passport)
  1. Flash success
  1. Redirect '/'

1. Account
  1. Is user logged in
    1. User authentication (existing email/username/etc) (passport)
      1. Authenticated:
        1. Next
        1. Return
    1. Flash error
    1. Redirect '/login'
  1. Render account page
  1. Update account (async)
    1. Store updates from:
      1. req.body.name
      1. req.body.email
    1. findOneAndUpdate (mongoDB)
      1. Store query id
        1. \_id: req.user.\_id (object)
      1. Store updates
        1. $set: updates (object)
      1. Store options
        1. new: true (returns a new actual user)
        1. runValidators: true (runs users through full validation) (mongoDB)
        1. context: 'query' (required for mongoDB to query properly)
      1. Store user with User.findOneAndUpdate with the above 3 parameters
    1. Flash success
    1. Redirect 'back'
  1. Forgot password (async)
    1. Check if user with provided email exists (mongoDB .findOne)
      1. If no user:
        1. Flash error
        1. Redirect '/login'
    1. Set password reset and expiry tokens
      1. Use built-in node module crypto to create:
        1. resetPasswordToken string
        1. resetPasswordExpires time frame
      1. Save user with new updated token fields
      1. Send email to user with the token(s) (async)
        1. Store the resetURL using:
          1. req.headers.host
          1. user.resetPasswordToken
        1. Using your chosen email service, set your: (variables.env)
          1. MAIL_USER
          1. MAIL_PASS
          1. MAIL_HOST
          1. MAIL_PORT
        1. Create a mail.js
          1. Use node-modules:
            1. nodemailer (makes interfacing with different mail protocols easy)
            1. pug (render html)
            1. juice (creates html with inlined css for old-browsers, and shit)
            1. html-to-text (converts html to text for text email clients, or some shit)
            1. promisify (convert non-promise functions into promise functions)
          1. Create a transport with your mail service variables.env
          1. Create a function that generates HTML using a filename and options
          1. Create a function to send mail via a promisified transport
        1. Using mail.js, send the resetURL (async)
      1. Flash success
      1. Redirect '/login'
  1. [GET] Reset (async)
    1. User authentication (existence check using reset and time tokens)
      1. If no user:
        1. Flash error
        1. Redirect '/login'
    1. Render reset form
  1. [POST] Confirm Passwords (POST of Reset ↑)
    1. Equality test req.body.password with req.body['password-confirm']
      1. If a match:
        1. Next
        1. Return
      1. Flash error
      1. Redirect 'back'
  1. [POST] Update (after Reset and Confirm Passwords) (async)
    1. User authentication (existence check using reset and time tokens)
      1. If no user:
        1. Flash error
        1. Redirect '/login'
    1. Wrap User.setPassword (passport) in es6-promisify to work with async/await with DB
    1. Store new password using setPassword with req.body.password (passport)
    1. Rid user of reset and time token fields
      1. Set each to 'undefined'
    1. Save updated user to user
    1. Automatically login user
    1. Flash success
    1. Redirect '/'
