const express = require('express')

const auth = require('./controllers/authControllers')
const account = require('./controllers/accountControler')
const authMiddleware = require('./middlewares/auth')

const app = express()
app.use(express.json())

app.use('/user', auth).use(authMiddleware)
app.use('/account', account)

app.listen(3333, () => console.log('Server is running'))

module.exports = {
  app
}
