import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
// import App from './App.tsx'
// import SimpleApp from './SimpleApp.tsx'
// import BasicApp from './BasicApp.tsx'
import WorkingApp from './WorkingApp.tsx'

const root = document.getElementById('root')
if (root) {
  createRoot(root).render(
    <StrictMode>
      <WorkingApp />
    </StrictMode>
  )
} else {
  console.error('Root element not found!')
}
