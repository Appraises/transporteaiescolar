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
  Clock,
  Terminal,
  Activity,
  Settings,
  Volume2,
  ShieldAlert,
  Globe,
  Trash2
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
  const [showAddForm, setShowAddForm] = useState(false);
  const [novoMotorista, setNovoMotorista] = useState({ nome: '', telefone: '', valorPlano: '99.90' });
  const [showLogsModal, setShowLogsModal] = useState(false);
  const [logsContent, setLogsContent] = useState('');
  const [logsLoading, setLogsLoading] = useState(false);
  const [showEvolutionConfig, setShowEvolutionConfig] = useState(false);
  const [evoConfig, setEvoConfig] = useState({ settings: {}, webhook: {} });
  const [configSaving, setConfigSaving] = useState(false);

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
      if (err.response && err.response.status === 401) {
        localStorage.removeItem('adminToken');
        localStorage.removeItem('isAdmin');
        window.location.href = '/admin/login';
      }
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

  const fetchLogs = async () => {
    setLogsLoading(true);
    setShowLogsModal(true);
    try {
      const config = { headers: { Authorization: `Bearer ${token}` } };
      const res = await axios.get('/api/admin/logs', config);
      setLogsContent(res.data);
    } catch (e) {
      setLogsContent('Erro ao carregar logs do servidor.');
    } finally {
      setLogsLoading(false);
    }
  };

  const fetchEvolutionConfig = async () => {
    try {
      setEvolutionLoading(true);
      const config = { headers: { Authorization: `Bearer ${token}` } };
      const res = await axios.get('/api/admin/evolution/config', config);
      setEvoConfig(res.data);
      setShowEvolutionConfig(true);
    } catch (e) {
      alert('Erro ao buscar configurações da Evolution API');
    } finally {
      setEvolutionLoading(false);
    }
  };

  const saveEvolutionConfig = async () => {
    setConfigSaving(true);
    try {
      const config = { headers: { Authorization: `Bearer ${token}` } };
      await axios.post('/api/admin/evolution/config', evoConfig, config);
      alert('Configurações salvas com sucesso!');
      setShowEvolutionConfig(false);
      fetchAll();
    } catch (e) {
      alert('Erro ao salvar configurações');
    } finally {
      setConfigSaving(false);
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
  
  const handleDeleteMotorista = async (motoristaId) => {
    if (!window.confirm('TEM CERTEZA? Isso excluirá permanentemente o motorista e todos os seus passageiros, viagens e histórico financeiro.')) return;

    try {
      const config = { headers: { Authorization: `Bearer ${token}` } };
      await axios.delete(`/api/admin/motoristas/${motoristaId}`, config);
      fetchAll();
    } catch (e) {
      alert(e.response?.data?.error || 'Erro ao deletar motorista');
    }
  };

  const handleAddMotorista = async (e) => {
    if (e) e.preventDefault();
    
    if (!novoMotorista.nome || !novoMotorista.telefone) {
      alert('Nome e telefone são obrigatórios');
      return;
    }

    try {
      const config = { headers: { Authorization: `Bearer ${token}` } };
      await axios.post('/api/admin/motoristas', {
        nome: novoMotorista.nome,
        telefone: novoMotorista.telefone,
        valor_plano: parseFloat(novoMotorista.valorPlano || '99.90')
      }, config);
      
      setShowAddForm(false);
      setNovoMotorista({ nome: '', telefone: '', valorPlano: '99.90' });
      fetchAll();
    } catch (e) {
      alert(e.response?.data?.error || 'Erro ao adicionar motorista');
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
    (m.nome || 'Motorista em Onboarding').toLowerCase().includes(searchTerm.toLowerCase()) || 
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
           {evolutionStatus.status === 'open' ? (
             <button 
               onClick={fetchEvolutionConfig}
               disabled={evolutionLoading}
               style={{ background: 'var(--color-surface)', color: 'var(--color-primary)', border: '1px solid var(--color-primary)' }}
               className="ml-4 p-2 rounded-lg transition-colors hover:bg-primary/10"
               title="Configurações da Instância"
             >
               {evolutionLoading ? <RefreshCcw size={18} className="animate-spin"/> : <Settings size={18} />}
             </button>
           ) : (
             <button 
               onClick={generateQRCode}
               disabled={evolutionLoading}
               style={{ background: 'var(--color-surface)', color: 'var(--color-text)', border: '1px solid var(--color-border)' }}
               className="ml-4 p-2 rounded-lg transition-colors hover:text-primary"
               title="Conectar WhatsApp"
             >
               {evolutionLoading ? <RefreshCcw size={18} className="animate-spin"/> : <QrCode size={18} />}
             </button>
           )}

           <button 
             onClick={fetchLogs}
             style={{ background: 'var(--color-surface)', color: 'var(--color-text)', border: '1px solid var(--color-border)' }}
             className="p-2 rounded-lg transition-colors flex items-center gap-2 px-3 text-xs font-bold"
             title="Ver Logs do Servidor"
           >
             <Terminal size={18} />
             <span className="hidden lg:inline">Logs PM2</span>
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
                <img src={qrCodeData.base64} alt="QR Code" className="w-64 h-64" />
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
            <h3 style={{ color: 'var(--color-text)' }} className="text-xl font-bold flex items-center gap-4">
              Central de Motoristas
              <button
                onClick={() => setShowAddForm(!showAddForm)}
                style={{ background: showAddForm ? 'var(--color-surface)' : 'var(--color-primary)', color: showAddForm ? 'var(--color-text)' : 'white', border: showAddForm ? '1px solid var(--color-border)' : 'none', cursor: 'pointer' }}
                className="text-sm px-4 py-1.5 rounded-lg flex items-center gap-2 hover:opacity-90 transition-opacity font-bold shadow-lg shadow-amber-500/20"
              >
                {showAddForm ? <XCircle size={16} /> : <UserPlus size={16} strokeWidth={3} />}
                {showAddForm ? 'Cancelar' : 'Novo'}
              </button>
            </h3>
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

         {showAddForm && (
           <div className="p-6 border-b border-[var(--color-border)] bg-[var(--color-surface-hover)] animate-in slide-in-from-top-2 duration-300">
             <form onSubmit={handleAddMotorista} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                <div className="flex flex-col gap-1.5">
                   <label className="text-[10px] font-black uppercase text-slate-500 ml-1">Nome do Motorista</label>
                   <input 
                     type="text" 
                     placeholder="Ex: João da Silva"
                     className="search-input w-full"
                     value={novoMotorista.nome}
                     onChange={e => setNovoMotorista({...novoMotorista, nome: e.target.value})}
                     required
                   />
                </div>
                <div className="flex flex-col gap-1.5">
                   <label className="text-[10px] font-black uppercase text-slate-500 ml-1">WhatsApp (DDD + Número)</label>
                   <input 
                     type="text" 
                     placeholder="Ex: 11999999999"
                     className="search-input w-full"
                     value={novoMotorista.telefone}
                     onChange={e => setNovoMotorista({...novoMotorista, telefone: e.target.value})}
                     required
                   />
                </div>
                <div className="flex flex-col gap-1.5">
                   <label className="text-[10px] font-black uppercase text-slate-500 ml-1">Valor do Plano (R$)</label>
                   <input 
                     type="number" 
                     step="0.01"
                     placeholder="99.90"
                     className="search-input w-full"
                     value={novoMotorista.valorPlano}
                     onChange={e => setNovoMotorista({...novoMotorista, valorPlano: e.target.value})}
                   />
                </div>
                <button 
                  type="submit"
                  className="bg-emerald-600 text-white font-bold h-[38px] rounded-xl hover:bg-emerald-500 transition-colors flex items-center justify-center gap-2"
                >
                   <CheckCircle2 size={18} /> Confirmar Cadastro
                </button>
             </form>
           </div>
         )}

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
                        <td style={{ color: 'var(--color-text-light)' }} className="p-4 font-mono text-xs">{(m.id || 0).toString().padStart(2, '0')}</td>
                        <td className="p-4">
                           <div className="flex items-center gap-3">
                              <div style={{ background: 'var(--color-surface-hover)', color: 'var(--color-text)' }} className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm">
                                 {(m.nome || '?').charAt(0)}
                              </div>
                              <div>
                                 <div style={{ color: 'var(--color-text)' }} className="text-sm font-bold group-hover:text-primary transition-colors">{m.nome || 'Motorista em Onboarding'}</div>
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

      {/* MODAL DE LOGS PM2 */}
      {showLogsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-slate-900 w-full max-w-4xl h-[80vh] rounded-3xl border border-slate-700 flex flex-col overflow-hidden shadow-2xl">
            <div className="p-6 border-b border-slate-800 flex items-center justify-between bg-slate-900/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-500">
                  <Activity size={20} />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white">Logs do Servidor (PM2)</h2>
                  <p className="text-xs text-slate-400">Monitoramento em tempo real do processo Node.js</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button 
                  onClick={fetchLogs}
                  disabled={logsLoading}
                  className="bg-slate-800 hover:bg-slate-700 text-white px-4 py-2 rounded-xl text-sm font-bold transition-colors flex items-center gap-2"
                >
                  {logsLoading ? <RefreshCcw size={16} className="animate-spin" /> : <RefreshCcw size={16} />}
                  Atualizar
                </button>
                <button 
                  onClick={() => setShowLogsModal(false)}
                  className="bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-xl text-sm font-bold transition-colors"
                >
                  Fechar
                </button>
              </div>
            </div>
            
            <div className="flex-1 overflow-auto p-6 bg-black/40">
              {logsLoading && !logsContent ? (
                <div className="h-full flex items-center justify-center text-slate-500 gap-3">
                  <RefreshCcw className="animate-spin" /> Carregando logs...
                </div>
              ) : (
                <pre className="font-mono text-xs md:text-sm text-emerald-400 whitespace-pre-wrap leading-relaxed">
                  {logsContent || 'Nenhum log disponível no momento.'}
                </pre>
              )}
            </div>
            
            <div className="p-4 bg-slate-950 border-t border-slate-800 text-[10px] text-slate-500 flex justify-between font-mono">
              <span>ESTADO: LIVE</span>
              <span>ULTIMA ATUALIZAÇÃO: {new Date().toLocaleTimeString()}</span>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Configuração Evolution */}
      {showEvolutionConfig && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="glass-panel w-full max-w-lg p-8 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-3 text-primary">
                <Settings size={28} />
                <div>
                  <h2 className="text-xl font-bold text-white">Configurações do Robô</h2>
                  <p className="text-xs text-slate-400">Instância: {evolutionStatus.instance}</p>
                </div>
              </div>
              <button 
                onClick={() => setShowEvolutionConfig(false)}
                className="text-slate-500 hover:text-white transition-colors"
              >
                <XCircle size={24} />
              </button>
            </div>

            <div className="space-y-6">
              {/* WHISPER / BASE64 */}
              <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-800/40 border border-slate-700/50">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-500">
                    <Volume2 size={20} />
                  </div>
                  <div>
                    <div className="text-sm font-bold text-white">Transcrição Whisper</div>
                    <div className="text-[10px] text-slate-400">Ativa envio de Base64 para IA ouvir áudios</div>
                  </div>
                </div>
                <button 
                  onClick={() => setEvoConfig({
                    ...evoConfig,
                    webhook: { ...evoConfig.webhook, base64: !evoConfig.webhook?.base64 }
                  })}
                  className={`w-12 h-6 rounded-full transition-all relative ${evoConfig.webhook?.base64 ? 'bg-amber-500' : 'bg-slate-700'}`}
                >
                  <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${evoConfig.webhook?.base64 ? 'left-7' : 'left-1'}`} />
                </button>
              </div>

              {/* REJECT CALL */}
              <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-800/40 border border-slate-700/50">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center text-red-500">
                    <ShieldAlert size={20} />
                  </div>
                  <div>
                    <div className="text-sm font-bold text-white">Rejeitar Chamadas</div>
                    <div className="text-[10px] text-slate-400">Desliga automaticamente ligações de voz/vídeo</div>
                  </div>
                </div>
                <button 
                  onClick={() => setEvoConfig({
                    ...evoConfig,
                    settings: { ...evoConfig.settings, rejectCall: !evoConfig.settings?.rejectCall }
                  })}
                  className={`w-12 h-6 rounded-full transition-all relative ${evoConfig.settings?.rejectCall ? 'bg-red-500' : 'bg-slate-700'}`}
                >
                  <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${evoConfig.settings?.rejectCall ? 'left-7' : 'left-1'}`} />
                </button>
              </div>

              {/* ALWAYS ONLINE */}
              <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-800/40 border border-slate-700/50">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-500">
                    <Globe size={20} />
                  </div>
                  <div>
                    <div className="text-sm font-bold text-white">Sempre Online</div>
                    <div className="text-[10px] text-slate-400">Mantém o status "Online" no WhatsApp</div>
                  </div>
                </div>
                <button 
                  onClick={() => setEvoConfig({
                    ...evoConfig,
                    settings: { ...evoConfig.settings, alwaysOnline: !evoConfig.settings?.alwaysOnline }
                  })}
                  className={`w-12 h-6 rounded-full transition-all relative ${evoConfig.settings?.alwaysOnline ? 'bg-emerald-500' : 'bg-slate-700'}`}
                >
                  <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${evoConfig.settings?.alwaysOnline ? 'left-7' : 'left-1'}`} />
                </button>
              </div>
            </div>

            <div className="mt-10 flex gap-4">
               <button 
                 onClick={() => setShowEvolutionConfig(false)}
                 className="flex-1 p-3 rounded-2xl font-bold text-sm text-slate-400 bg-slate-800/50 hover:bg-slate-800 transition-all border border-slate-700"
               >
                 Cancelar
               </button>
               <button 
                 onClick={saveEvolutionConfig}
                 disabled={configSaving}
                 className="flex-1 p-3 rounded-2xl font-black text-sm text-white bg-primary hover:brightness-110 transition-all flex items-center justify-center gap-2"
               >
                 {configSaving ? <RefreshCcw className="animate-spin" size={18} /> : 'Salvar Alterações'}
               </button>
            </div>
          </div>
        </div>
      )}
   </div>
  );
};

export default AdminDashboard;
