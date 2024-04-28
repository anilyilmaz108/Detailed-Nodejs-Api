const { DataTypes } = require('sequelize')
const db = require('../db/db')
const Socials = db.sequelize.define('Socials', {
    id: {
        type: DataTypes.BIGINT,
        allowNull: false,
        primaryKey: true,
        autoIncrement: true,
        unique: true,
    },
    socialMediaName: {
        type: DataTypes.STRING({ length: 50 }),
    },


}, {
    createdAt: true,
    updatedAt: true,
    deletedAt: true,
    modelName: 'Socials',
    tableName: 'social',
    timestamps: true,
    version: true,
    underscored: true
})



module.exports = Socials