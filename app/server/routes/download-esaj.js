const express = require('express');
const router = express.Router();
const { esajOutput } = require('../utils/outputFile');

router.get('/', (req, res) => {
    res.download(esajOutput, 'resultados.csv', (err) => {
        if (err) {
            res.status(500).send({ error: 'Erro ao baixar o arquivo' });
        }
    });
});

module.exports = router;