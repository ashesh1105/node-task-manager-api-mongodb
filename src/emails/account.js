const sgMail = require('@sendgrid/mail')

sgMail.setApiKey(process.env.SENDGRID_API_KEY)

const sendWelcomeEmail = (email, name) => {
    sgMail.send({
        to: email,
        from: 'ashesh1105@gmail.com',
        subject: 'Thanks for joining in!',
        text: `Welcome to Task Manager app ${name}! Let me know how you can get along with the app.` // Notice backtick here from ES6
    })
}

const sendCancelationEmail = (email, name) => {
    sgMail.send({
        to: email,
        from: 'ashesh1105@gmail.com',
        subject: 'Sorry to see you go!',
        text: `Goodbye ${name}. We hope to see you sometime back soon!`
    })
}

module.exports = {
    sendWelcomeEmail,    // ES6 syntax shortcut for sendWelcomeEmail: sendWelcomeEmail
    sendCancelationEmail
}
