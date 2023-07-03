//This function is used to wrap a function call that may fail
async function safeWrapper(call, args = []) {
    return new Promise(async (resolve, reject) => {
        try {
            let result = await call(...(args || []))
            resolve(result)
        } catch (error) {
            resolve(null)
        }
    })
}

module.exports = {
    safeWrapper: safeWrapper
}