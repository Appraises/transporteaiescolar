import React from 'react';
import { BrowserRouter as Router, Routes, Route, NavLink } from 'react-router-dom';
import { Bus, LayoutDashboard, Users, Wallet, Settings } from 'lucide-react';
import DashboardPage from './pages/Dashboard';
import './App.css';

const Sidebar = () => {
  return (
    <aside className="sidebar">
      <div className="brand">
        <Bus size={28} className="brand-icon" />
        <span>Gestor Van</span>
      </div>
      
      <nav className="nav-links">
        <NavLink to="/" className={({isActive}) => isActive ? "nav-item active" : "nav-item"}>
          <LayoutDashboard size={20} className="icon"/> Resumo
        </NavLink>
        <NavLink to="/alunos" className="nav-item">
          <Users size={20} className="icon"/> Alunos
        </NavLink>
        <NavLink to="/financeiro" className="nav-item">
          <Wallet size={20} className="icon"/> Financeiro
        </NavLink>
        <NavLink to="/config" className="nav-item">
          <Settings size={20} className="icon"/> Ajustes IA
        </NavLink>
      </nav>
    </aside>
  );
}

function App() {
  return (
    <Router>
      <div className="dashboard-layout">
        <Sidebar />
        <main className="main-content animate-fade-in">
          <Routes>
            <Route path="/" element={<DashboardPage />} />
            {/* Outras rotas serao resolvidas depois */}
            <Route path="/alunos" element={<div className="header-title">Alunos (Em breve)</div>} />
            <Route path="/financeiro" element={<div className="header-title">Financeiro (Em breve)</div>} />
            <Route path="/config" element={<div className="header-title">Configurações (Em breve)</div>} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;
