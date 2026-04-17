import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { DollarSign, AlertTriangle, CheckCircle, Search } from 'lucide-react';

const FinanceiroPage = () => {
  const [financas, setFinancas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterTurno, setFilterTurno] = useState('Todos');
  const [filterStatus, setFilterStatus] = useState('Todos');

  useEffect(() => {
    const fetchFinanceiro = async () => {
      try {
        const response = await axios.get('/api/financeiro');
        setFinancas(response.data);
      } catch (error) {
        console.error('Erro ao buscar financeiro', error);
      } finally {
        setLoading(false);
      }
    };
    fetchFinanceiro();
  }, []);

  const calcularStatusVisual = (status) => {
     if(status === 'pago') return <span style={{display:'inline-flex', alignItems:'center', gap:'4px', color:'#10b981', background:'#d1fae5', padding:'4px 8px', borderRadius:'12px', fontSize:'12px', fontWeight:'600'}}><CheckCircle size={14}/> PAGO (IA VALIDADA)</span>;
     if(status === 'atrasado') return <span style={{display:'inline-flex', alignItems:'center', gap:'4px', color:'#ef4444', background:'#fee2e2', padding:'4px 8px', borderRadius:'12px', fontSize:'12px', fontWeight:'600'}}><AlertTriangle size={14}/> ATRASADO</span>;
     
     return <span style={{display:'inline-flex', alignItems:'center', gap:'4px', color:'#f59e0b', background:'#fef3c7', padding:'4px 8px', borderRadius:'12px', fontSize:'12px', fontWeight:'600'}}>PENDENTE</span>;
  };

  const filteredFinancas = financas.filter(f => {
    const passTurno = filterTurno === 'Todos' || f.turno === filterTurno;
    const passStatus = filterStatus === 'Todos' || f.status === filterStatus;
    return passTurno && passStatus;
  });

  return (
    <div>
      <div className="flex-between mb-4" style={{ marginBottom: '24px' }}>
        <div>
          <h1 className="header-title" style={{ margin: 0 }}>Portal Financeiro</h1>
          <p className="header-subtitle" style={{ margin: 0, marginTop: '4px' }}>Controle Mágico de Mensalidades</p>
        </div>
      </div>

      <div className="stats-grid" style={{ marginBottom: '24px' }}>
         <div className="flat-panel stat-card" style={{borderTop: '4px solid #f59e0b'}}>
          <div className="stat-header">
            <h3>PAGAMENTOS PENDENTES</h3>
            <DollarSign className="text-warning" size={20} />
          </div>
          <div className="stat-value text-warning">{financas.filter(f=>f.status === 'pendente').length}</div>
        </div>
        <div className="flat-panel stat-card" style={{borderTop: '4px solid #10b981'}}>
          <div className="stat-header">
            <h3>CONFIRMADOS</h3>
            <CheckCircle className="text-success" size={20} />
          </div>
          <div className="stat-value text-success">{financas.filter(f=>f.status === 'pago').length}</div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '16px', marginBottom: '24px', flexWrap: 'wrap' }}>
        <select 
          className="search-input" 
          value={filterTurno} 
          onChange={e => setFilterTurno(e.target.value)} 
          style={{ width: 'auto', minWidth: '200px' }}
        >
          <option value="Todos">Todos os Turnos</option>
          <option value="manha">Manhã</option>
          <option value="tarde">Tarde</option>
          <option value="noite">Noite</option>
        </select>
        
        <select 
          className="search-input" 
          value={filterStatus} 
          onChange={e => setFilterStatus(e.target.value)}
          style={{ width: 'auto', minWidth: '200px' }}
        >
          <option value="Todos">Todas as Situações</option>
          <option value="pago">Pago (I.A)</option>
          <option value="pendente">Pendente</option>
          <option value="atrasado">Atrasado</option>
        </select>
        
        <div style={{ marginLeft: 'auto', color: 'var(--color-text-light)', fontSize: '14px', alignSelf: 'center' }}>
          Mostrando {filteredFinancas.length} registros
        </div>
      </div>

      <div className="flat-panel" style={{ padding: '0' }}>
        {loading ? (
          <div style={{ padding: '32px', textAlign: 'center', color: 'var(--color-text-light)' }}>
             Buscando movimentações no banco de dados...
          </div>
        ) : filteredFinancas.length === 0 ? (
          <div style={{ padding: '32px', textAlign: 'center', color: 'var(--color-text-light)' }}>
             Nenhum resultado pra esse filtro ou nenhuma fatura gerada.
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #e5e7eb', backgroundColor: '#f9fafb' }}>
                <th style={{ padding: '16px', fontWeight: '600', color: '#4b5563', fontSize: '14px' }}>Nome Passageiro</th>
                <th style={{ padding: '16px', fontWeight: '600', color: '#4b5563', fontSize: '14px' }}>Turno</th>
                <th style={{ padding: '16px', fontWeight: '600', color: '#4b5563', fontSize: '14px' }}>Valor Mínimo</th>
                <th style={{ padding: '16px', fontWeight: '600', color: '#4b5563', fontSize: '14px' }}>Vencimento</th>
                <th style={{ padding: '16px', fontWeight: '600', color: '#4b5563', fontSize: '14px', textAlign: 'right' }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredFinancas.map(fin => (
                <tr key={fin.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                  <td style={{ padding: '16px', fontWeight: '500', color: 'var(--color-text)' }}>
                    {fin.nome_passageiro}
                  </td>
                  <td style={{ padding: '16px', color: 'var(--color-text-light)', fontSize: '14px', textTransform: 'capitalize' }}>
                    {fin.turno}
                  </td>
                  <td style={{ padding: '16px', color: 'var(--color-text-light)', fontSize: '14px' }}>
                    R$ {fin.valor.toFixed(2)}
                  </td>
                  <td style={{ padding: '16px', color: 'var(--color-text-light)', fontSize: '14px' }}>
                     {fin.vencimento}
                  </td>
                  <td style={{ padding: '16px', textAlign: 'right' }}>
                    {calcularStatusVisual(fin.status)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default FinanceiroPage;
