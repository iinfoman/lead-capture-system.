import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import './index.css'

// AuthProvider deliberately does NOT live here — it is mounted by AuthShell
// inside App, so the Supabase SDK stays out of the public landing bundle.
ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    {/* BASE_URL is '/' on Netlify and '/<repo>/' on GitHub Pages. React
        Router wants the basename without a trailing slash. */}
    <BrowserRouter basename={import.meta.env.BASE_URL.replace(/\/$/, '')}>
      <App />
    </BrowserRouter>
  </React.StrictMode>,
)
