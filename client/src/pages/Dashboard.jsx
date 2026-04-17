import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { DollarSign, Pickaxe, UserCheck, Search, Filter } from 'lucide-react';

const DashboardPage = () => {
  const [stats, setStats] = useState({
    lucroMes: 0,
    inadimplentes: 0,
    ativos: 0,
    viagensHoje: 0
  });

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await axios.get('/api/dashboard/stats');
        if (response.data && typeof response.data === 'object' && response.data.lucroMes !== undefined) {
           setStats(response.data);
        }
      } catch (error) {
        console.error('Erro ao buscar stats do Painel:', error);
      }
    };
    fetchStats();
  }, []);

  return (
    <div>
      <div className="flex-between mb-4" style={{ marginBottom: '24px' }}>
        <div className="header-title" style={{ margin: 0 }}>Visão Geral Operacional</div>
      </div>

      {/* Action Bar imitando o print da referencia */}
      <div style={{ display: 'flex', gap: '16px', marginBottom: '32px' }}>
        <div style={{ flex: 1, position: 'relative' }}>
          <Search size={18} style={{ position: 'absolute', left: '12px', top: '12px', color: '#94a3b8' }} />
          <input 
            type="text" 
            className="search-input" 
            placeholder="Buscar por passageiro ou rota..." 
            style={{ paddingLeft: '38px', height: '42px' }}
          />
        </div>
        <button className="btn-primary" style={{ background: '#ffffff', color: '#334155', border: '1px solid #e5e7eb' }}>
          <Filter size={18} />
          Filtrar Situação
        </button>
      </div>

      {/* Stats Area */}
      <div className="stats-grid">
        <div className="flat-panel stat-card">
          <div className="stat-header">
            <h3>Lucro Estimado Mensal</h3>
            <DollarSign className="text-success" size={20} />
          </div>
          <div className="stat-value">R$ {(stats?.lucroMes || 0).toFixed(2)}</div>
        </div>

        <div className="flat-panel stat-card">
          <div className="stat-header">
            <h3>Alunos Pendentes (Atraso)</h3>
            <span style={{ color: '#ef4444' }}>⚠️</span>
          </div>
          <div className="stat-value text-danger">{stats.inadimplentes}</div>
        </div>

        <div className="flat-panel stat-card">
          <div className="stat-header">
            <h3>Total de Alunos Ativos</h3>
            <UserCheck className="text-primary" size={20} />
          </div>
          <div className="stat-value">{stats.ativos}</div>
        </div>
      </div>

      {/* Listagem Estilo Cards CatOleo */}
      <div style={{ marginTop: '32px' }}>
        <h3 style={{ fontSize: '16px', color: '#64748b', marginBottom: '16px' }}>ALUNOS NA ROTA DE HOJE</h3>
        <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))' }}>
          {/* Card Mock Aluno 1 */}
          <div className="flat-panel" style={{ padding: '20px', borderLeft: '4px solid #10b981' }}>
            <div style={{ fontWeight: '600', marginBottom: '8px', color: '#0f172a' }}>JOÃOZINHO SILVA</div>
            <div style={{ fontSize: '14px', color: '#64748b', marginBottom: '4px' }}>
              <strong>Tel:</strong> (11) 99999-1111
            </div>
            <div style={{ fontSize: '13px', color: '#64748b', marginBottom: '16px', display: 'flex', gap: '4px' }}>
              <span>📍 Rua das Flores, 123 - Centro</span>
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button className="btn-primary" style={{ flex: 1, justifyContent: 'center', background: '#ffffff', color: '#10b981', border: '1px solid #10b981' }}>Confirmado</button>
            </div>
          </div>

           {/* Card Mock Aluno 2 */}
           <div className="flat-panel" style={{ padding: '20px', borderLeft: '4px solid #ef4444' }}>
            <div style={{ fontWeight: '600', marginBottom: '8px', color: '#0f172a' }}>MARIA OLIVEIRA</div>
            <div style={{ fontSize: '14px', color: '#64748b', marginBottom: '4px' }}>
              <strong>Tel:</strong> (11) 98888-2222
            </div>
            <div style={{ fontSize: '13px', color: '#64748b', marginBottom: '16px', display: 'flex', gap: '4px' }}>
              <span>📍 Av Paulista, 1000 - Bela Vista</span>
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button className="btn-primary" style={{ flex: 1, justifyContent: 'center', background: '#fee2e2', color: '#ef4444', border: 'none' }}>Ausente Hoje</button>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
};

export default DashboardPage;
