<template>
  <div class="modal-card" style="width: auto">
    <section class="modal-card-body">
      <div class="content" v-for="(tx, index) in transactions" :key="tx.txId">
        <h5 class="title is-5">
          <span v-if="tx.inputRec == 0">Coinbase</span> Transaction Record
          {{ index }}
        </h5>
        <b-field label="Transaction ID">
          {{ tx.txId }}
        </b-field>
        <b-field class="has-background-white-bis" label="Timestamp">
          {{ tx.timestamp }} | {{ getDate(tx.timestamp) }}
        </b-field>

        <h6 class="title is-6 mt-3" v-if="tx.inputRec.length > 0">
          Input Record
        </h6>
        <div class="box" v-for="rec in tx.inputRec" :key="rec.signature">
          <b-field label="Prev Tx ID">
            {{ rec.prevTxId }}
          </b-field>
          <b-field label="Record Index">
            {{ rec.index }}
          </b-field>
          <b-field label="Amount">
            {{ rec.amount }}
          </b-field>
          <b-field label="Signature">
            {{ rec.signature }}
          </b-field>
        </div>
        <h6 class="title is-6 mt-3">Output Record</h6>
        <div class="box" v-for="(rec, index) in tx.outputRec" :key="index">
          <b-field label="Destination Wallet/Public Key">
            {{ rec.toAddress }}
          </b-field>
          <b-field label="Amount">
            {{ rec.amount }}
          </b-field>
        </div>
      </div>
    </section>
    <footer class="modal-card-foot">
      <b-button label="Close" @click="$parent.close()" />
    </footer>
  </div>
</template>

<script>
export default {
  props: {
    transactions: {
      type: Array,
      require: true,
    },
  },
  methods: {
    getDate(timestamp) {
      const d = new Date(+timestamp);
      return d;
    },
  },
};
</script>

<style scoped>
.box {
  overflow: hidden;
}
</style>
