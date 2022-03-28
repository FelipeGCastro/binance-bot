const express = require('express')
const socketio = require('socket.io')
// const auth = require('./controllers/authControllers')
// const account = require('./controllers/accountControler')
// const authMiddleware = require('./middlewares/auth')
const http = require('http')
const executePanda = require('../strategies/panda')

const app = express()
const httpServer = http.createServer(app)
const io = new socketio.Server(httpServer)

app.use(express.json())

// app.use('/user', auth).use(authMiddleware)
// app.use('/account', account).use(authMiddleware)

io.on('connection', (socket) => {
  console.log('New Conection:', socket.id)
  socket.emit()
  require('../services/socket').setIo(io)
})

httpServer.listen(process.env.PORT || 3333, () => {
  console.log('Server is running')
  executePanda(process.env.SYMBOL, true)
})
