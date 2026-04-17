import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Save, MapPin, Clock, Send } from 'lucide-react';

const ConfigPage = () => {
  const [baseAddress, setBaseAddress] = useState('');
  
  const [manhaParams, setManha] = useState({ enquete: '05:00', fechamento: '05:55' });
  const [tardeParams, setTarde] = useState({ enquete: '11:00', fechamento: '11:55' });
  const [noiteParams, setNoite] = useState({ enquete: '17:00', fechamento: '17:55' });

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const { data } = await axios.get('/api/config');
        setBaseAddress(data.baseAddress);
        setManha(data.manhaParams);
        setTarde(data.tardeParams);
        setNoite(data.noiteParams);
      } catch (e) {
        console.error('Erro loading config', e);
      } finally {
        setLoading(false);
      }
    }
    fetchConfig();
  }, []);

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      await axios.post('/api/config', {
        baseAddress, manhaParams, tardeParams, noiteParams
      });
      alert('Configurações Agendadas com Sucesso!');
    } catch(e) {
      alert('Erro ao salvar. Tente novamente.');
    }
  };

  if(loading) return <div style={{padding:'24px'}}>Carregando preferências...</div>;

  const ShiftConfigCard = ({ title, shiftParams, setShiftParams }) => (
    <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '8px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '12px' }}>
      <h3 style={{ fontSize: '15px', color: '#0f172a', borderBottom: '1px solid #cbd5e1', paddingBottom: '8px' }}>{title}</h3>
      <div style={{ display: 'flex', gap: '16px' }}>
        <div style={{ flex: 1 }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '13px', color: '#475569', marginBottom: '4px' }}>
            <Send size={14} /> Disparar Enquete
          </label>
          <input 
            type="time" className="search-input" 
            value={shiftParams.enquete} 
            onChange={(e) => setShiftParams({...shiftParams, enquete: e.target.value})} 
          />
        </div>
        <div style={{ flex: 1 }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '13px', color: '#475569', marginBottom: '4px' }}>
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
    <div>
      <div className="flex-between mb-4" style={{ marginBottom: '24px' }}>
        <div>
          <h1 className="header-title" style={{ margin: 0 }}>Configurações Logísticas</h1>
          <p className="header-subtitle" style={{ margin: 0, marginTop: '4px' }}>Defina horários de disparo e fechamento dos cron-jobs.</p>
        </div>
      </div>

      <div className="flat-panel" style={{ padding: '32px', maxWidth: '800px' }}>
        <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
          
          <div>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '15px', fontWeight: '500', marginBottom: '8px', color: '#1e3a8a' }}>
              <MapPin size={18} /> Endereço "Ponto 0" (Base do Motorista)
            </label>
            <input 
              type="text" 
              className="search-input" 
              value={baseAddress}
              onChange={(e) => setBaseAddress(e.target.value)}
              placeholder="Digite a rua da saída da Van..." 
            />
            <p className="text-muted" style={{ fontSize: '12px', marginTop: '4px' }}>A rota usará isto como largada (1º) e chegada no fim da viagem.</p>
          </div>

          <div>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '15px', fontWeight: '500', marginBottom: '16px', color: '#1e3a8a' }}>
              <Clock size={18} /> Agendamento de Enquetes por Turno
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
              <ShiftConfigCard title="Turno da Manhã" shiftParams={manhaParams} setShiftParams={setManha} />
              <ShiftConfigCard title="Turno da Tarde" shiftParams={tardeParams} setShiftParams={setTarde} />
              <ShiftConfigCard title="Turno da Noite" shiftParams={noiteParams} setShiftParams={setNoite} />
            </div>
          </div>

          <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '24px' }}>
            <button type="submit" className="btn-primary" style={{ display: 'inline-flex', padding: '12px 24px' }}>
              <Save size={18} /> Salvar Parâmetros e Atualizar Robô
            </button>
          </div>

        </form>
      </div>
    </div>
  );
};

export default ConfigPage;
