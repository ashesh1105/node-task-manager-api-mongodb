// Set up Test Database
const mongoose = require('mongoose')
const jwt = require('jsonwebtoken')
const User = require('../../src/models/user')

// Let's create an id to be user with our test user
const userOneId = new mongoose.Types.ObjectId()

// Let's define a test user using the id we created above
const userOne = {
    _id: userOneId,
    name: 'Mike',
    email: 'mike@something.com',
    password: 'mik12345',
    tokens: [{
        token: jwt.sign({ _id: userOneId }, process.env.JWT_SECRET)
    }]
}

const setUpDatabase = async () => {
    // Delete every user before running each test
    await User.deleteMany()
    // Let's create the test user before every test run
    await new User(userOne).save()
}

module.exports = {
    userOneId,
    userOne,
    setUpDatabase
}