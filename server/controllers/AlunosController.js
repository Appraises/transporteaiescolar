const Passageiro = require('../models/Passageiro');

class AlunosController {
  
  async listar(req, res) {
    try {
      const alunos = await Passageiro.findAll({
        order: [['nome', 'ASC']]
      });
      res.status(200).json(alunos);
    } catch (error) {
      console.error('[AlunosController] Falha ao listar alunos:', error);
      res.status(500).json({ error: 'Erro ao buscar alunos.' });
    }
  }

  async criar(req, res) {
    try {
      const { nome, telefone, bairro, turno_padrao, motorista_id, mensalidade } = req.body;
      
      const novoAluno = await Passageiro.create({
        nome,
        telefone_responsavel: telefone.includes('@s.whatsapp.net') ? telefone : `${telefone}@s.whatsapp.net`,
        bairro,
        turno: turno_padrao || 'manha',
        mensalidade: parseFloat(mensalidade) || null,
        motorista_id: motorista_id || 1, // Fallback para motorista 1 enquanto não há auth
        onboarding_step: 'CONCLUIDO'
      });

      res.status(201).json(novoAluno);
    } catch (error) {
      console.error('[AlunosController] Falha ao criar aluno:', error);
      res.status(500).json({ error: 'Erro ao cadastrar aluno.' });
    }
  }

  async atualizar(req, res) {
    try {
      const { id } = req.params;
      const { nome, telefone, bairro, turno_padrao, mensalidade } = req.body;
      
      const aluno = await Passageiro.findByPk(id);
      if (!aluno) return res.status(404).json({ error: 'Aluno não encontrado' });

      let novoTelefone = aluno.telefone_responsavel;
      if (telefone) {
        novoTelefone = telefone.includes('@s.whatsapp.net') ? telefone : `${telefone}@s.whatsapp.net`;
      }

      await aluno.update({
        nome: nome || aluno.nome,
        telefone_responsavel: novoTelefone,
        bairro: bairro !== undefined ? bairro : aluno.bairro,
        turno: turno_padrao || aluno.turno,
        mensalidade: mensalidade !== undefined ? parseFloat(mensalidade) : aluno.mensalidade
      });

      res.status(200).json(aluno);
    } catch (error) {
      console.error('[AlunosController] Falha ao atualizar aluno:', error);
      res.status(500).json({ error: 'Erro ao atualizar aluno.' });
    }
  }

}

module.exports = new AlunosController();
