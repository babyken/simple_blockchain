class UTXO {
    constructor(txId, index, amount, wallet) {        
        this.txId = txId
        this.amount = amount
        this.index = index
        this.wallet = wallet
    }

    static utxoFromJson(inXo) {
        return new UTXO(inXo.txId, inXo.index, inXo.amount, inXo.wallet)
    }
}

module.exports = UTXO