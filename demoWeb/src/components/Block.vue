<template>
  <div class="block__container has-background-light">
    <div class="columns">
      <div class="column">
        <h5 class="title is-5">
          Index: {{ block.index }}
          <span v-if="block.index == 0"> | Gensis Block</span>
        </h5>
        <b-field label="Timestamp">
          {{ block.timestamp }}
        </b-field>
        <b-field label="Prev Hash">
          {{ block.previousHash }}
        </b-field>
        <b-field label="nonce">
          {{ block.nonce }}
        </b-field>
        <b-field label="Block Hash">
          {{ block.hash }}
        </b-field>
      </div>
    </div>
    <div class="buttons">
      <b-button
        type="is-info"
        icon-left="book-open-outline"
        :disabled="block.transactions.length == 0"
        @click="showTransaction = true"
      >
        {{ block.transactions.length }}
      </b-button>
      <b-button type="is-info" @click="showRaw = true"
        ><b-icon icon="code-tags"></b-icon
      ></b-button>
    </div>
    <b-modal v-model="showRaw" has-modal-card :can-cancel="false">
      <Raw :block="block"></Raw>
    </b-modal>
    <b-modal v-model="showTransaction" has-modal-card :can-cancel="false">
      <Transactions :transactions="block.transactions"></Transactions>
    </b-modal>
  </div>
</template>

<script>
import Raw from "./Raw.vue";
import Transactions from "./Transactions.vue";
export default {
  components: {
    Raw,
    Transactions,
  },
  data() {
    return {
      showTransaction: false,
      showRaw: false,
    };
  },
  props: {
    block: {
      type: Object,
      require: true,
    },
  },
};
</script>

<style scoped>
.block__container {
  /* overflow-y: hidden; */
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  padding: 1rem;
  border: 5px solid #eee;
  border-radius: 3px;
}
</style>
