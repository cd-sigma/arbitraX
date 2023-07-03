const util = require('util');
const chalk = require('chalk');
const timeUtil = require('../util/time.util');

function logError(message) {
    try {
        console.log(chalk.red(JSON.stringify({
            time: timeUtil.getCurrentIndianTimeForUnixTimestamp(timeUtil.getCurrentTimestamp()),
            message: util.inspect(message)
        })));
    } catch (error) {
        throw error;
    }
}

function logInfo(message) {
    try {
        console.log(chalk.green(JSON.stringify({
            time: timeUtil.getCurrentIndianTimeForUnixTimestamp(timeUtil.getCurrentTimestamp()), message: message
        })));
    } catch (error) {
        throw error;
    }
}

function logWarn(message) {
    try {
        console.log(chalk.yellow(JSON.stringify({
            time: timeUtil.getCurrentIndianTimeForUnixTimestamp(timeUtil.getCurrentTimestamp()), message: message
        })));
    } catch (error) {
        throw error;
    }
}

function logDebug(message) {
    try {
        console.log(chalk.white(JSON.stringify({
            time: timeUtil.getCurrentIndianTimeForUnixTimestamp(timeUtil.getCurrentTimestamp()), message: message
        })));
    } catch (error) {
        throw error;
    }
}

module.exports = {
    logError: logError, logInfo: logInfo, logWarn: logWarn, logDebug: logDebug
}
