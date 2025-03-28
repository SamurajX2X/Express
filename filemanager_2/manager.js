const express = require('express');
const hbs = require('express-handlebars');
const fs = require('fs');
const path = require('path');
const formidable = require('formidable');
const cookieParser = require('cookie-parser');
const Datastore = require('nedb');
const nocache = require('nocache');
const { log } = require('console');


const app = express();

// Baza folderu 
const PLIKI_DIR = path.join(__dirname, 'PLIKI');
const TEMPLATES_DIR = path.join(__dirname, 'public', 'fileTemplates');
const USERS_DB = new Datastore({ filename: 'users.db', autoload: true });
const { uuid } = require('uuidv4');
// Przechowywanie sesji w pamięci
const sessions = {};

// Konfiguracja Handlebarow
app.set('view engine', 'hbs');
app.engine('hbs', hbs({
    defaultLayout: 'main.hbs',
    helpers: {
        fileIcon: function (file) {
            let extension = file.split('.').pop().toLowerCase();
            console.log('plik:', file, 'Extension:', extension); // Debug
            return icons[extension] || icons['default'];
        },
        eq: function (a, b) { //  helper eq
            return a === b;
        }
    }
}));
app.set('views', path.join(__dirname, 'views'));

app.use(express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(cookieParser());
app.use(nocache());
app.use(express.static('upload'))
app.use((req, res, next) => {
    const sessionId = req.cookies.sessionId;
    res.locals.user = sessions[sessionId] || null;
    next();
});

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





// Czyszczenie nieaktywnych sesji co 60 sekund
setInterval(() => {
    const now = Date.now();
    Object.entries(sessions).forEach(([sessionId, session]) => {

        if (now - session.lastActive > 30000) {
            delete sessions[sessionId];
            console.log(`Usunięto nieaktywną sesję: ${sessionId}`);
        }
    });
}, 60000); // Sprawdzaj co 60 sekund

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


const checkAuth = (req, res, next) => {
    const sessionId = req.cookies.sessionId;
    const session = sessions[sessionId];

    if (session) {
        // Resetuj timer sesji przy  interakcji
        session.lastActive = Date.now();
        req.user = session;
        next();
    } else {
        res.redirect('/login');
    }
};
// Logowanie
app.get('/login', (req, res) => {
    res.render('login');
});

app.post('/login', (req, res) => {
    const { login, password } = req.body;

    USERS_DB.findOne({ login, password }, (err, user) => {
        if (!user) return res.render('error', { message: 'Błędne dane' });

        const sessionId = uuid();
        sessions[sessionId] = {
            login: user.login,
            createdAt: Date.now()
        };

        res.cookie('sessionId', sessionId, {
            httpOnly: true,
            maxAge: 30 * 1000 // 30 sekund
        });
        res.redirect('/');
    });
});

// Rejestracja
app.get('/register', (req, res) => {
    res.render('register');
});

app.post('/register', (req, res) => {
    const { login, password } = req.body;

    USERS_DB.findOne({ login }, (err, user) => {
        if (user) return res.render('error', { message: 'Login zajęty' });

        const newUser = {
            _id: uuid(),
            login,
            password,
        };

        USERS_DB.insert(newUser, (err) => {
            res.redirect('/login');
        });
    });
});

// Wylogowanie
app.get('/logout', (req, res) => {
    const sessionId = req.cookies.sessionId;
    delete sessions[sessionId];
    res.clearCookie('sessionId');
    res.redirect('/login');
});


















// Trasy
app.get('/', checkAuth, (req, res) => {
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
app.post('/create-directory', checkAuth, (req, res) => {
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

app.post('/create-file', checkAuth, (req, res) => {
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
app.post('/delete-directory', checkAuth, (req, res) => {
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
app.post('/delete-file', checkAuth, (req, res) => {
    let root = req.body.root || '';
    const filename = req.body.filename;
    const filePath = path.join(PLIKI_DIR, root, filename);

    fs.unlinkSync(filePath);
    res.redirect(`/?root=${encodeURIComponent(root)}`);
});

// Zmiana nazwy 
app.post('/rename', checkAuth, (req, res) => {
    let root = req.body.root
    const oldName = req.body.oldName;
    const newName = forbiddenChar(req.body.newName);
    const isDir = req.body.isDir === 'true';

    let oldPath = path.join(PLIKI_DIR, root, oldName);
    let newPath = path.join(PLIKI_DIR, root, newName);
    console.log('Stara ścieżka:', oldPath);

    if (fs.existsSync(newPath)) {
        const stat = fs.statSync(newPath);
        const targetIsDir = stat.isDirectory();

        if (isDir) {
            fs.rename(oldPath, newPath, (err) => {
                if (err) {
                    console.log(err);
                    return res.status(500).send('Błąd przy zmianie nazwy');
                }
                res.redirect(`/?root=${encodeURIComponent(root)}`);
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

app.post('/file-rename', checkAuth, (req, res) => {
    let root = req.body.root || '';
    const oldName = req.body.oldName;
    const newName = forbiddenChar(req.body.newName);

    const oldPath = path.join(PLIKI_DIR, oldName);
    let newPath = path.join(PLIKI_DIR, newName);


    const oldExt = path.extname(oldName);
    if (!path.extname(newName) || path.extname(newName) !== oldExt) {
        newPath = path.join(PLIKI_DIR, root, newName + oldExt);
    }

    if (fs.existsSync(newPath)) {
        const ext = path.extname(oldName);
        const baseName = path.basename(newName, ext);
        const uniqueName = copyUnique(baseName, ext, path.join(PLIKI_DIR, root));
        newPath = path.join(PLIKI_DIR, root, uniqueName, ext);
    }

    fs.rename(oldPath, newPath, (err) => {
        if (err) {
            console.error('Error renaming file:', err);
            return res.status(500).send('Error renaming file');
        }

        console.log(path.join(root, newPath));
        const ext = path.extname(oldName);
        const modifiedname = newName + ext;

        res.redirect(`/edit?file=${encodeURIComponent(path.join(root, modifiedname))}`);
    });
});



app.get('/edit', checkAuth, (req, res) => {
    const file = req.query.file;
    const filePath = path.join(PLIKI_DIR, file);
    const root = path.dirname(file);
    const ext = path.extname(file).toLowerCase();

    // czy zdj???
    const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.bmp'];
    if (imageExtensions.includes(ext)) {
        res.redirect(`/photo-edit/${encodeURIComponent(file)}`);
        return;
    }

    fs.readFile(filePath, 'utf8', (err, data) => {
        if (err) {
            console.log('Błąd odczytu pliku:', err);
            res.redirect('/');
        } else {
            res.render('editor', { file, content: data, root });
        }
    });
});

app.get('/photo-edit', checkAuth, (req, res) => {
    const file = req.query.file;
    const filePath = path.join(PLIKI_DIR, file);
    const root = path.dirname(file);
    const ext = path.extname(file).toLowerCase();

    //  czy to zdjecie
    const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.bmp'];
    if (!imageExtensions.includes(ext)) {
        res.redirect(`/edit?file=${encodeURIComponent(file)}`);
        return;
    }

    //  filtry z config
    const configPath = path.join(__dirname, 'config.json');
    fs.readFile(configPath, 'utf8', (err, data) => {
        if (err) {
            console.error('blad odczytu config.json:', err);
            res.redirect('/');
            return;
        }

        try {
            const config = JSON.parse(data);
            const imageUrl = `/file-access/${encodeURIComponent(file)}`;

            res.render('photo-editor', {
                file,
                imageUrl,
                root,
                filters: config.filters
            });
        } catch (error) {
            console.error('blad parsowania config.json:', error);
            res.redirect('/');
        }
    });
});

// Pobieranie pliku
app.get('/file-access/:filepath', (req, res) => {
    const filePath = path.join(PLIKI_DIR, decodeURIComponent(req.params.filepath));
    res.sendFile(filePath);
});

// Zapis pliku (punkt d)
app.post('/saveFile', checkAuth, (req, res) => {
    const { filename, root, content } = req.body;
    const filePath = path.join(PLIKI_DIR, root, filename);

    fs.writeFile(filePath, content, 'utf8', (err) => {
        if (err) {
            console.error('blad zapisu pliku:', err);
            return res.status(500).send('blad zapisu pliku');
        }

        // przekieruj z powrotem do edytora
        res.redirect(`/edit?file=${encodeURIComponent(path.join(root, filename))}`);
    });
});

app.post('/savePhoto', checkAuth, (req, res) => {
    const form = new formidable.IncomingForm();
    form.uploadDir = PLIKI_DIR;  // Tymczasowy folder dla uploadu

    form.parse(req, (err, fields, files) => {
        if (err) {
            console.error('blad formidable:', err);
            return res.status(500).send('blad zapisu');
        }

        const { filename, root } = fields;
        const file = files.image;


        const fileObj = Array.isArray(file) ? file[0] : file;

        if (!fileObj) {
            console.error('brak pliku');
            return res.status(400).send('brak pliku');
        }

        const filePath = path.join(PLIKI_DIR, filename);

        // Przenieś plik
        fs.rename(fileObj.path, filePath, (err) => {
            if (err) {
                console.error('blad zapisu:', err);
                return res.status(500).send('blad zapisu');
            }
            res.sendStatus(200);
        });
    });
});
app.post('/save-config', checkAuth, (req, res) => {
    const configPath = 'config.json';
    let config = req.body;

    fs.readFile(configPath, 'utf8', (err, data) => {
        if (err) {
            console.error('Błąd odczytu pliku', err);
            return res.status(500).send('Błąd serwera');
        }
        try {

            const configData = JSON.parse(data);

            console.log(configData);

            configData.settings.textColor = config.textColor;
            configData.settings.fontSize = config.fontSize;
            configData.settings.backgroundColor = config.backgroundColor;

            const jsonData = JSON.stringify(configData, null, 4);

            fs.writeFile(configPath, jsonData, (err, data) =>
                err ? console.error('Błąd zapisu pliku', err) : console.log('Konfiguracja zapisana')
            );
        }
        catch (parseErr) {
            console.error('Błąd parsowania JSON:', parseErr);
            return res.status(500).send('Błąd parsowania konfiguracji');
        }
    });
});

app.get('/config', checkAuth, (req, res) => {
    const configPath = path.join('config.json');
    fs.readFile(configPath, 'utf8', (err, data) => {
        if (err) {
            console.error('Błąd odczytu pliku', err);
            return res.status(500).send('Błąd serwera');
        }
        try {
            const configData = JSON.parse(data);
            console.log(configData);
            res.header('Content-Type', 'application/json');
            res.send(configData);
        } catch (parseErr) {
            console.error('Błąd parsowania JSON:', parseErr);
            res.status(500).send('Błąd parsowania konfiguracji');
        }
    });
});

// Upload do podkatalogu
app.post('/upload', checkAuth, (req, res) => {
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

        res.redirect(`/?root=${encodeURIComponent(root)}`);
    });
});



app.listen(3000, () => {
    console.log('Serwer działa na http://localhost:3000');
});