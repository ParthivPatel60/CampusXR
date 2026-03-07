document.addEventListener("error", function (e) {
  const div = document.createElement("div");
  div.style.position = "fixed";
  div.style.zIndex = "999999";
  div.style.background = "red";
  div.style.color = "white";
  div.style.padding = "20px";
  div.style.top = "0";
  div.style.left = "0";
  div.innerHTML = "<h3>Error:</h3><pre>" + e.message + "</pre><br/><pre>" + e.error?.stack + "</pre>";
  document.body.appendChild(div);
}, true);

window.addEventListener("unhandledrejection", function (e) {
  const div = document.createElement("div");
  div.style.position = "fixed";
  div.style.zIndex = "999999";
  div.style.background = "red";
  div.style.color = "white";
  div.style.padding = "20px";
  div.style.top = "0";
  div.style.left = "0";
  div.innerHTML = "<h3>Unhandled Promise Rejection:</h3><pre>" + e.reason?.message + "</pre><br/><pre>" + e.reason?.stack + "</pre>";
  document.body.appendChild(div);
});
document.addEventListener("error", function (e) {
  const div = document.createElement("div");
  div.style.position = "fixed";
  div.style.zIndex = "999999";
  div.style.background = "red";
  div.style.color = "white";
  div.style.padding = "20px";
  div.style.top = "0";
  div.style.left = "0";
  div.innerHTML = "<h3>Error:</h3><pre>" + e.message + "</pre><br/><pre>" + e.error?.stack + "</pre>";
  document.body.appendChild(div);
}, true);

window.addEventListener("unhandledrejection", function (e) {
  const div = document.createElement("div");
  div.style.position = "fixed";
  div.style.zIndex = "999999";
  div.style.background = "red";
  div.style.color = "white";
  div.style.padding = "20px";
  div.style.top = "0";
  div.style.left = "0";
  div.innerHTML = "<h3>Unhandled Promise Rejection:</h3><pre>" + e.reason?.message + "</pre><br/><pre>" + e.reason?.stack + "</pre>";
  document.body.appendChild(div);
});
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import './index.css'
import UserTourPage from './pages/UserTourPage.jsx'
import LoginPage from './pages/admin/LoginPage.jsx'
import AdminPanel from './pages/admin/AdminPanel.jsx'
import AdminRoute from './components/admin/AdminRoute.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<UserTourPage />} />
        <Route path="/admin/login" element={<LoginPage />} />
        <Route
          path="/admin"
          element={
            <AdminRoute>
              <AdminPanel />
            </AdminRoute>
          }
        />
      </Routes>
    </BrowserRouter>
  </StrictMode>,
)


