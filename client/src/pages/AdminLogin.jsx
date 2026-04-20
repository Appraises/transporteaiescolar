import React, { useState } from 'react';
import { Shield, Lock, ArrowRight, Loader2 } from 'lucide-react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

const AdminLogin = () => {
  const [user, setUser] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await axios.post('/api/admin/login', { user, password });
      const { token } = response.data;
      
      localStorage.setItem('adminToken', token);
      localStorage.setItem('isAdmin', 'true');
      
      navigate('/admin');
    } catch (err) {
      setError(err.response?.data?.error || 'Erro ao autenticar. Verifique usuário e senha.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--color-background)' }}>
      <div className="glass-panel" style={{ width: '100%', maxWidth: '400px', padding: '40px 32px' }}>
        
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '32px' }}>
          <div style={{ background: 'linear-gradient(135deg, var(--color-primary), var(--color-primary-dark))', padding: '16px', borderRadius: '50%', marginBottom: '16px', boxShadow: 'var(--shadow-glow)' }}>
            <Shield size={32} color="white" />
          </div>
          <h1 style={{ fontSize: '24px', color: 'var(--color-text)' }}>Master Admin</h1>
          <p style={{ color: 'var(--color-text-light)', marginTop: '8px' }}>Gestor Van SaaS Platform</p>
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
              placeholder="admin" 
              required
            />
          </div>

          <div>
             <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '8px', color: 'var(--color-text)' }}>Senha de Acesso</label>
            <input 
              type="password" 
              className="search-input" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••" 
              required
            />
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className="btn-primary" 
            style={{ justifyContent: 'center', marginTop: '8px', padding: '12px', opacity: loading ? 0.7 : 1 }}
          >
            {loading ? <Loader2 size={18} className="animate-spin" /> : <><ArrowRight size={18} /> Acessar Central</>}
          </button>
        </form>

        <div style={{ marginTop: '32px', paddingTop: '32px', borderTop: '1px solid var(--color-border)', textAlign: 'center' }}>
          <p style={{ color: 'var(--color-text-light)', fontSize: '12px' }}>
            Área restrita para administração do sistema.<br />
            IP registrado para fins de auditoria.
          </p>
        </div>
      </div>
    </div>
  );
};

export default AdminLogin;
