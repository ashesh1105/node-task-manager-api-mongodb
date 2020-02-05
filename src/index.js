const app = require('./app')

// Heroku will set the PORT, for Dev environment it will take it from config file we are setting
const port = process.env.PORT   // Since we use env variable PORT, we don't have to say process.env.PORT || xxxx for dev environment
const log = console.log

// Start the server
app.listen(port, () => {
    log('Server is up on port', port)
})
