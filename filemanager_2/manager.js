const express = require('express');
const hbs = require('express-handlebars');
const fs = require('fs');
const path = require('path');
const formidable = require('formidable');

const app = express();

// Baza folderu 
const PLIKI_DIR = path.join(__dirname, 'PLIKI');
const TEMPLATES_DIR = path.join(__dirname, 'public', 'fileTemplates');

// Konfiguracja Handlebarow
app.set('view engine', 'hbs');
app.engine('hbs', hbs({
    defaultLayout: 'main.hbs',
    helpers: {
        fileIcon: function (file) {
            let extension = file.split('.').pop().toLowerCase();
            console.log('plik:', file, 'Extension:', extension); // Debug
            return icons[extension] || icons['default'];
        }
    }
}));
app.set('views', path.join(__dirname, 'views'));

app.use(express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// def ikonek z biblioteki copy pasta z F1 
const icons = {
    'pdf': 'gg-file-document',
    'docx': 'gg-file-document',
    'jpg': 'gg-image',
    'jpeg': 'gg-image',
    'png': 'gg-image',
    'gif': 'gg-image',
    'mp4': 'gg-play-button',
    'mp3': 'gg-music',
    'zip': 'gg-file-zip',
    'rar': 'gg-file-zip',
    'txt': 'gg-file',
    'default': 'gg-file'
};

// Zakazane znaki
const forbiddenChar = (name) => {
    let cleaned = name.trim(); // usuwa whitespace
    cleaned = cleaned.replace(/[\\/:*?"<>|]/g, '_');
    // cleaned = cleaned.replace(/_+/g, '_');
    return cleaned;
};

// do projektu z plikami wygodniej niz encodeURIcomponent 
// z minusow zamienia po prostu na %% co tez moze ew byc gorsze niz zastepowanie _ 
// 



// funkcja do inkrementowania przy kopiach
function copyUnique(name, ext, dir) {
    let index = 1;
    let newName = `${name} (kopia ${index})${ext}`;
    let newPath = path.join(dir, newName);

    while (fs.existsSync(newPath)) {
        index++;
        newName = `${name} (kopia ${index})${ext}`;
        newPath = path.join(dir, newName);
    }

    return newName;
}

// Trasy
app.get('/', (req, res) => {
    let root = req.query.root || ''; // default 
    let fullPath = path.join(PLIKI_DIR, root);
    console.log(req.query.fullPath);

    // if (!fs.existsSync(fullPath) || !fs.statSync(fullPath).isDirectory()) {
    //     root = '';
    //     fullPath = PLIKI_DIR;
    // }

    // wysweitlanie
    const content = fs.readdirSync(fullPath).map((item) => {
        const itemPath = path.join(fullPath, item);
        return {
            name: item,
            isDir: fs.statSync(itemPath).isDirectory(),
            path: `${root}/${item}`// sciezka
        };
    });

    // pozyskiwanie sciezki (breadcrumb)
    let pathArray = root ? root.split('/').filter(Boolean) : [];
    let pathList = [];


    pathList.push({
        name: 'Home',
        path: ''
    });

    let currentPath = '';
    pathArray.forEach((part, index) => {
        currentPath = index === 0 ? part : `${currentPath}/${part}`;
        pathList.push({
            name: part,
            path: currentPath
        });
    });
    // console.log(root);
    console.log(fullPath);


    res.render('filemanager', { content, root, path: pathList });
});

// Tworzenie katalogow 
app.post('/create-directory', (req, res) => {
    let root = req.body.root || '';
    let rawName = req.body.folder;
    let dirname = forbiddenChar(rawName);
    let newPath = path.join(PLIKI_DIR, root, dirname);

    // let counter = 1;
    // while (fs.existsSync(newPath)) {
    //     dirname = `${dirname} (${counter})`;
    //     newPath = path.join(PLIKI_DIR, root, dirname);
    //     counter++;
    // }

    while (fs.existsSync(newPath)) {
        dirname = copyUnique(dirname, '', path.join(PLIKI_DIR, root));
        newPath = path.join(PLIKI_DIR, root, dirname);
    }

    fs.mkdir(newPath, (err) => {
        if (err) console.log(err);
        else console.log("Staworzony katalog: " + newPath);
    });

    res.redirect(`/?root=${encodeURIComponent(root)}`);
});

// Tworzenie plikow

app.post('/create-file', (req, res) => {
    let root = req.body.root || '';
    let rawName = req.body.filename;
    let filename = forbiddenChar(rawName);
    const fileType = req.body.fileType;

    // Poprawione dodawanie rozszerzen
    if (!filename.includes('.')) {
        filename += `.${fileType}`;

        let newPath = path.join(PLIKI_DIR, root, filename);

        while (fs.existsSync(newPath)) {
            const ext = path.extname(filename);
            const baseName = path.basename(filename, ext);
            filename = copyUnique(baseName, ext, path.join(PLIKI_DIR, root));
            newPath = path.join(PLIKI_DIR, root, filename);
        }

        const templatePath = path.join(TEMPLATES_DIR, `template.${fileType}`);

        fs.readFile(templatePath, 'utf8', (err, content) => {
            if (err) {
                console.log('Błąd odczytu szablonu:', err);
                content = '';
            }


            //zapis
            fs.writeFile(newPath, content, (err) => {
                if (err) {
                    console.log('Błąd zapisu pliku:', err);
                    res.status(500).send('Błąd przy tworzeniu pliku');
                } else {
                    console.log(`Plik ${filename} utworzony w ${newPath}`);
                    res.redirect(`/?root=${encodeURIComponent(root)}`);
                }
            });
        });
    }
})


// Usuwanie katalogu calego z plikami
app.post('/delete-directory', (req, res) => {
    let root = req.body.root || '';
    const dirname = req.body.dirname;
    const dirPath = path.join(PLIKI_DIR, root, dirname);

    console.log('Usuwany katalog:', dirPath);

    fs.rmSync(dirPath, { recursive: true, force: true });
    console.log("Katalog usunięty");

    // Obliczanie nadrzędnej ścieżki
    // let newRoot = '';
    // if (root) {
    //     const parts = root.split('/').filter(Boolean);
    //     parts.pop(); 
    //     newRoot = parts.join('/');
    // }

    res.redirect(`/?root=${encodeURIComponent(root)}`);
});
// Usuwanie pliku
app.post('/delete-file', (req, res) => {
    let root = req.body.root || '';
    const filename = req.body.filename;
    const filePath = path.join(PLIKI_DIR, root, filename);

    fs.unlinkSync(filePath);
    res.redirect(`/?root=${encodeURIComponent(root)}`);
});

// Zmiana nazwy 
app.post('/rename', (req, res) => {
    let root = req.query.root || '';
    const oldName = req.body.oldName;
    const newName = forbiddenChar(req.body.newName);
    const isDir = req.body.isDir === 'true';

    let oldPath = path.join(PLIKI_DIR, root, oldName);
    let newPath = path.join(PLIKI_DIR, root, newName);

    if (fs.existsSync(newPath)) {
        const stat = fs.statSync(newPath);
        const targetIsDir = stat.isDirectory();

        if (isDir !== targetIsDir) {
            fs.rename(oldPath, newPath, (err) => {
                if (err) console.log(err);
                else res.redirect(`/?root=${encodeURIComponent(root)}`);
            });
        } else {

            const ext = isDir ? '' : path.extname(oldName);
            const baseName = isDir ? newName : path.basename(newName, ext);
            const uniqueName = copyUnique(baseName, ext, path.join(PLIKI_DIR, root));
            newPath = path.join(PLIKI_DIR, root, uniqueName);

            fs.rename(oldPath, newPath, (err) => {
                if (err) console.log(err);
                else res.redirect(`/?root=${encodeURIComponent(root)}`);
            });
        }
    } else {
        fs.rename(oldPath, newPath, (err) => {
            if (err) console.log(err);
            else res.redirect(`/?root=${encodeURIComponent(root)}`);
        });
    }
});

app.get('/edit', (req, res) => {
    const file = req.query.file;
    const filePath = path.join(PLIKI_DIR, file);
    const root = path.dirname(file); // Pobierz katalog nadrzędny

    fs.readFile(filePath, 'utf8', (err, data) => {
        if (err) {
            console.log('Błąd odczytu pliku:', err);
            res.redirect('/');
        } else {
            res.render('editor', { file, content: data, root });
        }
    });
});

// Zapis pliku (punkt d)
app.post('/saveFile', (req, res) => {
    const { filename, content } = req.body;
    const root = req.body.root;

    console.log(JSON.stringify(content, null, 2));


    const filePath = path.join(PLIKI_DIR, filename);
    console.log(filename);
    console.log(PLIKI_DIR);

    console.log(filePath);

    fs.writeFile(filePath, content, 'utf8', (err) => {
        if (err) {
            console.error('Błąd zapisu pliku:', err);
            res.status(500).send('Błąd');
        } else {
            // const redirectUrl = path.join(PLIKI_DIR, filename);
            res.redirect(`/edit?file=${filename}`);
        }
    });
});




app.post('/save-config', (req, res) => {
    const configPath = path.join(PLIKI_DIR, 'config.json');
    let config = req.body;

    // Opcjonalne przekształcenie tablicy kolorów na obiekt
    if (Array.isArray(config.assets?.colors)) {
        config.assets.colors = {
            red: config.assets.colors[0] || '#FF0000',
            green: config.assets.colors[1] || '#00FF00',
            blue: config.assets.colors[2] || '#0000FF'
        };
    }

    fs.writeFile(configPath, JSON.stringify(config, null, 2), 'utf8', (err) => {
        if (err) {
            console.error('Błąd zapisu konfiguracji:', err);
            res.status(500).send('Błąd');
        } else {
            res.status(200).send('OK');
        }
    });
});

app.get('/colors', (req, res) => {
    const configPath = path.join(PLIKI_DIR, 'config.json');
    fs.readFile(configPath, 'utf8', (err, data) => {
        if (err) {
            console.error('Błąd odczytu pliku konfiguracyjnego:', err);
            return res.status(500).send('Błąd serwera');
        }
        try {
            const configData = JSON.parse(data);
            console.log(configData.assets.colors);

            const colorsObject = configData.assets.colors;
            const colorsArray = Object.values(colorsObject);
            res.header('Content-Type', 'application/json');
            res.json(colorsArray);
        } catch (parseErr) {
            console.error('Błąd parsowania JSON:', parseErr);
            res.status(500).send('Błąd parsowania konfiguracji');
        }
    });
});

// Upload do podkatalogu
app.post('/upload', (req, res) => {
    const form = new formidable.IncomingForm();

    form.uploadDir = PLIKI_DIR; // Bazowo gdyby nie udalo sie dac pliku do folderu to pojdzie do main plikow
    form.multiples = true;

    form.parse(req, (err, fields, files) => {
        const root = fields.root || ''; // Root z fields dla uploadu z multiple
        const mainPath = path.join(PLIKI_DIR, root);

        const uploadedFiles = files.file ? (Array.isArray(files.file) ? files.file : [files.file]) : [];

        uploadedFiles.forEach((file, index) => {
            if (!file || !file.name) {
                console.warn("plik bez nazwy: ", file);
                return;
            }

            let originalName = file.name;
            const ext = path.extname(originalName);
            const baseName = path.basename(originalName, ext);
            let newName = path.join(mainPath, originalName);

            while (fs.existsSync(newName)) {
                originalName = copyUnique(baseName, ext, mainPath);
                newName = path.join(mainPath, originalName);
            }

            fs.rename(file.path, newName, (err) => {
                if (err) console.log(err);
            });
        });

        res.redirect(`/? root = ${encodeURIComponent(root)}`);
    });
});



app.listen(3000, () => {
    console.log('Serwer działa na http://localhost:3000');
});