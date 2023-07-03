const mongoose = require("mongoose")

const chainEnum = require("../enum/chain.enum")

const liquidityPoolSchema = new mongoose.Schema({
    chain: {
        type: String, default: chainEnum.ETH
    }, protocol: {
        type: String,
    }, address: {
        type: String,
    }, token0: {
        type: String,
    }, token1: {
        type: String,
    }, blockNumber: {
        type: Number,
    }
})

module.exports = mongoose.connection
    .useDb("arbitrax")
    .model("liquidity_pools", liquidityPoolSchema)
