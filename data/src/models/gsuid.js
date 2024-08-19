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
        suffix: {
            type: DataTypes.STRING,
        },
        gender: {
            type: DataTypes.STRING,
        },
        bloodType: {
            type: DataTypes.STRING,
        },
        birthDate: {
            type: DataTypes.STRING,
        },
        mobileNumber: {
            type: DataTypes.STRING,
        },
        email: {
            type: DataTypes.STRING,
        },
        guardianName: {
            type: DataTypes.STRING,
        },
        guardianNumber: {
            type: DataTypes.STRING,
        },
        address: {
            type: DataTypes.STRING,
        },
        status: {
            type: DataTypes.INTEGER,
        },
        course: {
            type: DataTypes.STRING,
        },
    }, {
        // Other model options go here
    })
}