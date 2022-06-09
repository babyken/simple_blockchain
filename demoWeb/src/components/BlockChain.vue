<template>
  <div>
    <div class="columns">
      <div class="column is-one-quarter is-family-code">
        <span class="has-text-weight-bold">Difficulty:</span>
        {{ blockchain.difficulty }}
      </div>
      <div class="column is-one-quarter is-family-code">
        <span class="has-text-weight-bold">Mint Reward:</span>
        {{ blockchain.miningReward }}
      </div>
      <div class="column is-one-quarter is-family-code">
        <span class="has-text-weight-bold">My Balance:</span>
        {{ balance }}
      </div>
      <div class="column is-one-quarter is-family-code">
        <b-button
          type="is-info"
          icon-left="book-open-outline"
          :disabled="blockchain.pendingTransactions.length == 0"
          @click="showTransaction = true"
        >
          Pending Transactions {{ blockchain.pendingTransactions.length }}
        </b-button>
      </div>
    </div>
    <div class="columns chain">
      <div
        class="column is-one-quarter"
        v-for="block in blockchain.chain"
        :key="block.index"
      >
        <Block :block="block" />
      </div>
    </div>
    <div class="columns">
      <div class="column">
        <h5 class="title is-5">UTXO Ledger</h5>
        <UTXO :utxo="blockchain.utxo" :address="address" />
      </div>
    </div>
    <b-modal v-model="showTransaction" has-modal-card :can-cancel="false">
      <Transactions
        :transactions="blockchain.pendingTransactions"
      ></Transactions>
    </b-modal>
  </div>
</template>

<script>
import Block from "./Block.vue";
import UTXO from "./UTXO.vue";
import Transactions from "./Transactions.vue";
export default {
  components: {
    Block,
    UTXO,
    Transactions,
  },
  props: {
    host: {
      type: String,
      require: true,
    },
    address: {
      type: String,
      require: true,
    },
  },
  data() {
    return {
      blockchain: {
        difficulty: 9999,
        miningReward: 9999,
        pendingTransactions: [],
        syncTimer: null,
      },
      balance: 9999,
      showTransaction: false,
    };
  },
  watch: {
    host: {
      handler: function () {
        this.stopSync();
        this.getBlockchain();
      },
    },
  },

  methods: {
    async getBlockchain() {
      try {
        const result = await this.$http.get(`http://${this.host}/blockchain`);
        const data = result.data;

        if (data.success) {
          this.blockchain = data.blockchain;

          const balResult = await this.$http.get(`http://${this.host}/balance`);
          const { success, balance } = balResult.data;

          if (success) {
            this.balance = balance;
          }

          const vm = this;
          this.syncTimer = setTimeout(function () {
            vm.getBlockchain();
          }, 800);
        }
      } catch (err) {
        console.log(this.host);
        console.log(err);
      }
    },
    stopSync() {
      clearTimeout(this.syncTimer);
    },
  },
};
</script>

<style scoped>
.columns.chain {
  overflow-y: auto;
}
</style>
