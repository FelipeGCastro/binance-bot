const express = require('express')
const { v4: uuidv4 } = require('uuid')

const app = express()
app.use(express.json())

app.get('/account', (request, response) => {

})
// app.post('/account', (request, response) => {
//   const { email, name } = request.body
//   const id = uuidv4
// })

app.listen(3333)

module.exports = {
  app
}
