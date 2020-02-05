const express = require('express')
require('./db/mongoose')
const userRouter = require('./routers/user')
const taskRouter = require('./routers/task')

const app = express()
const log = console.log

// Customize our server. express package provides something to pass in and extract as Json
app.use(express.json())

// Add the router to use
app.use(userRouter)
app.use(taskRouter)

// export app to be used outside of this file. This helps using it with automated tests as well
module.exports = app
