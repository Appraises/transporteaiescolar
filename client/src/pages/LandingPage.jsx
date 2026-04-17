import React from 'react';
import { Bot, Map, CheckSquare, ShieldCheck, ChevronRight, Check, ArrowDown, MessageSquare } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const LandingPage = () => {
  const navigate = useNavigate();

  return (
    <div className="font-sans text-gray-800 bg-white min-h-screen">
      
      {/* HEADER / NAVBAR */}
      <header className="flex justify-between items-center py-6 px-8 max-w-7xl mx-auto border-b border-gray-100">
        <div className="text-2xl font-black text-amber-400 tracking-tighter flex items-center gap-2">
          <Map className="text-amber-400" strokeWidth={3} />
          <span className="text-slate-900">Gestor Van</span>
        </div>
        <button 
           onClick={() => navigate('/')} 
           className="text-gray-600 hover:text-yellow-600 font-semibold"
        >
          Entrar no Painel
        </button>
      </header>

      {/* HERO SECTION */}
      <section className="max-w-7xl mx-auto px-8 py-20 flex flex-col md:flex-row items-center gap-12">
        <div className="md:w-1/2 space-y-6">
          <h1 className="text-5xl md:text-6xl font-black text-slate-900 leading-tight">
            Chega de dor de cabeça com <span className="text-amber-400">pagamentos e rotas perdidas.</span>
          </h1>
          <p className="text-xl text-slate-600 leading-relaxed">
            O primeiro assistente inteligente que cobra mensalidades, lê Pix automáticos, solta enquetes de presença e roteiriza seu caminho diário inteiramente pelo WhatsApp.
          </p>
          <div className="pt-4">
            <button 
              onClick={() => window.location.href='#pricing'}
              className="bg-amber-400 hover:bg-amber-500 transition-colors text-slate-900 text-lg font-bold py-4 px-8 rounded-full shadow-lg shadow-amber-400/30 flex items-center gap-2"
            >
              Automatizar minha Van Agora <ChevronRight size={20} className="mt-1"/>
            </button>
          </div>
        </div>
        
        {/* NOVO VISUAL B2B: ZAP + ROTA */}
        <div className="md:w-1/2 flex justify-center relative w-full pt-8 md:pt-0">
          <div className="absolute inset-0 bg-amber-200 rounded-full blur-[80px] opacity-40"></div>
          
          <div className="relative w-full max-w-md flex flex-col items-center gap-4 z-10">
            {/* Robot Badge */}
            <div className="bg-slate-900 text-white px-4 py-2 rounded-full shadow-lg flex items-center gap-2 z-20 shrink-0 transform translate-y-4">
               <Bot size={18} className="text-amber-400"/>
               <span className="text-xs font-bold tracking-wider">ROBÔ DESPACHANTE DA I.A</span>
            </div>

            {/* WhatsApp MOCK Bubble */}
            <div className="bg-[#dcf8c6] p-4 pt-6 rounded-b-2xl rounded-tl-2xl rounded-tr-sm shadow-md w-[90%] relative self-end border border-[#c8e6b1]">
               <div className="absolute top-0 -right-2 w-4 h-4 bg-[#dcf8c6] transform rotate-45 border-t border-r border-[#c8e6b1]"></div>
               
               <div className="font-bold text-slate-800 text-[15px] mb-2 leading-tight">
                 🚌 Chamada Faculdade - Turno Noite
               </div>
               <div className="text-slate-600 text-sm mb-3">Você vai de Van hoje? Responda abaixo:</div>
               
               {/* Poll Options */}
               <div className="space-y-2 bg-white/50 p-2 rounded-lg">
                  <div className="flex justify-between items-center bg-white p-2 rounded shadow-sm border border-emerald-100">
                    <span className="text-slate-700 text-sm font-medium">Vou de Van (Ida e Volta)</span>
                    <div className="bg-emerald-500 rounded-full w-5 h-5 flex items-center justify-center">
                      <div className="w-2 h-2 bg-white rounded-full"></div>
                    </div>
                  </div>
                  <div className="flex justify-between items-center bg-white p-2 rounded shadow-sm border border-slate-100 opacity-60">
                    <span className="text-slate-700 text-sm font-medium">Só Ida na Van</span>
                    <div className="border-2 border-slate-300 rounded-full w-5 h-5"></div>
                  </div>
                  <div className="flex justify-between items-center bg-white p-2 rounded shadow-sm border border-slate-100 opacity-60">
                    <span className="text-slate-700 text-sm font-medium">Hoje não vou de Van</span>
                    <div className="border-2 border-slate-300 rounded-full w-5 h-5"></div>
                  </div>
               </div>
               <div className="text-[10px] text-slate-500 text-right mt-2 font-medium">17:00 ✓✓</div>
            </div>

            {/* Connector Arrow */}
            <div className="flex flex-col items-center justify-center -my-2 relative z-10">
               <div className="w-1.5 h-8 bg-amber-400 rounded-full shadow-sm animate-pulse"></div>
               <ArrowDown className="text-amber-500 -mt-3 drop-shadow-md" size={32}/>
            </div>

            {/* Routing Map Result */}
            <div className="bg-white p-5 rounded-3xl shadow-xl border border-slate-100 w-[95%] self-start transform transition-transform hover:-translate-y-1 relative">
               <div className="flex items-center gap-3 mb-5">
                  <div className="bg-emerald-100 p-2.5 rounded-xl text-emerald-600 shadow-inner">
                    <Map size={24}/>
                  </div>
                  <div>
                    <div className="text-sm font-black text-slate-900 tracking-tight uppercase">Rota Otimizada Gerada</div>
                    <div className="text-xs text-emerald-600 font-bold bg-emerald-50 inline-block px-2 py-0.5 rounded-md mt-0.5 border border-emerald-100">Economia: 4km (1 Aluno Pulado)</div>
                  </div>
               </div>
               
               {/* Bulletproof Flex Timeline */}
               <div className="flex flex-col gap-0 mt-2">
                 
                 {/* Step 1 */}
                 <div className="flex gap-4 min-h-[40px]">
                   <div className="flex flex-col items-center w-6 shrink-0">
                     <div className="w-3 h-3 bg-amber-400 rounded-full border border-white shadow-sm z-10 mt-1"></div>
                     <div className="w-0.5 h-full bg-slate-200 -mt-1"></div>
                   </div>
                   <div className="pb-4">
                     <span className="text-[13px] font-bold text-slate-700">Partida da Base</span>
                   </div>
                 </div>

                 {/* Step 2 */}
                 <div className="flex gap-4 min-h-[40px]">
                   <div className="flex flex-col items-center w-6 shrink-0">
                     <div className="w-3 h-3 bg-emerald-500 rounded-full border border-white shadow-sm z-10 mt-1"></div>
                     <div className="w-0.5 h-full bg-slate-200 -mt-1"></div>
                   </div>
                   <div className="pb-4 w-full">
                     <div className="flex flex-col">
                       <span className="text-[13px] font-bold text-slate-800">Coletando João Silva</span>
                       <span className="text-[10px] text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md mt-1 border border-emerald-100 self-start font-bold">Entrou na Van ✓</span>
                     </div>
                     {/* Notification Inject */}
                     <div className="bg-blue-50 border border-blue-100 p-2.5 rounded-xl mt-3 relative transform ml-1 shadow-sm">
                        <div className="absolute -left-1.5 top-3 w-3 h-3 bg-blue-50 border-t border-l border-blue-100 transform -rotate-45"></div>
                        <div className="flex items-center gap-1.5 mb-1">
                          <Bot size={14} className="text-blue-600"/>
                          <span className="text-[10px] font-black text-blue-800 tracking-wide uppercase">I.A Avisou Lucas:</span>
                        </div>
                        <span className="text-[11px] text-blue-600 font-medium leading-tight block">"Tô chegando em 5 min, João já subiu! Desce pro portão pra não atrasar a rota!"</span>
                     </div>
                   </div>
                 </div>

                 {/* Step 3 */}
                 <div className="flex gap-4 min-h-[40px]">
                   <div className="flex flex-col items-center w-6 shrink-0">
                     <div className="w-3 h-3 bg-amber-400 rounded-full border border-white shadow-sm z-10 mt-1 animate-pulse"></div>
                     <div className="w-0.5 h-full bg-slate-200 -mt-1"></div>
                   </div>
                   <div className="pb-4 mt-2">
                     <span className="text-[13px] font-bold text-slate-800">Embarque de Lucas (Aguardando)</span>
                   </div>
                 </div>

                 {/* Step 4 */}
                 <div className="flex gap-4 min-h-[40px] opacity-40">
                   <div className="flex flex-col items-center w-6 shrink-0">
                     <div className="w-3 h-3 bg-slate-400 rounded-full border border-white shadow-sm z-10 mt-1"></div>
                     <div className="w-0.5 h-full bg-slate-200 -mt-1"></div>
                   </div>
                   <div className="pb-4">
                     <span className="text-[13px] font-semibold text-slate-600 line-through">Desvio ignorado: Maria Oliveira</span>
                   </div>
                 </div>

                 {/* Step 5 */}
                 <div className="flex gap-4">
                   <div className="flex flex-col items-center w-6 shrink-0">
                     <div className="w-3 h-3 bg-slate-800 rounded-full border border-white shadow-sm z-10 mt-1"></div>
                   </div>
                   <div>
                     <span className="text-[13px] font-black text-slate-900">Chegada na Faculdade</span>
                   </div>
                 </div>

               </div>
            </div>

          </div>
        </div>
      </section>

      {/* FEATURES / NOSSAS FUNCIONALIDADES */}
      <section className="bg-slate-50 py-24 border-t border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-8">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="text-4xl font-bold text-slate-900 mb-4">Funcionalidades do Gestor</h2>
            <p className="text-slate-600 text-lg">Um batalhão de robôs trabalhando para você de madrugada, para que você possa focar no volante com segurança e paz de espírito.</p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100 hover:shadow-lg transition-shadow">
              <div className="w-12 h-12 bg-amber-100 rounded-lg flex items-center justify-center text-amber-600 mb-6">
                <ShieldCheck size={24} />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-3">Cobrança Anti-Ban</h3>
              <p className="text-slate-600 leading-relaxed">O sistema avisa quem tá devendo por você e usa um sistema anti-rastreio inteligente para nunca bloquear seu WhatsApp.</p>
            </div>
            
            <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100 hover:shadow-lg transition-shadow">
              <div className="w-12 h-12 bg-emerald-100 rounded-lg flex items-center justify-center text-emerald-600 mb-6">
                <Bot size={24} />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-3">Inteligência Artificial (Pix)</h3>
              <p className="text-slate-600 leading-relaxed">O pai mandou foto do PIX? Nossa IA lê o papel, confirma se o valor tá certo e dá baixa no sistema na hora!</p>
            </div>

            <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100 hover:shadow-lg transition-shadow">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center text-blue-600 mb-6">
                <Map size={24} />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-3">Roteirização GPS</h3>
              <p className="text-slate-600 leading-relaxed">Acabou o zig-zag! Geramos a rota diária mais rápida da porta do aluno até a escola calculada via IA e Google Maps.</p>
            </div>

            <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100 hover:shadow-lg transition-shadow">
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center text-purple-600 mb-6">
                <CheckSquare size={24} />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-3">Controle de Faltas</h3>
              <p className="text-slate-600 leading-relaxed">Um robô manda enquete de manhã no grupo e só coloca na sua rota de busca quem marcou "Vou hoje", poupando combustível.</p>
            </div>
          </div>
        </div>
      </section>

      {/* TUTORIAL / PASSO A PASSO */}
      <section className="py-24 max-w-7xl mx-auto px-8">
        <div className="flex flex-col md:flex-row items-center gap-16">
          <div className="md:w-1/2">
             <h2 className="text-4xl font-bold text-slate-900 mb-6">O que acontece logo depois que você assina?</h2>
             <p className="text-lg text-slate-600 mb-10">Esqueça sistemas complicados. Preparamos uma jornada simples que entra no ar em 5 minutos.</p>
             
             <div className="space-y-8">
                <div className="flex gap-4">
                  <div className="flex-shrink-0 w-10 h-10 rounded-full bg-slate-900 text-amber-400 font-black flex items-center justify-center text-lg">1</div>
                  <div>
                    <h4 className="text-xl font-bold text-slate-900">Configure sua Base</h4>
                    <p className="text-slate-600 mt-1">Insira seu endereço fixo e o turno/horários que você atende lá no painel logístico.</p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="flex-shrink-0 w-10 h-10 rounded-full bg-slate-900 text-amber-400 font-black flex items-center justify-center text-lg">2</div>
                  <div>
                    <h4 className="text-xl font-bold text-slate-900">Conecte seu WhatsApp</h4>
                    <p className="text-slate-600 mt-1">Escaneie um QR Code comum no computador e a I.A "acorda" imediatamente no seu número.</p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="flex-shrink-0 w-10 h-10 rounded-full bg-slate-900 text-amber-400 font-black flex items-center justify-center text-lg">3</div>
                  <div>
                    <h4 className="text-xl font-bold text-slate-900">Relaxe</h4>
                    <p className="text-slate-600 mt-1">Assista o painel atualizando mensalidades e roteiros sozinhos enquanto você apenas dirige.</p>
                  </div>
                </div>
             </div>
          </div>
          <div className="md:w-1/2 w-full">
             <div className="bg-slate-100 rounded-3xl p-8 border-4 border-white shadow-xl aspect-square flex items-center justify-center">
                 <img src="https://illustrations.popsy.co/amber/freelancer.svg" alt="Driver Relaxing" className="max-w-xs" />
             </div>
          </div>
        </div>
      </section>

      {/* PRICING */}
      <section id="pricing" className="bg-slate-900 py-24">
        <div className="max-w-4xl mx-auto px-8 text-center">
          <h2 className="text-4xl font-bold text-white mb-4">Mude de vida por menos de R$ 2 ao dia.</h2>
          <p className="text-slate-400 text-lg mx-auto max-w-2xl mb-12">Você já queima esse valor em combustível parando em porta de aluno que resolveu faltar sem avisar. O sistema se paga literalmente no primeiro dia do mês.</p>
          
          <div className="bg-white rounded-3xl p-10 max-w-lg mx-auto relative transform transition-transform hover:-translate-y-2">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-amber-400 text-slate-900 font-black px-6 py-2 rounded-full uppercase tracking-widest text-sm shadow-lg">
              Plano Único Profissional
            </div>
            
            <div className="mt-4 mb-8">
              <span className="text-5xl font-black text-slate-900">R$ 50<span className="text-2xl font-bold text-slate-400">,00</span></span>
              <span className="text-slate-500 ml-2">/ Mês</span>
            </div>
            
            <div className="space-y-4 mb-10 text-left">
              <div className="flex gap-3 items-center">
                <Check className="text-emerald-500" size={20} /> <span className="text-slate-700 font-medium">Alunos e Rotas Ilimitadas</span>
              </div>
              <div className="flex gap-3 items-center">
                <Check className="text-emerald-500" size={20} /> <span className="text-slate-700 font-medium">Painel Logístico no Computador ou Celular</span>
              </div>
              <div className="flex gap-3 items-center">
                <Check className="text-emerald-500" size={20} /> <span className="text-slate-700 font-medium">Leitura e Baixa Automática de Pix Recebidos</span>
              </div>
              <div className="flex gap-3 items-center">
                <Check className="text-emerald-500" size={20} /> <span className="text-slate-700 font-medium">GPS Inteligente que Pula Faltas e Corta Caminho</span>
              </div>
              <div className="flex gap-3 items-center">
                <Check className="text-emerald-500" size={20} /> <span className="text-slate-700 font-medium">Sem burocracia (Cancele quando quiser)</span>
              </div>
            </div>
            
            <button className="w-full bg-slate-900 hover:bg-slate-800 text-amber-400 font-bold py-4 rounded-xl transition-colors text-lg shadow-xl shadow-slate-900/20">
              Quero assinar o Gestor Inteligente
            </button>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="bg-slate-950 text-slate-500 py-8 text-center">
        <p>© 2026 Gestor Van Inteligente. Todos os direitos reservados. Focado no transporte universitário e executivo B2B.</p>
      </footer>
    </div>
  );
};

export default LandingPage;
