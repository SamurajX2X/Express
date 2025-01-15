const express = require('express');
const hbs = require('express-handlebars');
const formidable = require('formidable');
const path = require('path');
const fs = require('fs');


const app = express();
const PORT = 3000;

app.use(express.static(path.join(__dirname, 'public')));



// ikonki z biblioteki css gg 
const icons = {
    'pdf': 'gg-file-document',  // Ikona dla PDF
    'docx': 'gg-file-document',  // word
    'jpg': 'gg-image',  // imagesy
    'jpeg': 'gg-image',
    'png': 'gg-image',
    'gif': 'gg-image',
    'mp4': 'gg-play-button',  // wideo
    'mp3': 'gg-music',  // aduio
    'zip': 'gg-file-zip',  // Ikona dla archiwów
    'rar': 'gg-file-zip',
    'txt': 'gg-file-text',  //  txt
    'default': 'gg-file',  //  ikona
};

// Konfiguracja handlebara
app.set('views', path.join(__dirname, 'views'));
app.engine('hbs', hbs({
    defaultLayout: 'main.hbs',
    helpers: {
        fileIcon: function (file) {
            var extension = file.split('.').pop().toLowerCase(); // Prozszerzenie
            return icons[extension] || icons['default']; // Ikona z uwzgl defaultowego
        }

    }
}));
app.set('view engine', 'hbs');


// Render defaultowej stonry
app.get('/', (req, res) => {
    res.render('upload');
});


// Tablica z plikami
const filesData = [];
// id do przechowywania konkretnych indexow
let currentId = 1;
// post na upload pliku
app.post('/upload', (req, res) => {
    const form = formidable({
        multiples: true,
        keepExtensions: true,
        uploadDir: path.join(__dirname, 'public/uploads'),
    });

    form.parse(req, (err, fields, files) => {
        const localFiles = Array.isArray(files.file) ? files.file : [files.file];

        // const localFile = files.file;
        // console.log(localFiles);

        console.log(localFiles);

        localFiles.forEach((file) => {
            console.log(file.name);
            let fileData = {
                // id: savedFiles.length > 0 ? savedFiles[savedFiles.length - 1].id + 1 : 0,
                id: currentId++,
                name: file.name,
                path: file.path,
                size: file.size,
                type: file.type, // do pozniej wyswietlanaia
                unique: file.uni
            };
            console.log(fileData);
            filesData.push(fileData);
        });


        // console.log('tablica przed', JSON.stringify(filesData, null, 4));

        res.redirect('/filemanager');
    });
});

// main strona z plikami
app.get('/filemanager', (req, res) => {
    // const savedFiles = filesData.map((file) => ({
    //     id: file.id,
    //     name: file.name,
    //     size: file.size,
    //     type: file.type,
    // }));
    console.log(filesData);

    res.render('filemanager', { filesData });
});

// Pobieranie pliku
app.get('/download/:id', (req, res) => {
    const file = filesData.find((file) => file.id === parseInt(req.params.id, 10));

    if (file) {
        res.download(file.path, file.name);
    } else {
        res.status(404).send('Plik nie znaleziony');
    }

});


// Delete plików tylko z tablicy bez z serwera
app.get('/delete/:id', (req, res) => {
    const id = parseInt(req.params.id, 10);
    const index = filesData.findIndex((file) => file.id === id);

    if (index !== -1) {
        filesData.splice(index, 1); // delete z tablicy
    }
    console.log(filesData.length);

    if (filesData.length === 0) {
        currentId = 1;
    }

    res.redirect('/filemanager');
});

// wyswietlanie plikow 
app.get('/show/:id', (req, res) => {

    const file = filesData.find((file) => file.id === parseInt(req.params.id, 10));

    // console.log(file);
    // console.log(filesData);
    if (!file) {
        console.log('Plik nie znaleziony');
        return res.status(404).send('404');
    }

    res.sendFile(file.path);

});


// info 
app.get('/info/:id', (req, res) => {
    const file = filesData.find((file) => file.id === parseInt(req.params.id, 10));
    if (!file) {
        res.status(404).send('Plik nie znaleziony');
        return;
    }

    res.render('info', { file });
});

app.get('/info/', (req, res) => {
    res.render('info');
});

// reset 
app.get('/reset', (req, res) => {
    filesData.length = 0;
    currentId = 1;
    res.redirect('/filemanager');
});


// Uruchomienie serwera
app.listen(PORT, () => {
    console.log(`Serwer działa na http://localhost:${PORT}`);
});