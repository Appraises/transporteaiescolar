import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { DollarSign, AlertTriangle, CheckCircle, Search, PlusCircle, TrendingUp, TrendingDown, BarChart2, Edit2, Trash2 } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const FinanceiroPage = () => {
  const [financas, setFinancas] = useState([]);
  const [despesas, setDespesas] = useState([]);
  const [grafico, setGrafico] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [activeTab, setActiveTab] = useState('receitas'); // receitas, despesas, relatorio
  
  const [filterTurno, setFilterTurno] = useState('Todos');
  const [filterStatus, setFilterStatus] = useState('Todos');

  const [showDespesaForm, setShowDespesaForm] = useState(false);
  const [showEditDespesaForm, setShowEditDespesaForm] = useState(false);
  const [novaDespesa, setNovaDespesa] = useState({ categoria: 'Combustível', valor: '', descricao: '', data: '' });
  const [despesaEmEdicao, setDespesaEmEdicao] = useState({ id: null, categoria: 'Combustível', valor: '', descricao: '', data: '' });

  const fetchDados = async () => {
    try {
      setLoading(true);
      const [resFinancas, resDespesas, resGrafico] = await Promise.all([
        axios.get('/api/financeiro'),
        axios.get('/api/financeiro/despesas'),
        axios.get('/api/financeiro/grafico')
      ]);
      setFinancas(resFinancas.data);
      setDespesas(resDespesas.data);
      setGrafico(resGrafico.data);
    } catch (error) {
      console.error('Erro ao buscar financeiro detalhado', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDados();
  }, []);

  const handleCreateDespesa = async (e) => {
    e.preventDefault();
    try {
      await axios.post('/api/financeiro/despesas', novaDespesa);
      setShowDespesaForm(false);
      setNovaDespesa({ categoria: 'Combustível', valor: '', descricao: '', data: '' });
      fetchDados();
    } catch (error) {
      alert('Erro ao cadastrar despesa.');
    }
  };

  const handleUpdateDespesa = async (e) => {
    e.preventDefault();
    try {
      await axios.put(`/api/financeiro/despesas/${despesaEmEdicao.id}`, despesaEmEdicao);
      setShowEditDespesaForm(false);
      setDespesaEmEdicao({ id: null, categoria: 'Combustível', valor: '', descricao: '', data: '' });
      fetchDados();
    } catch (error) {
      alert('Erro ao atualizar despesa.');
    }
  };

  const handleDeleteDespesa = async (id) => {
    if (window.confirm('Tem certeza que deseja deletar esta despesa?')) {
      try {
        await axios.delete(`/api/financeiro/despesas/${id}`);
        fetchDados();
      } catch (error) {
        alert('Erro ao deletar despesa.');
      }
    }
  };

  const openEditDespesaModal = (desp) => {
    setDespesaEmEdicao({
      id: desp.id,
      categoria: desp.categoria,
      valor: desp.valor,
      descricao: desp.descricao || '',
      data: desp.data
    });
    setShowEditDespesaForm(true);
    setShowDespesaForm(false);
  };

  const calcularStatusVisual = (status) => {
     if(status === 'pago') return <span style={{display:'inline-flex', alignItems:'center', gap:'4px', color:'var(--color-success)', background:'rgba(16, 185, 129, 0.1)', border:'1px solid var(--color-success)', padding:'4px 8px', borderRadius:'12px', fontSize:'12px', fontWeight:'600'}}><CheckCircle size={14}/> PAGO (IA VALIDADA)</span>;
     if(status === 'atrasado') return <span style={{display:'inline-flex', alignItems:'center', gap:'4px', color:'var(--color-error)', background:'rgba(239, 68, 68, 0.1)', border:'1px solid var(--color-error)', padding:'4px 8px', borderRadius:'12px', fontSize:'12px', fontWeight:'600'}}><AlertTriangle size={14}/> ATRASADO</span>;
     
     return <span style={{display:'inline-flex', alignItems:'center', gap:'4px', color:'var(--color-warning)', background:'rgba(245, 158, 11, 0.1)', border:'1px solid var(--color-warning)', padding:'4px 8px', borderRadius:'12px', fontSize:'12px', fontWeight:'600'}}>PENDENTE</span>;
  };

  const filteredFinancas = financas.filter(f => {
    const passTurno = filterTurno === 'Todos' || f.turno === filterTurno;
    const passStatus = filterStatus === 'Todos' || f.status === filterStatus;
    return passTurno && passStatus;
  });

  // Calculate totals
  const totalReceitaBruta = financas.filter(f => f.status === 'pago').reduce((acc, curr) => acc + curr.valor, 0);
  const totalCustos = despesas.reduce((acc, curr) => acc + curr.valor, 0);
  const lucroLiquido = totalReceitaBruta - totalCustos;

  return (
    <div>
      <div className="flex-between mb-4" style={{ marginBottom: '24px' }}>
        <div>
          <h1 className="header-title" style={{ margin: 0 }}>Portal Financeiro Detalhado</h1>
          <p className="header-subtitle" style={{ margin: 0, marginTop: '4px' }}>Controle Mágico de Mensalidades, Custos e Lucro</p>
        </div>
      </div>

      {/* Resumo Rápido */}
      <div className="stats-grid" style={{ marginBottom: '32px' }}>
        <div className="glass-panel stat-card" style={{borderTop: '4px solid var(--color-success)'}}>
          <div className="stat-header">
            <h3>Receita Bruta (Recebida)</h3>
            <TrendingUp style={{ color: 'var(--color-success)' }} size={20} />
          </div>
          <div className="stat-value" style={{ color: 'var(--color-success)' }}>R$ {totalReceitaBruta.toFixed(2)}</div>
        </div>
        <div className="glass-panel stat-card" style={{borderTop: '4px solid var(--color-error)'}}>
          <div className="stat-header">
            <h3>Custos / Despesas</h3>
            <TrendingDown style={{ color: 'var(--color-error)' }} size={20} />
          </div>
          <div className="stat-value" style={{ color: 'var(--color-error)' }}>R$ {totalCustos.toFixed(2)}</div>
        </div>
        <div className="glass-panel stat-card" style={{borderTop: '4px solid var(--color-primary)'}}>
          <div className="stat-header">
            <h3>Lucro Líquido</h3>
            <DollarSign style={{ color: 'var(--color-primary)' }} size={20} />
          </div>
          <div className="stat-value" style={{ color: 'var(--color-primary)' }}>R$ {lucroLiquido.toFixed(2)}</div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '24px', borderBottom: '1px solid var(--color-border)', paddingBottom: '8px' }}>
        <button 
          onClick={() => setActiveTab('receitas')}
          style={{ background: activeTab === 'receitas' ? 'var(--color-surface)' : 'transparent', color: activeTab === 'receitas' ? 'var(--color-text)' : 'var(--color-text-light)', border: 'none', padding: '8px 16px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}
        >
          <TrendingUp size={18}/> Receitas (Alunos)
        </button>
        <button 
          onClick={() => setActiveTab('despesas')}
          style={{ background: activeTab === 'despesas' ? 'var(--color-surface)' : 'transparent', color: activeTab === 'despesas' ? 'var(--color-text)' : 'var(--color-text-light)', border: 'none', padding: '8px 16px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}
        >
          <TrendingDown size={18}/> Custos (Despesas)
        </button>
        <button 
          onClick={() => setActiveTab('relatorio')}
          style={{ background: activeTab === 'relatorio' ? 'var(--color-surface)' : 'transparent', color: activeTab === 'relatorio' ? 'var(--color-text)' : 'var(--color-text-light)', border: 'none', padding: '8px 16px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}
        >
          <BarChart2 size={18}/> Gráfico de Lucro
        </button>
      </div>

      {loading ? (
        <div style={{ padding: '32px', textAlign: 'center', color: 'var(--color-text-light)' }}>
           Buscando movimentações no banco de dados...
        </div>
      ) : (
        <>
          {/* TAB RECEITAS */}
          {activeTab === 'receitas' && (
            <div>
              <div style={{ display: 'flex', gap: '16px', marginBottom: '24px', flexWrap: 'wrap' }}>
                <select className="search-input" value={filterTurno} onChange={e => setFilterTurno(e.target.value)} style={{ width: 'auto', minWidth: '200px' }}>
                  <option value="Todos">Todos os Turnos</option>
                  <option value="manha">Manhã</option>
                  <option value="tarde">Tarde</option>
                  <option value="noite">Noite</option>
                </select>
                <select className="search-input" value={filterStatus} onChange={e => setFilterStatus(e.target.value)} style={{ width: 'auto', minWidth: '200px' }}>
                  <option value="Todos">Todas as Situações</option>
                  <option value="pago">Pago (I.A)</option>
                  <option value="pendente">Pendente</option>
                  <option value="atrasado">Atrasado</option>
                </select>
                <div style={{ marginLeft: 'auto', color: 'var(--color-text-light)', fontSize: '14px', alignSelf: 'center' }}>
                  Mostrando {filteredFinancas.length} alunos
                </div>
              </div>

              <div className="glass-panel" style={{ padding: '0', overflow: 'hidden' }}>
                {filteredFinancas.length === 0 ? (
                  <div style={{ padding: '32px', textAlign: 'center', color: 'var(--color-text-light)' }}>Nenhum resultado pra esse filtro.</div>
                ) : (
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid var(--color-border)', backgroundColor: 'var(--color-surface-hover)' }}>
                        <th style={{ padding: '16px', fontWeight: '600', color: 'var(--color-text-light)', fontSize: '14px' }}>Nome Passageiro</th>
                        <th style={{ padding: '16px', fontWeight: '600', color: 'var(--color-text-light)', fontSize: '14px' }}>Turno</th>
                        <th style={{ padding: '16px', fontWeight: '600', color: 'var(--color-text-light)', fontSize: '14px' }}>Valor</th>
                        <th style={{ padding: '16px', fontWeight: '600', color: 'var(--color-text-light)', fontSize: '14px' }}>Vencimento</th>
                        <th style={{ padding: '16px', fontWeight: '600', color: 'var(--color-text-light)', fontSize: '14px', textAlign: 'right' }}>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredFinancas.map(fin => (
                        <tr key={fin.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                          <td style={{ padding: '16px', fontWeight: '500', color: 'var(--color-text)' }}>{fin.nome_passageiro}</td>
                          <td style={{ padding: '16px', color: 'var(--color-text-light)', fontSize: '14px', textTransform: 'capitalize' }}>{fin.turno}</td>
                          <td style={{ padding: '16px', color: 'var(--color-text-light)', fontSize: '14px', fontWeight: 'bold' }}>R$ {fin.valor.toFixed(2)}</td>
                          <td style={{ padding: '16px', color: 'var(--color-text-light)', fontSize: '14px' }}>{fin.vencimento}</td>
                          <td style={{ padding: '16px', textAlign: 'right' }}>{calcularStatusVisual(fin.status)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          )}

          {/* TAB DESPESAS */}
          {activeTab === 'despesas' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '24px' }}>
                <button className="btn-primary" onClick={() => setShowDespesaForm(!showDespesaForm)}>
                  <PlusCircle size={18} /> {showDespesaForm ? 'Cancelar' : 'Nova Despesa'}
                </button>
              </div>

              {showDespesaForm && (
                <div className="glass-panel" style={{ padding: '24px', marginBottom: '24px', border: '1px solid var(--color-primary)' }}>
                  <h2 style={{ fontSize: '16px', marginBottom: '16px' }}>Lançar Custo Diário/Mensal</h2>
                  <form onSubmit={handleCreateDespesa} style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                    <div style={{ flex: '1 1 200px' }}>
                      <label style={{ display: 'block', fontSize: '13px', color: 'var(--color-text-light)', marginBottom: '4px' }}>Categoria</label>
                      <select required className="search-input" value={novaDespesa.categoria} onChange={e => setNovaDespesa({...novaDespesa, categoria: e.target.value})}>
                        <option value="Combustível">Combustível</option>
                        <option value="Manutenção">Manutenção</option>
                        <option value="Impostos">Impostos / Doc.</option>
                        <option value="Limpeza">Limpeza</option>
                        <option value="Outros">Outros</option>
                      </select>
                    </div>
                    <div style={{ flex: '1 1 150px' }}>
                      <label style={{ display: 'block', fontSize: '13px', color: 'var(--color-text-light)', marginBottom: '4px' }}>Valor (R$)</label>
                      <input required type="number" step="0.01" className="search-input" value={novaDespesa.valor} onChange={e => setNovaDespesa({...novaDespesa, valor: e.target.value})} placeholder="0.00" />
                    </div>
                    <div style={{ flex: '1 1 150px' }}>
                      <label style={{ display: 'block', fontSize: '13px', color: 'var(--color-text-light)', marginBottom: '4px' }}>Data</label>
                      <input required type="date" className="search-input" value={novaDespesa.data} onChange={e => setNovaDespesa({...novaDespesa, data: e.target.value})} />
                    </div>
                    <div style={{ flex: '1 1 250px' }}>
                      <label style={{ display: 'block', fontSize: '13px', color: 'var(--color-text-light)', marginBottom: '4px' }}>Descrição (Opcional)</label>
                      <input type="text" className="search-input" value={novaDespesa.descricao} onChange={e => setNovaDespesa({...novaDespesa, descricao: e.target.value})} placeholder="Ex: Posto Ipiranga" />
                    </div>
                    <div style={{ flex: '1 1 100%', display: 'flex', justifyContent: 'flex-end', marginTop: '8px' }}>
                      <button type="submit" className="btn-primary" style={{ background: 'var(--color-success)', borderColor: 'var(--color-success)' }}>Salvar Custo</button>
                    </div>
                  </form>
                </div>
              )}

              {showEditDespesaForm && (
                <div className="glass-panel" style={{ padding: '24px', marginBottom: '24px', border: '1px solid var(--color-warning)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                    <h2 style={{ fontSize: '16px', margin: 0 }}>Editar Custo</h2>
                    <button onClick={() => setShowEditDespesaForm(false)} style={{ background: 'none', border: 'none', color: 'var(--color-text-light)', cursor: 'pointer' }}>Cancelar</button>
                  </div>
                  <form onSubmit={handleUpdateDespesa} style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                    <div style={{ flex: '1 1 200px' }}>
                      <label style={{ display: 'block', fontSize: '13px', color: 'var(--color-text-light)', marginBottom: '4px' }}>Categoria</label>
                      <select required className="search-input" value={despesaEmEdicao.categoria} onChange={e => setDespesaEmEdicao({...despesaEmEdicao, categoria: e.target.value})}>
                        <option value="Combustível">Combustível</option>
                        <option value="Manutenção">Manutenção</option>
                        <option value="Impostos">Impostos / Doc.</option>
                        <option value="Limpeza">Limpeza</option>
                        <option value="Outros">Outros</option>
                      </select>
                    </div>
                    <div style={{ flex: '1 1 150px' }}>
                      <label style={{ display: 'block', fontSize: '13px', color: 'var(--color-text-light)', marginBottom: '4px' }}>Valor (R$)</label>
                      <input required type="number" step="0.01" className="search-input" value={despesaEmEdicao.valor} onChange={e => setDespesaEmEdicao({...despesaEmEdicao, valor: e.target.value})} />
                    </div>
                    <div style={{ flex: '1 1 150px' }}>
                      <label style={{ display: 'block', fontSize: '13px', color: 'var(--color-text-light)', marginBottom: '4px' }}>Data</label>
                      <input required type="date" className="search-input" value={despesaEmEdicao.data} onChange={e => setDespesaEmEdicao({...despesaEmEdicao, data: e.target.value})} />
                    </div>
                    <div style={{ flex: '1 1 250px' }}>
                      <label style={{ display: 'block', fontSize: '13px', color: 'var(--color-text-light)', marginBottom: '4px' }}>Descrição (Opcional)</label>
                      <input type="text" className="search-input" value={despesaEmEdicao.descricao} onChange={e => setDespesaEmEdicao({...despesaEmEdicao, descricao: e.target.value})} />
                    </div>
                    <div style={{ flex: '1 1 100%', display: 'flex', justifyContent: 'flex-end', marginTop: '8px' }}>
                      <button type="submit" className="btn-primary" style={{ background: 'var(--color-warning)', borderColor: 'var(--color-warning)' }}>Atualizar Custo</button>
                    </div>
                  </form>
                </div>
              )}

              <div className="glass-panel" style={{ padding: '0', overflow: 'hidden' }}>
                {despesas.length === 0 ? (
                  <div style={{ padding: '32px', textAlign: 'center', color: 'var(--color-text-light)' }}>Nenhuma despesa lançada. O seu lucro está nas alturas! 🚀</div>
                ) : (
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid var(--color-border)', backgroundColor: 'var(--color-surface-hover)' }}>
                        <th style={{ padding: '16px', fontWeight: '600', color: 'var(--color-text-light)', fontSize: '14px' }}>Data</th>
                        <th style={{ padding: '16px', fontWeight: '600', color: 'var(--color-text-light)', fontSize: '14px' }}>Categoria</th>
                        <th style={{ padding: '16px', fontWeight: '600', color: 'var(--color-text-light)', fontSize: '14px' }}>Descrição</th>
                        <th style={{ padding: '16px', fontWeight: '600', color: 'var(--color-text-light)', fontSize: '14px', textAlign: 'right' }}>Valor Custo</th>
                        <th style={{ padding: '16px', fontWeight: '600', color: 'var(--color-text-light)', fontSize: '14px', textAlign: 'center' }}>Ações</th>
                      </tr>
                    </thead>
                    <tbody>
                      {despesas.map(desp => (
                        <tr key={desp.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                          <td style={{ padding: '16px', color: 'var(--color-text-light)', fontSize: '14px' }}>{new Date(desp.data).toLocaleDateString('pt-BR')}</td>
                          <td style={{ padding: '16px', fontWeight: '500', color: 'var(--color-text)' }}>{desp.categoria}</td>
                          <td style={{ padding: '16px', color: 'var(--color-text-light)', fontSize: '14px' }}>{desp.descricao || '-'}</td>
                          <td style={{ padding: '16px', textAlign: 'right', fontWeight: 'bold', color: 'var(--color-error)' }}>- R$ {desp.valor.toFixed(2)}</td>
                          <td style={{ padding: '16px', textAlign: 'center' }}>
                            <button onClick={() => openEditDespesaModal(desp)} style={{ background: 'none', border: 'none', color: 'var(--color-text-light)', cursor: 'pointer', marginRight: '8px' }}>
                              <Edit2 size={16} />
                            </button>
                            <button onClick={() => handleDeleteDespesa(desp.id)} style={{ background: 'none', border: 'none', color: 'var(--color-error)', cursor: 'pointer' }}>
                              <Trash2 size={16} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          )}

          {/* TAB GRÁFICO */}
          {activeTab === 'relatorio' && (
            <div className="glass-panel" style={{ padding: '32px', minHeight: '400px' }}>
              <h2 style={{ fontSize: '18px', marginBottom: '24px', textAlign: 'center' }}>Evolução do Lucro Líquido (Receitas x Custos)</h2>
              <ResponsiveContainer width="100%" height={350}>
                <LineChart data={grafico} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                  <XAxis dataKey="name" stroke="#888" />
                  <YAxis stroke="#888" />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#1E1E1E', border: '1px solid #333', borderRadius: '8px' }}
                    itemStyle={{ fontWeight: 'bold' }}
                  />
                  <Line type="monotone" dataKey="Lucro" stroke="var(--color-primary)" strokeWidth={3} dot={{ r: 6 }} activeDot={{ r: 8 }} />
                  <Line type="monotone" dataKey="Receita" stroke="var(--color-success)" strokeWidth={2} strokeDasharray="5 5" />
                  <Line type="monotone" dataKey="Custos" stroke="var(--color-error)" strokeWidth={2} strokeDasharray="5 5" />
                </LineChart>
              </ResponsiveContainer>
              <div style={{ display: 'flex', justifyContent: 'center', gap: '24px', marginTop: '16px', fontSize: '14px' }}>
                <span style={{ color: 'var(--color-primary)', fontWeight: 'bold' }}>— Lucro Líquido</span>
                <span style={{ color: 'var(--color-success)' }}>- - Receita</span>
                <span style={{ color: 'var(--color-error)' }}>- - Custos</span>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default FinanceiroPage;
