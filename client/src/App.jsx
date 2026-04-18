import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation, Navigate } from 'react-router-dom';
import { Home, Users, DollarSign, Settings, LogOut, Menu, Bus } from 'lucide-react';
import DashboardPage from './pages/Dashboard';
import LoginPage from './pages/Login';
import ConfigPage from './pages/Config';
import AlunosPage from './pages/AlunosPage';
import FinanceiroPage from './pages/FinanceiroPage';
import LandingPage from './pages/LandingPage';
import './index.css';

const Layout = ({ children, logout }) => {
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
        backgroundColor: isActive(path) ? 'white' : 'transparent',
        color: isActive(path) ? 'var(--color-primary)' : 'white',
        fontWeight: isActive(path) ? '600' : 'normal'
    });

    return (
        <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: 'var(--color-background)' }}>
            {/* Sidebar - Desktop */}
            <aside style={{
                width: '250px',
                backgroundColor: 'var(--color-primary)',
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
                    backgroundColor: 'white',
                    boxShadow: 'var(--shadow-sm)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                }} className="mobile-header">
                    <span style={{ fontSize: '1.25rem', fontWeight: 'bold', color: 'var(--color-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Bus size={28} />
                        Gestor Van
                    </span>
                    <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                        <Menu size={24} color="var(--color-primary)" />
                    </button>
                </header>

                {/* Mobile Navigation Overlay */}
                {mobileMenuOpen && (
                    <div className="mobile-nav-overlay" style={{
                        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                        backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 9999,
                    }} onClick={() => setMobileMenuOpen(false)}>
                        <nav style={{
                            width: '280px', height: '100%', backgroundColor: 'var(--color-primary)',
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

                <div style={{ padding: '24px' }} className="container bg-slate-50 min-h-screen">
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
    // Estado super simples substituindo AuthContext para nosso protótipo base
    const [isAuthenticated, setIsAuthenticated] = React.useState(false);

    const logout = () => setIsAuthenticated(false);

    return (
        <Router>
            <Routes>
                <Route path="/landing" element={<LandingPage />} />
                <Route path="/login" element={
                    isAuthenticated ? <Navigate to="/" /> : <LoginPage onLogin={() => setIsAuthenticated(true)} />
                } />
                
                {/* Rotas Admin Master */}
                <Route path="/admin/login" element={<AdminLogin />} />
                <Route path="/admin" element={
                    <AdminProtectedRoute>
                        <AdminDashboard />
                    </AdminProtectedRoute>
                } />
                
                <Route path="/*" element={
                    <ProtectedRoute isAuthenticated={isAuthenticated}>
                        <Layout logout={logout}>
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
