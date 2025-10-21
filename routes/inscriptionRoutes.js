// routes/inscriptionRoutes.js
const express = require('express');
const router = express.Router();
const mysql = require('mysql2');

const connection = mysql.createConnection({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});

// ==========================
// ROTAS DE LOCALIZAÇÃO
// ==========================

router.get('/estados', (req, res) => {
  const query = 'SELECT IDESTADO, NOME, UF FROM estados ORDER BY NOME';
  connection.execute(query, (err, results) => {
    if (err) {
      console.error('Erro ao buscar estados:', err);
      return res.status(500).json({ message: 'Erro ao buscar estados' });
    }
    res.json(results);
  });
});

router.get('/cidades/:idEstado', (req, res) => {
  const { idEstado } = req.params;
  if (!idEstado || isNaN(idEstado)) {
    return res.status(400).json({ message: 'ID do estado inválido' });
  }
  const query = 'SELECT CODMUNICIPIO, NOME FROM cidades WHERE IDESTADO = ? ORDER BY NOME';
  connection.execute(query, [idEstado], (err, results) => {
    if (err) {
      console.error('Erro ao buscar cidades:', err);
      return res.status(500).json({ message: 'Erro ao buscar cidades' });
    }
    res.json(results);
  });
});

// ==========================
// ROTAS DE CURSOS
// ==========================

router.get('/cursos/:instituicao/:modalidade', (req, res) => {
  const { instituicao, modalidade } = req.params;
  if (!instituicao || isNaN(instituicao)) {
    return res.status(400).json({ message: 'ID da instituição inválido' });
  }
  if (!modalidade || isNaN(modalidade)) {
    return res.status(400).json({ message: 'ID da modalidade inválido' });
  }
  const query = `
    SELECT IDCURSO, NOME 
    FROM cursos 
    WHERE IDINSTITUICAO = ? AND CODMODALIDADE = ? AND ATIVO = 1 
    ORDER BY NOME
  `;
  connection.execute(query, [instituicao, modalidade], (err, results) => {
    if (err) {
      console.error('Erro ao buscar cursos:', err);
      return res.status(500).json({ message: 'Erro ao buscar cursos' });
    }
    res.json(results);
  });
});

// ==========================
// ROTAS DE PESSOAS
// ==========================

// POST - Validar CPF e criar pessoa (se permitido)
router.post('/pessoas', (req, res) => {
  const { fullName, cpf, email, phone, city, state, IDSORTEIO } = req.body;

  if (!fullName || !cpf || !email || !IDSORTEIO) {
    return res.status(400).json({ message: 'Nome, CPF, e-mail e sorteio são obrigatórios' });
  }

  // 1. Verifica se JÁ EXISTE uma inscrição com esse CPF no sorteio atual
  const checkInscricaoQuery = `
    SELECT i.IDINSCRICAO
    FROM inscricoes i
    JOIN pessoas p ON i.IDPESSOA = p.IDPESSOA
    WHERE p.CPF = ? AND i.IDSORTEIO = ?
  `;

  connection.execute(checkInscricaoQuery, [cpf, IDSORTEIO], (err, results) => {
    if (err) {
      console.error('Erro ao verificar inscrição por CPF:', err);
      return res.status(500).json({ message: 'Erro ao verificar inscrição' });
    }

    if (results.length > 0) {
      return res.status(409).json({ message: 'Este CPF já está inscrito neste sorteio.' });
    }

    // 2. Verifica se a pessoa já existe (para reutilizar IDPESSOA)
    const checkPessoaQuery = 'SELECT IDPESSOA FROM pessoas WHERE CPF = ?';
    connection.execute(checkPessoaQuery, [cpf], (err, pessoaResults) => {
      if (err) {
        console.error('Erro ao verificar pessoa:', err);
        return res.status(500).json({ message: 'Erro ao verificar pessoa' });
      }

      if (pessoaResults.length > 0) {
        // Pessoa existe → retorna IDPESSOA
        return res.json({ IDPESSOA: pessoaResults[0].IDPESSOA, created: false });
      }

      // 3. Busca CODMUNICIPIO
      const getCodMunicipioQuery = `
        SELECT CODMUNICIPIO 
        FROM cidades 
        WHERE NOME = ? AND IDESTADO = ?
      `;
      connection.execute(getCodMunicipioQuery, [city, state], (err, cidadeResults) => {
        if (err) {
          console.error('Erro ao buscar município:', err);
          return res.status(500).json({ message: 'Erro ao buscar município' });
        }

        if (cidadeResults.length === 0) {
          return res.status(400).json({ message: 'Cidade ou estado inválido' });
        }

        const codMunicipio = cidadeResults[0].CODMUNICIPIO;

        // 4. Cria nova pessoa
        const insertPessoaQuery = `
          INSERT INTO pessoas 
          (NOME, CPF, EMAIL, TELEFONE, CODMUNICIPIO, CRIADOPOR, CRIADOEM, MODIFICADOEM)
          VALUES (?, ?, ?, ?, ?, ?, NOW(), NOW())
        `;

        connection.execute(
          insertPessoaQuery,
          [fullName, cpf, email, phone, codMunicipio, email],
          (err, results) => {
            if (err) {
              console.error('Erro ao inserir pessoa:', err);
              return res.status(500).json({ message: 'Erro ao salvar pessoa' });
            }
            return res.status(201).json({ IDPESSOA: results.insertId, created: true });
          }
        );
      });
    });
  });
});

// ==========================
// ROTAS DE INSCRIÇÃO
// ==========================

router.post('/inscriptions', (req, res) => {
  const { IDSORTEIO, IDPESSOA, IDCURSO, CRIADOPOR } = req.body;

  if (!IDSORTEIO || !IDPESSOA || !IDCURSO) {
    return res.status(400).json({ message: 'IDSORTEIO, IDPESSOA e IDCURSO são obrigatórios' });
  }

  const checkQuery = 'SELECT IDINSCRICAO FROM inscricoes WHERE IDPESSOA = ? AND IDSORTEIO = ?';
  connection.execute(checkQuery, [IDPESSOA, IDSORTEIO], (err, results) => {
    if (err) {
      console.error('Erro ao verificar duplicidade:', err);
      return res.status(500).json({ message: 'Erro interno do servidor' });
    }

    if (results.length > 0) {
      return res.status(409).json({ message: 'Esta pessoa já está inscrita neste sorteio' });
    }

    const insertQuery = `
      INSERT INTO inscricoes 
      (IDSORTEIO, IDPESSOA, IDCURSO, DTINSCRICAO, CRIADOPOR, CRIADOEM, MODIFICADOEM) 
      VALUES (?, ?, ?, NOW(), ?, NOW(), NOW())
    `;

    connection.execute(
      insertQuery,
      [IDSORTEIO, IDPESSOA, IDCURSO, CRIADOPOR || 'Sistema'],
      (err, results) => {
        if (err) {
          console.error('Erro ao inserir inscrição:', err);
          return res.status(500).json({ message: 'Erro ao salvar inscrição' });
        }
        res.status(201).json({
          message: 'Inscrição realizada com sucesso!',
          IDINSCRICAO: results.insertId
        });
      }
    );
  });
});

// Rotas GET/DELETE mantidas (sem alteração de nomes de tabelas)

router.get('/inscriptions', (req, res) => {
  const query = `
    SELECT 
      i.IDINSCRICAO,
      i.IDSORTEIO,
      i.IDPESSOA,
      i.IDCURSO,
      i.DTINSCRICAO,
      i.CRIADOPOR,
      i.CRIADOEM,
      i.MODIFICADOEM,
      p.NOME as NOME_PESSOA,
      c.NOME as NOME_CURSO,
      s.DESCRICAO as DESCRICAO_SORTEIO
    FROM inscricoes i
    LEFT JOIN pessoas p ON i.IDPESSOA = p.IDPESSOA
    LEFT JOIN cursos c ON i.IDCURSO = c.IDCURSO
    LEFT JOIN sorteios s ON i.IDSORTEIO = s.IDSORTEIO
    ORDER BY i.DTINSCRICAO DESC
  `;
  connection.execute(query, (err, results) => {
    if (err) {
      console.error('Erro ao buscar inscrições:', err);
      return res.status(500).json({ message: 'Erro interno do servidor' });
    }
    res.json(results);
  });
});

router.get('/inscriptions/:id', (req, res) => {
  const { id } = req.params;
  const query = `
    SELECT 
      i.*,
      p.NOME as NOME_PESSOA,
      c.NOME as NOME_CURSO,
      s.DESCRICAO as DESCRICAO_SORTEIO
    FROM inscricoes i
    LEFT JOIN pessoas p ON i.IDPESSOA = p.IDPESSOA
    LEFT JOIN cursos c ON i.IDCURSO = c.IDCURSO
    LEFT JOIN sorteios s ON i.IDSORTEIO = s.IDSORTEIO
    WHERE i.IDINSCRICAO = ?
  `;
  connection.execute(query, [id], (err, results) => {
    if (err) {
      console.error('Erro ao buscar inscrição:', err);
      return res.status(500).json({ message: 'Erro interno do servidor' });
    }
    if (results.length === 0) {
      return res.status(404).json({ message: 'Inscrição não encontrada' });
    }
    res.json(results[0]);
  });
});

router.delete('/inscriptions/:id', (req, res) => {
  const { id } = req.params;
  const query = 'DELETE FROM inscricoes WHERE IDINSCRICAO = ?';
  connection.execute(query, [id], (err, results) => {
    if (err) {
      console.error('Erro ao excluir inscrição:', err);
      return res.status(500).json({ message: 'Erro interno do servidor' });
    }
    if (results.affectedRows === 0) {
      return res.status(404).json({ message: 'Inscrição não encontrada' });
    }
    res.json({ message: 'Inscrição excluída com sucesso' });
  });
});

module.exports = router;