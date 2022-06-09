import Vue from 'vue'

import App from './App.vue'

import Buefy from 'buefy'
import 'buefy/dist/buefy.css'
import '@mdi/font/css/materialdesignicons.css'

import router from './router'
import {http} from './axios'

Vue.config.productionTip = false
Vue.prototype.$http = http

Vue.use(Buefy)




new Vue({
  render: h => h(App),  
  router,

}).$mount('#app')
