import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { DollarSign, Pickaxe, UserCheck, Search, Filter, TrendingUp, TrendingDown, AlertTriangle, ArrowRight, ArrowLeft, MapPin } from 'lucide-react';

const DashboardPage = () => {
  const [stats, setStats] = useState({
    lucroMes: 0,
    receitaBruta: 0,
    custosTotais: 0,
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



      {/* Stats Area - Financeiro */}
      <h3 style={{ fontSize: '16px', color: 'var(--color-text-light)', marginBottom: '16px' }}>Saúde Financeira</h3>
      <div className="stats-grid">
        <div className="glass-panel stat-card">
          <div className="stat-header">
            <h3>Receita Bruta Mensal</h3>
            <TrendingUp style={{ color: 'var(--color-success)' }} size={20} />
          </div>
          <div className="stat-value">R$ {(stats?.receitaBruta || 0).toFixed(2)}</div>
        </div>

        <div className="glass-panel stat-card">
          <div className="stat-header">
            <h3>Gastos do Mês</h3>
            <TrendingDown style={{ color: 'var(--color-error)' }} size={20} />
          </div>
          <div className="stat-value" style={{ color: 'var(--color-error)' }}>R$ {(stats?.custosTotais || 0).toFixed(2)}</div>
        </div>

        <div className="glass-panel stat-card" style={{ borderBottom: '4px solid var(--color-success)' }}>
          <div className="stat-header">
            <h3>Lucro Líquido</h3>
            <DollarSign style={{ color: 'var(--color-success)' }} size={20} />
          </div>
          <div className="stat-value">R$ {(stats?.lucroMes || 0).toFixed(2)}</div>
        </div>
      </div>

      {/* Stats Area - Operacional */}
      <h3 style={{ fontSize: '16px', color: 'var(--color-text-light)', marginTop: '24px', marginBottom: '16px' }}>Operacional</h3>
      <div className="stats-grid">
        <div className="glass-panel stat-card">
          <div className="stat-header">
            <h3>Total de Alunos Ativos</h3>
            <UserCheck style={{ color: 'var(--color-primary)' }} size={20} />
          </div>
          <div className="stat-value">{stats.ativos}</div>
        </div>

        <div className="glass-panel stat-card">
          <div className="stat-header">
            <h3>Alunos Pendentes (Atraso)</h3>
            <AlertTriangle style={{ color: 'var(--color-warning)' }} size={20} />
          </div>
          <div className="stat-value" style={{ color: 'var(--color-warning)' }}>{stats.inadimplentes}</div>
        </div>
      </div>

      {/* Listagem Estilo Cards CatOleo - Dividida Ida e Volta */}
      <div style={{ marginTop: '32px' }}>
        <h3 style={{ fontSize: '16px', color: 'var(--color-text-light)', marginBottom: '16px' }}>ALUNOS NA ROTA DE HOJE</h3>
        
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '32px' }}>
          
          {/* COLUNA IDA */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px', paddingBottom: '8px', borderBottom: '1px solid var(--color-border)' }}>
              <ArrowRight size={20} style={{ color: 'var(--color-primary)' }} />
              <h4 style={{ color: 'var(--color-text)', fontSize: '15px', fontWeight: 'bold', margin: 0 }}>Rota de Ida (Buscando)</h4>
              <span style={{ marginLeft: 'auto', fontSize: '12px', color: 'var(--color-text-light)' }}>Ordem de busca</span>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Card Mock Ida 1 */}
              <div className="glass-panel" style={{ padding: '20px', borderLeft: '4px solid var(--color-success)', position: 'relative' }}>
                <div style={{ position: 'absolute', top: '-10px', left: '-10px', background: 'var(--color-primary)', color: 'white', width: '24px', height: '24px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 'bold' }}>1</div>
                <div style={{ fontWeight: '600', marginBottom: '8px', color: 'var(--color-text)' }}>JOÃOZINHO SILVA</div>
                <div style={{ fontSize: '14px', color: 'var(--color-text-light)', marginBottom: '4px' }}>
                  <strong>Tel:</strong> (11) 99999-1111
                </div>
                <div style={{ fontSize: '13px', color: 'var(--color-text-light)', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <MapPin size={14} /> <span>Rua das Flores, 123 - Centro</span>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button className="btn-primary" style={{ flex: 1, justifyContent: 'center', background: 'rgba(16, 185, 129, 0.1)', color: 'var(--color-success)', border: '1px solid var(--color-success)', boxShadow: 'none' }}>Confirmado</button>
                </div>
              </div>

              {/* Card Mock Ida 2 */}
              <div className="glass-panel" style={{ padding: '20px', borderLeft: '4px solid var(--color-error)', opacity: 0.7, position: 'relative' }}>
                <div style={{ position: 'absolute', top: '-10px', left: '-10px', background: 'var(--color-surface-hover)', color: 'var(--color-text-light)', width: '24px', height: '24px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 'bold' }}>-</div>
                <div style={{ fontWeight: '600', marginBottom: '8px', color: 'var(--color-text)' }}>MARIA OLIVEIRA</div>
                <div style={{ fontSize: '14px', color: 'var(--color-text-light)', marginBottom: '4px' }}>
                  <strong>Tel:</strong> (11) 98888-2222
                </div>
                <div style={{ fontSize: '13px', color: 'var(--color-text-light)', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <MapPin size={14} /> <span>Av Paulista, 1000 - Bela Vista</span>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button className="btn-primary" style={{ flex: 1, justifyContent: 'center', background: 'rgba(239, 68, 68, 0.1)', color: 'var(--color-error)', border: '1px solid var(--color-error)', boxShadow: 'none' }}>Ausente Hoje</button>
                </div>
              </div>
            </div>
          </div>

          {/* COLUNA VOLTA */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px', paddingBottom: '8px', borderBottom: '1px solid var(--color-border)' }}>
              <ArrowLeft size={20} style={{ color: 'var(--color-warning)' }} />
              <h4 style={{ color: 'var(--color-text)', fontSize: '15px', fontWeight: 'bold', margin: 0 }}>Rota de Volta (Deixando)</h4>
              <span style={{ marginLeft: 'auto', fontSize: '12px', color: 'var(--color-text-light)' }}>Ordem de entrega</span>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Card Mock Volta 1 */}
              <div className="glass-panel" style={{ padding: '20px', borderLeft: '4px solid var(--color-warning)', position: 'relative' }}>
                <div style={{ position: 'absolute', top: '-10px', left: '-10px', background: 'var(--color-warning)', color: 'white', width: '24px', height: '24px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 'bold' }}>1</div>
                <div style={{ fontWeight: '600', marginBottom: '8px', color: 'var(--color-text)' }}>JOÃOZINHO SILVA</div>
                <div style={{ fontSize: '14px', color: 'var(--color-text-light)', marginBottom: '4px' }}>
                  <strong>Tel:</strong> (11) 99999-1111
                </div>
                <div style={{ fontSize: '13px', color: 'var(--color-text-light)', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <MapPin size={14} /> <span>Rua das Flores, 123 - Centro</span>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button className="btn-primary" style={{ flex: 1, justifyContent: 'center', background: 'rgba(245, 158, 11, 0.1)', color: 'var(--color-warning)', border: '1px solid var(--color-warning)', boxShadow: 'none' }}>Aguardando Retorno</button>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>

    </div>
  );
};

export default DashboardPage;
