import { BrowserRouter, Routes, Route } from 'react-router-dom';
import MainLayout from './layouts/MainLayout';
import Home from './pages/Home/Home';
import Departments from './pages/Departments/Departments';
import Doctors from './pages/Doctors/Doctors';

function App() {
  return (
    <BrowserRouter>
      <MainLayout>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/departments" element={<Departments />} />
          <Route path="/doctors" element={<Doctors />} />
          <Route path="/login" element={<div className="container mt-4">Login Page (Coming Soon)</div>} />
          <Route path="/register" element={<div className="container mt-4">Sign Up Page (Coming Soon)</div>} />
        </Routes>
      </MainLayout>
    </BrowserRouter>
  );
}

export default App;
