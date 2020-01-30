const mongoose = require('mongoose')
const validator = require('validator')  // npm package to validate anything
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')

const Task = require('./task')

const log = console.log

// Create User Schema and then User Model
const userSchema = mongoose.Schema({
    name: {
        type: String,
        required: true,  // Makes this field mandatory to be provided
        trim: true  // coming from npm validator. remove spaces before and after
    },
    age: {
        type: Number,
        validate(value) {   // available from JavaScript
            if (value <= 0) {
                throw new Error('Please provide a valid age (>= 0 years)!')
            }
        }
    },
    email: {
        type: String,
        required: true,
        // creates an index in mongodb and ensures uniqueness for email
        // You might need to drop the db and recreate for index to be built
        unique: true,   // ensures no users with same email can be saved in the DB!
        trim: true, // coming from npm validator - order of these options are not important
        lowercase: true, // coming from npm validator
        validate(value) {
            // Using validator npm package. There are many more validations with npm validator:
            // as documented on their site: https://www.npmjs.com/package/validator
            if (!validator.isEmail(value)) {
                throw new Error('Please enter valid email address!')
            }
        }
    },
    password: {
        type: String,
        required: true,
        // Below validation comes from mongoose itself. Note, it is minlength and not minLength!
        // https://mongoosejs.com/docs/schematypes.html#string-validators
        minlength: 7,
        trim: true,
        validate(value) {
            if (value.toLowerCase().includes('password')) {
                throw new Error('Password can not contain "password"!')
            }
        }
    },
    // Note: this is how you declare an array type in a model!
    tokens: [{
        token: {
            type: String,
            required: true
        }
    }],
    avatar: {
        type: Buffer
    }
}, {
    // Add schema options. You must declare schema explicitely like this to provide options!
    timestamps: true    // Will allow saving createdAt and updatedAt in DB for a user instance. By default it is false.
})

// Below code will allow us to find all tasks on a user by code like: await user.populate('tasks').execPopulate()
// Let's create a relationship between User and Task models since a user will own certain tasks
// Unlike Task model, where we specify owner property with ref: 'User' and that helps User ID to physically live with
// a task object in DB, here, we will create a virtual relationship that mongoose will understand
userSchema.virtual('tasks', {   // name: 'tasks' could be anything we want
    ref: 'Task',    // Refers Task Model, should be typed as it is
    localField: '_id',    // Meaning, which field in this (User) model will be linked to Task objects. Should be typed as it is
    foreignField: 'owner' // Meaning, which field in Task model will allow linking. We specified it as 'owner' in Task model
})

// A method declared on Schema.methods makes it available only to an instance on which new function
// like below is called. We need real function here since arrow functions don't have access to 'this'
userSchema.methods.generateAuthToken = async function () {

    const user = this   // get instance of this in a variable

    const token = jwt.sign({ _id: user._id.toString() }, process.env.JWT_SECRET, {
        expiresIn: '24 hours'   // takes values like english, like 1 hour, 7 days, 1 week, etc.
    })
    // append token as new object to user.tokens array
    user.tokens = user.tokens.concat({ token }) // short hand syntax for {token: token}
    // Now save the user so new token is saved in the DB
    await user.save()

    return token
}

// Same as above, this will be available to an invividual instance of User
// Below method intercepts the Json input sent by user for any endpoint on User Router, converts it to object
// and then strips off anything we do not want caller to see, like password or tokens arrays which indicates how many
// sessions a user is signed in as. So this way indivual routes do not need to do this job individually!
userSchema.methods.toJSON = function () {
    const user = this   // Get Json input passed by caller to any endpoint on User Router
    const userObject = user.toObject()  // Converts the input to object

    // Now do any manupulation we need for every endpoint, e.g., not send back password and logged in session tokens
    delete userObject.password
    delete userObject.tokens
    // Let's also delete avatar since that is heavy data and we have endpoints to save, delete, etc., on it anyway
    // Basically we do not need to return avatar with profile data, a seperate BE call can be made for that
    // You can try commenting the line below and then do GET /users/me to see how big the avatar binary data is on the field!
    delete userObject.avatar

    // Finally return the updated object to end point on User Router, where this might be sent by res.send(user)..
    return userObject
}

// You can define below only when mongoose.Schema is independently defined, like above
// A method defined on statics makes it available to all the instances
userSchema.statics.findByCredentials = async (email, password) => {

    const user = await User.findOne({ email })  // short hand syntax for { email: email }
    if (!user) {
        throw new Error('Unable to login')
    }

    // Let's see if we found the right user
    const isMatch = await bcrypt.compare(password, user.password)
    if (!isMatch) {
        // It is better not to be too specific on error messages for login, since that way we do not
        // let the caller get more info than (s)he knows, like 'Wrong password', etc.
        throw new Error('Unable to login')
    }

    // Return user if there's match
    return user
}

// Do some checks before save operation on user. Comes from Mongoose Middleware
// Make sure to use user.save() method in user model whereever you need mongoose middleware to kick in
// findByIdAndUpdate kind of methods bypass mongoose!
// https://mongoosejs.com/docs/middleware.html#pre
// You can't use arrow function below since arrow functions don't have access to 'this'
userSchema.pre('save', async function (next) {
    const user = this   // 'this'' is the user instance that you'll save in router: user.js

    // Check if password was modified by the user. Hash it and add it back in user object we have
    // So, the user instance that will be saved to DB will have hashed password and not plain text one!
    if (user.isModified('password')) {
        user.password = await bcrypt.hash(user.password, 8)
    }

    // You must call next() otherwise it'll hang forever thinking we'll do something more before save
    next()
})

// Delete all tasks of a user when user deletes himself / herself
userSchema.pre('remove', async function (next) {
    const user = this
    await Task.deleteMany({ owner: user._id })

    next()  // must call this to proeed to route handler!
})

// Finlly, create the model
const User = mongoose.model('User', userSchema)

// Export model to be used outside of this file
module.exports = User