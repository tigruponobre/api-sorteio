// routes/courseRoutes.js
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

// GET - Listar cursos ativos
router.get('/courses', (req, res) => {
  const query = `
    SELECT 
      IDCURSO, 
      NOME, 
      MODALIDADE 
    FROM Cursos 
    WHERE ATIVO = 1 
    ORDER BY NOME
  `;
  
  connection.execute(query, (err, results) => {
    if (err) {
      console.error('Erro ao buscar cursos:', err);
      return res.status(500).json({ message: 'Erro interno do servidor' });
    }
    res.json(results);
  });
});

module.exports = router;