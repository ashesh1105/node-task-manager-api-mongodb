const express = require('express')
require('./db/mongoose')
const userRouter = require('./routers/user')
const taskRouter = require('./routers/task')

const app = express()
// Heroku will set the PORT, for Dev environment it will take it from config file we are setting
const port = process.env.PORT   // Since we use env variable PORT, we don't have to say process.env.PORT || xxxx for dev environment
const log = console.log

// Customize our server. express package provides something to pass in and extract as Json
app.use(express.json())

// Add the router to use
app.use(userRouter)
app.use(taskRouter)

// Start the server
app.listen(port, () => {
    log('Server is up on port', port)
})
