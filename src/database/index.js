const mongoose = require('mongoose')
const mongoUser = process.env.DB_USER
const mongoSecret = process.env.DB_SECRET
const mongoURI = `mongodb+srv://${mongoUser}:${mongoSecret}@luizbotapi.mzzrx.mongodb.net/luizbot?retryWrites=true&w=majority`
mongoose.connect(mongoURI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  useCreateIndex: true,
  useFindAndModify: true
})
mongoose.Promise = global.Promise

module.exports = mongoose
