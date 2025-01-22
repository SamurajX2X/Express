const express = require('express');
const hbs = require('express-handlebars');
const formidable = require('formidable');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = 3000;

app.use(express.static(path.join(__dirname, 'public')));


app.engine('hbs', hbs({
    defaultLayout: 'main.hbs',
}));
app.set('view engine', 'hbs');

app.get('/', (req, res) => {
    res.render('filemanager');
});


app.listen(PORT, () => {
    console.log(`Serwer działa na http://localhost:${PORT}`);
});