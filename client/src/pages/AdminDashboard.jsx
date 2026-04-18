import React, { useState, useEffect } from 'react';
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
    <div className="min-h-screen bg-[#0f172a] text-slate-300 font-sans p-4 md:p-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
        <div>
          <h1 className="text-3xl font-black text-white flex items-center gap-3">
             <span className="bg-amber-400 text-slate-900 p-2 rounded-xl transform -rotate-3"><Users size={24} strokeWidth={3}/></span>
             Painel Master Admin
          </h1>
          <p className="text-slate-500 mt-2">Visão consolidada do SaaS Gestor Van</p>
        </div>
        
        <div className="flex items-center gap-4 bg-slate-900 border border-slate-800 p-2 rounded-2xl pr-6">
           <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${evolutionStatus.status === 'open' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-amber-500/10 text-amber-500'}`}>
              <Smartphone size={20} />
           </div>
           <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Instância Evolution</span>
                <span className={`flex items-center gap-1 text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${evolutionStatus.status === 'open' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'}`}>
                   <Circle size={8} fill="currentColor"/> {evolutionStatus.status === 'open' ? 'Conectado' : 'Desconectado'}
                </span>
              </div>
              <div className="text-sm font-bold text-white">{evolutionStatus.instance || 'Principal'} {evolutionStatus.mockMode && '(Simulado)'}</div>
           </div>
           <button 
             onClick={generateQRCode}
             disabled={evolutionLoading}
             className="ml-4 bg-white/5 hover:bg-white/10 p-2 rounded-lg transition-colors border border-white/5"
           >
             {evolutionLoading ? <RefreshCcw size={18} className="animate-spin"/> : <QrCode size={18} />}
           </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-3xl relative overflow-hidden group">
          <div className="absolute -top-4 -right-4 w-24 h-24 bg-emerald-500/5 rounded-full blur-2xl group-hover:bg-emerald-500/10 transition-all"></div>
          <div className="flex items-center gap-4 mb-4">
             <div className="w-12 h-12 bg-emerald-500/10 text-emerald-500 rounded-2xl flex items-center justify-center">
                <DollarSign size={24} />
             </div>
             <span className="text-sm font-bold text-slate-500 uppercase">MRR (Recorrente)</span>
          </div>
          <div className="text-3xl font-black text-white">R$ {(stats?.mrr || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
          <div className="text-xs text-emerald-500 font-bold mt-2 flex items-center gap-1">
             <CheckCircle2 size={12}/> Receita total de {stats?.totalAssinaturas} ativos
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-6 rounded-3xl relative overflow-hidden group">
          <div className="absolute -top-4 -right-4 w-24 h-24 bg-blue-500/5 rounded-full blur-2xl group-hover:bg-blue-500/10 transition-all"></div>
          <div className="flex items-center gap-4 mb-4">
             <div className="w-12 h-12 bg-blue-500/10 text-blue-500 rounded-2xl flex items-center justify-center">
                <UserPlus size={24} />
             </div>
             <span className="text-sm font-bold text-slate-500 uppercase">Motoristas Ativos</span>
          </div>
          <div className="text-3xl font-black text-white">{stats?.motoristasAtivos}</div>
          <div className="text-xs text-slate-500 font-bold mt-2 flex items-center gap-1">
             Total de {stats?.totalMotoristas} cadastrados
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-6 rounded-3xl relative overflow-hidden group">
          <div className="absolute -top-4 -right-4 w-24 h-24 bg-amber-500/5 rounded-full blur-2xl group-hover:bg-amber-500/10 transition-all"></div>
          <div className="flex items-center gap-4 mb-4">
             <div className="w-12 h-12 bg-amber-500/10 text-amber-500 rounded-2xl flex items-center justify-center">
                <TrendingDown size={24} />
             </div>
             <span className="text-sm font-bold text-slate-500 uppercase">Churn Rate</span>
          </div>
          <div className="text-3xl font-black text-white">{stats?.churnRate}%</div>
          <div className="text-xs text-amber-500 font-bold mt-2 flex items-center gap-1">
             {stats?.canceladosMes} cancelamentos este mês
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-6 rounded-3xl relative overflow-hidden group">
          <div className="absolute -top-4 -right-4 w-24 h-24 bg-purple-500/5 rounded-full blur-2xl group-hover:bg-purple-500/10 transition-all"></div>
          <div className="flex items-center gap-4 mb-4">
             <div className="w-12 h-12 bg-purple-500/10 text-purple-500 rounded-2xl flex items-center justify-center">
                <Users size={24} />
             </div>
             <span className="text-sm font-bold text-slate-500 uppercase">Total Passageiros</span>
          </div>
          <div className="text-3xl font-black text-white">{stats?.totalPassageiros}</div>
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
      <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl">
         <div className="p-6 border-b border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <h3 className="text-xl font-bold text-white">Central de Motoristas</h3>
            <div className="relative">
               <Search className="absolute left-3 top-2.5 text-slate-500" size={18} />
               <input 
                 type="text" 
                 placeholder="Buscar motorista ou telefone..."
                 value={searchTerm}
                 onChange={(e) => setSearchTerm(e.target.value)}
                 className="bg-slate-800 border border-slate-700 rounded-xl pl-10 pr-4 py-2 text-sm outline-none focus:border-amber-400/50 w-full md:w-64"
               />
            </div>
         </div>

         <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
               <thead>
                  <tr className="bg-slate-950/50">
                     <th className="p-4 text-xs font-black uppercase text-slate-500">#</th>
                     <th className="p-4 text-xs font-black uppercase text-slate-500">Motorista</th>
                     <th className="p-4 text-xs font-black uppercase text-slate-500">Status</th>
                     <th className="p-4 text-xs font-black uppercase text-slate-500">Passageiros</th>
                     <th className="p-4 text-xs font-black uppercase text-slate-500">Plano Mensal</th>
                     <th className="p-4 text-xs font-black uppercase text-slate-500">Data Ativação</th>
                     <th className="p-4 text-xs font-black uppercase text-slate-500 text-right">Ações</th>
                  </tr>
               </thead>
               <tbody className="divide-y divide-slate-800">
                  {filteredMotoristas.map((m) => (
                     <tr key={m.id} className="hover:bg-white/5 transition-colors group">
                        <td className="p-4 font-mono text-xs text-slate-500">{m.numero.toString().padStart(2, '0')}</td>
                        <td className="p-4">
                           <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center text-slate-300 font-bold text-sm">
                                 {m.nome.charAt(0)}
                              </div>
                              <div>
                                 <div className="text-sm font-bold text-white group-hover:text-amber-400 transition-colors">{m.nome}</div>
                                 <div className="text-xs text-slate-500">{m.telefone.replace('@s.whatsapp.net', '')}</div>
                              </div>
                           </div>
                        </td>
                        <td className="p-4">
                           <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${
                             m.status === 'ativo' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'
                           }`}>
                              {m.status}
                           </span>
                        </td>
                        <td className="p-4">
                           <div className="flex items-center gap-2">
                              <span className="text-sm font-bold text-white">{m.qtdPassageiros}</span>
                              <span className="text-[10px] text-slate-500 font-medium">unid.</span>
                           </div>
                        </td>
                        <td className="p-4">
                           <div className="flex items-center gap-2">
                              <span className="text-sm font-bold text-white">R$ {(m.valorPlano || 0).toFixed(2)}</span>
                              <button 
                                onClick={() => handleUpdatePrice(m.id)}
                                className="opacity-0 group-hover:opacity-100 p-1 text-slate-500 hover:text-amber-400 transition-all"
                              >
                                <Edit2 size={12} />
                              </button>
                           </div>
                        </td>
                        <td className="p-4">
                           <div className="text-xs text-slate-400 flex items-center gap-1 font-medium">
                              <Clock size={12} /> {new Date(m.dataAtivacao).toLocaleDateString('pt-BR')}
                           </div>
                        </td>
                        <td className="p-4 text-right">
                           <div className="flex items-center justify-end gap-2">
                              <button className="bg-slate-800 hover:bg-slate-700 text-slate-300 p-2 rounded-lg transition-colors border border-slate-700">
                                 <ExternalLink size={16} />
                              </button>
                           </div>
                        </td>
                     </tr>
                  ))}
                  {filteredMotoristas.length === 0 && (
                    <tr>
                      <td colSpan="7" className="p-10 text-center text-slate-500 font-medium">
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
