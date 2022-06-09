<template>
  <div class="container has-background-grey-lighter">
    <div class="columns">
      <div class="column">
        <b-field label="From">
          <b-select placeholder="WS Peer Address" v-model="from">
            <option v-for="address in peer" :value="address" :key="address">
              {{ address }}
            </option>
          </b-select>
        </b-field>
      </div>
      <div class="column">
        <b-field label="To">
          <b-select placeholder="WS Peer Address" v-model="to">
            <option v-for="address in peer" :value="address" :key="address">
              {{ address }}
            </option>
          </b-select>
        </b-field>
      </div>
    </div>
    <div class="columns is-flex is-vcentered">
      <div class="column">
        <b-field label="Amount">
          <b-input v-model="amount" placeholder="$_$"></b-input>
        </b-field>
      </div>
      <div class="column has-text-centered mt-4">
        <b-button type="is-info" @click="createTransaction">Create</b-button>
      </div>
    </div>
    <div>{{ txid }}</div>
  </div>
</template>

<script>
export default {
  props: {
    peer: {
      type: Array,
      require: true,
    },
  },
  data() {
    return {
      amount: 0,
      from: null,
      to: null,
      tx: null,
    };
  },
  computed: {
    txid() {
      return this.tx ? "Tx ID: " + this.tx : "";
    },
  },
  methods: {
    async createTransaction() {
      // Get From address
      let fromPort = this.from.replace(/^\D+/g, "");
      fromPort = +fromPort + 1000;
      const fromHost = "localhost:" + fromPort;
      await this.$http.post(`http://${fromHost}/blockchain`);

      // Get TO address and its public key
      let toPort = this.to.replace(/^\D+/g, "");
      toPort = +toPort + 1000;
      const toHost = "localhost:" + toPort;

      const addResult = await this.$http.get(`http://${toHost}/address`);
      const { success, wallet } = addResult.data;

      if (success) {
        const txResult = await this.$http.post(
          `http://${fromHost}/transaction`,
          {
            destination: wallet,
            amount: this.amount,
          }
        );
        const { success, txId } = txResult.data;
        if (success) {
          this.$buefy.toast.open({
            duration: 5000,
            message: `New TxId: ${txId}`,
            type: "is-info",
          });
          this.tx = txId;
        } else {
          console.log(
            "CreateTransaction, create transaction fail.",
            txResult.data.msg
          );

          this.$buefy.toast.open({
            duration: 5000,
            message: `FAIL: ${txResult.data.msg}`,
            type: "is-danger",
          });
        }
      } else {
        console.log("CreateTransaction, get address fail");
      }
    },
  },
};
</script>

<style scoped>
.container {
  padding: 3rem;
  border: 3px solid #333;
  border-radius: 30px;
}

.columns.is-vcentered {
  -webkit-box-align: center;
  -ms-flex-align: center;
  align-items: center;
}
</style>
