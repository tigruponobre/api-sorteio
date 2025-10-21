// routes/locationRoutes.js
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

// GET - Listar todos os estados
router.get('/estados', (req, res) => {
  const query = 'SELECT IDESTADO, NOME, UF FROM estados ORDER BY NOME';
  connection.execute(query, (err, results) => {
    if (err) {
      console.error('Erro ao buscar estados:', err);
      return res.status(500).json({ message: 'Erro interno do servidor' });
    }
    res.json(results);
  });
});

// GET - Listar cidades por estado
router.get('/cidades/:idEstado', (req, res) => {
  const { idEstado } = req.params;

  if (!idEstado || isNaN(idEstado)) {
    return res.status(400).json({ message: 'ID do estado inválido' });
  }

  const query = 'SELECT CODMUNICIPIO, NOME FROM cidades WHERE IDESTADO = ? ORDER BY NOME';
  connection.execute(query, [idEstado], (err, results) => {
    if (err) {
      console.error('Erro ao buscar cidades:', err);
      return res.status(500).json({ message: 'Erro interno do servidor' });
    }
    res.json(results);
  });
});

module.exports = router;