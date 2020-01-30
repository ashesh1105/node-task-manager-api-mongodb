const mongoose = require('mongoose')

mongoose.connect(process.env.MONGODB_URL + process.env.DB_NAME, {    // db name is part of URL in mongoose
    useNewUrlParser: true,
    useUnifiedTopology: true,
    useCreateIndex: true,
    // Below helps suppress deprecation warning of mongoose not using latest mongodb driver
    useFindAndModify: false
})

// const task = new Tasks({
//     description: "Learn the Mongoose Library",
//     completed: false
// })

// task.save().then((task) => {
//     log(task)
// }).catch((error) => {
//     log('Error!', error)
// })

// new Tasks({
//     description: "  Complete NodeJS tutorial asap!  ",   // trim will help here!
//     completed: false // false is default value provided from model anyway!
// }).save().then((task) => {
//     log(task)
// }).catch((error) => {
//     log('Error!', error)
// })