function removeLeadingZeroes(hex) {
    hex = hex.substring(2)
    hex = hex.substring(24)
    hex = "0x" + hex
    return hex
}


module.exports={
    removeLeadingZeroes: removeLeadingZeroes
}