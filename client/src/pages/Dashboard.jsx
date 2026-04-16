import React, { useState, useEffect } from 'react';
import { DollarSign, Pickaxe, UserCheck, TrendingUp } from 'lucide-react';

const DashboardPage = () => {
  // Mock Data temporária para o front (até termos a API do Backend pronta)
  const [stats, setStats] = useState({
    lucroMes: 4500,
    inadimplentes: 3,
    ativos: 14,
    viagensHoje: 2
  });

  return (
    <div>
      <div className="header-title">Visão Geral</div>
      <div className="header-subtitle">Acompanhe seus rendimentos e rotas de hoje.</div>

      {/* Stats Area */}
      <div className="stats-grid">
        <div className="glass-panel stat-card">
          <div className="stat-header">
            <h3>Lucro Estimado</h3>
            <DollarSign className="text-success" size={20} />
          </div>
          <div className="stat-value">R$ {stats.lucroMes.toFixed(2)}</div>
        </div>

        <div className="glass-panel stat-card">
          <div className="stat-header">
            <h3>Em Atraso</h3>
            <TrendingUp className="text-danger" size={20} />
          </div>
          <div className="stat-value text-danger">{stats.inadimplentes}</div>
        </div>

        <div className="glass-panel stat-card">
          <div className="stat-header">
            <h3>Alunos Ativos</h3>
            <UserCheck className="text-primary" size={20} />
          </div>
          <div className="stat-value">{stats.ativos}</div>
        </div>
      </div>

      {/* Rota do Dia (Provisão) */}
      <div className="glass-panel p-6" style={{ padding: '24px' }}>
        <h2 className="text-lg font-bold mb-4" style={{ marginBottom: '16px', fontSize: '18px' }}>Rota de Hoje (Manhã)</h2>
        <div className="text-muted">A rota de hoje ainda não foi iniciada.</div>
      </div>

    </div>
  );
};

export default DashboardPage;
