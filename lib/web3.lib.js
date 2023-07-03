const _ = require("lodash");
const Web3 = require("web3");

const libConfig = require("../configs/lib.config");

function getWebSocketWeb3Instance(url) {
    try {
        if (_.isEmpty(url)) {
            throw new Error("url empty");
        }
        return new Web3(
            new Web3.providers.WebsocketProvider(url, {
                clientConfig: {
                    maxReceivedFrameSize: 10000000000,
                    maxReceivedMessageSize: 10000000000,
                },
            })
        );
    } catch (error) {
        throw error;
    }
}

async function getPastLogs(address, topics, fromBlock, toBlock, web3) {
    return new Promise(async (resolve, reject) => {
        try {
            if (
                _.isEmpty(address) ||
                _.isEmpty(topics) ||
                _.isNil(fromBlock) ||
                _.isNil(toBlock) ||
                _.isEmpty(web3)
            ) {
                throw new Error(
                    `Missing Params : address: ${address}, topics: ${topics}, fromBlock: ${fromBlock}, toBlock: ${toBlock}, web3: ${web3}`
                );
            }

            if (!_.isArray(topics)) {
                throw new Error(`topics is not an array`);
            }

            if (toBlock - fromBlock > libConfig.web3.getPastLogsMaxBLockRangeLimit) {
                throw new Error(
                    `max block range limit exceeded. fromBlock: ${fromBlock}, toBlock: ${toBlock}, maxBlockRangeLimit: ${libConfig.web3.getPastLogsMaxBLockRangeLimit}`
                );
            }

            let logs = await web3.eth.getPastLogs({
                address: address,
                topics: topics,
                fromBlock: fromBlock,
                toBlock: toBlock,
            });

            resolve(logs);
        } catch (error) {
            reject(error);
        }
    });
}

module.exports={
    getWebSocketWeb3Instance: getWebSocketWeb3Instance,
    getPastLogs: getPastLogs,
}