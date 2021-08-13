const mongoose = require('mongoose')

mongoose.connect('mongodb://localhost/luizbot', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  useCreateIndex: true,
  useFindAndModify: true
})
mongoose.Promise = global.Promise

module.exports = mongoose
