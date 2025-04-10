const express = require('express');
const router = express.Router();
const { outputFile } = require('../utils/extrairUtils');

router.get('/', (req, res) => {
    res.download(outputFile, 'resultados.csv', (err) => {
        if (err) {
            res.status(500).send({ error: 'Erro ao baixar o arquivo' });
        }
    });
});

module.exports = router;
