const EC = require('elliptic').ec

// can choose any algorithm curve
// secp256k1 used in Bitcoin wallet
const ec = new EC('secp256k1')

const key = ec.genKeyPair()
const publicKey = key.getPublic('hex')
const privateKey = key.getPrivate('hex')

console.log()
console.log('Private Key:', privateKey)

console.log()
console.log('Public key:', publicKey)