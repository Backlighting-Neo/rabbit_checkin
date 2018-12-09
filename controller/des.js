const crypto = require('crypto')

// DES 加密
function desEncrypt(message, key) {
  key = key.length >= 8 ? key.slice(0, 8) : key.concat('0'.repeat(8 - key.length))
  const keyHex = new Buffer(key)
  const cipher = crypto.createCipheriv('des-cbc', keyHex, keyHex)
  let c = cipher.update(message, 'utf8', 'base64')
  c += cipher.final('base64')
  return c
}

// DES 解密
function desDecrypt(text, key) {
  key = key.length >= 8 ? key.slice(0, 8) : key.concat('0'.repeat(8 - key.length))
  const keyHex = new Buffer(key)
  const cipher = crypto.createDecipheriv('des-cbc', keyHex, keyHex)
  let c = cipher.update(text, 'base64', 'utf8')
  c += cipher.final('utf8')
  return c
}

module.exports = {
  desEncrypt,
  desDecrypt
};
