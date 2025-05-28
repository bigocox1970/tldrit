import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Set dark mode as default unless user has chosen otherwise
const userTheme = localStorage.getItem('theme');
if (!userTheme) {
  document.documentElement.classList.add('dark');
} else if (userTheme === 'light') {
  document.documentElement.classList.remove('dark');
} else if (userTheme === 'dark') {
  document.documentElement.classList.add('dark');
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
