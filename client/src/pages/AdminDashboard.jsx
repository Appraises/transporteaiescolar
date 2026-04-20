import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { 
  Users, 
  DollarSign, 
  TrendingDown, 
  UserPlus, 
  RefreshCcw, 
  Search, 
  Smartphone, 
  QrCode, 
  Circle,
  ExternalLink,
  Edit2,
  CheckCircle2,
  XCircle,
  Clock
} from 'lucide-react';

const AdminDashboard = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [motoristas, setMotoristas] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [evolutionStatus, setEvolutionStatus] = useState({ status: 'checking', instance: '' });
  const [qrCodeData, setQrCodeData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [evolutionLoading, setEvolutionLoading] = useState(false);

  const token = localStorage.getItem('adminToken');

  const fetchAll = async () => {
    try {
      const config = { headers: { Authorization: `Bearer ${token}` } };
      const [statsRes, listRes, evoRes] = await Promise.all([
        axios.get('/api/admin/stats', config),
        axios.get('/api/admin/motoristas', config),
        axios.get('/api/admin/evolution/status', config)
      ]);

      setStats(statsRes.data);
      setMotoristas(listRes.data);
      setEvolutionStatus({
        status: evoRes.data.status,
        instance: evoRes.data.instance,
        mockMode: evoRes.data.mockMode
      });
    } catch (err) {
      console.error('Erro ao buscar dados admin', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();
    // Poll status a cada 60s
    const interval = setInterval(() => {
      fetchEvolutionStatus();
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  const fetchEvolutionStatus = async () => {
    try {
      const config = { headers: { Authorization: `Bearer ${token}` } };
      const res = await axios.get('/api/admin/evolution/status', config);
      setEvolutionStatus({
        status: res.data.status,
        instance: res.data.instance,
        mockMode: res.data.mockMode
      });
    } catch (e) {
      console.error('Erro status evolution');
    }
  };

  const generateQRCode = async () => {
    setEvolutionLoading(true);
    setQrCodeData(null);
    try {
      const config = { headers: { Authorization: `Bearer ${token}` } };
      const res = await axios.get('/api/admin/evolution/qrcode', config);
      
      if (res.data.mockMode) {
        setQrCodeData({ mock: true });
      } else {
        setQrCodeData(res.data);
      }
      
      // Se gerou QR, checar status mais frequente
      const pollStart = Date.now();
      const pollInterval = setInterval(async () => {
        const currentRes = await axios.get('/api/admin/evolution/status', config);
        if (currentRes.data.status === 'open' || Date.now() - pollStart > 120000) {
          setEvolutionStatus({ status: currentRes.data.status, instance: currentRes.data.instance });
          setQrCodeData(null);
          clearInterval(pollInterval);
        }
      }, 5000);

    } catch (e) {
      alert('Falha ao gerar QR Code');
    } finally {
      setEvolutionLoading(false);
    }
  };

  const handleUpdatePrice = async (motoristaId) => {
    const novoValor = prompt('Qual o novo valor da mensalidade (R$)?');
    if (!novoValor || isNaN(novoValor)) return;

    try {
      const config = { headers: { Authorization: `Bearer ${token}` } };
      await axios.put(`/api/admin/motoristas/${motoristaId}/plano`, { valor_plano: parseFloat(novoValor) }, config);
      fetchAll(); // Refresh
    } catch (e) {
      alert('Erro ao atualizar valor');
    }
  };

  if (loading) return (
    <div className="min-h-screen bg-[#0f172a] flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <RefreshCcw className="text-amber-400 animate-spin" size={40} />
        <span className="text-slate-400 font-medium">Carregando Central de Dados...</span>
      </div>
    </div>
  );

  const filteredMotoristas = motoristas.filter(m => 
    m.nome.toLowerCase().includes(searchTerm.toLowerCase()) || 
    m.telefone.includes(searchTerm)
  );

  return (
    <div style={{ minHeight: '100vh', background: 'var(--color-background)', color: 'var(--color-text)', padding: '16px' }} className="md:p-8 font-sans">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
        <div>
          <h1 style={{ color: 'var(--color-text)' }} className="text-3xl font-black flex items-center gap-3">
             <span style={{ background: 'linear-gradient(135deg, var(--color-primary), var(--color-primary-dark))', color: 'white', padding: '8px', borderRadius: '12px', transform: 'rotate(-3deg)' }}><Users size={24} strokeWidth={3}/></span>
             Painel Master Admin
          </h1>
          <p style={{ color: 'var(--color-text-light)' }} className="mt-2">Visão consolidada do SaaS Gestor Van</p>
        </div>
        
        <div className="glass-panel flex items-center gap-4 p-2 rounded-2xl pr-6">
           <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${evolutionStatus.status === 'open' ? 'text-emerald-500' : 'text-amber-500'}`} style={{ background: evolutionStatus.status === 'open' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(245, 158, 11, 0.1)' }}>
              <Smartphone size={20} />
           </div>
           <div>
              <div className="flex items-center gap-2">
                <span style={{ color: 'var(--color-text-light)' }} className="text-xs font-bold uppercase tracking-wider">Instância Evolution</span>
                <span className={`flex items-center gap-1 text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${evolutionStatus.status === 'open' ? 'text-emerald-500' : 'text-amber-500'}`} style={{ background: evolutionStatus.status === 'open' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(245, 158, 11, 0.1)' }}>
                   <Circle size={8} fill="currentColor"/> {evolutionStatus.status === 'open' ? 'Conectado' : 'Desconectado'}
                </span>
              </div>
              <div style={{ color: 'var(--color-text)' }} className="text-sm font-bold">{evolutionStatus.instance || 'Principal'} {evolutionStatus.mockMode && '(Simulado)'}</div>
           </div>
           <button 
             onClick={generateQRCode}
             disabled={evolutionLoading}
             style={{ background: 'var(--color-surface)', color: 'var(--color-text)', border: '1px solid var(--color-border)' }}
             className="ml-4 p-2 rounded-lg transition-colors"
           >
             {evolutionLoading ? <RefreshCcw size={18} className="animate-spin"/> : <QrCode size={18} />}
           </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
        <div className="glass-panel stat-card relative overflow-hidden group">
          <div className="flex items-center gap-4 mb-4">
             <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-emerald-500" style={{ background: 'rgba(16, 185, 129, 0.1)' }}>
                <DollarSign size={24} />
             </div>
             <span style={{ color: 'var(--color-text-light)' }} className="text-sm font-bold uppercase">MRR (Recorrente)</span>
          </div>
          <div style={{ color: 'var(--color-text)' }} className="text-3xl font-black">R$ {(stats?.mrr || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
          <div className="text-xs text-emerald-500 font-bold mt-2 flex items-center gap-1">
             <CheckCircle2 size={12}/> Receita total de {stats?.totalAssinaturas} ativos
          </div>
        </div>

        <div className="glass-panel stat-card relative overflow-hidden group">
          <div className="flex items-center gap-4 mb-4">
             <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ color: 'var(--color-primary)', background: 'rgba(249, 115, 22, 0.1)' }}>
                <UserPlus size={24} />
             </div>
             <span style={{ color: 'var(--color-text-light)' }} className="text-sm font-bold uppercase">Motoristas Ativos</span>
          </div>
          <div style={{ color: 'var(--color-text)' }} className="text-3xl font-black">{stats?.motoristasAtivos}</div>
          <div style={{ color: 'var(--color-text-light)' }} className="text-xs font-bold mt-2 flex items-center gap-1">
             Total de {stats?.totalMotoristas} cadastrados
          </div>
        </div>

        <div className="glass-panel stat-card relative overflow-hidden group">
          <div className="flex items-center gap-4 mb-4">
             <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ color: 'var(--color-error)', background: 'rgba(239, 68, 68, 0.1)' }}>
                <TrendingDown size={24} />
             </div>
             <span style={{ color: 'var(--color-text-light)' }} className="text-sm font-bold uppercase">Churn Rate</span>
          </div>
          <div style={{ color: 'var(--color-text)' }} className="text-3xl font-black">{stats?.churnRate}%</div>
          <div style={{ color: 'var(--color-error)' }} className="text-xs font-bold mt-2 flex items-center gap-1">
             {stats?.canceladosMes} cancelamentos este mês
          </div>
        </div>

        <div className="glass-panel stat-card relative overflow-hidden group">
          <div className="flex items-center gap-4 mb-4">
             <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-purple-500" style={{ background: 'rgba(168, 85, 247, 0.1)' }}>
                <Users size={24} />
             </div>
             <span style={{ color: 'var(--color-text-light)' }} className="text-sm font-bold uppercase">Total Passageiros</span>
          </div>
          <div style={{ color: 'var(--color-text)' }} className="text-3xl font-black">{stats?.totalPassageiros}</div>
          <div className="text-xs text-purple-500 font-bold mt-2 flex items-center gap-1">
             Volume total de usuários no bot
          </div>
        </div>
      </div>

      {qrCodeData && (
        <div className="mb-10 bg-slate-900 border-2 border-amber-400/30 p-8 rounded-3xl flex flex-col items-center gap-6 animate-in fade-in slide-in-from-top-4 duration-500">
           <div className="text-center">
              <h2 className="text-xl font-bold text-white mb-2">Conectar Novo Celular</h2>
              <p className="text-slate-400 text-sm">Escaneie o QR Code abaixo com o WhatsApp do Bot</p>
           </div>
           
           <div className="bg-white p-4 rounded-2xl shadow-2xl">
              {qrCodeData.mock ? (
                <div className="w-64 h-64 bg-slate-100 flex flex-col items-center justify-center text-slate-400 gap-3 border-4 border-dashed border-slate-200">
                    <QrCode size={64} />
                    <span className="text-xs font-bold uppercase tracking-widest text-slate-500">MODO SIMULAÇÃO</span>
                    <button 
                      onClick={fetchEvolutionStatus}
                      className="mt-2 text-[10px] bg-slate-800 text-white px-3 py-1 rounded-full uppercase"
                    >Simular Conexão</button>
                </div>
              ) : (
                <img src={qrCodeData.code} alt="QR Code" className="w-64 h-64" />
              )}
           </div>
           
           <div className="flex items-center gap-2 text-amber-400 text-xs font-bold animate-pulse">
              <RefreshCcw size={14} className="animate-spin" /> AGUARDANDO LEITURA...
           </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="glass-panel" style={{ padding: '0', overflow: 'hidden' }}>
         <div style={{ padding: '24px', borderBottom: '1px solid var(--color-border)' }} className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <h3 style={{ color: 'var(--color-text)' }} className="text-xl font-bold">Central de Motoristas</h3>
            <div className="relative">
               <Search style={{ color: 'var(--color-text-light)' }} className="absolute left-3 top-2.5" size={18} />
               <input 
                 type="text" 
                 placeholder="Buscar motorista ou telefone..."
                 value={searchTerm}
                 onChange={(e) => setSearchTerm(e.target.value)}
                 className="search-input w-full md:w-64"
                 style={{ paddingLeft: '38px', height: '38px', margin: 0 }}
               />
            </div>
         </div>

         <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
               <thead>
                  <tr style={{ background: 'var(--color-surface-hover)', borderBottom: '1px solid var(--color-border)' }}>
                     <th style={{ color: 'var(--color-text-light)' }} className="p-4 text-xs font-black uppercase">#</th>
                     <th style={{ color: 'var(--color-text-light)' }} className="p-4 text-xs font-black uppercase">Motorista</th>
                     <th style={{ color: 'var(--color-text-light)' }} className="p-4 text-xs font-black uppercase">Status</th>
                     <th style={{ color: 'var(--color-text-light)' }} className="p-4 text-xs font-black uppercase">Passageiros</th>
                     <th style={{ color: 'var(--color-text-light)' }} className="p-4 text-xs font-black uppercase">Plano Mensal</th>
                     <th style={{ color: 'var(--color-text-light)' }} className="p-4 text-xs font-black uppercase">Data Ativação</th>
                     <th style={{ color: 'var(--color-text-light)' }} className="p-4 text-xs font-black uppercase text-right">Ações</th>
                  </tr>
               </thead>
               <tbody>
                  {filteredMotoristas.map((m) => (
                     <tr key={m.id} style={{ borderBottom: '1px solid var(--color-border)' }} className="group">
                        <td style={{ color: 'var(--color-text-light)' }} className="p-4 font-mono text-xs">{m.numero.toString().padStart(2, '0')}</td>
                        <td className="p-4">
                           <div className="flex items-center gap-3">
                              <div style={{ background: 'var(--color-surface-hover)', color: 'var(--color-text)' }} className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm">
                                 {m.nome.charAt(0)}
                              </div>
                              <div>
                                 <div style={{ color: 'var(--color-text)' }} className="text-sm font-bold group-hover:text-primary transition-colors">{m.nome}</div>
                                 <div style={{ color: 'var(--color-text-light)' }} className="text-xs">{m.telefone.replace('@s.whatsapp.net', '')}</div>
                              </div>
                           </div>
                        </td>
                        <td className="p-4">
                           <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${m.status === 'ativo' ? 'text-emerald-500' : 'text-red-500'}`} style={{ background: m.status === 'ativo' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)' }}>
                              {m.status}
                           </span>
                        </td>
                        <td className="p-4">
                           <div className="flex items-center gap-2">
                              <span style={{ color: 'var(--color-text)' }} className="text-sm font-bold">{m.qtdPassageiros}</span>
                              <span style={{ color: 'var(--color-text-light)' }} className="text-[10px] font-medium">unid.</span>
                           </div>
                        </td>
                        <td className="p-4">
                           <div className="flex items-center gap-2">
                              <span style={{ color: 'var(--color-text)' }} className="text-sm font-bold">R$ {(m.valorPlano || 0).toFixed(2)}</span>
                              <button 
                                onClick={() => handleUpdatePrice(m.id)}
                                style={{ color: 'var(--color-text-light)' }}
                                className="opacity-0 group-hover:opacity-100 p-1 hover:text-primary transition-all"
                              >
                                <Edit2 size={12} />
                              </button>
                           </div>
                        </td>
                        <td className="p-4">
                           <div style={{ color: 'var(--color-text-light)' }} className="text-xs flex items-center gap-1 font-medium">
                              <Clock size={12} /> {new Date(m.dataAtivacao).toLocaleDateString('pt-BR')}
                           </div>
                        </td>
                        <td className="p-4 text-right">
                           <div className="flex items-center justify-end gap-2">
                              <button 
                                onClick={() => navigate(`/admin/motorista/${m.id}`)}
                                style={{ color: 'var(--color-text-light)', background: 'var(--color-surface)', border: '1px solid var(--color-border)', cursor: 'pointer' }} 
                                className="p-2 rounded-lg transition-colors hover:text-primary"
                              >
                                 <ExternalLink size={16} />
                              </button>
                           </div>
                        </td>
                     </tr>
                  ))}
                  {filteredMotoristas.length === 0 && (
                    <tr>
                      <td colSpan="7" style={{ color: 'var(--color-text-light)' }} className="p-10 text-center font-medium">
                        Nenhum motorista encontrado com os filtros atuais.
                      </td>
                    </tr>
                  )}
               </tbody>
            </table>
         </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
