const express = require('express');
const exphbs = require('express-handlebars');
const fs = require('fs');
const path = require('path');
const formidable = require('formidable');

const app = express();

// Konfiguracja Handlebars
app.engine('hbs', exphbs({ extname: '.hbs' }));
app.set('view engine', 'hbs');
app.set('views', path.join(__dirname, 'views'));

// Middleware do obsługi danych formularza
app.use(express.urlencoded({ extended: true }));

// Główna ścieżka
app.get('/', (req, res) => {
    const files = fs.readdirSync('PLIKI');
    res.render('filemanager2', { files });
});

// Start serwera
app.listen(3000, () => {
    console.log('Serwer działa na http://localhost:3000');
});