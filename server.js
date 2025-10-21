// server.js - Versão simplificada sem pool
const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const mysql = require('mysql2');

dotenv.config();

// Configuração do banco
const dbConfig = {
  host: process.env.DB_HOST,
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  // Configurações para evitar timeout
  acquireTimeout: 60000,
  timeout: 60000,
  reconnect: true
};

// Criar conexão única
const connection = mysql.createConnection(dbConfig);

// Conectar ao banco
connection.connect((err) => {
  if (err) {
    console.error('❌ Erro de conexão:', err);
    // Tentar reconectar após 5 segundos
    setTimeout(() => process.exit(1), 5000);
  } else {
    console.log('✅ Conectado ao MySQL');
    
    // Manter conexão viva
    setInterval(() => {
      connection.query('SELECT 1', (err) => {
        if (err) console.log('❌ Ping falhou:', err);
      });
    }, 30000); // Ping a cada 30 segundos
  }
});

const app = express();
app.use(cors());
app.use(express.json());

// Middleware para adicionar conexão às requisições
app.use((req, res, next) => {
  req.db = connection;
  next();
});

// Suas rotas continuam iguais
const inscriptionRoutes = require('./routes/inscriptionRoutes');
const drawRoutes = require('./routes/drawRoutes');
const locationRoutes = require('./routes/locationRoutes');

app.use('/api', inscriptionRoutes);
app.use('/api', drawRoutes);
app.use('/api', locationRoutes);

// Health check
app.get('/health', (req, res) => {
  req.db.query('SELECT 1', (err) => {
    if (err) {
      return res.status(500).json({ 
        status: 'ERROR', 
        database: 'Offline' 
      });
    }
    res.json({ 
      status: 'OK', 
      database: 'Online' 
    });
  });
});

// Rota raiz
app.get('/', (req, res) => {
  res.send(`
    <h1>🎉 Backend do Sorteio</h1>
    <p><a href="/health">Health Check</a></p>
  `);
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Servidor na porta ${PORT}`);
});