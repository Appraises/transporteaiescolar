import React from 'react';
import axios from 'axios';
import { BrowserRouter as Router, Routes, Route, Link, useLocation, Navigate } from 'react-router-dom';
import { Home, Users, DollarSign, Settings, LogOut, Menu, Bus, Moon, Sun } from 'lucide-react';
import DashboardPage from './pages/Dashboard';
import LoginPage from './pages/Login';
import ConfigPage from './pages/Config';
import AlunosPage from './pages/AlunosPage';
import FinanceiroPage from './pages/FinanceiroPage';
import LandingPage from './pages/LandingPage';
import AdminDashboard from './pages/AdminDashboard';
import AdminLogin from './pages/AdminLogin';
import AdminMotoristaDetail from './pages/AdminMotoristaDetail';
import './index.css';

const savedMotoristaToken = localStorage.getItem('motoristaToken');
if (savedMotoristaToken) {
    axios.defaults.headers.common.Authorization = `Bearer ${savedMotoristaToken}`;
}

const Layout = ({ children, logout, theme, toggleTheme }) => {
    const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);
    const location = useLocation();

    const isActive = (path) => {
        if (path === '/') return location.pathname === '/';
        return location.pathname.startsWith(path);
    };

    const getLinkStyle = (path) => ({
        padding: '0.75rem',
        borderRadius: 'var(--border-radius)',
        display: 'flex',
        alignItems: 'center',
        gap: '0.75rem',
        backgroundColor: isActive(path) ? 'rgba(255,255,255,0.2)' : 'transparent',
        color: 'white',
        fontWeight: isActive(path) ? '600' : 'normal'
    });

    return (
        <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: 'var(--color-background)', transition: 'background-color 0.3s' }}>
            {/* Sidebar - Desktop */}
            <aside style={{
                width: '250px',
                background: 'linear-gradient(180deg, rgba(249, 115, 22, 0.95), rgba(234, 88, 12, 0.9))',
                backdropFilter: 'blur(20px)',
                WebkitBackdropFilter: 'blur(20px)',
                color: 'white',
                display: window.innerWidth > 768 ? 'flex' : 'none',
                flexDirection: 'column',
                padding: '2rem 1rem',
                position: 'sticky',
                top: 0,
                height: '100vh',
                overflowY: 'auto'
            }} className="desktop-sidebar">
                <h1 style={{ color: 'white', marginBottom: '2rem', display: 'flex', alignItems: 'center', gap: '0.5rem', flexShrink: 0 }}>
                    <Bus size={32} />
                    <span style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>Gestor Van</span>
                </h1>

                <nav style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <Link to="/" style={getLinkStyle('/')}><Home size={20} /> Resumo</Link>
                    <Link to="/alunos" style={getLinkStyle('/alunos')}><Users size={20} /> Alunos</Link>
                    <Link to="/financeiro" style={getLinkStyle('/financeiro')}><DollarSign size={20} /> Financeiro</Link>
                    <Link to="/config" style={getLinkStyle('/config')}><Settings size={20} /> Configurações</Link>
                </nav>

                <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <button onClick={toggleTheme} style={{
                        width: '100%',
                        padding: '0.75rem',
                        borderRadius: 'var(--border-radius)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.75rem',
                        backgroundColor: 'rgba(255,255,255,0.1)',
                        color: 'white',
                        border: 'none',
                        cursor: 'pointer',
                    }}>
                        {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />} 
                        {theme === 'light' ? 'Modo Escuro' : 'Modo Claro'}
                    </button>
                    <button onClick={logout} style={{
                        width: '100%',
                        padding: '0.75rem',
                        borderRadius: 'var(--border-radius)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.75rem',
                        backgroundColor: 'transparent',
                        color: 'white',
                        border: '1px solid rgba(255,255,255,0.3)',
                        cursor: 'pointer',
                    }}>
                        <LogOut size={20} /> Sair
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <main style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                {/* Mobile Header */}
                <header style={{
                    padding: '1rem',
                    backgroundColor: 'var(--color-surface)',
                    boxShadow: 'var(--shadow-sm)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                }} className="mobile-header">
                    <span style={{ fontSize: '1.25rem', fontWeight: 'bold', color: 'var(--color-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Bus size={28} />
                        Gestor Van
                    </span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <button onClick={toggleTheme} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text)' }}>
                            {theme === 'light' ? <Moon size={24} /> : <Sun size={24} />}
                        </button>
                        <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                            <Menu size={24} color="var(--color-primary)" />
                        </button>
                    </div>
                </header>

                {/* Mobile Navigation Overlay */}
                {mobileMenuOpen && (
                    <div className="mobile-nav-overlay" style={{
                        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                        backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 9999,
                        backdropFilter: 'blur(4px)'
                    }} onClick={() => setMobileMenuOpen(false)}>
                        <nav style={{
                            width: '280px', height: '100%', 
                            background: 'linear-gradient(180deg, rgba(249, 115, 22, 0.95), rgba(234, 88, 12, 0.9))',
                            backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
                            padding: '2rem 1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem',
                            overflowY: 'auto',
                        }} onClick={e => e.stopPropagation()}>
                            <h1 style={{ color: 'white', marginBottom: '1.5rem', fontSize: '1.5rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <Bus size={32} />
                                Gestor Van
                            </h1>
                            {[
                                { to: '/', icon: <Home size={20} />, label: 'Resumo' },
                                { to: '/alunos', icon: <Users size={20} />, label: 'Alunos' },
                                { to: '/financeiro', icon: <DollarSign size={20} />, label: 'Financeiro' },
                                { to: '/config', icon: <Settings size={20} />, label: 'Configurações' },
                            ].map(item => (
                                <Link key={item.to} to={item.to} style={getLinkStyle(item.to)} onClick={() => setMobileMenuOpen(false)}>
                                    {item.icon} {item.label}
                                </Link>
                            ))}
                            <div style={{ marginTop: 'auto', paddingTop: '1rem' }}>
                                <button onClick={() => { logout(); setMobileMenuOpen(false); }} style={{
                                    width: '100%', padding: '0.75rem', borderRadius: 'var(--border-radius)',
                                    display: 'flex', alignItems: 'center', gap: '0.75rem',
                                    backgroundColor: 'transparent', color: 'white',
                                    border: '1px solid rgba(255,255,255,0.3)', cursor: 'pointer',
                                }}>
                                    <LogOut size={20} /> Sair
                                </button>
                            </div>
                        </nav>
                    </div>
                )}

                <div style={{ padding: '24px' }} className="container min-h-screen">
                    {children}
                </div>
            </main>
        </div>
    );
};

const ProtectedRoute = ({ isAuthenticated, children }) => {
    if (!isAuthenticated) return <Navigate to="/login" replace />;
    return children;
};

const AdminProtectedRoute = ({ children }) => {
    const isAdmin = localStorage.getItem('isAdmin') === 'true';
    const token = localStorage.getItem('adminToken');
    if (!isAdmin || !token) return <Navigate to="/admin/login" replace />;
    return children;
};

function App() {
    const [isAuthenticated, setIsAuthenticated] = React.useState(() => Boolean(localStorage.getItem('motoristaToken')));
    const [theme, setTheme] = React.useState(localStorage.getItem('theme') || 'light');

    React.useEffect(() => {
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem('theme', theme);
    }, [theme]);

    React.useEffect(() => {
        const token = localStorage.getItem('motoristaToken');
        if (token) {
            axios.defaults.headers.common.Authorization = `Bearer ${token}`;
        } else {
            delete axios.defaults.headers.common.Authorization;
        }
    }, [isAuthenticated]);

    const toggleTheme = () => {
        setTheme(prev => prev === 'light' ? 'dark' : 'light');
    };

    const handleLogin = ({ token, motorista }) => {
        localStorage.setItem('motoristaToken', token);
        localStorage.setItem('motoristaUser', JSON.stringify(motorista));
        axios.defaults.headers.common.Authorization = `Bearer ${token}`;
        setIsAuthenticated(true);
    };

    const logout = () => {
        localStorage.removeItem('motoristaToken');
        localStorage.removeItem('motoristaUser');
        delete axios.defaults.headers.common.Authorization;
        setIsAuthenticated(false);
    };

    return (
        <Router>
            <Routes>
                <Route path="/landing" element={<LandingPage />} />
                <Route path="/login" element={
                    isAuthenticated ? <Navigate to="/" /> : <LoginPage onLogin={handleLogin} />
                } />
                
                {/* Rotas Admin Master */}
                <Route path="/admin/login" element={<AdminLogin />} />
                <Route path="/admin" element={
                    <AdminProtectedRoute>
                        <AdminDashboard />
                    </AdminProtectedRoute>
                } />
                <Route path="/admin/motorista/:id" element={
                    <AdminProtectedRoute>
                        <AdminMotoristaDetail />
                    </AdminProtectedRoute>
                } />
                
                <Route path="/*" element={
                    <ProtectedRoute isAuthenticated={isAuthenticated}>
                        <Layout logout={logout} theme={theme} toggleTheme={toggleTheme}>
                            <Routes>
                                <Route path="/" element={<DashboardPage />} />
                                <Route path="/alunos" element={<AlunosPage />} />
                                <Route path="/financeiro" element={<FinanceiroPage />} />
                                <Route path="/config" element={<ConfigPage />} />
                            </Routes>
                        </Layout>
                    </ProtectedRoute>
                } />
            </Routes>
        </Router>
    );
}

export default App;
