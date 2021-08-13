const express = require('express')

const auth = require('./controllers/authControllers')
const account = require('./controllers/accountControler')
const tradeRoutes = require('./controllers/tradeController')
const authMiddleware = require('./middlewares/auth')

const app = express()
app.use(express.json())

app.use('/user', auth).use(authMiddleware)
app.use('/account', account).use(authMiddleware)
app.use('/trade', tradeRoutes).use(authMiddleware)

app.listen(3333, () => console.log('Server is running'))

module.exports = {
  app
}
