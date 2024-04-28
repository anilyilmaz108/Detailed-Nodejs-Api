const jwt = require('jsonwebtoken')

const token = jwt.sign({
    email: 'anilyilmaz108@gmail.com',
    ad: 'Anil',
    exp: Math.floor(Date.now() / 1000) + 60,
    issuer: 'www.anonymous.com'
}, 'secretKey')


const hashToPassword = (password) => {
    const md5 = require('md5')
    return md5(password)
}



module.exports = {
    token,
    hashToPassword
}
