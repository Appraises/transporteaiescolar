import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { UserPlus, UserCog, MapPin, Phone } from 'lucide-react';

const AlunosPage = () => {
  const [alunos, setAlunos] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAlunos = async () => {
      try {
        const response = await axios.get('/api/alunos');
        setAlunos(response.data);
      } catch (error) {
        console.error('Erro ao buscar alunos', error);
      } finally {
        setLoading(false);
      }
    };
    fetchAlunos();
  }, []);

  return (
    <div>
      <div className="flex-between mb-4" style={{ marginBottom: '24px' }}>
        <div>
          <h1 className="header-title" style={{ margin: 0 }}>Gestão de Alunos</h1>
          <p className="header-subtitle" style={{ margin: 0, marginTop: '4px' }}>Gerencie passageiros e endereços</p>
        </div>
        <button className="btn-primary">
          <UserPlus size={18} /> Cadastrar Aluno
        </button>
      </div>

      <div className="flat-panel" style={{ padding: '0' }}>
        {loading ? (
          <div style={{ padding: '32px', textAlign: 'center', color: 'var(--color-text-light)' }}>
             Carregando banco de dados...
          </div>
        ) : alunos.length === 0 ? (
          <div style={{ padding: '32px', textAlign: 'center', color: 'var(--color-text-light)' }}>
             Nenhum aluno cadastrado. Peça para mandarem mensagem no WhatsApp!
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #e5e7eb', backgroundColor: '#f9fafb' }}>
                <th style={{ padding: '16px', fontWeight: '600', color: '#4b5563', fontSize: '14px' }}>Nome</th>
                <th style={{ padding: '16px', fontWeight: '600', color: '#4b5563', fontSize: '14px' }}>WhatsApp (JID)</th>
                <th style={{ padding: '16px', fontWeight: '600', color: '#4b5563', fontSize: '14px' }}>Endereço (Turno)</th>
                <th style={{ padding: '16px', fontWeight: '600', color: '#4b5563', fontSize: '14px', textAlign: 'right' }}>Ações</th>
              </tr>
            </thead>
            <tbody>
              {alunos.map(aluno => (
                <tr key={aluno.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                  <td style={{ padding: '16px', fontWeight: '500', color: 'var(--color-text)' }}>
                    {aluno.nome}
                  </td>
                  <td style={{ padding: '16px', color: 'var(--color-text-light)', fontSize: '14px' }}>
                    <div style={{display: 'flex', alignItems: 'center', gap: '6px'}}>
                      <Phone size={14} /> {aluno.telefone.replace('@s.whatsapp.net', '')}
                    </div>
                  </td>
                  <td style={{ padding: '16px', color: 'var(--color-text-light)', fontSize: '14px' }}>
                    <div style={{display: 'flex', alignItems: 'center', gap: '6px'}}>
                      <MapPin size={14} /> {aluno.bairro || 'Sem Endereço'} 
                      <span style={{background: '#e0f2fe', color: '#0284c7', padding: '2px 8px', borderRadius: '12px', fontSize: '12px', marginLeft: '8px'}}>
                        {aluno.turno_padrao || '?'}
                      </span>
                    </div>
                  </td>
                  <td style={{ padding: '16px', textAlign: 'right' }}>
                    <button style={{ background: 'none', color: '#64748b', cursor: 'pointer', padding: '4px' }}>
                      <UserCog size={18} />
                    </button>
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

export default AlunosPage;
