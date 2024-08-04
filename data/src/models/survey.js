const { DataTypes } = require('sequelize')

module.exports = (modelName, sequelize) => {
    return sequelize.define(modelName, {
        name: {
            type: DataTypes.STRING,
        },
        contact: {
            type: DataTypes.STRING,
        },
        dateVisited: {
            type: DataTypes.STRING,
        },
        respondentSelect: {
            type: DataTypes.STRING,
        },
        respondent: {
            type: DataTypes.STRING,
        },
        birthDate: {
            type: DataTypes.STRING,
        },
        gender: {
            type: DataTypes.STRING,
        },
        service: {
            type: DataTypes.STRING,
        },
        howLong: {
            type: DataTypes.STRING,
        },
        answerQuality: {
            type: DataTypes.STRING,
        },
        environment: {
            type: DataTypes.STRING,
        },
        patient: {
            type: DataTypes.STRING,
        },
        enthusiastic: {
            type: DataTypes.STRING,
        },
        responsive: {
            type: DataTypes.STRING,
        },
        friendly: {
            type: DataTypes.STRING,
        },
        responsiveness: {
            type: DataTypes.STRING,
        },
        reliability: {
            type: DataTypes.STRING,
        },
        access: {
            type: DataTypes.STRING,
        },
        communication: {
            type: DataTypes.STRING,
        },
        costs: {
            type: DataTypes.STRING,
        },
        integrity: {
            type: DataTypes.STRING,
        },
        assurance: {
            type: DataTypes.STRING,
        },
        outcome: {
            type: DataTypes.STRING,
        },
        comments: {
            type: DataTypes.STRING,
        },
    }, {
        // Other model options go here
    })
}
