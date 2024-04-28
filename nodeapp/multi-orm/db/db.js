const { Sequelize, DataTypes } = require('sequelize')
const db = {}
const sequelize = new Sequelize('manytomanydb', 'postgres', '176369', {
    dialect: 'postgres',
    logging: true,
    retry: 3
})
db.Sequelize = Sequelize
db.sequelize = sequelize

db.connect = () => {
    return new Promise(async(resolve, reject) => {
        try {
            await db.sequelize.authenticate({ logging: true })
            console.log('Bağlantı Başarıyla Gerçekleşti')
            resolve(db)

        } catch (error) {
            console.log('error', error)
            reject(error)
        }
    })
}
db.createTables = async() => {
    const User = require('../models/user-model')
    const Socials = require('../models/social-model')

    User.hasMany(Socials, { foreignKey: 'user_id', onDelete: 'CASCADE', hooks: true })
    Socials.belongsTo(User, { onDelete: 'CASCADE', hooks: true })
    sequelize.sync({ force: true })
}


module.exports = db