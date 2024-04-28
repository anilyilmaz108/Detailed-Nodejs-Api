const winston = require('winston')
const { label, timestamp, prettyPrint, json } = winston.format
const dailyRotateFile = require('winston-daily-rotate-file')

const logger = winston.createLogger({
    defaultMeta: { api: 'Nodejs Uygulaması Endpointleri' },
    format: winston.format.combine(
        label({ label: 'Benim Api' }),
        timestamp(),
        prettyPrint(),
        json()
    ),
    level: "verbose",
    transports: [
        new dailyRotateFile({
            datePattern: "DD-MM-YYYY",
            filename: "myapp-%DATE%.log",
            dirname: './logs/logsFile'
        })
    ]
})
class MyLogger {
    logError(message) {
        logger.error(message)
    }
    logInfo(message) {
        logger.info(message)
    }
    logWarning(message) {
        logger.warn(message)
    }
}

module.exports = MyLogger