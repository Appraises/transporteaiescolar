import React, { useState } from 'react';
import { Bus, KeyRound } from 'lucide-react';

const LoginPage = ({ onLogin }) => {
  const [user, setUser] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (user === 'admin' && password === 'admin') {
      onLogin();
    } else {
      setError('Credenciais inválidas. Tente admin / admin');
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--color-background)' }}>
      <div className="glass-panel" style={{ width: '100%', maxWidth: '400px', padding: '40px 32px' }}>
        
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '32px' }}>
          <div style={{ background: 'linear-gradient(135deg, var(--color-primary), var(--color-primary-dark))', padding: '16px', borderRadius: '50%', marginBottom: '16px', boxShadow: 'var(--shadow-glow)' }}>
            <Bus size={32} color="white" />
          </div>
          <h1 style={{ fontSize: '24px', color: 'var(--color-text)' }}>Gestor Van</h1>
          <p style={{ color: 'var(--color-text-light)', marginTop: '8px' }}>Painel Administrativo Escolar</p>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          {error && <div style={{ padding: '12px', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid var(--color-error)', color: 'var(--color-error)', borderRadius: '4px', fontSize: '14px', textAlign: 'center' }}>{error}</div>}

          <div>
            <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '8px', color: 'var(--color-text)' }}>Usuário</label>
            <input 
              type="text" 
              className="search-input" 
              value={user}
              onChange={(e) => setUser(e.target.value)}
              placeholder="Digite seu usuário..." 
            />
          </div>

          <div>
             <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '8px', color: 'var(--color-text)' }}>Senha</label>
            <input 
              type="password" 
              className="search-input" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••" 
            />
          </div>

          <button type="submit" className="btn-primary" style={{ justifyContent: 'center', marginTop: '8px', padding: '12px' }}>
            <KeyRound size={18} /> Entrar no Sistema
          </button>
        </form>

      </div>
    </div>
  );
};

export default LoginPage;
