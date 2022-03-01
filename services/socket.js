// define module constructor that accepts the io variable
let io
module.exports = {
  updateAccountData,
  setIo: function (importIO) {
    io = importIO
  }
}

// elsewhere in the module
function updateAccountData (data) {
  const interv = setInterval(() => {
    if (io) {
      io.emit('account', data)
      clearInterval(interv)
    }
  }, 5000)
}
