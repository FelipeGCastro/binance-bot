const mongoose = require('../database')

const AccountSchema = new mongoose.Schema({
  id: {
    type: Number,
    unique: true,
    required: true
  },
  side: {
    type: String,
    required: false
  },
  stepOne: {
    type: Boolean,
    required: false,
    default: false
  },
  stepTwo: {
    type: Boolean,
    required: false,
    default: false
  },
  stepThree: {
    type: Boolean,
    required: false,
    default: false
  },
  stepFour: {
    type: Boolean,
    required: false,
    default: false
  },
  stepFive: {
    type: Boolean,
    required: false,
    default: false
  }
})

const Account = mongoose.model('Account', AccountSchema)

module.exports = Account
