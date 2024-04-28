const jwt = require('jsonwebtoken')
const constants = require('../constants');

module.exports = (req, res, next) => {
    try {
        const decodedToken = jwt.verify(constants.token, 'secretKey')
        next();
    } catch (error) {
        if (error.name === "TokenExpiredError") {
            return res.status(401).send({
                message: 'Token Expired',
                status: -1
            })
        } else if (error.name === "JsonWebTokenError") {
            return res.status(401).send({
                message: ' Attempting to Access with an Invalid Token or Signature',
                status: -1
            })
        } else {
            return res.status(401).send({
                message: ' Unauthorized Access',
                status: -1
            })
        }
    }
}