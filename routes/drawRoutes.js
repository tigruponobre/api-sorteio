// src/routes/draws.routes.js - VERSÃO COMPLETAMENTE CORRIGIDA
const express = require('express');
const mysql = require('mysql2/promise');

const router = express.Router();

const db = mysql.createPool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});


// ✅ Rota CORRIGIDA: listar todos os sorteios
router.get('/draws', async (req, res) => {
  let connection;
  try {
    console.log('🔍 Iniciando busca por sorteios...');
    
    connection = await db.getConnection();
    
    // Primeiro, vamos diagnosticar a estrutura da tabela
    console.log('📊 Verificando estrutura da tabela...');
    
    const [tableInfo] = await connection.execute(`
      SELECT COLUMN_NAME, DATA_TYPE 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_NAME = 'sorteios' 
      AND TABLE_SCHEMA = ?
      ORDER BY ORDINAL_POSITION
    `, [process.env.DB_NAME]);

    console.log('📋 Estrutura da tabela sorteios:');
    tableInfo.forEach(col => {
      console.log(`   - ${col.COLUMN_NAME} (${col.DATA_TYPE})`);
    });

    // Query mais simples e robusta
    const [rows] = await connection.execute(`
      SELECT 
        IDSORTEIO as id,
        NOME as name,
        DESCRICAO as description,
        MULTIPLAINSCRICAO as multiplainscricao,
        ATIVO as active,
        QTDBOLSAS as totalBolsas,
        DATE(DTINICIOINCRICAO) as date,
        DATE(DTFIMINSCRICAO) as endDate,
        URL as url,
        CRIADOEM as createdAt
      FROM sorteios 
      ORDER BY CRIADOEM DESC
    `);

    console.log(`✅ ${rows.length} sorteios encontrados`);
    
    // Processar os resultados
    const draws = rows.map(draw => ({
      id: draw.id || 0,
      name: draw.name || 'Sorteio sem nome',
      description: draw.description || '',
      multiplainscricao: Boolean(draw.multiplainscricao),
      active: Boolean(draw.active),
      totalBolsas: draw.totalBolsas || 0,
      date: draw.date ? new Date(draw.date).toISOString().split('T')[0] : null,
      endDate: draw.endDate ? new Date(draw.endDate).toISOString().split('T')[0] : null,
      url: draw.url || '',
      createdAt: draw.createdAt || new Date().toISOString()
    }));

    res.status(200).json(draws);
    
  } catch (error) {
    console.error('❌ Erro detalhado ao buscar sorteios:');
    console.error('   Mensagem:', error.message);
    console.error('   Código SQL:', error.code);
    console.error('   SQL State:', error.sqlState);
    
    if (error.sqlMessage) {
      console.error('   Mensagem SQL:', error.sqlMessage);
    }

    res.status(500).json({ 
      error: 'Erro interno do servidor ao carregar sorteios',
      details: error.message,
      sqlMessage: error.sqlMessage,
      code: error.code
    });
  } finally {
    if (connection) {
      connection.release();
    }
  }
});

// Rota para criar um novo sorteio
router.post('/draws', async (req, res) => {
  const { 
    nome, 
    descricao, 
    multiplainscricao, 
    ativo, 
    qtdbolsas, 
    dtinicioinscricao, 
    dtfiminscricao, 
    url 
  } = req.body;

  console.log('📥 Dados recebidos para criar sorteio:', req.body);

  if (!nome || !dtinicioinscricao || !dtfiminscricao) {
    return res.status(400).json({ 
      error: 'Nome, data de início e fim são obrigatórios.',
      received: { nome, dtinicioinscricao, dtfiminscricao }
    });
  }

  let connection;
  try {
    connection = await db.getConnection();
    
    const dataInicio = new Date(dtinicioinscricao).toISOString().slice(0, 19).replace('T', ' ');
    const dataFim = new Date(dtfiminscricao).toISOString().slice(0, 19).replace('T', ' ');

    // Buscar próximo ID
    const [maxIdResult] = await connection.execute(`
      SELECT COALESCE(MAX(IDSORTEIO), 0) + 1 as nextId FROM sorteios
    `);
    
    const nextId = maxIdResult[0].nextId;
    console.log('🔍 Próximo ID disponível:', nextId);

    // Inserir novo sorteio
    const [result] = await connection.execute(`
      INSERT INTO sorteios (
        IDSORTEIO, NOME, DESCRICAO, MULTIPLAINSCRICAO, ATIVO, QTDBOLSAS, 
        DTINICIOINCRICAO, DTFIMINSCRICAO, URL, CRIADOPOR, CRIADOEM
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
    `, [
      nextId,
      nome,
      descricao || null,
      multiplainscricao ? 1 : 0,
      ativo ? 1 : 0,
      parseInt(qtdbolsas) || 3,
      dataInicio,
      dataFim,
      url || null,
      'admin'
    ]);

    console.log('✅ Sorteio criado com ID:', nextId);

    res.status(201).json({
      message: 'Sorteio criado com sucesso!',
      id: nextId
    });
  } catch (error) {
    console.error('❌ Erro ao criar sorteio:', error);
    
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(500).json({ 
        error: 'Erro de duplicidade. Tente novamente.'
      });
    }
    
    res.status(500).json({ 
      error: 'Erro interno do servidor ao criar sorteio.',
      details: error.message,
      sqlMessage: error.sqlMessage,
      code: error.code
    });
  } finally {
    if (connection) {
      connection.release();
    }
  }
});

module.exports = router;