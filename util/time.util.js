function getCurrentTimestamp() {
    return Date.now();
}

function getCurrentIndianTimeForUnixTimestamp(timestamp){
    return new Date(timestamp).toLocaleString("en-US", {timeZone: "Asia/Kolkata"});
}

module.exports={
    getCurrentTimestamp:getCurrentTimestamp,
    getCurrentIndianTimeForUnixTimestamp:getCurrentIndianTimeForUnixTimestamp
}