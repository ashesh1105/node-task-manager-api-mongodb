const express = require('express')
const Task = require('../models/task')
const auth = require('../middleware/auth')

// Define the router
const router = new express.Router()

const log = console.log

// Start configuring the routes

// Post Request Route to create a new task
// With mongoose middleware function used in user model -> taskSchema.pre method, you'll be allowed
// to add checks before a task is actually saved to DB!
// middleware/auth is used to verify token, extract user from DB and set that on req.user which we will use here
router.post('/tasks', auth, async (req, res) => {
    // Checks validations on User model coming from mongoose and npm validator
    const task = new Task({
        ...req.body,    // ES6 syntax: take everything from req.body, which we will append with more key-value below
        owner: req.user._id // we do not want caller to pass owner, in middleware/auth, we extract user from token and add to req
    })
    try {
        await task.save()   // mongoose middleware will kick in here (file: ../models/task.js)
        res.status(201).send({  // status code 201 means "Created"
            status: 'Success!',
            new_task: task
        })
    } catch (error) {
        res.status(400).send(error) // will send status code as 400 Bad Request instead of 200 OK
    }
})

// Get all tasks, only the ones a user created by himself / herself
// Get /tasks?completed=false
// Get /tasks?limit=10&skip=20
// Get /tasks?sortBy=createdAt:desc // any special character between field name and asc or desc will be fine!
// Get /tasks?completed=true&limit=4&skip=0&sortBy=createdAt:asc    // use all of these params at once!
router.get('/tasks', auth, async (req, res) => {

    // when match.completed will be true or (anything else, like false): we filter the tasks, else, return all tasks
    const match = {}

    // Set match only if completed is sent with request
    if (req.query.completed) {
        match.completed = req.query.completed === 'true'    // set match to true if completed sent with string 'true'
    }

    // Use the sort query parameter, if provided
    const sort = {}

    // Parse the sortBy query param and set to sort object
    if (req.query.sortBy) {
        const parts = req.query.sortBy.split(':')
        // We don't know which field client wants to sort, so will use dymanic syntax to retrieve the field name
        // dot (.) notation won't work here!
        sort[parts[0]] = parts[1] === 'desc' ? -1 : 1   // -1 for desc and 1 for asc
    }

    try {
        // Below will work as 100%, but let's comment it out and see another way of get it done
        // const tasks = await Task.find({ owner: req.user._id })
        // Here, we are leveraging the virtual relationship we created in User model to link user to all his/her tasks
        await req.user.populate({
            path: 'tasks',
            // With match, we can specify more options for which tasks we want to be populated on user object
            match,  // Short hand syntax for: match: match,
            // This is how you provide options like limit, skip, etc.
            options: {
                limit: parseInt(req.query.limit),    // Need to parse limit since it'll come as String
                skip: parseInt(req.query.skip),
                // sort: {
                //     createdAt: 1   // asc will be 1 and desc will be -1
                // }
                sort    // Since sort is an object, we will preset it, just like match and use shorthand syntax!
            }
        }).execPopulate()
        res.send(req.user.tasks)    // 'tasks' is a virtual property mongoose undertands since we defined it in User Model
    } catch (error) {
        res.status(500).send()
    }
})

// Get a task by Id, only by the user who created it
router.get('/tasks/:id', auth, async (req, res) => {
    const _id = req.params.id
    try {
        const task = await Task.findOne({ _id, owner: req.user._id })
        if (!task) {
            return res.status(404).send()
        }
        res.send(task)
    } catch (error) {
        res.status(500).send()
    }
})

// Update a given task by id, only be the user who created it
// With mongoose middleware function used in user model -> taskSchema.pre method, you'll be allowed
// to add checks before a task is actually saved to DB!
router.patch('/tasks/:id', auth, async (req, res) => {

    // Let's ensure updates are only allowed if right keys are sent
    const updates = Object.keys(req.body)   // Returns keys passed as array of strings
    const allowedUpdates = ['completed', 'description'] // keys we want to allow updates
    // every function returns true Only If every array elements satisfy given condition!
    const isValidOpration = updates.every((update) => allowedUpdates.includes(update))

    // Don't allow updates if keys sent are not what we allow
    if (!isValidOpration) {
        return res.status(400).send({ Error: 'Invalid update sent!' })
    }

    try {
        // findByIdAndUpdate kind of methods bypass mongoose, that is why we need to explicitely say
        // run validators. We need mongoose middleware to kick in before save method executes
        // So replacing below line with alternate next 3 lines allow that to happen:
        // const task = await Task.findByIdAndUpdate(req.params.id, req.body,
        // { new: true, runValidators: true })
        const task = await Task.findOne({ _id: req.params.id, owner: req.user._id })    // user is set to req in middleware/auth
        if (!task) {
            res.status(404).send()
        }
        updates.forEach((update) => task[update] = req.body[update])
        await task.save()   // Now the mongoose middleware will kick in here (file: ../models/task.js)

        res.send(task)
    } catch (error) {
        res.status(400).send()
    }
})

// Delete a task, created by same user, by id
router.delete('/tasks/:id', auth, async (req, res) => {
    // https://mongoosejs.com/docs/queries.html
    try {
        const task = await Task.findOneAndDelete({ _id: req.params.id, owner: req.user._id })   // user is set in req at auth
        if (!task) {
            return res.status(404).send({ Error: 'Task not found!' })   // task not found!
        }
        res.send(task)
    } catch (error) {
        res.status(500).send(error)
    }
})

module.exports = router