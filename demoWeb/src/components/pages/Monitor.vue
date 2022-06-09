<template>
  <div class="container">
    <Connection @hostchange="hostChange" />
    <BlockChain :host="host" :address="address" />
  </div>
</template>

<script>
import Connection from "../Connection.vue";
import BlockChain from "../BlockChain.vue";

export default {
  components: {
    Connection,
    BlockChain,
  },
  data() {
    return {
      host: null,
      address: null,
    };
  },
  methods: {
    hostChange({ host, address }) {
      this.host = host;
      this.address = address;
    },
  },
};
</script>

<style scoped>
.container {
  margin-top: 3vh;
}
</style>
