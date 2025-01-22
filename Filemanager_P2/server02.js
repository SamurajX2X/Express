const fs = require('fs');
const path = require('path');


// fs.readFile("../public/uploads/test.txt", "utf8", (err, data) => {
//     if (err) {
//         console.error(err);
//         return;
//     }
//     console.log(data.toString());
// })


const filePath = path.join(__dirname, "../public/uploads", "test.txt");


const filepath2 = path.join(__dirname, "../public/uploads/", "test3.txt")

// fs.writeFile(filepath2, "tekst do wpisania", (err) => {
//     if (err) throw err
//     console.log("plik nadpisany");
// })



// fs.appendFile(filepath2, "\n\ntekst do dopisania", (err) => {
//     if (err) throw err
//     console.log("plik utworzony");
// })





// fs.unlink(filePath, (err) => {

//     if (fs.existsSync(filePath)) {
//         console.log("czas 1: " + new Date().getMilliseconds());

//         console.log("plik istnieje");
//     } else {
//         console.log("plik nie istnieje");
//     }
//     // if (err) throw er
// })

const filepath3 = path.join(__dirname, "../public/uploads/", "file03.txt")
const filepath4 = path.join(__dirname, "../public/uploads/", "file04.txt")

fs.writeFile(filepath3, "tekst do zapisania", (err) => {
    if (err) throw err
    console.log("plik utworzony - czas 1: " + new Date().getMilliseconds());

    fs.appendFile(filepath3, "\n\ntekst do dopisania", (err) => {
        if (err) throw err
        console.log("plik zmodyfikowany - czas 2: " + new Date().getMilliseconds());

    })
})



