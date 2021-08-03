function extractData (dataArray, index = 'CLOSE') {
  const type = {
    CLOSE: 4,
    HIGH: 2,
    LOW: 3
  }

  const data = []
  dataArray.forEach(kandle => {
    const close = Number(kandle[type[index]])
    data.push(close)
  })
  return data
}

function getTargetPrice (price, stopPrice) {
  let targetPrice
  const oldPrice = price
  const side = price < stopPrice
  const decreaseValue = price - stopPrice
  const perc = (Math.abs((decreaseValue / price) * 100) * 2)
  if (side) {
    targetPrice = price - (price * (perc / 100))
  } else {
    targetPrice = price + (price * (perc / 100))
  }
  console.log(targetPrice, 'price:', price, 'stopPrice', stopPrice, 'getTargetPrice')
  return priceMirrorFormat(targetPrice, oldPrice)
}

function priceMirrorFormat (number, format) {
  const decimals = format.split('.')[1].length
  const formatter = new Intl.NumberFormat('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals, useGrouping: false })
  console.log(number, format, formatter.format(parseFloat(number)), 'priceMirrorFormat')

  return Number(formatter.format(parseFloat(number)))
}

function getLasts (data, amount) {
  return data.slice(Math.max(data.length - amount, 1))
}

function addInArray (arr, newItens) {
  const lastCandle = arr[arr.length - 1]
  if (lastCandle[0] === newItens[0][0]) {
    console.log('penultimo')
    arr.pop()
    arr.concat(newItens)
    return arr
  } else if (lastCandle[0] === newItens[1][0]) {
    console.log('É o ultimo')
    arr.pop()
    arr.concat(newItens.pop())
    return arr
  }
}

// NEED TO FIND A WAY TO FORMAT NUMBERS BY COIN FORMAT

module.exports = {
  extractData,
  addInArray,
  getLasts,
  getTargetPrice,
  priceMirrorFormat
}
