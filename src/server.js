const express = require('express')

const account = require('./controllers/authControllers')
const pair = require('./controllers/pairController')

const app = express()
app.use(express.json())

app.use('/account', account)
app.use('/pair', pair)

app.listen(3333, () => console.log('Server is running'))

module.exports = {
  app
}
