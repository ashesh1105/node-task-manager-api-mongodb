const request = require('supertest')
const app = require('../src/app')
const User = require('../src/models/user')
const { userOneId, userOne, setUpDatabase } = require('./fixtures/db')

// beforeAll(async () => {
//     // Do something before a single test start runnning in this test suite! Can do it with await option
// })

// Runs before each test case runs
// https://jestjs.io/docs/en/setup-teardown
beforeEach(setUpDatabase)

// We have unique email validation but due to beforeEach above, DB is cleaned everytime, so this test will pass!
// Below is a great test which won't send (actual) since we have mocked @sendgrid/mail !!
test('Should sign up a new user', async () => {
    const response = await request(app).post('/users').send({
        name: 'Ashesh Singh',
        email: 'ashesh1105@gmail.com',
        password: 'ash12345'
    }).expect(201)

    // Assert that datbase was changed correctly
    const user = await User.findById(response.body.user._id)    // Do not forget to use await here!
    expect(user).not.toBeNull()

    // Assertion about the response
    expect(response.body).toMatchObject({   // Note: it is not toMatch, it is toMatchObject!
        user: {
            name: 'Ashesh Singh',
            email: 'ashesh1105@gmail.com'
        },
        token: user.tokens[0].token
    })

    // Assert that password not saved in DB as plain text password
    expect(user.password).not.toBe('ash12345')
})

// Test User Login
test('Should login existing user', async () => {
    const response = await request(app)
        .post('/users/login')
        .send({
            email: userOne.email,
            password: userOne.password
        })
        .expect(200)

    // Assertion to ensure new token is saved in DB and the same is returned
    // Note: This will be send token in tokens array since first one was saved when user got created in beforeEach method! 
    const user = await User.findById(response.body.user._id)
    // You don't have to use toMatchObject in below and can do this too: expect(response.body.token).toBe(user.tokens[1].token)
    expect(response.body).toMatchObject({
        token: user.tokens[1].token
    })
})

// Negative test for user login
test('Should not be able to login existing user', async () => {
    await request(app)
        .post('/users/login')
        .send({
            email: userOne.email,
            password: 'pass123'
        })
        .expect(400)
})

// Test to get user profile. Note, how we are setting the header 'Authorization' here with Bearer token!
test('Should get user profile', async () => {
    await request(app)
        .get('/users/me')
        // set Bearer token in Header
        .set('Authorization', `Bearer ${userOne.tokens[0].token}`)
        .expect(200)
})

// Test access profile for unauthenticated user 
test('Should not get user profile', async () => {
    await request(app)
        .get('/users/me')
        // .set(    // set Bearer token in Header
        //     'Authorization', `Bearer ${userOne.tokens[0].token}`)
        .expect(401)
})

// Test to delete a user by himself/herself
test('Should be able to delete own profile', async () => {
    const response = await request(app)
        .delete('/users/me')
        // set Bearer token in Header
        .set('Authorization', `Bearer ${userOne.tokens[0].token}`)
        .expect(200)

    // Assertion to ensure user is indeed deleted from the DB
    const user = await User.findById(userOne._id)
    expect(user).toBeNull()
})

// Test error situation when someone tries to delete other's profile
test('Should not allow unauthorized user delete', async () => {
    await request(app)
        .delete('/users/me')
        // // set Bearer token in Header
        // .set('Authorization', `Bearer ${userOne.tokens[0].token}`)
        .expect(401)    // 401 This comes from middleware auth function which we defined due to token issues
})

// Test Avatar image upload
test('Should upload avatar image to a user', async () => {
    await request(app)
        .post('/users/me/avatar')
        .set('Authorization', `Bearer ${userOne.tokens[0].token}`)
        .attach('avatar', 'tests/fixtures/profile-pic.jpg') // Note: we use attach method with supertest to send files!
        .expect(200)
    // Check if avatar saved at user is of binary type
    const user = await User.findById(userOneId) // Don't forget await here!
    // Note: .toBe is like ===, .Equal(expect.any(<data_type>)) just checks if types are same!
    expect(user.avatar).toEqual(expect.any(Buffer))
})

// Test (positive) to update user's first name
test('Should update user\'s first name', async () => {
    const response = await request(app)
        .patch('/users/me')
        .set('Authorization', `Bearer ${userOne.tokens[0].token}`)
        .send({
            name: 'Michael'
        })
        .expect(200)
    const user = await User.findById(userOneId)
    expect(user.name).toEqual('Michael')  // Note: since the endpoint returns req.user, response.body will pretty much be the user object
})

// Test (negative) to update a non-existing user field
test('Should fail user update for non-existing field', async () => {
    await request(app)
        .patch('/users/me')
        .set('Authorization', `Bearer ${userOne.tokens[0].token}`)
        .send({
            dob: '12/12/2001'   // send a field that doesn't exist in the DB. Be careful to update test when you add this field in User model!
        })
        .expect(400)
})


// afterEach(async () => {
//     // do something with await option here!
// })

// afterAll(async () => {
//     // Do something after all the test cases in this test suite finish running. Do it with await option
// })