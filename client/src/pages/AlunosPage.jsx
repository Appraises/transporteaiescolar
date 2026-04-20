import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { UserPlus, UserCog, MapPin, Phone } from 'lucide-react';

const AlunosPage = () => {
  const [alunos, setAlunos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [novoAluno, setNovoAluno] = useState({ nome: '', telefone: '', turno_padrao: 'manha', bairro: '', mensalidade: '' });
  const [alunoEmEdicao, setAlunoEmEdicao] = useState({ id: null, nome: '', telefone: '', turno_padrao: 'manha', bairro: '', mensalidade: '' });

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

  useEffect(() => {
    fetchAlunos();
  }, []);

  const handleCreateAluno = async (e) => {
    e.preventDefault();
    try {
      await axios.post('/api/alunos', novoAluno);
      setShowModal(false);
      setNovoAluno({ nome: '', telefone: '', turno_padrao: 'manha', bairro: '', mensalidade: '' });
      fetchAlunos();
    } catch (error) {
      alert('Erro ao cadastrar aluno.');
    }
  };

  const handleUpdateAluno = async (e) => {
    e.preventDefault();
    try {
      await axios.put(`/api/alunos/${alunoEmEdicao.id}`, {
        nome: alunoEmEdicao.nome,
        telefone: alunoEmEdicao.telefone,
        turno_padrao: alunoEmEdicao.turno_padrao,
        bairro: alunoEmEdicao.bairro,
        mensalidade: alunoEmEdicao.mensalidade
      });
      setShowEditModal(false);
      setAlunoEmEdicao({ id: null, nome: '', telefone: '', turno_padrao: 'manha', bairro: '', mensalidade: '' });
      fetchAlunos();
    } catch (error) {
      alert('Erro ao atualizar aluno.');
    }
  };

  const openEditModal = (aluno) => {
    setAlunoEmEdicao({
      id: aluno.id,
      nome: aluno.nome,
      telefone: aluno.telefone_responsavel?.replace('@s.whatsapp.net', '') || '',
      turno_padrao: aluno.turno || 'manha',
      bairro: aluno.bairro || '',
      mensalidade: aluno.mensalidade || ''
    });
    setShowEditModal(true);
    setShowModal(false); // Close create modal if open
  };

  return (
    <div>
      <div className="flex-between mb-4" style={{ marginBottom: '24px' }}>
        <div>
          <h1 className="header-title" style={{ margin: 0 }}>Gestão de Alunos</h1>
          <p className="header-subtitle" style={{ margin: 0, marginTop: '4px' }}>Gerencie passageiros e endereços</p>
        </div>
        <button className="btn-primary" onClick={() => setShowModal(!showModal)}>
          <UserPlus size={18} /> {showModal ? 'Cancelar' : 'Cadastrar Aluno'}
        </button>
      </div>

      {showModal && (
        <div className="glass-panel" style={{ padding: '24px', marginBottom: '24px' }}>
          <h2 style={{ fontSize: '18px', color: 'var(--color-text)', marginBottom: '16px' }}>Novo Aluno</h2>
          <form onSubmit={handleCreateAluno} style={{ display: 'flex', flexWrap: 'wrap', gap: '16px' }}>
            <div style={{ flex: '1 1 250px' }}>
              <label style={{ fontSize: '13px', color: 'var(--color-text-light)', marginBottom: '4px', display: 'block' }}>Nome Completo *</label>
              <input required type="text" className="search-input" value={novoAluno.nome} onChange={e => setNovoAluno({...novoAluno, nome: e.target.value})} placeholder="Ex: Lucas Silva" />
            </div>
            <div style={{ flex: '1 1 200px' }}>
              <label style={{ fontSize: '13px', color: 'var(--color-text-light)', marginBottom: '4px', display: 'block' }}>Telefone / WhatsApp *</label>
              <input required type="text" className="search-input" value={novoAluno.telefone} onChange={e => setNovoAluno({...novoAluno, telefone: e.target.value})} placeholder="5511999999999" />
            </div>
            <div style={{ flex: '1 1 150px' }}>
              <label style={{ fontSize: '13px', color: 'var(--color-text-light)', marginBottom: '4px', display: 'block' }}>Turno Padrão *</label>
              <select required className="search-input" value={novoAluno.turno_padrao} onChange={e => setNovoAluno({...novoAluno, turno_padrao: e.target.value})}>
                <option value="manha">Manhã</option>
                <option value="tarde">Tarde</option>
                <option value="noite">Noite</option>
              </select>
            </div>
            <div style={{ flex: '1 1 200px' }}>
              <label style={{ fontSize: '13px', color: 'var(--color-text-light)', marginBottom: '4px', display: 'block' }}>Bairro / Ponto de Ref.</label>
              <input type="text" className="search-input" value={novoAluno.bairro} onChange={e => setNovoAluno({...novoAluno, bairro: e.target.value})} placeholder="Ex: Centro" />
            </div>
            <div style={{ flex: '1 1 150px' }}>
              <label style={{ fontSize: '13px', color: 'var(--color-text-light)', marginBottom: '4px', display: 'block' }}>Mensalidade (R$)</label>
              <input type="number" step="0.01" className="search-input" value={novoAluno.mensalidade} onChange={e => setNovoAluno({...novoAluno, mensalidade: e.target.value})} placeholder="Ex: 250.00" />
            </div>
            <div style={{ flex: '1 1 100%', display: 'flex', justifyContent: 'flex-end', marginTop: '8px' }}>
              <button type="submit" className="btn-primary" style={{ padding: '8px 24px' }}>Salvar Aluno</button>
            </div>
          </form>
        </div>
      )}

      {showEditModal && (
        <div className="glass-panel" style={{ padding: '24px', marginBottom: '24px', border: '1px solid var(--color-warning)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h2 style={{ fontSize: '18px', color: 'var(--color-text)', margin: 0 }}>Editar Aluno</h2>
            <button onClick={() => setShowEditModal(false)} style={{ background: 'none', border: 'none', color: 'var(--color-text-light)', cursor: 'pointer' }}>Cancelar</button>
          </div>
          <form onSubmit={handleUpdateAluno} style={{ display: 'flex', flexWrap: 'wrap', gap: '16px' }}>
            <div style={{ flex: '1 1 250px' }}>
              <label style={{ fontSize: '13px', color: 'var(--color-text-light)', marginBottom: '4px', display: 'block' }}>Nome Completo *</label>
              <input required type="text" className="search-input" value={alunoEmEdicao.nome} onChange={e => setAlunoEmEdicao({...alunoEmEdicao, nome: e.target.value})} />
            </div>
            <div style={{ flex: '1 1 200px' }}>
              <label style={{ fontSize: '13px', color: 'var(--color-text-light)', marginBottom: '4px', display: 'block' }}>Telefone / WhatsApp *</label>
              <input required type="text" className="search-input" value={alunoEmEdicao.telefone} onChange={e => setAlunoEmEdicao({...alunoEmEdicao, telefone: e.target.value})} />
            </div>
            <div style={{ flex: '1 1 150px' }}>
              <label style={{ fontSize: '13px', color: 'var(--color-text-light)', marginBottom: '4px', display: 'block' }}>Turno Padrão *</label>
              <select required className="search-input" value={alunoEmEdicao.turno_padrao} onChange={e => setAlunoEmEdicao({...alunoEmEdicao, turno_padrao: e.target.value})}>
                <option value="manha">Manhã</option>
                <option value="tarde">Tarde</option>
                <option value="noite">Noite</option>
              </select>
            </div>
            <div style={{ flex: '1 1 200px' }}>
              <label style={{ fontSize: '13px', color: 'var(--color-text-light)', marginBottom: '4px', display: 'block' }}>Bairro / Ponto de Ref.</label>
              <input type="text" className="search-input" value={alunoEmEdicao.bairro} onChange={e => setAlunoEmEdicao({...alunoEmEdicao, bairro: e.target.value})} />
            </div>
            <div style={{ flex: '1 1 150px' }}>
              <label style={{ fontSize: '13px', color: 'var(--color-text-light)', marginBottom: '4px', display: 'block' }}>Mensalidade (R$)</label>
              <input type="number" step="0.01" className="search-input" value={alunoEmEdicao.mensalidade} onChange={e => setAlunoEmEdicao({...alunoEmEdicao, mensalidade: e.target.value})} />
            </div>
            <div style={{ flex: '1 1 100%', display: 'flex', justifyContent: 'flex-end', marginTop: '8px' }}>
              <button type="submit" className="btn-primary" style={{ padding: '8px 24px', background: 'var(--color-warning)', borderColor: 'var(--color-warning)' }}>Atualizar Aluno</button>
            </div>
          </form>
        </div>
      )}

      <div className="glass-panel" style={{ padding: '0', overflow: 'hidden' }}>
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
              <tr style={{ borderBottom: '1px solid var(--color-border)', backgroundColor: 'var(--color-surface-hover)' }}>
                <th style={{ padding: '16px', fontWeight: '600', color: 'var(--color-text-light)', fontSize: '14px' }}>Nome</th>
                <th style={{ padding: '16px', fontWeight: '600', color: 'var(--color-text-light)', fontSize: '14px' }}>WhatsApp (JID)</th>
                <th style={{ padding: '16px', fontWeight: '600', color: 'var(--color-text-light)', fontSize: '14px' }}>Mensalidade</th>
                <th style={{ padding: '16px', fontWeight: '600', color: 'var(--color-text-light)', fontSize: '14px' }}>Endereço (Turno)</th>
                <th style={{ padding: '16px', fontWeight: '600', color: 'var(--color-text-light)', fontSize: '14px', textAlign: 'right' }}>Ações</th>
              </tr>
            </thead>
            <tbody>
              {alunos.map(aluno => (
                <tr key={aluno.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                  <td style={{ padding: '16px', fontWeight: '500', color: 'var(--color-text)' }}>
                    {aluno.nome}
                  </td>
                  <td style={{ padding: '16px', color: 'var(--color-text-light)', fontSize: '14px' }}>
                    <div style={{display: 'flex', alignItems: 'center', gap: '6px'}}>
                      <Phone size={14} /> {aluno.telefone_responsavel?.replace('@s.whatsapp.net', '') || 'Sem telefone'}
                    </div>
                  </td>
                  <td style={{ padding: '16px', fontWeight: '600', color: 'var(--color-primary)', fontSize: '14px' }}>
                    {aluno.mensalidade ? `R$ ${aluno.mensalidade.toFixed(2)}` : 'Não informada'}
                  </td>
                  <td style={{ padding: '16px', color: 'var(--color-text-light)', fontSize: '14px' }}>
                    <div style={{display: 'flex', alignItems: 'center', gap: '6px'}}>
                      <MapPin size={14} /> {aluno.bairro || 'Sem Endereço'} 
                      <span style={{background: 'rgba(249, 115, 22, 0.1)', color: 'var(--color-primary)', border: '1px solid var(--color-primary)', padding: '2px 8px', borderRadius: '12px', fontSize: '12px', marginLeft: '8px'}}>
                        {aluno.turno || '?'}
                      </span>
                    </div>
                  </td>
                  <td style={{ padding: '16px', textAlign: 'right' }}>
                    <button onClick={() => openEditModal(aluno)} style={{ background: 'none', color: 'var(--color-text-light)', cursor: 'pointer', padding: '4px' }}>
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
