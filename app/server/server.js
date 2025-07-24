const express = require('express');
const cors = require('cors');
const app = express();
const port = 8080;
const { logMessage } = require('./utils/extrairUtils');

// Middlewares
app.use(cors());
app.use(express.json({ limit: "100mb" }));
app.use(express.urlencoded({ limit: "100mb", extended: true }));

// Rotas
app.use('/extrairPje', require('./routes/extrairPje'));
app.use('/extrairEsaj', require('./routes/extrairEsaj'))
app.use('/extrairRs', require('./routes/extrairRS'))
app.use('/logs', require('./routes/logs'));
app.use('/cancelar', require('./routes/cancelar'));
app.use('/progress', require('./routes/progress'));

app.listen(port, () => {
    console.log(`Servidor rodando em http://localhost:${port}`);
    logMessage('🚀 API Online')
});