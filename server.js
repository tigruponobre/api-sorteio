
// server.js
const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const mysql = require('mysql2');

dotenv.config();

// Configuração do banco (para diagnóstico)
const dbConfig = {
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
};

// Teste de conexão com o banco
const testDatabaseConnection = () => {
  console.log('🔍 Tentando conectar ao banco de dados...');
  console.log('   Host:', dbConfig.host);
  console.log('   Porta:', dbConfig.port);
  console.log('   Usuário:', dbConfig.user);
  console.log('   Banco:', dbConfig.database);

  const connection = mysql.createConnection(dbConfig);

  connection.connect((err) => {
    if (err) {
      console.error('❌ Falha na conexão com o banco de dados:');
      console.error('   Código:', err.code);
      console.error('   Mensagem:', err.message);
      process.exit(1);
    } else {
      console.log('✅ Conexão com o banco de dados estabelecida com sucesso!');
    }
    connection.end();
  });
};

testDatabaseConnection();

const app = express();

app.use(cors());
app.use(express.json());

// Rotas
const inscriptionRoutes = require('./routes/inscriptionRoutes');
const drawRoutes = require('./routes/drawRoutes');
const locationRoutes = require('./routes/locationRoutes'); // 👈 Nova rota

app.use('/api', inscriptionRoutes);
app.use('/api', drawRoutes);
app.use('/api', locationRoutes); // 👈 Registrando a rota

// Rota de saúde
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'Backend está funcionando!',
    database: 'Conectado'
  });
});

// Rota raiz
app.get('/', (req, res) => {
  res.send(`
    <h1>🎉 Backend do Sorteio de Bolsas</h1>
    <p>API rodando na porta ${process.env.PORT || 5000}</p>
    <p><a href="/health">Verificar saúde</a></p>
    <p><strong>Endpoints disponíveis:</strong></p>
    <ul>
      <li>POST /api/inscriptions → Nova inscrição</li>
      <li>GET /api/inscriptions → Listar inscrições</li>
      <li>GET /api/estados → Listar todos os estados</li>
      <li>GET /api/cidades/:idEstado → Listar cidades por estado</li>
      <li>GET /api/sorteios/active → Sorteios ativos</li>
    </ul>
    <hr>
    <h3>Conexão com o banco:</h3>
    <ul>
      <li><strong>Host:</strong> ${process.env.DB_HOST}</li>
      <li><strong>Porta:</strong> ${process.env.DB_PORT}</li>
      <li><strong>Usuário:</strong> ${process.env.DB_USER}</li>
      <li><strong>Banco:</strong> ${process.env.DB_NAME}</li>
    </ul>
  `);
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`🚀 Servidor rodando em http://localhost:${PORT}`);
});