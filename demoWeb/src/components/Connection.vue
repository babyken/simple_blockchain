<template>
  <div class="columns">
    <div class="column is-one-quarter">
      <b-field :type="isConnected ? 'is-success' : 'is-info'">
        <template #label>
          <b-icon icon="desktop-classic"></b-icon>
          Enter host to connect...
        </template>
        <b-input
          v-model="host"
          placeholder="localhost:4000"
          @blur="connectToHost"
        ></b-input>
      </b-field>
      <b-field>
        <template #label>
          <b-icon icon="hubspot"> </b-icon>
          Connected Peer(s)
        </template>
        <b-select placeholder="WS Peer Address" @input="hostChange">
          <option v-for="address in peer" :value="address" :key="address">
            {{ address }}
          </option>
        </b-select>
      </b-field>
    </div>
    <div class="column">
      <b-field>
        <template #label>
          <b-icon icon="piggy-bank-outline"> </b-icon>
          Public Key
        </template>
        <b-input maxlength="150" type="textarea" v-model="publicKey"></b-input>
      </b-field>
    </div>
    <div class="column">
      <div class="columns">
        <div class="column">
          <div class="buttons">
            <b-button
              type="is-primary"
              @click="isCreateTxModalActive = true"
              icon-left="credit-card-plus-outline"
            >
              Create Transaction
            </b-button>
            <b-button type="is-info" @click="mineOnClick" icon-left="bitcoin">
              Mine
            </b-button>
            <b-button type="is-danger" @click="mineGhostBlock">👻</b-button>
          </div>
        </div>
      </div>
      <div class="columns">
        <div class="column">
          <b-button
            type="is-info"
            @click="syncBlockchainOnClick"
            icon-left="cached"
          >
            Sync
          </b-button>
        </div>
      </div>
    </div>
    <b-modal
      v-model="isCreateTxModalActive"
      has-modal-card
      close-button-aria-label="Close"
    >
      <template #default>
        <CreateTransaction :peer="peer" />
      </template>
    </b-modal>
  </div>
</template>

<script>
import CreateTransaction from "./CreateTransaction.vue";
export default {
  components: {
    CreateTransaction,
  },
  data() {
    return {
      host: "localhost:4000",
      isConnected: false,
      publicKey: null,
      peer: [],
      isCreateTxModalActive: false,
    };
  },
  methods: {
    hostChange(e) {
      let port = e.replace(/^\D+/g, "");
      port = +port + 1000;

      this.host = "localhost:" + port;
      this.connectToHost();
    },
    async connectToHost() {
      try {
        const result = await this.$http.get(`http://${this.host}/address`);
        const data = result.data;
        if (data.success) {
          this.isConnected = true;
          this.publicKey = data.wallet;
          await this.getPeerAddress();

          this.$emit("hostchange", {
            host: this.host,
            address: this.publicKey,
          });
        }
      } catch (err) {
        this.isConnected = false;
        this.$buefy.toast.open({
          duration: 5000,
          message: `Cannot connect to host`,
          type: "is-danger",
        });
        console.log(err);
      }
    },
    async getPeerAddress() {
      const result = await this.$http.get(`http://${this.host}/peer`);
      const data = result.data;

      if (data.success) {
        this.peer = data.address;
      }
    },
    async mineOnClick() {
      await this.$http.post(`http://${this.host}/mine`);
    },
    async syncBlockchainOnClick() {
      await this.$http.post(`http://${this.host}/blockchain`);
      await this.getPeerAddress();
    },
    async mineGhostBlock() {
      await this.$http.post(`http://${this.host}/mine/ghost`);
    },
  },
};
</script>
