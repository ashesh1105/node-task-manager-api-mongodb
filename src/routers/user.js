const express = require('express')
const multer = require('multer')    // npm package to manage file uploads
const sharp = require('sharp')  // npm package to convert large images to smaller, web-friendly images

const User = require('../models/user')
const auth = require('../middleware/auth')
const { sendWelcomeEmail, sendCancelationEmail } = require('../emails/account') // Object destructuring

const log = console.log

// Define the router
const router = new express.Router()

// Start configuring the routes

// Post Request Route to create a new user
// Using async - await functionality, we can simplify the code quite a bit
// Since await can only used inside an async function, we can mark the callback function
// with req and res as async
// With mongoose middleware function used in user model -> userSchema.pre method, you'll never save
// user.password as plain text, it will be a hashed one!
router.post('/users', async (req, res) => {

    // const user = new User({ // Check validations on User model coming from mongoose and npm validator
    //     name: req.body.name,    // since we did app.use(express.josn()) above!
    //     email: req.body.email,
    //     password: req.body.password
    // })
    // We can directly pass req.body to achieve above
    const user = new User(req.body)

    // user.save().then((user) => {
    //     // status code 201 means "Created", so that is more appropriate than generic 200 OK
    //     res.status(201).send({
    //         status: 'Success!',
    //         new_user: user
    //     })
    // }).catch((error) => {
    //     res.status(400).send(error) // will send status code as 400 Bad Request instead of 200 OK
    // })
    // We can simplify the code above using async - await functionality:
    try {
        await user.save()

        // This function needs to be defined at an instance level at User model: userSchema.methods.generateAuthToken
        // This function also saves the user instance. It generates JWT token and saves with user instance
        const token = await user.generateAuthToken()
        sendWelcomeEmail(user.email, user.name) // defined under src/emails/account.js

        res.status(201).send({ user, token })
    } catch (error) {
        res.status(400).send(error)
    }
})

// Set avatar for a user by allowing file upoload with some constraints
// Step #1: Set validations
const upload = multer({
    // when you save this visual studio automatically created the folder /avatars
    // dest: 'avatars',    // If we do not provide this option, multer will pass this in app.post method below this!
    limits: {
        fileSize: 1000000,
    },
    // Restrict upload to certain file extension, .jpeg, .jpg, .png only
    fileFilter(req, file, cb) { // cb means call back. Documentation: https://www.npmjs.com/package/multer

        if (!file.originalname.match(/\.(jpg|jpeg|png)$/)) {    // use regex with match method
            return cb(new Error('Please upload images only!'))
        }

        cb(undefined, true) // meaning no error and success at this step

        // This is how to call cb for error or no error conditions:
        // cb(new Error('Please upload PDF files only!'))  // send error message
        // cb(undefined, false)    // Failure but silently rejecting it
        // cb(undefined, true) // Successful case

    }
})

// Step #2: Add the route, use our auth and then upload.single middleware functions, handle errors too
router.post('/users/me/avatar', auth, upload.single('avatar'), async (req, res) => {

    // Normalize the avatar image before saving it!
    // Let's use npm package - sharp, to convert the image buffer to .png type, resize it, etc, before saving it
    const buffer = await sharp(req.file.buffer).resize({ width: 250, height: 250 }).png().toBuffer()
    // req.user.avatar = req.file.buffer
    req.user.avatar = buffer
    await req.user.save()
    res.send()
}, (error, req, res, next) => { // Handle error message coming from our middleware function upload.single()
    res.status(400).send({ error: error.message })
})

// Delete user's avatar
router.delete('/users/me/avatar', auth, async (req, res) => {
    try {
        req.user.avatar = undefined // Clear this field on user
        await req.user.save()
        res.send()
    } catch (error) {
        res.status(500).send()
    }
})

// Get avatar
router.get('/users/:id/avatar', async (req, res) => {
    try {
        const user = await User.findById(req.params.id)
        if (!user || !user.avatar) {
            throw new Error()
        }
        res.set('Content-Type', 'image/png')    // Since we convert image, when uploaded, to .png using sharp npm package
        res.send(user.avatar)
    } catch (error) {
        res.status(404).send()
    }
})

// Login Route
router.post('/users/login', async (req, res) => {
    try {
        // Below function needs to be defined at User model as: userSchema.statics.findByCredentials
        const user = await User.findByCredentials(req.body.email, req.body.password)

        // This function needs to be defined at an instance level at User model: userSchema.methods.generateAuthToken
        // This function also saves the user instance. It generates JWT token and saves with user instance
        const token = await user.generateAuthToken()

        res.send({ user, token })   // short hand syntax for {user: user, token: token}
    } catch (error) {
        res.status(400).send(error)  // 400 enough is a signal that login wasn't successful
    }
})

// Logout a logged in user. You'll need auth here to check if user is signed in and also to remove the token on user obj
router.post('/users/logout', auth, async (req, res) => {
    try {
        // Filter out token in use. Since we set token value with key token at user in middleware/auth method
        // so we refer it by req.token
        req.user.tokens = req.user.tokens.filter((obj) => obj.token != req.token)
        await req.user.save()   // save the user with its token removed

        res.send()
    } catch (error) {
        res.status(500).send()
    }
})

// Logout of all sessions
router.post('/users/logoutAll', auth, async (req, res) => {
    try {
        // Remove all the tokens from this user object
        req.user.tokens = []
        await req.user.save()
        res.send()
    } catch (error) {
        res.status(500).send()
    }
})

// Let's start using async - await for rest of the routes as well (like above)

// Get all users
// This path was good to play in dev but don't make sense for prod since a user should not be allowed to get other users!
// router.get('/users', auth, async (req, res) => {
//     try {
//         const users = await User.find({})
//         res.status(200).send(users) // status code 200 is default anyway
//     } catch (e) {
//         res.status(500).send(e)
//     }
// })

// Get user profile
router.get('/users/me', auth, async (req, res) => {

    // Return the user set on req in auth middleware instead of wasting resources fetch DB again for it
    res.status(200).send(req.user) // status code 200 is default anyway
})

// Get a user by id
// Commenting this out since we shouldn't allow any user to get another user (by id). We have /users/me above anyway
// which a user can use to get his/her profile as long as user exists in the system and is logged in
// router.get('/users/:id', async (req, res) => {
//     const _id = req.params.id
//     try {
//         // https://mongoosejs.com/docs/api.html#model_Model.findById
//         const user = await User.findById(_id)
//         if (!user) {
//             // return helps stop the exeution here
//             return res.status(404).send()   // 404 - not found sent to client
//         }
//         res.status(200).send(user)
//     } catch (error) {
//         res.status(500).send()
//     }
// })

// Update my profile
// With mongoose middleware function used in user model -> userSchema.pre method, you'll never save
// user.password as plain text, it will be a hashed one!
router.patch('/users/me', auth, async (req, res) => {

    // Let's ensure updates are only allowed if right keys are sent
    // Basically keys that are sent is a subset (or equal number) of keys available in the model
    const updates = Object.keys(req.body)   // Returns keys passed as array of strings
    const allowedUpdates = ['name', 'email', 'password', 'age'] // keys we want to allow updates
    // every function returns true Only If every array elements satisfy given condition!
    const isValidOpration = updates.every((update) => allowedUpdates.includes(update))

    // Don't allow updates if keys sent are not what we allow
    if (!isValidOpration) {
        return res.status(400).send({ Error: 'Invalid update sent!' })
    }

    try {
        // findByIdAndUpdate kind of methods bypass mongoose, that is why we need to explicitely say
        // run validators. We need mongoose middleware to kick in for save method to validate password
        // just before save(). So commenting below line alternate next 3 lines allow that to happen:
        // const user = await User.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true })
        // More updates to use auth middleware function. Commenting below line too and using the user sent in auth function:
        // const user = await User.findById(req.params.id)
        // Our user object is in req.user

        // Now, let's make sure we update every property of this user instance with key-value sent
        // Since we will be in loop and won't know which key, we use syntax like obj1[key] = obj2[key]
        // and not obj1.key = obj2.key
        updates.forEach((update) => req.user[update] = req.body[update])
        await req.user.save()   // Now the mongoose middleware will kick in here (file: ../models/user.js)

        // Finally, send the user back to caller
        res.send(req.user)  // Here, password and token will be stripped off due to toJSON instance level function in User model
    } catch (error) {
        res.status(400).send()
    }
})

// Delete myself from the system. I need to A) exist in the system and B) log in (/users/login) to be able to call this
// Note: this will also delete all this user's tasks since we defined middleware function userSchema.pre with first argument
// as 'remove' in User model! In these situations, it is better to use middleware instead of cascade deleting manually
router.delete('/users/me', auth, async (req, res) => {
    // https://mongoosejs.com/docs/queries.html
    try {
        // Since we are using middleware - auth function where we add user to req object once verified, so using that here
        await req.user.remove() // mongoose method to remove a user

        sendCancelationEmail(req.user.email, req.user.name) // defined under src/emails/account.js

        res.send(req.user)
    } catch (error) {
        res.status(500).send(error)
    }
})

module.exports = router