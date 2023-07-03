require('dotenv').config({path: '../.env'});
const _ = require('lodash');

const web3Lib = require('../lib/web3.lib');
const mongoLib = require('../lib/mongo.lib');
const consoleLib = require('../lib/console.lib');
const helperUtil = require('../util/helper.util');

const PAIR_CREATED_TOPIC0 = "0x0d3648bd0f6ba80134a33ba9275ac585d9d315f0ad8355cddefde31afa28d0e9"
const GET_LOG_CALLS_BATCH_SIZE = 100;
const BLOCK_BATCH_SIZE = 500;

const dexConfig = require('../configs/dex.config');
const lpModel = require('../models/lp.model');

function getPairInfo(log) {
    try {
        return {
            address: '0x' + log.data.substring(26, 66).toLowerCase(),
            token0: helperUtil.removeLeadingZeroes(log.topics[1]).toLowerCase(),
            token1: helperUtil.removeLeadingZeroes(log.topics[2]).toLowerCase(),
            blockNumber: log.blockNumber,
        };
    } catch (error) {
        throw error;
    }
}

(async () => {
    try {
        await mongoLib.connect(process.env.MONGO_URL);
        const web3 = web3Lib.getWebSocketWeb3Instance(process.env.ETH_NODE_WS_URL);

        const dex = process.argv[2];

        if (_.isEmpty(dex)) {
            throw new Error('Provide dex name as argument');
        }

        if (!Object.keys(dexConfig).includes(dex)) {
            throw new Error('Invalid dex name');
        }

        let {address: factoryAddress, deployedOnBlock: startBlock} = dexConfig[dex].factory;
        let latestBlock = await web3.eth.getBlockNumber();

        let getLogCalls = [], dbWriteCalls = [], pairs = [], logs = [];
        for (let iterBlock = startBlock; iterBlock <= latestBlock; iterBlock += BLOCK_BATCH_SIZE) {
            getLogCalls.push(web3.eth.getPastLogs({
                fromBlock: iterBlock,
                toBlock: iterBlock + BLOCK_BATCH_SIZE,
                address: factoryAddress,
                topics: [PAIR_CREATED_TOPIC0]
            }));

            if (getLogCalls.length % GET_LOG_CALLS_BATCH_SIZE === 0 || iterBlock + BLOCK_BATCH_SIZE > latestBlock) {
                logs = await Promise.all(getLogCalls);
                logs = _.flatten(logs);
                getLogCalls = [];

                pairs = [];
                logs.forEach(log => {
                    pairs.push(getPairInfo(log));
                })

                dbWriteCalls = [];
                pairs.forEach(pair => {
                    dbWriteCalls.push({
                        updateOne: {
                            filter: {address: pair.address}, update: {$set: {...pair, protocol: dex}}, upsert: true
                        }
                    });
                });

                if (dbWriteCalls.length > 0) {
                    await mongoLib.bulkWrite(lpModel, dbWriteCalls);
                }

                consoleLib.logInfo({
                    lastBlock: iterBlock + BLOCK_BATCH_SIZE, pairsInserted: dbWriteCalls.length, logsCount: logs.length
                });
            }
        }
    } catch (error) {
        consoleLib.logError(error);
        process.exit(1);
    }
})();