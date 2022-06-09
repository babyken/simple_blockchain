<template>
  <div class="container">
    <div class="columns" v-for="rowNo in noOfRow" :key="rowNo">
      <div
        class="column is-one-quarter"
        v-for="colNo in noOfCol(rowNo)"
        :key="colNo * rowNo"
      >
        <div class="record container">
          <div class="card">
            <div
              class="card-content"
              :class="backgroundColorClass(getUtxo(rowNo, colNo).wallet)"
            >
              <div class="content">
                <div>TxId: {{ getUtxo(rowNo, colNo).txId }}</div>
                <div>index: {{ getUtxo(rowNo, colNo).index }}</div>
                <div>amount: {{ getUtxo(rowNo, colNo).amount }}</div>
                <div>Wallet {{ getUtxo(rowNo, colNo).wallet }}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  data() {
    return {
      itemPerRow: 4,
    };
  },
  props: {
    utxo: {
      type: Array,
      require: true,
      default: () => {
        return [];
      },
    },
    address: {
      type: String,
      require: true,
    },
  },
  computed: {
    noOfRow() {
      if (this.utxo.length == 0) {
        return 0;
      }
      return Math.floor(this.utxo.length / this.itemPerRow + 1);
    },
  },
  methods: {
    getUtxo(rowNo, colNo) {
      const colBase = (rowNo - 1) * this.itemPerRow;
      return this.utxo[colBase + (colNo - 1)];
    },
    noOfCol(rowNo) {
      if (rowNo == 0) return 0;
      rowNo -= 1; // Adjust the loop start at 1 instead of 0
      const itemsLeft = this.utxo.length - rowNo * this.itemPerRow;
      return itemsLeft > this.itemPerRow ? this.itemPerRow : itemsLeft;
    },
    backgroundColorClass(wallet) {
      if (wallet === this.address) {
        return "has-background-warning-light";
      }
      return null;
    },
  },
};
</script>

<style scoped>
.record.container {
  overflow: hidden;
}

.card-content {
  padding: 8px;
}
</style>
