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

// POST - Criar nova inscrição
router.post('/inscriptions', (req, res) => {
  const {
    IDSORTEIO,
    IDPESSOA,
    IDCURSO,
    CRIADOPOR
  } = req.body;

  // Validações básicas
  if (!IDSORTEIO || !IDPESSOA || !IDCURSO) {
    return res.status(400).json({
      message: 'IDSORTEIO, IDPESSOA e IDCURSO são obrigatórios'
    });
  }

  // Verificar se a pessoa já está inscrita neste sorteio
  const checkQuery = 'SELECT IDINSCRICAO FROM Inscricoes WHERE IDPESSOA = ? AND IDSORTEIO = ?';
  connection.execute(checkQuery, [IDPESSOA, IDSORTEIO], (err, results) => {
    if (err) {
      console.error('Erro ao verificar duplicidade:', err);
      return res.status(500).json({
        message: 'Erro interno do servidor'
      });
    }

    if (results.length > 0) {
      return res.status(409).json({
        message: 'Esta pessoa já está inscrita neste sorteio'
      });
    }

    // Inserir nova inscrição
    const insertQuery = `
      INSERT INTO Inscricoes 
      (IDSORTEIO, IDPESSOA, IDCURSO, DTINSCRICAO, CRIADOPOR, CRIADOEM, MODIFICADOEM) 
      VALUES (?, ?, ?, NOW(), ?, NOW(), NOW())
    `;
    


    connection.execute(
      insertQuery,
      [IDSORTEIO, IDPESSOA, IDCURSO, CRIADOPOR || 'Sistema'],
      (err, results) => {
        if (err) {
          console.error('Erro ao inserir inscrição:', err);
          return res.status(500).json({
            message: 'Erro ao salvar inscrição'
          });
        }

        res.status(201).json({
          message: 'Inscrição realizada com sucesso!',
          IDINSCRICAO: results.insertId
        });
      }
    );
  });
});

// GET - Listar todas as inscrições
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
    FROM Inscricoes i
    LEFT JOIN Pessoas p ON i.IDPESSOA = p.IDPESSOA
    LEFT JOIN Cursos c ON i.IDCURSO = c.IDCURSO
    LEFT JOIN Sorteios s ON i.IDSORTEIO = s.IDSORTEIO
    ORDER BY i.DTINSCRICAO DESC
  `;
  
  connection.execute(query, (err, results) => {
    if (err) {
      console.error('Erro ao buscar inscrições:', err);
      return res.status(500).json({
        message: 'Erro interno do servidor'
      });
    }

    res.json(results);
  });
});

// GET - Buscar inscrição por ID
router.get('/inscriptions/:id', (req, res) => {
  const { id } = req.params;
  
  const query = `
    SELECT 
      i.*,
      p.NOME as NOME_PESSOA,
      c.NOME as NOME_CURSO,
      s.DESCRICAO as DESCRICAO_SORTEIO
    FROM Inscricoes i
    LEFT JOIN Pessoas p ON i.IDPESSOA = p.IDPESSOA
    LEFT JOIN Cursos c ON i.IDCURSO = c.IDCURSO
    LEFT JOIN Sorteios s ON i.IDSORTEIO = s.IDSORTEIO
    WHERE i.IDINSCRICAO = ?
  `;

  connection.execute(query, [id], (err, results) => {
    if (err) {
      console.error('Erro ao buscar inscrição:', err);
      return res.status(500).json({
        message: 'Erro interno do servidor'
      });
    }

    if (results.length === 0) {
      return res.status(404).json({
        message: 'Inscrição não encontrada'
      });
    }

    res.json(results[0]);
  });
});

// DELETE - Excluir inscrição
router.delete('/inscriptions/:id', (req, res) => {
  const { id } = req.params;

  const query = 'DELETE FROM Inscricoes WHERE IDINSCRICAO = ?';

  connection.execute(query, [id], (err, results) => {
    if (err) {
      console.error('Erro ao excluir inscrição:', err);
      return res.status(500).json({
        message: 'Erro interno do servidor'
      });
    }

    if (results.affectedRows === 0) {
      return res.status(404).json({
        message: 'Inscrição não encontrada'
      });
    }

    res.json({
      message: 'Inscrição excluída com sucesso'
    });
  });
});

module.exports = router; 