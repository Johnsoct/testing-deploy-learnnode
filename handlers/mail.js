const nodemailer = require('nodemailer');
const pug = require('pug');
const juice = require('juice');
const htmlToText = require('html-to-text');
const promisify = require('es6-promisify');

// A transport is a way to interface with ways of sending email
const transport = nodemailer.createTransport({
  host: process.env.MAIL_HOST,
  port: process.env.MAIL_PORT,
  auth: {
    user: process.env.MAIL_USER,
    pass: process.env.MAIL_PASS
  }
});

const generateHTML = (filename, options = {}) => {
  // Whenever using renderFile, we never know where were currently are on our
  // hard disk, so we use __dirname to use the development location of the file
  const html = pug.renderFile(`${__dirname}/../views/email/${filename}.pug`, options);
  // creates html w/ inlined css
  const inlined = juice(html);
  return inlined;
}

exports.send = async(options) => {
  // render html in emails
  const html = generateHTML(options.filename, options);
  // For old as fuck text email browsers, or some shit
  const text = htmlToText.fromString(html);
  const mailOptions = {
    from: 'Chris Johnson <johnsoctbus@gmail.com>',
    to: options.user.email,
    subject: options.subject,
    html,
    text
  };
  const sendMail = promisify(transport.sendMail, transport);
  return sendMail(mailOptions);
};
