require('dotenv').config({path: '../.env'});

const mongoLib= require('../lib/mongo.lib');
const consoleLib = require('../lib/console.lib');

(async () => {
    try {
        await mongoLib.connect(process.env.MONGO_URL);



    } catch (error) {
        consoleLib.logError(error);
        process.exit(1);
    }
})();