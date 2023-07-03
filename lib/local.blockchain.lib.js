const fs = require('fs');
const {v4: uuidv4} = require('uuid');
const Web3 = require('web3');
const ganache = require('ganache');

const consoleLib = require('./console.lib');

async function getForkedWeb3Instance(extraOptions = {}, network = "mainnet", block = "latest") {
    return new Promise(async (resolve, reject) => {
        try {
            if (!fs.existsSync("../blockchain.db")) {
                fs.mkdirSync("../blockchain.db");
            }

            const instanceId = uuidv4();
            const options = {
                fork: {
                    network: network, blockNumber: block === "latest" ? block : parseInt(block) - 1
                }, logging: {
                    quiet: true
                }, database: {
                    dbPath: "../blockchain.db/" + instanceId
                }
            }

            const provider = ganache.provider({...options, ...extraOptions});
            const web3 = new Web3(provider);
            const latestBlockNumber = await web3.eth.getBlockNumber();

            consoleLib.logInfo({
                msg: "Forked Web3 instance created successfully!",
                instanceId: instanceId,
                network: network,
                block: latestBlockNumber
            })

            resolve({web3, instanceId});
        } catch (error) {
            reject(error);
        }
    })
}

async function destroyWeb3Instance(instanceId) {
    return new Promise((resolve, reject) => {
        try {
            fs.rmdirSync("../blockchain.db/" + instanceId, {recursive: true});
            resolve();
        } catch (error) {
            reject(error);
        }
    })
}

module.exports = {
    getForkedWeb3Instance: getForkedWeb3Instance, destroyWeb3Instance: destroyWeb3Instance
}