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
    <div className="min-h-screen flex items-center justify-center bg-[#0f172a] p-4 font-sans">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-[10%] -left-[10%] w-[40%] h-[40%] bg-amber-400/10 rounded-full blur-[120px]"></div>
        <div className="absolute -bottom-[10%] -right-[10%] w-[40%] h-[40%] bg-blue-600/10 rounded-full blur-[120px]"></div>
      </div>

      <div className="relative w-full max-w-md">
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 md:p-10 shadow-2xl">
          
          <div className="flex flex-col items-center mb-8">
            <div className="w-16 h-16 bg-gradient-to-br from-amber-400 to-amber-600 rounded-2xl flex items-center justify-center shadow-lg shadow-amber-500/20 mb-4 transform -rotate-6">
              <Shield size={32} className="text-slate-900" />
            </div>
            <h1 className="text-2xl font-black text-white tracking-tight">Master Admin</h1>
            <p className="text-slate-400 text-sm mt-1">Gestor Van SaaS Platform</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-3 rounded-xl text-sm text-center">
                {error}
              </div>
            )}

            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-300 ml-1">Usuário</label>
              <div className="relative">
                <input 
                  type="text" 
                  value={user}
                  onChange={(e) => setUser(e.target.value)}
                  className="w-100 bg-slate-800 border border-slate-700 text-white rounded-xl px-4 py-3 outline-none focus:border-amber-400/50 focus:ring-4 focus:ring-amber-400/10 transition-all"
                  placeholder="admin"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-300 ml-1">Senha de Acesso</label>
              <div className="relative">
                <input 
                  type="password" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-100 bg-slate-800 border border-slate-700 text-white rounded-xl px-4 py-3 outline-none focus:border-amber-400/50 focus:ring-4 focus:ring-amber-400/10 transition-all"
                  placeholder="••••••••"
                  required
                />
              </div>
            </div>

            <button 
              type="submit" 
              disabled={loading}
              className="w-100 bg-amber-400 hover:bg-amber-500 disabled:opacity-50 disabled:cursor-not-allowed text-slate-900 font-bold py-4 rounded-xl shadow-lg shadow-amber-500/20 transition-all flex items-center justify-center gap-2 group"
            >
              {loading ? (
                <Loader2 size={20} className="animate-spin" />
              ) : (
                <>
                  Acessar Central <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>
          </form>

          <div className="mt-8 pt-8 border-t border-slate-800 text-center">
            <p className="text-slate-500 text-xs">
              Área restrita para administração do sistema.<br />
              IP registrado para fins de auditoria.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminLogin;
