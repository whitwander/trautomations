const express = require('express');
const cors = require('cors');
const app = express();
const port = 8080;

// Middlewares
app.use(cors());
app.use(express.json({ limit: "100mb" }));
app.use(express.urlencoded({ limit: "100mb", extended: true }));

// Rotas
app.use('/extrair', require('./routes/extrair'));
app.use('/logs', require('./routes/logs'));
app.use('/download', require('./routes/download'));
app.use('/cancelar', require('./routes/cancelar'));

app.listen(port, () => {
    console.log(`Servidor rodando em http://localhost:${port}`);
});
