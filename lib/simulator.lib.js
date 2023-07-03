const _ = require('lodash');
const simulatorConfig = require('../configs/simulator.config.json');

const web3Util = require('../util/web3.util');
const wrapperUtil = require('../util/wrapper.util');
const localBlockchainLib = require('./local.blockchain.lib');

const contractTypeEnum = require('../enum/contract.type.enum');
const ERC20_TRANSFER_TOPIC0 = "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef";

async function extractAssetChangesFromLogs(logs, web3) {
    return new Promise(async (resolve, reject) => {
        try {
            if (_.isEmpty(logs)) {
                resolve([]);
                return;
            }

            let erc20Balance = {};
            for (const log of logs) {
                if (log.topics && log.topics.length >= 1 && log.topics[0].toLowerCase() === ERC20_TRANSFER_TOPIC0) {
                    let contractType = await web3Util.classifyContract(log.address, web3);

                    if (contractType === contractTypeEnum.ERC20) {
                        let decodedLog = await web3Util.decodeErc20TransferLog(log, web3);
                        if (!erc20Balance[`${decodedLog.from}_${decodedLog.tokenAddress}`]) {
                            erc20Balance[`${decodedLog.from}_${decodedLog.tokenAddress}`] = 0 - parseInt(decodedLog.value);
                        } else {
                            erc20Balance[`${decodedLog.from}_${decodedLog.tokenAddress}`] -= parseInt(decodedLog.value);
                        }

                        if (!erc20Balance[`${decodedLog.to}_${decodedLog.tokenAddress}`]) {
                            erc20Balance[`${decodedLog.to}_${decodedLog.tokenAddress}`] = parseInt(decodedLog.value);
                        } else {
                            erc20Balance[`${decodedLog.to}_${log.address}`] += parseInt(decodedLog.value);
                        }
                    }
                }
            }

            let assetChanges = [];
            for (let assetChange in erc20Balance) {
                let [walletAddress, tokenAddress] = assetChange.split("_");
                let symbol = await web3Util.getTokenSymbol(tokenAddress, web3);
                let decimals = await web3Util.getTokenDecimals(tokenAddress, web3);
                assetChanges.push({
                    walletAddress: walletAddress,
                    tokenAddress: tokenAddress,
                    tokenType: contractTypeEnum.ERC20,
                    symbol: symbol,
                    decimals: decimals,
                    type: erc20Balance[assetChange] > 0 ? "IN" : "OUT",
                    balanceChange: Math.abs(erc20Balance[assetChange]) / 10 ** decimals
                })
            }

            resolve(assetChanges);
        } catch (error) {
            reject(error);
        }
    })
}

async function simulateAssetChanges(from, to, gas, gasPrice, value, input, maxFeePerGas, maxPriorityFeePerGas, chain, blockNumber = "latest") {
    return new Promise(async (resolve, reject) => {
        try {
            if (!from || !to || !gas || !gasPrice || !input || !chain || _.isNil(value)) {
                throw new Error("Missing required parameters!");
            }

            if (!_.includes(Object.keys(simulatorConfig.rpc), chain)) {
                throw new Error(`Invalid chain! Supported chains are ${Object.keys(simulatorConfig.rpc)}`);
            }

            const options = {
                wallet: {
                    unlockedAccounts: [from]
                }
            }
            let {web3, instanceId} = await localBlockchainLib.getForkedWeb3Instance(options);
            let txReceipt = await wrapperUtil.safeWrapper(web3.eth.sendTransaction, [{
                from: from,
                to: to,
                gas: parseInt(gas),
                gasPrice: parseInt(gasPrice),
                value: parseInt(value),
                input: input, ...(maxFeePerGas && {maxFeePerGas: parseInt(maxFeePerGas)}), ...(maxPriorityFeePerGas && {maxPriorityFeePerGas: parseInt(maxPriorityFeePerGas)})
            }]);

            if (!txReceipt || txReceipt.status === false) {
                throw new Error("Transaction failed!");
            }

            let assetChanges = await extractAssetChangesFromLogs(txReceipt.logs, web3);
            await localBlockchainLib.destroyWeb3Instance(instanceId);

            resolve(assetChanges);
        } catch (error) {
            reject(error);
        }
    });
}

module.exports = {
    simulateAssetChanges: simulateAssetChanges
}