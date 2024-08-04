const moment = require('moment')
const { DataTypes } = require('sequelize')

module.exports = (modelName, sequelize) => {
    return sequelize.define(modelName, {
        uid: {
            type: DataTypes.STRING,
        },
        accountType: {
            type: DataTypes.STRING,
        },
        idNumber: {
            type: DataTypes.STRING,
        },
        firstName: {
            type: DataTypes.STRING,
        },
        middleName: {
            type: DataTypes.STRING,
        },
        lastName: {
            type: DataTypes.STRING,
        },
        email: {
            type: DataTypes.STRING,
        },
        mobileNumber: {
            type: DataTypes.STRING,
        },
    }, {
        // Other model options go here
    })
}