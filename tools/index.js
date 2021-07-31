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
  addInArray
}
