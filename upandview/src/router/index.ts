import { createRouter, createWebHistory } from 'vue-router'
import Upload from '@/components/upload.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'upload',
      component: Upload,
    },
  ]
})

export default router
