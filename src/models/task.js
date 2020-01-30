const mongoose = require('mongoose')
const validator = require('validator')  // npm package to validate anything

// Create Task Scheme and then Task Model
// Mongoose will change "Tasks" to "tasks" and save that as collection name
const taskSchema = mongoose.Schema({
    description: {
        type: String,
        required: true,
        trim: true
    },
    completed: {
        type: Boolean,
        default: false   // ensures there's default values saved in DB, if not provided!
    },
    owner: {    // prop name: 'owner' could be anything we want, like 'belongsTo', etc.
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        // Relationship between Task and User models. Will help do: await Task(findById(_id)).populate('owner').execPopulate()
        // With that, the task object will contain entire embedded User object in owner field! 
        ref: 'User'
    }
}, {
    timestamps: true    // Will allow saving createdAt and updatedAt in DB for a task instance. By default it is false.
})

// Do some checks before save operation on task. Comes from Mongoose Middleware
// Make sure to use user.save() method in task model whereever you need mongoose middleware to kick in
// findByIdAndUpdate kind of methods bypass mongoose!
// https://mongoosejs.com/docs/middleware.html#pre
// You can't use arrow function below since arrow functions don't have access to 'this'
taskSchema.pre('save', async function (next) {
    const task = this   // 'this' is the task instance that you'll save in router: user.js

    console.log('Just before saving task..')

    // You must call next() otherwise it'll hang forever thinking we'll do something more before save
    next()

})

const Task = mongoose.model('Task', taskSchema)

module.exports = Task