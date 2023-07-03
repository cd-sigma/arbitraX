const mongoose = require("mongoose")

const consoleLib = require("./console.lib")

async function connect(url) {
    return new Promise(async (resolve, reject) => {
        try {
            mongoose.set("strictQuery", false)
            mongoose.connect(url)
            //TODO listen all events here
            const connection = mongoose.connection
            connection.once("open", () => {
                consoleLib.logInfo("MongoDB connected")
                resolve()
            })
        } catch (error) {
            reject(error)
        }
    })
}

function isConnected() {
    try {
        let isConnected = mongoose.connection.readyState === 1
        return isConnected
    } catch (error) {
        throw error
    }
}

async function getStats() {
    return new Promise(async (resolve, reject) => {
        try {
            let dbs = await mongoose.connection.db.admin().listDatabases()
            dbs = dbs.databases.filter((db) => {
                return db.name !== "admin" && db.name !== "local" && db.name !== "config"
            })

            let dbStats = await Promise.all(
                dbs.map(async ({ name }) => {
                    const dbConnection = mongoose.connection.useDb(name)
                    return dbConnection.db.stats()
                }),
            )

            resolve(dbStats)
        } catch (error) {
            reject(error)
        }
    })
}

async function getCountForModel(model) {
    return new Promise(async (resolve, reject) => {
        try {
            if (model == null) {
                throw "values of model " + model
            }
            let count = await model.count()
            resolve(count)
        } catch (err) {
            reject(err)
        }
    })
}

async function getCountForModelWithQuery(model, query) {
    return new Promise(async (resolve, reject) => {
        try {
            if (model == null || query == null) {
                throw "values of model " + model + " query " + query
            }
            let count = await model.countDocuments(query)
            resolve(count)
        } catch (err) {
            reject(err)
        }
    })
}

async function disconnect() {
    return new Promise(async (resolve, reject) => {
        try {
            await mongoose.disconnect()
            consoleLib.logInfo("MongoDB disconnected")
            resolve()
        } catch (err) {
            reject(err)
        }
    })
}

async function findById(model, id) {
    return new Promise(async (resolve, reject) => {
        try {
            if (id == null || model == null) {
                throw "values of id " + id + " model " + model
            }
            let doc = await model.findById(id)
            resolve(doc)
        } catch (error) {
            reject(error)
        }
    })
}

async function findByQuery(model, query, option = {}) {
    return new Promise(async (resolve, reject) => {
        try {
            if (query == null || model == null) {
                throw "values of query " + query + " model " + model
            }
            let docs = await model.find(query, option)
            resolve(docs)
        } catch (error) {
            reject(error)
        }
    })
}

async function findOneByQuerywithOption(model, query, option = {}) {
    return new Promise(async (resolve, reject) => {
        try {
            if (model == null || query == null) {
                throw "values of model " + model + " query " + query
            }
            let findOneObject = await model.findOne(query, option)
            resolve(findOneObject)
        } catch (err) {
            reject(err)
        }
    })
}

async function findByQueryWithSkipLimit(model, query, limit, skip) {
    return new Promise(async (resolve, reject) => {
        try {
            if (model == null || query == null || limit == null || skip == null) {
                throw "values of model" + model + " query " + query + " limit " + limit + " skip" + skip
            }
            let docs = await model.find(query).skip(skip).limit(limit)
            resolve(docs)
        } catch (err) {
            reject(err)
        }
    })
}

async function findByQueryWithHint(model, query, hint) {
    return new Promise(async (resolve, reject) => {
        try {
            if (query == null || model == null || hint == null) {
                throw "values of id " + id + " model " + model + " hint " + hint
            }
            let docs = await model.find(query).hint(hint)
            resolve(docs)
        } catch (error) {
            reject(error)
        }
    })
}

async function findByQueryWithHintWithSelect(model, query, hint, selectedFields) {
    return new Promise(async (resolve, reject) => {
        try {
            if (query == null || model == null || hint == null || selectedFields == null) {
                throw " model " + model + " hint " + hint + " selectedFields " + selectedFields
            }
            let docs = await model.find(query).hint(hint).select(selectedFields)
            resolve(docs)
        } catch (error) {
            reject(error)
        }
    })
}

async function findByQueryWithHintWithSelectWithSkipLimit(
    model,
    query,
    hint,
    selectedFields,
    skip,
    limit,
) {
    return new Promise(async (resolve, reject) => {
        try {
            if (query == null || model == null || hint == null || selectedFields == null) {
                throw " model " + model + " hint " + hint + " selectedFields " + selectedFields
            }
            let docs = await model.find(query).hint(hint).skip(skip).limit(limit).select(selectedFields)
            resolve(docs)
        } catch (error) {
            reject(error)
        }
    })
}

async function findOneByQueryWithHint(model, query, hint) {
    return new Promise(async (resolve, reject) => {
        try {
            if (query == null || model == null || hint == null) {
                throw "values of query" + query + " model " + model + " hint " + hint
            }
            let doc = await model.findOne(query).hint(hint)
            resolve(doc)
        } catch (error) {
            reject(error)
        }
    })
}

async function findByQueryWithSkipLimitWithHint(model, query, limit, skip, hint) {
    return new Promise(async (resolve, reject) => {
        try {
            if (model == null || query == null || limit == null || skip == null || hint == null) {
                throw (
                    "values of model " +
                    model +
                    " query " +
                    query +
                    " limit " +
                    limit +
                    " skip" +
                    skip +
                    " hint " +
                    hint
                )
            }
            let docs = await model.find(query).skip(skip).limit(limit).hint(hint)
            resolve(docs)
        } catch (err) {
            reject(err)
        }
    })
}

async function deleteMany(model, query) {
    return new Promise(async (resolve, reject) => {
        try {
            if (model == null || query == null) {
                throw "values of model " + model + " query " + query
            }
            await model.deleteMany(query)
            resolve()
        } catch (err) {
            reject(err)
        }
    })
}

async function deleteOne(model, query) {
    return new Promise(async (resolve, reject) => {
        try {
            if (model == null || query == null) {
                throw "values of model " + model + " query " + query
            }
            const deletedData = await model.deleteOne(query)
            resolve(deletedData)
        } catch (err) {
            reject(err)
        }
    })
}

async function findOneAndUpdate(model, filterQuery, updateQuery, options = {}) {
    return new Promise(async (resolve, reject) => {
        try {
            if (model == null || filterQuery == null || updateQuery == null) {
                throw (
                    "values of model " + model + " filterQuery " + filterQuery + " updateQuery " + updateQuery
                )
            }
            let doc = await model.findOneAndUpdate(filterQuery, updateQuery, options)
            resolve(doc)
        } catch (error) {
            reject(error)
        }
    })
}

async function bulkWrite(model, operations, options = {}) {
    return new Promise(async (resolve, reject) => {
        try {
            if (model == null || operations == null) {
                throw "values of model " + model + " operations " + operations
            }
            let bulkwriteObject = await model.bulkWrite(operations, options)
            resolve(bulkwriteObject)
        } catch (err) {
            reject(err)
        }
    })
}

async function findOneByQuery(model, query) {
    return new Promise(async (resolve, reject) => {
        try {
            if (model == null || query == null) {
                throw "values of model " + model + " query " + query
            }
            let findOneObject = await model.findOne(query)
            resolve(findOneObject)
        } catch (err) {
            reject(err)
        }
    })
}

async function createDoc(model, object) {
    return new Promise(async (resolve, reject) => {
        try {
            if (model == null || object == null) {
                throw "values of model " + model + " object " + object
            }
            let doc = await model.create(object)
            resolve(doc)
        } catch (err) {
            reject(err)
        }
    })
}

async function getDistinctValueForField(model, query, field) {
    return new Promise(async (resolve, reject) => {
        try {
            if (model == null || query == null || field == null) {
                throw "values of model " + model + "query" + query + " field " + field
            }
            let distinctValues = await model.find(query).distinct(field)
            resolve(distinctValues)
        } catch (err) {
            reject(err)
        }
    })
}

async function getDistinctCountForFieldWithQuery(model, query, field) {
    return new Promise(async (resolve, reject) => {
        try {
            if (model == null || query == null || field == null) {
                throw "values of model " + model + "query" + query + " field " + field
            }
            let distinctCount = await model.find(query).distinct(field).count()
            resolve(distinctCount)
        } catch (err) {
            reject(err)
        }
    })
}

async function isDocExistsForQuery(model, query) {
    return new Promise(async (resolve, reject) => {
        try {
            if (model == null || query == null) {
                throw "values of model " + model + " query " + query
            }
            const exist = await model.exists(query)
            resolve(exist)
        } catch (err) {
            reject(err)
        }
    })
}

async function findByQueryWithSortLimit(model, query, sort, limit) {
    return new Promise(async (resolve, reject) => {
        try {
            if (model == null || query == null || sort == null || limit == null) {
                throw "values of model " + model + " query " + query + "sort" + sort + "limit " + limit
            }
            const docs = await model.find(query).sort(sort).limit(limit)
            resolve(docs)
        } catch (err) {
            reject(err)
        }
    })
}

//query must be in array of object
async function aggregate(model, query) {
    return new Promise(async (resolve, reject) => {
        try {
            if (model == null || query == null) {
                throw "values of model " + model + " query " + query
            }
            const docs = await model.aggregate(query).exec()
            resolve(docs)
        } catch (err) {
            reject(err)
        }
    })
}

module.exports = {
    getStats: getStats,
    getCountForModel: getCountForModel,
    disconnect: disconnect,
    findById: findById,
    findByQuery: findByQuery,
    connect: connect,
    isConnected: isConnected,
    findOneByQuerywithOption: findOneByQuerywithOption,
    getCountForModelWithQuery: getCountForModelWithQuery,
    findByQueryWithSkipLimit: findByQueryWithSkipLimit,
    findByQueryWithSkipLimitWithHint: findByQueryWithSkipLimitWithHint,
    findByQueryWithHint: findByQueryWithHint,
    findByQueryWithHintWithSelect: findByQueryWithHintWithSelect,
    findByQueryWithHintWithSelectWithSkipLimit: findByQueryWithHintWithSelectWithSkipLimit,
    findOneByQueryWithHint: findOneByQueryWithHint,
    findOneAndUpdate: findOneAndUpdate,
    deleteMany: deleteMany,
    deleteOne: deleteOne,
    bulkWrite: bulkWrite,
    findOneByQuery: findOneByQuery,
    createDoc: createDoc,
    getDistinctValueForField: getDistinctValueForField,
    getDistinctCountForFieldWithQuery: getDistinctCountForFieldWithQuery,
    isDocExistsForQuery: isDocExistsForQuery,
    findByQueryWithSortLimit: findByQueryWithSortLimit,
    aggregate: aggregate,
}
