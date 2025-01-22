const fs = require("fs")
const path = require("path")


// niepoprawna kolejnosc
// if (!fs.existsSync("./newdir")) {
//     fs.mkdir("./newdir", (err) => {
//         if (err) throw err
//         console.log("jest");
//     })
// }

// if (fs.existsSync("./newdir")) {
//     fs.rmdir("./newdir", (err) => {
//         if (err) throw err
//         console.log("nie ma ");
//     })
// }



// if (!fs.existsSync("./newdir")) {
//     fs.mkdir("./newdir", (err) => {
//         if (err) throw err
//         console.log("jest");
//         if (fs.existsSync("./newdir")) {
//             fs.rmdir("./newdir", (err) => {
//                 if (err) throw err
//                 console.log("nie ma ");
//             })
//         }
//     })
// }

// fs.readdir(__dirname, (err, files) => {
//     if (err) throw err
//     console.log("lista", files);
// })


// d) listowanie i dodanie nowego katalogu - niepoprawna kolejność callbacków

// fs.readdir(__dirname, (err, files) => {
//     if (err) throw err
//     console.log("lista 1 - ", files);
// })

// fs.mkdir("./newdir", (err) => {
//     if (err) throw err
//     console.log("jest");
// })

// fs.readdir(__dirname, (err, files) => {
//     if (err) throw err
//     console.log("lista 2 - ", files);
// })


// e) listowanie i dodanie nowego katalogu - poprawna kolejność callbacków
// fs.readdir(__dirname, (err, files) => {
//     if (err) throw err
//     console.log("lista 1 - ", files);

//     fs.mkdir("./newdir", (err) => {
//         // if (err) throw err
//         console.log("dodany");

//         fs.readdir(__dirname, (err, files) => {
//             if (err) throw err
//             console.log("lista 2 - ", files);
//         })
//     })
// })


fs.readdir(__dirname, (err, files) => {
    if (err) throw err

    // foreach
    console.log(__dirname);

    files.forEach((file) => {
        fs.lstat("../", (err, stats) => {
            console.log(file, stats.isDirectory());
        })
    })

    // lub for of
    /*
    for (const f of files) {
      fs.lstat("filepath", (err, stats) => {
            console.log(f, stats.isDirectory());
        })

   }
    */


})