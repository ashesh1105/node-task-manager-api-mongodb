const jwt = require('jsonwebtoken')
const User = require('../models/user')

const log = console.log

// express middleware "intervention"
// If you add a function to express middleware, you can do something before request get routed to one of the Route Handlers,
// like userRouter or taskRouter in our case. Your function takes 3 parameters - req, res and next
// Remember! you must call next once you're done in your function, else control will just sit there and will never get to route
// handlers! Also, do not require this in index.js unless you want to intercept all requests. Do it in the specific Route Handlers
// where you want to intercept certain paths, like userRouter and intercept all POST calls before a User gets created or logged in
const auth = async (req, res, next) => {
    try {

        // Grab the auth token user sent in header, if any
        const token = req.header('Authorization').replace('Bearer ', '')    // String 'Bearer ' since we pass it that way in call
        const decoded = jwt.verify(token, process.env.JWT_SECRET)  // get payload out of token. secret has to be same you used to create token!
        const user = await User.findOne({ _id: decoded._id, 'tokens.token': token })

        // Let's add this user and the token as part of the req so a route doesn't need to fetch user from DB again
        if (!user) {
            // Tell the user to authenticate so no user could be found with _id with token passed and the (logged in) token itself
            throw new Error()   // will make the catch block execute and send the error with that to caller
        }
        // If user found, add that to req object so the user API can use this and does not need to fetch it from DB again!
        req.user = user
        req.token = token

        // Must call this, else control will not move out of this function and it'll just sit here!
        next()
    } catch (error) {
        res.status(401).send({ AuthError: 'Please authenticate!' })
    }
}

module.exports = auth