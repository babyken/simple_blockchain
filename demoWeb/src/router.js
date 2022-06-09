import Vue from 'vue'
import VueRouter from 'vue-router'

import Monitor from './components/pages/Monitor'

Vue.use(VueRouter)

const routes = [
    { path: '/', redirect: '/monitor' },
    { path: '/monitor', name: 'monitor', component: Monitor },
]

const router = new VueRouter({
    mode: 'history',
    routes
})

export default router