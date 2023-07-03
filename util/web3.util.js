const { ethers } = require("ethers")
const _=require('lodash');

const wrapperUtil = require("./wrapper.util")
const contractTypeEnum = require("../enum/contract.type.enum")
const nftTransferTypeEnum = require("../enum/nft.transfer.type.enum")

const ERC1155_INTERFACE_ID = "0xd9b67a26"
const ERC721_INTERFACE_ID = "0x80ac58cd"
const ERC20_ABI = require("../abi/erc20.abi.json")
const ERC721_ABI = require("../abi/erc721.abi.json")
const ERC1155_ABI = require("../abi/erc1155.abi.json")
const NAME_STRING_ABI = require("../abi/name.string.abi.json")
const NAME_BYTES32_ABI = require("../abi/name.bytes32.abi.json")
const SYMBOL_STRING_ABI = require("../abi/symbol.string.abi.json")
const SYMBOL_BYTES32_ABI = require("../abi/symbol.bytes32.abi.json")
const ERC20_ERC721_TRANSFER_TOPIC0 =
    "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef"
const ERC1155_SINGLE_TRANSFER_TOPIC0 =
    "0xc3d58168c5ae7397731d063d5bbf3d657854427343f4c083240f7aacaa2d0f62"
const ERC1155_BATCH_TRANSFER_TOPIC0 =
    "0x4a39dc06d4c0dbc64b70af90fd698a233a518aa5d07e595d983b8c0526c8f7fb"
const RANDOM_ADDRESS = "0x786a45a142d812dfecb0d854b23b030987ec4671"
const SUPPORT_INTERFACE_ABI = require("../abi/support.interface.abi.json")

//this function is used to extract meaningful data from the log using the abi
function decodeLog(abi, log) {
    try {
        if (_.isEmpty(abi) || _.isEmpty(log)) {
            throw new Error(`abi or log is empty, abi:${abi}, log:${log}`)
        }

        const intrfc = new ethers.utils.Interface(abi)
        let decodedLog = intrfc.parseLog(log)
        return decodedLog
    } catch (error) {
        throw error
    }
}

//this function returns the sender and receiver in case of ERC20/ERC721 transfers
function getSenderAndReceiverFromTransferLog(log, web3) {
    try {
        if (_.isEmpty(log)) {
            throw new Error("log is empty")
        }

        if (_.isEmpty(web3)) {
            throw new Error("please provide web3 instance")
        }

        let topicsLength = log.topics.length
        let logDataSignature, decodedLogData
        switch (topicsLength) {
            case 1:
                logDataSignature = ["address", "address", "uint256"]
                decodedLogData = web3.eth.abi.decodeParameters(logDataSignature, log.data)
                return {
                    from: decodedLogData["0"].toLowerCase(),
                    to: decodedLogData["1"].toLowerCase(),
                }
            case 2:
                logDataSignature = ["address", "uint256"]
                decodedLogData = web3.eth.abi.decodeParameters(logDataSignature, log.data)
                return {
                    from: removeLeadingZeroes(log.topics[1]).toLowerCase(),
                    to: decodedLogData["0"].toLowerCase(),
                }
            case 3:
                logDataSignature = ["uint256"]
                decodedLogData = web3.eth.abi.decodeParameters(logDataSignature, log.data)
                return {
                    from: removeLeadingZeroes(log.topics[1]).toLowerCase(),
                    to: removeLeadingZeroes(log.topics[2]).toLowerCase(),
                }
            case 4:
                return {
                    from: removeLeadingZeroes(log.topics[1]).toLowerCase(),
                    to: removeLeadingZeroes(log.topics[2]).toLowerCase(),
                }
            default:
                return null
        }
    } catch (error) {
        throw error
    }
}

//this function extracts the addresses involved in ERC20/ERC721/ERC1155 transfers with the transaction hash
function extractTransactionsFromReceipts(transactionReceipts, web3) {
    try {
        if (_.isEmpty(transactionReceipts)) {
            throw new Error("transactionReceipts is empty")
        }

        if (_.isEmpty(web3)) {
            throw new Error("please provide web3 instance")
        }

        let txns = [],
            decodedLog

        for (const txReceipt of transactionReceipts) {
            //extract addresses from transaction receipt( ERC20, ERC721, ERC1155 transfer logs)
            if (txReceipt && txReceipt.logs) {
                for (const log of txReceipt.logs) {
                    if (log.topics.length > 0) {
                        //decode the transfer logs depending on the type of transfer and extract the from and to addresses
                        switch (log.topics[0]) {
                            case ERC20_ERC721_TRANSFER_TOPIC0:
                                decodedLog = getSenderAndReceiverFromTransferLog(log, web3)
                                txns.push({
                                    address: decodedLog.from.toLowerCase(),
                                    txHash: txReceipt.transactionHash.toLowerCase(),
                                })
                                txns.push({
                                    address: decodedLog.to.toLowerCase(),
                                    txHash: txReceipt.transactionHash.toLowerCase(),
                                })
                                break
                            case ERC1155_SINGLE_TRANSFER_TOPIC0:
                                decodedLog = decodeErc1155SingleTransferLog(log, web3)
                                txns.push({
                                    address: decodedLog.from.toLowerCase(),
                                    txHash: txReceipt.transactionHash.toLowerCase(),
                                })
                                txns.push({
                                    address: decodedLog.to.toLowerCase(),
                                    txHash: txReceipt.transactionHash.toLowerCase(),
                                })
                                break
                            case ERC1155_BATCH_TRANSFER_TOPIC0:
                                decodedLog = decodeErc1155BatchTransferLog(log, web3)
                                txns.push({
                                    address: decodedLog.from.toLowerCase(),
                                    txHash: txReceipt.transactionHash.toLowerCase(),
                                })
                                txns.push({
                                    address: decodedLog.to.toLowerCase(),
                                    txHash: txReceipt.transactionHash.toLowerCase(),
                                })
                                break
                            default:
                                break
                        }
                    }
                }
            }
        }
        return txns
    } catch (error) {
        throw error
    }
}

//this function extracts the addresses involved in a transaction from the traces
function extractTransactionsFromTraces(traces) {
    try {
        if (_.isEmpty(traces)) {
            throw new Error("traces is empty")
        }

        let txns = []
        traces.forEach((trace) => {
            if (trace.action && trace.action.from) {
                txns.push({
                    address: trace.action.from.toLowerCase(),
                    txHash: trace.transactionHash.toLowerCase(),
                })
            }
            if (trace.action && trace.action.to) {
                txns.push({
                    address: trace.action.to.toLowerCase(),
                    txHash: trace.transactionHash.toLowerCase(),
                })
            }
        })
        return txns
    } catch (error) {
        throw new Error(error)
    }
}

//this function is used to check if a contract is ERC20
async function checkContractIsErc20(address, web3) {
    return new Promise(async (resolve, reject) => {
        try {
            if (_.isEmpty(address)) {
                throw new Error("address is required")
            }

            if (_.isEmpty(web3)) {
                throw new Error("Please provide a web3 instance")
            }

            let contract = new web3.eth.Contract(ERC20_ABI, address)
            //classify the contract as ERC20 by checking if it has the decimals() function
            let doesDecimalsMethodExist = await wrapperUtil.hypotheticalCallWrapper(
                contract.methods.decimals().call,
            )
            let doesBalanceOfMethodExist = await wrapperUtil.hypotheticalCallWrapper(
                contract.methods.balanceOf(RANDOM_ADDRESS).call,
            )
            resolve(doesDecimalsMethodExist !== null && doesBalanceOfMethodExist !== null)
        } catch (error) {
            reject(error)
        }
    })
}

//this function is used to check if a contract is ERC721
async function checkContractIsErc721(address, web3) {
    return new Promise(async (resolve, reject) => {
        try {
            if (_.isEmpty(address)) {
                throw new Error("address is required")
            }

            if (_.isEmpty(web3)) {
                throw new Error("Please provide a web3 instance")
            }

            let contract = new web3.eth.Contract(SUPPORT_INTERFACE_ABI, address)
            //classify the contract as ERC721 by calling the supportsInterface() function with the ERC721 interface ID
            let resp = await wrapperUtil.hypotheticalCallWrapper(
                contract.methods.supportsInterface(ERC721_INTERFACE_ID).call,
            )
            resolve(resp === null ? false : resp)
        } catch (error) {
            reject(error)
        }
    })
}

//this function is used to check if a contract is ERC1155
async function checkContractIsErc1155(address, web3) {
    return new Promise(async (resolve, reject) => {
        try {
            if (_.isEmpty(address)) {
                throw new Error("address is required")
            }

            if (_.isEmpty(web3)) {
                throw new Error("Please provide a web3 instance")
            }

            let contract = new web3.eth.Contract(SUPPORT_INTERFACE_ABI, address)
            //classify the contract as ERC1155 by calling the supportsInterface() function with the ERC1155 interface ID
            let isErc1155 = await wrapperUtil.hypotheticalCallWrapper(
                contract.methods.supportsInterface(ERC1155_INTERFACE_ID).call,
            )
            resolve(isErc1155 === null ? false : isErc1155)
        } catch (error) {
            reject(error)
        }
    })
}

//this function is used to classify a contract as ERC20, ERC721, ERC1155 or OTHER
async function classifyContract(address, web3) {
    return new Promise(async (resolve, reject) => {
        try {
            if (_.isEmpty(address)) {
                throw new Error("address is required")
            }

            if (_.isEmpty(web3)) {
                throw new Error("Please provide a web3 instance")
            }

            let isErc20 = await checkContractIsErc20(address, web3)
            if (isErc20) {
                resolve(contractTypeEnum.ERC20)
                return
            }
            let isErc721 = await checkContractIsErc721(address, web3)
            if (isErc721) {
                resolve(contractTypeEnum.ERC721)
                return
            }
            let isErc1155 = await checkContractIsErc1155(address, web3)
            if (isErc1155) {
                resolve(contractTypeEnum.ERC1155)
                return
            }
            resolve(contractTypeEnum.OTHER)
        } catch (error) {
            reject(error)
        }
    })
}

//this function is used to get the name of a token
async function getTokenName(address, web3) {
    return new Promise(async (resolve, reject) => {
        try {
            if (_.isEmpty(address)) {
                throw new Error("address is required")
            }

            if (_.isEmpty(web3)) {
                throw new Error("Please provide a web3 instance")
            }

            //first try to get the name as a string
            let contract = new web3.eth.Contract(NAME_STRING_ABI, address)
            let name = await wrapperUtil.hypotheticalCallWrapper(contract.methods.name().call)
            if (name === null) {
                //if the name is not a string, try to get it as a bytes32
                contract = new web3.eth.Contract(NAME_BYTES32_ABI, address)
                let nameBytes32 = await wrapperUtil.hypotheticalCallWrapper(contract.methods.name().call)
                if (nameBytes32 !== null) {
                    name = await wrapperUtil.hypotheticalCallWrapper(web3.utils.hexToUtf8, [nameBytes32])
                    name = name === null ? "" : name
                } else {
                    //if the name is not a string or bytes32, return an empty string
                    name = ""
                }
            }
            resolve(name)
        } catch (error) {
            reject(error)
        }
    })
}

//this function is used to get the symbol of a token
async function getTokenSymbol(address, web3) {
    return new Promise(async (resolve, reject) => {
        try {
            if (_.isEmpty(address)) {
                throw new Error("address is required")
            }

            if (_.isEmpty(web3)) {
                throw new Error("Please provide a web3 instance")
            }

            //First try to get the symbol as a string
            let contract = new web3.eth.Contract(SYMBOL_STRING_ABI, address)
            let symbol = await wrapperUtil.hypotheticalCallWrapper(contract.methods.symbol().call)
            if (symbol === null) {
                //If the symbol is not a string, try to get it as a bytes32
                contract = new web3.eth.Contract(SYMBOL_BYTES32_ABI, address)
                let symbolBytes32 = await wrapperUtil.hypotheticalCallWrapper(
                    contract.methods.symbol().call,
                )
                if (symbolBytes32 !== null) {
                    symbol = await wrapperUtil.hypotheticalCallWrapper(web3.utils.hexToUtf8, [symbolBytes32])
                    symbol = symbol === null ? "" : symbol
                } else {
                    //If the symbol is not a string or bytes32, return an empty string
                    symbol = ""
                }
            }
            resolve(symbol)
        } catch (error) {
            reject(error)
        }
    })
}

//this function is used to get the decimals of a token
async function getTokenDecimals(address, web3) {
    return new Promise(async (resolve, reject) => {
        try {
            if (_.isEmpty(address)) {
                throw new Error("address is required")
            }

            if (_.isEmpty(web3)) {
                throw new Error("please pass a web3 instance")
            }

            let contract = new web3.eth.Contract(ERC20_ABI, address)
            let decimals = await wrapperUtil.hypotheticalCallWrapper(contract.methods.decimals().call)
            resolve(decimals)
        } catch (error) {
            reject(error)
        }
    })
}

//this function is used to get the metadata of a token (name, symbol, decimals)
async function getContractMetadata(address, contractType, web3) {
    return new Promise(async (resolve, reject) => {
        try {
            if (_.isEmpty(address) || _.isEmpty(contractType)) {
                throw new Error("address and contractType are required")
            }

            if (!Object.keys(contractTypeEnum).includes(contractType)) {
                throw new Error("invalid contractType")
            }

            if (_.isEmpty(web3)) {
                throw new Error("Please provide a web3 instance")
            }

            let name, symbol, decimals
            switch (contractType) {
                //if the contract is ERC20, get the name, symbol and decimals
                case contractTypeEnum.ERC20:
                    name = await getTokenName(address, web3)
                    symbol = await getTokenSymbol(address, web3)
                    decimals = await getTokenDecimals(address, web3) //promise.all
                    resolve({
                        name,
                        symbol,
                        decimals,
                    })
                    break
                //if the contract is ERC721, get the name and symbol
                case contractTypeEnum.ERC721:
                    name = await getTokenName(address, web3)
                    symbol = await getTokenSymbol(address, web3)
                    resolve({
                        name,
                        symbol,
                    })
                    break
                //if the contract is ERC1155, get the name and symbol
                case contractTypeEnum.ERC1155:
                    name = await getTokenName(address, web3)
                    symbol = await getTokenSymbol(address, web3)
                    resolve({
                        name,
                        symbol,
                    })
                    break
                default:
                    resolve(null)
            }
        } catch (error) {
            reject(error)
        }
    })
}

//this function is used to extract the logs from a list of transaction receipts
function extractLogsFromReceipts(transactionReceipts) {
    try {
        if (_.isEmpty(transactionReceipts)) {
            throw new Error("Transaction receipts is empty")
        }

        let logs = []
        transactionReceipts.forEach((transactionReceipt) => {
            logs = logs.concat(transactionReceipt.logs)
        })
        return logs
    } catch (error) {
        throw new Error(error)
    }
}

//this function is used to get the balance of a ERC20 token for a given address
async function getTokenBalanceForErc20Token(address, token, web3) {
    return new Promise(async (resolve, reject) => {
        try {
            if (_.isEmpty(address) || _.isEmpty(token)) {
                throw new Error(
                    `Value of address or token is empty, address: ${address}, token: ${token}`,
                )
            }

            if (_.isEmpty(web3)) {
                throw new Error("Please provide web3 instance")
            }

            let contract = new web3.eth.Contract(ERC20_ABI, token)
            let rawBalance = await contract.methods.balanceOf(address).call()
            let decimals = await contract.methods.decimals().call()
            resolve(rawBalance / Math.pow(10, decimals))
        } catch (error) {
            reject(error)
        }
    })
}

//this function is used to get the owner of a ERC721 token
async function getTokenOwnerForErc721Token(tokenId, tokenAddress, web3) {
    return new Promise(async (resolve, reject) => {
        try {
            if (_.isEmpty(tokenId) || _.isEmpty(tokenAddress)) {
                throw new Error(
                    `Value of tokenId or tokenAddress is empty, tokenId: ${tokenId}, tokenAddress: ${tokenAddress}`,
                )
            }

            if (_.isEmpty(web3)) {
                throw new Error("Please provide web3 instance")
            }

            let contract = new web3.eth.Contract(ERC721_ABI, tokenAddress)
            let owner = await wrapperUtil.hypotheticalCallWrapper(contract.methods.ownerOf(tokenId).call)
            resolve(owner)
        } catch (error) {
            reject(error)
        }
    })
}

//this function is used to extract the tokenIds from a ERC1155 batch transfer log
function getTokenIdsFromErc1155BatchTransferLog(log, web3) {
    try {
        if (_.isEmpty(log)) {
            throw new Error("Log is empty")
        }

        if (_.isEmpty(web3)) {
            throw new Error("Please provide web3 instance")
        }

        //log data is of type [tokenIds[], noOfTokens[]]
        let logDataSignature = ["uint256[]", "uint256[]"]
        let decodedLogData = web3.eth.abi.decodeParameters(logDataSignature, log.data)
        //the token ids are the first parameter of the log data
        let tokenIds = decodedLogData["0"].forEach((tokenId) => {
            tokenIds.push(BigInt(tokenId))
        })
        return tokenIds
    } catch (error) {
        throw error
    }
}

//this function is used to get the balance of a ERC1155 token for a given address
async function getTokenBalanceForErc1155Token(walletAddress, tokenAddress, tokenId, web3) {
    return new Promise(async (resolve, reject) => {
        try {
            if (
                _.isEmpty(walletAddress) ||
                _.isEmpty(tokenAddress) ||
                _.isEmpty(tokenId)
            ) {
                throw new Error(
                    `Wallet address, token address or token id is empty: ${walletAddress}, ${tokenAddress}, ${tokenId}`,
                )
            }

            if (_.isEmpty(web3)) {
                throw new Error(`Please provide a web3 instance`)
            }

            let contract = new web3.eth.Contract(ERC1155_ABI, tokenAddress)
            let balance = await contract.methods.balanceOf(walletAddress, tokenId).call()
            resolve(parseInt(balance))
        } catch (error) {
            reject(error)
        }
    })
}

//this function is used remove the leading zeroes from a log topic containing an address
function removeLeadingZeroes(hex) {
    try {
        if (_.isEmpty(hex) || !_.isString(hex)) {
            throw new Error(`Hex string is empty or not string: ${hex}`)
        }

        hex = hex.substring(2)
        hex = hex.substring(24)
        hex = "0x" + hex
        return hex
    } catch (error) {
        throw error
    }
}

//this function is used to decode an ERC20 transfer log, it returns the from, to and value
function decodeErc20TransferLog(log, web3) {
    try {
        if (_.isEmpty(log)) {
            throw new Error("Log is empty")
        }

        if (_.isEmpty(web3)) {
            throw new Error("Please provide web3 instance")
        }

        let topicsLength = log.topics.length
        let logDataSignature, decodedLogData

        switch (topicsLength) {
            case 1:
                logDataSignature = ["address", "address", "uint256"]
                decodedLogData = web3.eth.abi.decodeParameters(logDataSignature, log.data)
                return {
                    tokenAddress: log.address.toLowerCase(),
                    from: decodedLogData["0"].toLowerCase(),
                    to: decodedLogData["1"].toLowerCase,
                    value: BigInt(decodedLogData["2"]),
                }
            case 2:
                logDataSignature = ["address", "uint256"]
                decodedLogData = web3.eth.abi.decodeParameters(logDataSignature, log.data)
                return {
                    tokenAddress: log.address.toLowerCase(),
                    from: removeLeadingZeroes(log.topics[1]).toLowerCase(),
                    to: decodedLogData["0"].toLowerCase(),
                    value: BigInt(decodedLogData["1"]),
                }
            case 3:
                logDataSignature = ["uint256"]
                decodedLogData = web3.eth.abi.decodeParameters(logDataSignature, log.data)
                return {
                    tokenAddress: log.address.toLowerCase(),
                    from: removeLeadingZeroes(log.topics[1]).toLowerCase(),
                    to: removeLeadingZeroes(log.topics[2]).toLowerCase(),
                    value: BigInt(decodedLogData["0"]),
                }
            case 4:
                return {
                    tokenAddress: log.address.toLowerCase(),
                    from: removeLeadingZeroes(log.topics[1]).toLowerCase(),
                    to: removeLeadingZeroes(log.topics[2]).toLowerCase(),
                    value: BigInt(log.topics[3]),
                }
            default:
                return null
        }
    } catch (error) {
        throw error
    }
}

//this function is used to decode an ERC721 transfer log, it returns the from, to and tokenId
function decodeErc721TransferLog(log, web3) {
    try {
        if (_.isEmpty(log)) {
            throw new Error("Log is empty")
        }

        if (_.isEmpty(web3)) {
            throw new Error("Please provide web3 instance")
        }
        let topicsLength = log.topics.length
        let logDataSignature, decodedLogData

        switch (topicsLength) {
            case 1:
                logDataSignature = ["address", "address", "uint256"]
                decodedLogData = web3.eth.abi.decodeParameters(logDataSignature, log.data)
                return {
                    tokenAddress: log.address.toLowerCase(),
                    from: decodedLogData["0"].toLowerCase(),
                    to: decodedLogData["1"].toLowerCase(),
                    tokenId: BigInt(decodedLogData["2"]),
                }
            case 2:
                logDataSignature = ["address", "uint256"]
                decodedLogData = web3.eth.abi.decodeParameters(logDataSignature, log.data)
                return {
                    tokenAddress: log.address.toLowerCase(),
                    from: removeLeadingZeroes(log.topics[1]).toLowerCase(),
                    to: decodedLogData["0"].toLowerCase(),
                    tokenId: BigInt(decodedLogData["1"]),
                }
            case 3:
                logDataSignature = ["uint256"]
                decodedLogData = web3.eth.abi.decodeParameters(logDataSignature, log.data)
                return {
                    tokenAddress: log.address.toLowerCase(),
                    from: removeLeadingZeroes(log.topics[1]).toLowerCase(),
                    to: removeLeadingZeroes(log.topics[2]).toLowerCase(),
                    tokenId: BigInt(decodedLogData["0"]),
                }
            case 4:
                return {
                    tokenAddress: log.address.toLowerCase(),
                    from: removeLeadingZeroes(log.topics[1]).toLowerCase(),
                    to: removeLeadingZeroes(log.topics[2]).toLowerCase(),
                    tokenId: BigInt(log.topics[3]),
                }
            default:
                return null
        }
    } catch (error) {
        throw error
    }
}

//this function is used to decode an ERC1155 batch transfer log, it returns the operator, from, to, tokenId and value
function decodeErc1155SingleTransferLog(log, web3) {
    try {
        if (_.isEmpty(log)) {
            throw new Error("Log is empty")
        }

        if (_.isEmpty(web3)) {
            throw new Error("Please provide web3 instance")
        }

        let topicsLength = log.topics.length
        let logDataSignature, decodedLogData

        switch (topicsLength) {
            case 1:
                logDataSignature = ["address", "address", "address", "uint256", "uint256"]
                decodedLogData = web3.eth.abi.decodeParameters(logDataSignature, log.data)
                return {
                    tokenAddress: log.address.toLowerCase(),
                    operator: decodedLogData["0"].toLowerCase(),
                    from: decodedLogData["1"].toLowerCase(),
                    to: decodedLogData["2"].toLowerCase(),
                    tokenId: BigInt(decodedLogData["3"]),
                    value: BigInt(decodedLogData["4"]),
                }
            case 2:
                logDataSignature = ["address", "address", "uint256", "uint256"]
                decodedLogData = web3.eth.abi.decodeParameters(logDataSignature, log.data)
                return {
                    tokenAddress: log.address.toLowerCase(),
                    operator: removeLeadingZeroes(log.topics[1]).toLowerCase(),
                    from: decodedLogData["0"].toLowerCase(),
                    to: decodedLogData["1"].toLowerCase(),
                    tokenId: BigInt(decodedLogData["2"]),
                    value: BigInt(decodedLogData["3"]),
                }
            case 3:
                logDataSignature = ["address", "uint256", "uint256"]
                decodedLogData = web3.eth.abi.decodeParameters(logDataSignature, log.data)
                return {
                    tokenAddress: log.address.toLowerCase(),
                    operator: removeLeadingZeroes(log.topics[1]).toLowerCase(),
                    from: removeLeadingZeroes(log.topics[2]).toLowerCase(),
                    to: decodedLogData["0"].toLowerCase(),
                    tokenId: BigInt(decodedLogData["1"]),
                    value: BigInt(decodedLogData["2"]),
                }
            case 4:
                logDataSignature = ["uint256", "uint256"]
                decodedLogData = web3.eth.abi.decodeParameters(logDataSignature, log.data)
                return {
                    tokenAddress: log.address.toLowerCase(),
                    operator: removeLeadingZeroes(log.topics[1]).toLowerCase(),
                    from: removeLeadingZeroes(log.topics[2]).toLowerCase(),
                    to: removeLeadingZeroes(log.topics[3]).toLowerCase(),
                    tokenId: BigInt(decodedLogData["0"]),
                    value: BigInt(decodedLogData["1"]),
                }
            case 5:
                logDataSignature = ["uint256"]
                decodedLogData = web3.eth.abi.decodeParameters(logDataSignature, log.data)
                return {
                    tokenAddress: log.address.toLowerCase(),
                    operator: removeLeadingZeroes(log.topics[1]).toLowerCase(),
                    from: removeLeadingZeroes(log.topics[2]).toLowerCase(),
                    to: removeLeadingZeroes(log.topics[3]).toLowerCase(),
                    tokenId: BigInt(log.topics[4]),
                    value: BigInt(decodedLogData["0"]),
                }
            case 6:
                return {
                    tokenAddress: log.address.toLowerCase(),
                    operator: removeLeadingZeroes(log.topics[1]).toLowerCase(),
                    from: removeLeadingZeroes(log.topics[2]).toLowerCase(),
                    to: removeLeadingZeroes(log.topics[3]).toLowerCase(),
                    tokenId: BigInt(log.topics[4]),
                    value: BigInt(log.topics[5]),
                }
            default:
                return null
        }
    } catch (error) {
        throw error
    }
}

//this function is used to decode an ERC1155 batch transfer log, it returns the operator, from, to, tokenIds and values
function decodeErc1155BatchTransferLog(log, web3) {
    try {
        if (_.isEmpty(log)) {
            throw new Error("Log is empty")
        }

        if (_.isEmpty(web3)) {
            throw new Error("Please provide web3 instance")
        }

        let topicsLength = log.topics.length
        let logDataSignature, decodedLogData

        switch (topicsLength) {
            case 1:
                logDataSignature = ["address", "address", "address", "uint256[]", "uint256[]"]
                decodedLogData = web3.eth.abi.decodeParameters(logDataSignature, log.data)
                return {
                    tokenAddress: log.address.toLowerCase(),
                    operator: decodedLogData["0"].toLowerCase(),
                    from: decodedLogData["1"].toLowerCase(),
                    to: decodedLogData["2"].toLowerCase(),
                    tokenIds: decodedLogData["3"].map((tokenId) => BigInt(tokenId)),
                    values: decodedLogData["4"].map((value) => BigInt(value)),
                }
            case 2:
                logDataSignature = ["address", "address", "uint256[]", "uint256[]"]
                decodedLogData = web3.eth.abi.decodeParameters(logDataSignature, log.data)
                return {
                    tokenAddress: log.address.toLowerCase(),
                    operator: removeLeadingZeroes(log.topics[1]).toLowerCase(),
                    from: decodedLogData["0"].toLowerCase(),
                    to: decodedLogData["1"].toLowerCase(),
                    tokenIds: decodedLogData["2"].map((tokenId) => BigInt(tokenId)),
                    values: decodedLogData["3"].map((value) => BigInt(value)),
                }
            case 3:
                logDataSignature = ["address", "uint256[]", "uint256[]"]
                decodedLogData = web3.eth.abi.decodeParameters(logDataSignature, log.data)
                return {
                    tokenAddress: log.address.toLowerCase(),
                    operator: removeLeadingZeroes(log.topics[1]).toLowerCase(),
                    from: removeLeadingZeroes(log.topics[2]).toLowerCase(),
                    to: decodedLogData["0"].toLowerCase(),
                    tokenIds: decodedLogData["1"].map((tokenId) => BigInt(tokenId)),
                    values: decodedLogData["2"].map((value) => BigInt(value)),
                }
            case 4:
                logDataSignature = ["uint256[]", "uint256[]"]
                decodedLogData = web3.eth.abi.decodeParameters(logDataSignature, log.data)
                return {
                    tokenAddress: log.address.toLowerCase(),
                    operator: removeLeadingZeroes(log.topics[1]).toLowerCase(),
                    from: removeLeadingZeroes(log.topics[2]).toLowerCase(),
                    to: removeLeadingZeroes(log.topics[3]).toLowerCase(),
                    tokenIds: decodedLogData["0"].map((tokenId) => BigInt(tokenId)),
                    values: decodedLogData["1"].map((value) => BigInt(value)),
                }
            case 5:
                logDataSignature = ["uint256[]"]
                decodedLogData = web3.eth.abi.decodeParameters(logDataSignature, log.data)
                return {
                    tokenAddress: log.address.toLowerCase(),
                    operator: removeLeadingZeroes(log.topics[1]).toLowerCase(),
                    from: removeLeadingZeroes(log.topics[2]).toLowerCase(),
                    to: removeLeadingZeroes(log.topics[3]).toLowerCase(),
                    tokenIds: log.topics[4].map((tokenId) => BigInt(tokenId)),
                    values: decodedLogData["0"].map((value) => BigInt(value)),
                }
            case 6:
                return {
                    tokenAddress: log.address.toLowerCase(),
                    operator: removeLeadingZeroes(log.topics[1]).toLowerCase(),
                    from: removeLeadingZeroes(log.topics[2]).toLowerCase(),
                    to: removeLeadingZeroes(log.topics[3]).toLowerCase(),
                    tokenIds: log.topics[4].map((tokenId) => BigInt(tokenId)),
                    values: log.topics[5].map((value) => BigInt(value)),
                }
            default:
                return null
        }
    } catch (error) {
        throw error
    }
}

async function checkIfAddressIsContract(address, web3) {
    return new Promise(async (resolve, reject) => {
        try {
            if (_.isEmpty(address)) {
                throw new Error("Address is empty")
            }

            if (_.isEmpty(web3)) {
                throw new Error("Please provide web3 instance")
            }

            let bytecode = await web3.eth.getCode(address)
            if (bytecode === "0x") {
                resolve(false)
            } else {
                resolve(true)
            }
        } catch (error) {
            reject(error)
        }
    })
}

function extractAddressesFromTraces(traces) {
    try {
        if (_.isEmpty(traces)) {
            throw new Error("Traces is empty")
        }

        let addresses = []
        traces.forEach((trace) => {
            if (trace.type === "call" && trace.action && trace.action.to !== null) {
                addresses.push(trace.action.to.toLowerCase())
            }
            if (trace.type === "call" && trace.action && trace.action.from) {
                addresses.push(trace.action.from.toLowerCase())
            }
            if (trace.type === "create" && trace.result && trace.result.address) {
                addresses.push(trace.result.address.toLowerCase())
            }
        })

        // remove duplicates
        addresses = [...new Set(addresses)]

        return addresses
    } catch (error) {
        throw error
    }
}

async function extractNftTransfersFromLogs(logs, web3) {
    return new Promise(async (resolve, reject) => {
        try {
            if (_.isEmpty(logs)) {
                throw new Error("Logs is empty")
            }

            let nftTransfers = [],
                isErc721,
                decodedLog
            for (const log of logs) {
                if (log.topics && log.topics.length > 0) {
                    switch (log.topics[0]) {
                        case ERC20_ERC721_TRANSFER_TOPIC0:
                            isErc721 = await checkContractIsErc721(log.address, web3)
                            if (isErc721) {
                                decodedLog = decodeErc721TransferLog(log, web3)
                                nftTransfers.push({
                                    token_standard: contractTypeEnum.ERC721,
                                    transfer_type: nftTransferTypeEnum.SINGLE,
                                    evt_index: log.logIndex,
                                    contract_address: decodedLog.tokenAddress,
                                    token_id: decodedLog.tokenId,
                                    amount: 1,
                                    from: decodedLog.from,
                                    to: decodedLog.to,
                                    executed_by: decodedLog.from, //TODO: take tx sender
                                    tx_hash: log.transactionHash,
                                })
                            }
                            break
                        case ERC1155_SINGLE_TRANSFER_TOPIC0:
                            decodedLog = decodeErc1155SingleTransferLog(log, web3)
                            nftTransfers.push({
                                token_standard: contractTypeEnum.ERC1155,
                                transfer_type: nftTransferTypeEnum.SINGLE,
                                evt_index: log.logIndex,
                                contract_address: decodedLog.tokenAddress,
                                token_id: decodedLog.tokenId,
                                amount: decodedLog.value,
                                from: decodedLog.from,
                                to: decodedLog.to,
                                executed_by: decodedLog.from, //TODO: take tx sender
                                tx_hash: log.transactionHash,
                            })
                            break
                        case ERC1155_BATCH_TRANSFER_TOPIC0:
                            decodedLog = decodeErc1155BatchTransferLog(log, web3)
                            decodedLog.tokenIds.forEach((tokenId, index) => {
                                nftTransfers.push({
                                    token_standard: contractTypeEnum.ERC1155,
                                    transfer_type: nftTransferTypeEnum.BATCH,
                                    evt_index: log.logIndex,
                                    contract_address: decodedLog.tokenAddress,
                                    token_id: tokenId,
                                    amount: decodedLog.values[index],
                                    from: decodedLog.from,
                                    to: decodedLog.to,
                                    executed_by: decodedLog.from, //TODO: take tx sender
                                    tx_hash: log.transactionHash,
                                })
                            })
                            break
                        default:
                            break
                    }
                }
            }

            resolve(nftTransfers)
        } catch (error) {
            reject(error)
        }
    })
}

module.exports = {
    checkContractIsErc20: checkContractIsErc20,
    checkContractIsErc721: checkContractIsErc721,
    checkContractIsErc1155: checkContractIsErc1155,
    classifyContract: classifyContract,
    decodeLog: decodeLog,
    getContractMetadata: getContractMetadata,
    extractLogsFromReceipts: extractLogsFromReceipts,
    getTokenName: getTokenName,
    getTokenSymbol: getTokenSymbol,
    getTokenDecimals: getTokenDecimals,
    getTokenBalanceForErc20Token: getTokenBalanceForErc20Token,
    getTokenOwnerForErc721Token: getTokenOwnerForErc721Token,
    getTokenIdsFromErc1155BatchTransferLog: getTokenIdsFromErc1155BatchTransferLog,
    getTokenBalanceForErc1155Token: getTokenBalanceForErc1155Token,
    decodeErc20TransferLog: decodeErc20TransferLog,
    decodeErc721TransferLog: decodeErc721TransferLog,
    decodeErc1155SingleTransferLog: decodeErc1155SingleTransferLog,
    decodeErc1155BatchTransferLog: decodeErc1155BatchTransferLog,
    extractTransactionsFromReceipts: extractTransactionsFromReceipts,
    extractTransactionsFromTraces: extractTransactionsFromTraces,
    extractAddressesFromTraces: extractAddressesFromTraces,
    checkIfAddressIsContract: checkIfAddressIsContract,
    extractNftTransfersFromLogs: extractNftTransfersFromLogs,
}
