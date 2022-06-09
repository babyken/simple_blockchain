<template>
  <div class="modal-card" style="width: auto">
    <section class="modal-card-body">
      <pre>{{ this.block }}</pre>
    </section>
    <footer class="modal-card-foot">
      <b-button label="Close" @click="$parent.close()" />
    </footer>
  </div>
</template>

<script>
export default {
  props: {
    block: {
      type: Object,
      require: true,
    },
  },
};
</script>
