import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { 
  ArrowLeft, Users, DollarSign, Settings, Save, MapPin, Clock, Send, Edit2, Trash2, Plus, CheckCircle2, XCircle, FileText
} from 'lucide-react';

const AdminMotoristaDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const token = localStorage.getItem('adminToken');

  const [motorista, setMotorista] = useState(null);
  const [activeTab, setActiveTab] = useState('alunos');
  const [loading, setLoading] = useState(true);

  // States Alunos
  const [alunos, setAlunos] = useState([]);
  const [editingAluno, setEditingAluno] = useState(null);
  const [showAddAluno, setShowAddAluno] = useState(false);
  const [novoAluno, setNovoAluno] = useState({ nome: '', telefone_responsavel: '', turno: 'manha', endereco: '', mensalidade: 0 });

  // States Financeiro
  const [financeiro, setFinanceiro] = useState([]);

  // States Config
  const [baseAddress, setBaseAddress] = useState('');
  const [schoolAddress, setSchoolAddress] = useState('');
  const [manhaParams, setManha] = useState({ enquete: '05:00', fechamento: '05:55' });
  const [tardeParams, setTarde] = useState({ enquete: '11:00', fechamento: '11:55' });
  const [noiteParams, setNoite] = useState({ enquete: '17:00', fechamento: '17:55' });

  useEffect(() => {
    fetchMotorista();
    fetchTabData(activeTab);
  }, [id, activeTab]);

  const configReq = { headers: { Authorization: `Bearer ${token}` } };

  const fetchMotorista = async () => {
    try {
      const { data } = await axios.get(`/api/admin/motoristas/${id}`, configReq);
      setMotorista(data);
    } catch (error) {
      console.error('Erro ao buscar motorista', error);
      navigate('/admin');
    }
  };

  const fetchTabData = async (tab) => {
    setLoading(true);
    try {
      if (tab === 'alunos') {
        const { data } = await axios.get(`/api/admin/motoristas/${id}/alunos`, configReq);
        setAlunos(data);
      } else if (tab === 'financeiro') {
        const { data } = await axios.get(`/api/admin/motoristas/${id}/financeiro`, configReq);
        setFinanceiro(data);
      } else if (tab === 'config') {
        const { data } = await axios.get(`/api/admin/motoristas/${id}/config`, configReq);
        setBaseAddress(data.baseAddress);
        setSchoolAddress(data.schoolAddress);
        setManha(data.manhaParams);
        setTarde(data.tardeParams);
        setNoite(data.noiteParams);
      }
    } catch (e) {
      console.error(`Erro tab ${tab}`, e);
    } finally {
      setLoading(false);
    }
  };

  // --- Alunos Actions ---
  const handleCreateAluno = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`/api/admin/motoristas/${id}/alunos`, novoAluno, configReq);
      setShowAddAluno(false);
      setNovoAluno({ nome: '', telefone_responsavel: '', turno: 'manha', endereco: '', mensalidade: 0 });
      fetchTabData('alunos');
    } catch (e) {
      alert('Erro ao criar aluno');
    }
  };

  const handleUpdateAluno = async (alunoId) => {
    try {
      await axios.put(`/api/admin/motoristas/${id}/alunos/${alunoId}`, editingAluno, configReq);
      setEditingAluno(null);
      fetchTabData('alunos');
    } catch (e) {
      alert('Erro ao editar aluno');
    }
  };

  const handleDeleteAluno = async (alunoId) => {
    if (!window.confirm('Tem certeza que deseja remover este aluno?')) return;
    try {
      await axios.delete(`/api/admin/motoristas/${id}/alunos/${alunoId}`, configReq);
      fetchTabData('alunos');
    } catch (e) {
      alert('Erro ao remover aluno');
    }
  };

  // --- Config Actions ---
  const handleSaveConfig = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`/api/admin/motoristas/${id}/config`, {
        baseAddress, schoolAddress, manhaParams, tardeParams, noiteParams
      }, configReq);
      alert('Configurações do motorista salvas com sucesso!');
    } catch(e) {
      alert('Erro ao salvar. Tente novamente.');
    }
  };

  if (!motorista) return <div className="p-8 text-center" style={{ color: 'var(--color-text)' }}>Carregando...</div>;

  const ShiftConfigCard = ({ title, shiftParams, setShiftParams }) => (
    <div style={{ background: 'var(--color-surface)', padding: '16px', borderRadius: '8px', border: '1px solid var(--color-border)', borderTop: '4px solid var(--color-primary)', display: 'flex', flexDirection: 'column', gap: '12px' }}>
      <h3 style={{ fontSize: '15px', color: 'var(--color-text)', borderBottom: '1px solid var(--color-border)', paddingBottom: '8px' }}>{title}</h3>
      <div style={{ display: 'flex', gap: '16px' }}>
        <div style={{ flex: 1 }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '13px', color: 'var(--color-text-light)', marginBottom: '4px' }}>
            <Send size={14} /> Disparar Enquete
          </label>
          <input 
            type="time" className="search-input" 
            value={shiftParams.enquete} 
            onChange={(e) => setShiftParams({...shiftParams, enquete: e.target.value})} 
          />
        </div>
        <div style={{ flex: 1 }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '13px', color: 'var(--color-text-light)', marginBottom: '4px' }}>
            <Clock size={14} /> Encerrar e Rotear
          </label>
          <input 
            type="time" className="search-input" 
            value={shiftParams.fechamento} 
            onChange={(e) => setShiftParams({...shiftParams, fechamento: e.target.value})} 
          />
        </div>
      </div>
    </div>
  );

  return (
    <div style={{ minHeight: '100vh', background: 'var(--color-background)', color: 'var(--color-text)', padding: '16px' }} className="md:p-8 font-sans">
      
      {/* Header com botão voltar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
        <div>
          <button 
            onClick={() => navigate('/admin')}
            style={{ color: 'var(--color-text-light)' }}
            className="flex items-center gap-2 mb-4 hover:text-primary transition-colors font-medium text-sm bg-transparent border-none cursor-pointer"
          >
            <ArrowLeft size={16} /> Voltar ao Painel Master
          </button>
          <h1 style={{ color: 'var(--color-text)' }} className="text-3xl font-black flex items-center gap-3">
             <div style={{ background: 'var(--color-surface-hover)', color: 'var(--color-text)', padding: '8px', borderRadius: '12px' }}>
               {motorista.nome.charAt(0)}
             </div>
             Gestão de Motorista: {motorista.nome}
          </h1>
          <p style={{ color: 'var(--color-text-light)' }} className="mt-2 flex items-center gap-2">
            Telefone: <span className="font-mono text-sm">{motorista.telefone.replace('@s.whatsapp.net', '')}</span>
            • Status: <span style={{ color: motorista.status === 'ativo' ? '#10b981' : '#ef4444', fontWeight: 'bold' }}>{motorista.status.toUpperCase()}</span>
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="glass-panel" style={{ padding: '0', overflow: 'hidden', marginBottom: '24px' }}>
        <div className="flex border-b" style={{ borderColor: 'var(--color-border)' }}>
          <button 
            onClick={() => setActiveTab('alunos')}
            style={{ 
              padding: '16px 24px', 
              color: activeTab === 'alunos' ? 'var(--color-primary)' : 'var(--color-text-light)',
              borderBottom: activeTab === 'alunos' ? '2px solid var(--color-primary)' : '2px solid transparent',
              fontWeight: activeTab === 'alunos' ? 'bold' : 'normal',
              display: 'flex', alignItems: 'center', gap: '8px',
              background: 'transparent', cursor: 'pointer'
            }}
          ><Users size={18}/> Passageiros</button>
          
          <button 
            onClick={() => setActiveTab('financeiro')}
            style={{ 
              padding: '16px 24px', 
              color: activeTab === 'financeiro' ? 'var(--color-primary)' : 'var(--color-text-light)',
              borderBottom: activeTab === 'financeiro' ? '2px solid var(--color-primary)' : '2px solid transparent',
              fontWeight: activeTab === 'financeiro' ? 'bold' : 'normal',
              display: 'flex', alignItems: 'center', gap: '8px',
              background: 'transparent', cursor: 'pointer'
            }}
          ><DollarSign size={18}/> Financeiro</button>
          
          <button 
            onClick={() => setActiveTab('config')}
            style={{ 
              padding: '16px 24px', 
              color: activeTab === 'config' ? 'var(--color-primary)' : 'var(--color-text-light)',
              borderBottom: activeTab === 'config' ? '2px solid var(--color-primary)' : '2px solid transparent',
              fontWeight: activeTab === 'config' ? 'bold' : 'normal',
              display: 'flex', alignItems: 'center', gap: '8px',
              background: 'transparent', cursor: 'pointer'
            }}
          ><Settings size={18}/> Configurações Logísticas</button>
        </div>
      </div>

      {loading ? (
        <div className="p-8 text-center" style={{ color: 'var(--color-text-light)' }}>Carregando dados...</div>
      ) : (
        <>
          {/* TAB ALUNOS */}
          {activeTab === 'alunos' && (
            <div className="glass-panel" style={{ padding: '24px' }}>
              <div className="flex justify-between items-center mb-6">
                <h2 style={{ color: 'var(--color-text)', fontSize: '18px', fontWeight: 'bold' }}>Lista de Passageiros</h2>
                <button onClick={() => setShowAddAluno(!showAddAluno)} className="btn-primary" style={{ padding: '8px 16px', fontSize: '14px' }}>
                  {showAddAluno ? 'Cancelar' : <><Plus size={16}/> Novo Aluno</>}
                </button>
              </div>

              {showAddAluno && (
                <form onSubmit={handleCreateAluno} style={{ background: 'var(--color-surface)', padding: '20px', borderRadius: '12px', border: '1px solid var(--color-border)', marginBottom: '24px', display: 'flex', flexWrap: 'wrap', gap: '16px' }}>
                  <div style={{ flex: '1 1 200px' }}>
                    <label style={{ fontSize: '12px', color: 'var(--color-text-light)' }}>Nome Completo *</label>
                    <input required className="search-input" value={novoAluno.nome} onChange={e => setNovoAluno({...novoAluno, nome: e.target.value})} placeholder="Ex: João Silva" />
                  </div>
                  <div style={{ flex: '1 1 150px' }}>
                    <label style={{ fontSize: '12px', color: 'var(--color-text-light)' }}>Telefone (WhatsApp) *</label>
                    <input required className="search-input" value={novoAluno.telefone_responsavel} onChange={e => setNovoAluno({...novoAluno, telefone_responsavel: e.target.value})} placeholder="5511999999999" />
                  </div>
                  <div style={{ flex: '1 1 100px' }}>
                    <label style={{ fontSize: '12px', color: 'var(--color-text-light)' }}>Turno *</label>
                    <select required className="search-input" value={novoAluno.turno} onChange={e => setNovoAluno({...novoAluno, turno: e.target.value})}>
                      <option value="manha">Manhã</option>
                      <option value="tarde">Tarde</option>
                      <option value="noite">Noite</option>
                    </select>
                  </div>
                  <div style={{ flex: '1 1 200px' }}>
                    <label style={{ fontSize: '12px', color: 'var(--color-text-light)' }}>Bairro (Endereço)</label>
                    <input className="search-input" value={novoAluno.endereco} onChange={e => setNovoAluno({...novoAluno, endereco: e.target.value})} placeholder="Ex: Centro" />
                  </div>
                  <div style={{ flex: '1 1 100px' }}>
                    <label style={{ fontSize: '12px', color: 'var(--color-text-light)' }}>Mensalidade (R$)</label>
                    <input type="number" step="0.01" className="search-input" value={novoAluno.mensalidade} onChange={e => setNovoAluno({...novoAluno, mensalidade: parseFloat(e.target.value)})} />
                  </div>
                  <div style={{ flex: '1 1 100%', display: 'flex', justifyContent: 'flex-end', marginTop: '8px' }}>
                    <button type="submit" className="btn-primary" style={{ padding: '8px 24px' }}>Salvar Aluno</button>
                  </div>
                </form>
              )}

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr style={{ background: 'var(--color-surface-hover)', borderBottom: '1px solid var(--color-border)' }}>
                      <th style={{ color: 'var(--color-text-light)' }} className="p-4 text-xs font-black uppercase">Nome</th>
                      <th style={{ color: 'var(--color-text-light)' }} className="p-4 text-xs font-black uppercase">Telefone</th>
                      <th style={{ color: 'var(--color-text-light)' }} className="p-4 text-xs font-black uppercase">Turno</th>
                      <th style={{ color: 'var(--color-text-light)' }} className="p-4 text-xs font-black uppercase">Bairro</th>
                      <th style={{ color: 'var(--color-text-light)' }} className="p-4 text-xs font-black uppercase">Mensalidade</th>
                      <th style={{ color: 'var(--color-text-light)' }} className="p-4 text-xs font-black uppercase text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {alunos.map(aluno => {
                      const isEditing = editingAluno && editingAluno.id === aluno.id;
                      return (
                        <tr key={aluno.id} style={{ borderBottom: '1px solid var(--color-border)' }} className="group">
                          {isEditing ? (
                            <>
                              <td className="p-2"><input className="search-input" style={{margin:0, padding:'6px'}} value={editingAluno.nome} onChange={e=>setEditingAluno({...editingAluno, nome: e.target.value})} /></td>
                              <td className="p-2"><input className="search-input" style={{margin:0, padding:'6px'}} value={editingAluno.telefone_responsavel} onChange={e=>setEditingAluno({...editingAluno, telefone_responsavel: e.target.value})} /></td>
                              <td className="p-2">
                                <select className="search-input" style={{margin:0, padding:'6px'}} value={editingAluno.turno} onChange={e=>setEditingAluno({...editingAluno, turno: e.target.value})}>
                                  <option value="manha">Manhã</option>
                                  <option value="tarde">Tarde</option>
                                  <option value="noite">Noite</option>
                                </select>
                              </td>
                              <td className="p-2"><input className="search-input" style={{margin:0, padding:'6px'}} value={editingAluno.bairro} onChange={e=>setEditingAluno({...editingAluno, bairro: e.target.value})} /></td>
                              <td className="p-2"><input type="number" step="0.01" className="search-input" style={{margin:0, padding:'6px'}} value={editingAluno.mensalidade} onChange={e=>setEditingAluno({...editingAluno, mensalidade: parseFloat(e.target.value)})} /></td>
                              <td className="p-2 text-right">
                                <button onClick={() => handleUpdateAluno(aluno.id)} className="text-emerald-500 p-2 bg-transparent border-none cursor-pointer"><CheckCircle2 size={18}/></button>
                                <button onClick={() => setEditingAluno(null)} className="text-red-500 p-2 bg-transparent border-none cursor-pointer"><XCircle size={18}/></button>
                              </td>
                            </>
                          ) : (
                            <>
                              <td className="p-4 font-bold" style={{ color: 'var(--color-text)' }}>{aluno.nome}</td>
                              <td className="p-4 font-mono text-xs" style={{ color: 'var(--color-text-light)' }}>{aluno.telefone_responsavel}</td>
                              <td className="p-4 uppercase text-xs font-bold" style={{ color: 'var(--color-text-light)' }}>{aluno.turno}</td>
                              <td className="p-4" style={{ color: 'var(--color-text-light)' }}>{aluno.bairro || '-'}</td>
                              <td className="p-4 font-bold" style={{ color: 'var(--color-text)' }}>R$ {(aluno.mensalidade || 0).toFixed(2)}</td>
                              <td className="p-4 text-right">
                                <div className="flex items-center justify-end gap-2">
                                  <button onClick={() => setEditingAluno(aluno)} style={{ color: 'var(--color-text-light)' }} className="p-2 hover:text-primary transition-colors bg-transparent border-none cursor-pointer"><Edit2 size={16}/></button>
                                  <button onClick={() => handleDeleteAluno(aluno.id)} style={{ color: 'var(--color-text-light)' }} className="p-2 hover:text-red-500 transition-colors bg-transparent border-none cursor-pointer"><Trash2 size={16}/></button>
                                </div>
                              </td>
                            </>
                          )}
                        </tr>
                      )
                    })}
                    {alunos.length === 0 && <tr><td colSpan="6" className="p-8 text-center" style={{ color: 'var(--color-text-light)' }}>Nenhum aluno cadastrado.</td></tr>}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB FINANCEIRO */}
          {activeTab === 'financeiro' && (
            <div className="glass-panel" style={{ padding: '24px' }}>
              <div className="flex justify-between items-center mb-6">
                <h2 style={{ color: 'var(--color-text)', fontSize: '18px', fontWeight: 'bold' }}>Faturas de Mensalidade</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr style={{ background: 'var(--color-surface-hover)', borderBottom: '1px solid var(--color-border)' }}>
                      <th style={{ color: 'var(--color-text-light)' }} className="p-4 text-xs font-black uppercase">Status</th>
                      <th style={{ color: 'var(--color-text-light)' }} className="p-4 text-xs font-black uppercase">Aluno</th>
                      <th style={{ color: 'var(--color-text-light)' }} className="p-4 text-xs font-black uppercase">Vencimento</th>
                      <th style={{ color: 'var(--color-text-light)' }} className="p-4 text-xs font-black uppercase">Valor</th>
                    </tr>
                  </thead>
                  <tbody>
                    {financeiro.map(f => (
                      <tr key={f.id} style={{ borderBottom: '1px solid var(--color-border)' }} className="hover:bg-white/5">
                        <td className="p-4">
                           <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${
                             f.status === 'pago' ? 'text-emerald-500' : 
                             f.status === 'atrasado' ? 'text-red-500' : 
                             'text-amber-500'
                           }`} style={{ background: 
                             f.status === 'pago' ? 'rgba(16, 185, 129, 0.1)' : 
                             f.status === 'atrasado' ? 'rgba(239, 68, 68, 0.1)' : 
                             'rgba(245, 158, 11, 0.1)'
                           }}>
                              {f.status}
                           </span>
                        </td>
                        <td className="p-4 font-bold" style={{ color: 'var(--color-text)' }}>{f.nome_passageiro} <span className="text-xs font-normal" style={{ color: 'var(--color-text-light)' }}>({f.turno})</span></td>
                        <td className="p-4" style={{ color: 'var(--color-text-light)' }}>{f.vencimento.split('-').reverse().join('/')}</td>
                        <td className="p-4 font-bold" style={{ color: 'var(--color-text)' }}>R$ {f.valor.toFixed(2)}</td>
                      </tr>
                    ))}
                    {financeiro.length === 0 && <tr><td colSpan="4" className="p-8 text-center" style={{ color: 'var(--color-text-light)' }}>Nenhum registro financeiro encontrado.</td></tr>}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB CONFIG */}
          {activeTab === 'config' && (
            <div className="glass-panel" style={{ padding: '32px', maxWidth: '800px', margin: '0 auto' }}>
              <div className="mb-6">
                <h2 style={{ color: 'var(--color-text)', fontSize: '18px', fontWeight: 'bold' }}>Configurações do Motorista</h2>
                <p style={{ color: 'var(--color-text-light)', fontSize: '13px' }}>Ajuste os parâmetros de roteirização apenas para este motorista.</p>
              </div>
              <form onSubmit={handleSaveConfig} style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '16px' }}>
                  <div>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '15px', fontWeight: '500', marginBottom: '8px', color: 'var(--color-primary)' }}>
                      <MapPin size={18} /> Endereço "Ponto 0" (Base da Van)
                    </label>
                    <input 
                      type="text" 
                      className="search-input" 
                      value={baseAddress}
                      onChange={(e) => setBaseAddress(e.target.value)}
                      placeholder="Rua da largada..." 
                    />
                    <p style={{ color: 'var(--color-text-light)', fontSize: '12px', marginTop: '4px' }}>A rota usará isto como largada (1º) e chegada no fim.</p>
                  </div>

                  <div>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '15px', fontWeight: '500', marginBottom: '8px', color: 'var(--color-primary)' }}>
                      <MapPin size={18} /> Endereço da Escola/Universidade
                    </label>
                    <input 
                      type="text" 
                      className="search-input" 
                      value={schoolAddress}
                      onChange={(e) => setSchoolAddress(e.target.value)}
                      placeholder="Endereço de destino..." 
                    />
                    <p style={{ color: 'var(--color-text-light)', fontSize: '12px', marginTop: '4px' }}>Usado para notificar alunos da volta ao se aproximar.</p>
                  </div>
                </div>

                <div>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '15px', fontWeight: '500', marginBottom: '16px', color: 'var(--color-primary)' }}>
                    <Clock size={18} /> Agendamento de Enquetes por Turno
                  </label>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
                    <ShiftConfigCard title="Turno da Manhã" shiftParams={manhaParams} setShiftParams={setManha} />
                    <ShiftConfigCard title="Turno da Tarde" shiftParams={tardeParams} setShiftParams={setTarde} />
                    <ShiftConfigCard title="Turno da Noite" shiftParams={noiteParams} setShiftParams={setNoite} />
                  </div>
                </div>

                <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: '24px' }}>
                  <button type="submit" className="btn-primary" style={{ display: 'inline-flex', padding: '12px 24px' }}>
                    <Save size={18} /> Salvar Parâmetros para {motorista.nome}
                  </button>
                </div>
              </form>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default AdminMotoristaDetail;
