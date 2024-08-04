const { DataTypes } = require('sequelize')


module.exports = (modelName, sequelize) => {
    return sequelize.define(modelName, {
        firstName: {
            type: DataTypes.STRING,
        },
        middleName: {
            type: DataTypes.STRING
        },
        lastName: {
            type: DataTypes.STRING
        },
        email: {
            type: DataTypes.STRING
        },
        username: {
            type: DataTypes.STRING
        },
        passwordHash: {
            type: DataTypes.STRING
        },
        salt: {
            type: DataTypes.STRING
        },
        roles: {
            type: DataTypes.JSON
        },
        active: {
            type: DataTypes.BOOLEAN
        },
    }, {
        // Other model options go here
    })
}