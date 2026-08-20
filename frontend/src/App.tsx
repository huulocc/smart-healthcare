import { BrowserRouter, Routes, Route } from 'react-router-dom';
import MainLayout from './layouts/MainLayout';
import Home from './pages/Home/Home';

function App() {
  return (
    <BrowserRouter>
      <MainLayout>
        <Routes>
          <Route path="/" element={<Home />} />
          {/* Placeholder routes for future implementation */}
          <Route path="/departments" element={<div className="container mt-4">Departments Page (Coming Soon)</div>} />
          <Route path="/doctors" element={<div className="container mt-4">Doctors Page (Coming Soon)</div>} />
          <Route path="/ai-chat" element={<div className="container mt-4">AI Chat Page (Coming Soon)</div>} />
          <Route path="/login" element={<div className="container mt-4">Login Page (Coming Soon)</div>} />
          <Route path="/register" element={<div className="container mt-4">Sign Up Page (Coming Soon)</div>} />
        </Routes>
      </MainLayout>
    </BrowserRouter>
  );
}

export default App;
