const express = require('express')
const app = express();
const bodyParser = require('body-parser');
const session = require("express-session");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

app.use(express.static(__dirname));
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.set('view engine', 'ejs');

const mysql = require("mysql2")

app.use(session({
    secret: process.env.SECRET_KEY,
    resave: false,
    saveUninitialized: false
}));

app.get("/", (req, res) => {
    if (req.session.userId) {
        res.render(__dirname + "/index.ejs", { logged: true })
    } else {
        res.render(__dirname + "/index.ejs", { logged: false })
    }
});


app.get("/dashboard", (req, res) => {
    const pool = mysql.createPool({
        host: process.env.MYSQL_HOST,
        user: process.env.MYSQL_USER,
        password: process.env.MYSQL_PASSWORD,
        database: process.env.MYSQL_DATABASE,
        connectionLimit: 10,
    });

    let ans = {};

    pool.getConnection((err, connection) => {
        if (err) {
            console.error('Error connecting to the database: ', err);
            res.redirect('/');
            return;
        }

        connection.query(
            "SELECT id, fullName, email FROM users WHERE email = ?",
            [req.session.userId],
            (err, results) => {
                if (err) {
                    console.error('Error executing the query: ', err);
                    connection.release();
                    res.redirect('/');
                    return;
                }

                if (results.length === 0) {
                    connection.release();
                    res.redirect('/');
                    return;
                }

                results[0].logged = true;
                ans = results[0];

                connection.query(
                    "SELECT * FROM favorites JOIN houses on favorites.houseid=houses.id WHERE userid = ?",
                    [parseInt(ans.id)],
                    (err, results) => {
                        if (err) {
                            console.error('Error executing the query: ', err);
                            connection.release();
                            res.redirect('/');
                            return;
                        }
                        results.forEach((Element) => {
                            Element.choice = 'liked';
                            Element.img = Element.id + '/' + Element.id + "_" + "1.jpg";
                        })

                        ans.info = results;

                        connection.release();

                        res.render(__dirname + "/dashboard.ejs", {
                            fullName: ans.fullName,
                            email: ans.email,
                            logged: ans.logged,
                            info: ans.info,
                        });
                    }
                );
            }
        );
    });
});


app.get("/logout", (req, res) => {
    req.session.userId = undefined
    res.redirect("/")
})

app.get("/property_detail/:prop_name", (req, res) => {
    const pool = mysql.createPool({
        host: process.env.MYSQL_HOST,
        user: process.env.MYSQL_USER,
        password: process.env.MYSQL_PASSWORD,
        database: process.env.MYSQL_DATABASE,
        connectionLimit: 10,
    });


    pool.getConnection((err, connection) => {
        if (err) {
            console.error('Error connecting to the database: ', err);
            return;
        }


        connection.query("SELECT * FROM houses where name='" + req.params.prop_name + "'", (err, results) => {
            if (err) {
                console.error('Error executing the query: ', err);
                return;
            }
            results.forEach((result) => {
             result.img=result.id+"/"+result.id+"_"+"1.jpg"
            })

            if (req.session.userId) {
                results[0].logged = true;
                res.render(__dirname + "/property_detail.ejs", results[0])
            } else {
                results[0].logged = false;
                res.render(__dirname + "/property_detail.ejs", results[0])
            }

            connection.release();
        });
        connection.release();
    });

})

app.get("/pg/:city", (req, res) => {
    const pool = mysql.createPool({
        host: process.env.MYSQL_HOST,
        user: process.env.MYSQL_USER,
        password: process.env.MYSQL_PASSWORD,
        database: process.env.MYSQL_DATABASE,
        connectionLimit: 10,
    });


    pool.getConnection((err, connection) => {
        if (err) {
            console.error('Error connecting to the database: ', err);
            res.send("unable to connect to server");
            return;
        }

        let userid = undefined;
        connection.query('select id from users where email=?', [req.session.userId], (err, results) => {
            if (err) {
                console.error('Error executing the query: ', err);
                return;
            }
            if (results.length != 0) {
                console.log(results);
                if (results[0].id != undefined) {
                    userid = parseInt(results[0].id);
                }
            }
            connection.query("SELECT * FROM houses LEFT JOIN(SELECT houseid FROM favorites WHERE userid = ?)AS fav ON houses.id = fav.houseid where houses.city=?", [userid, req.params.city], (err, results) => {
                if (err) {
                    console.error('Error executing the query: ', err);
                    return;
                }
                results.forEach((Element) => {
                    if (Element.houseid) Element.choice = 'liked';
                    else Element.choice = 'unliked';
                    Element.img = Element.id + '/' + Element.id + "_" + "1.jpg";
                })

                if (req.session.userId) {
                    res.render(__dirname + '/property_list.ejs', { info: results, city: req.params.city, logged: true })
                } else {
                    res.render(__dirname + '/property_list.ejs', { info: results, city: req.params.city, logged: false })
                }

                connection.release();
            });
        })
    });
})

app.get('/search', (req, res) => {
    const searchCity = req.query.citySearch

    const pool = mysql.createPool({
        host: process.env.MYSQL_HOST,
        user: process.env.MYSQL_USER,
        password: process.env.MYSQL_PASSWORD,
        database: process.env.MYSQL_DATABASE,
        connectionLimit: 10,
    });


    pool.getConnection((err, connection) => {
        if (err) {
            console.error('Error connecting to the database: ', err);
            res.send("unable to connect to server");
            return;
        }


        connection.query("SELECT city FROM houses where city='" + req.query.citySearch + "'", (err, results) => {
            if (err) {
                console.error('Error executing the query: ', err);
                return;
            }

            if (results.length > 0)
                res.redirect("/pg/" + req.query.citySearch + "")
            else res.redirect("/")

            connection.release();
        });

        connection.release();
    });

    // res.send('Hello, World!');
});

app.get("/pg/:city/filter", (req, res) => {
    const pool = mysql.createPool({
        host: process.env.MYSQL_HOST,
        user: process.env.MYSQL_USER,
        password: process.env.MYSQL_PASSWORD,
        database: process.env.MYSQL_DATABASE,
        connectionLimit: 10,
    });


    pool.getConnection((err, connection) => {
        if (err) {
            console.error('Error connecting to the database: ', err);
            res.send("failure");
            return;
        }

        let userid = undefined;
        connection.query('select id from users where email=?', [req.session.userId], (err, results) => {
            if (err) {
                console.error('Error executing the query: ', err);
                res.send("failure");
                return;
            }
            if (results.length != 0) {
                console.log(results);
                if (results[0].id != undefined) {
                    userid = parseInt(results[0].id);
                }
            }
            connection.query("SELECT * FROM houses LEFT JOIN(SELECT houseid FROM favorites WHERE userid = ?)AS fav ON houses.id = fav.houseid where houses.city=? and (houses.gender=? or 'clear'=?)", [userid, req.params.city, req.query.gender, req.query.gender], (err, results) => {
                if (err) {
                    console.error('Error executing the query: ', err);
                    res.send("failure");
                    return;
                }
                results.forEach((Element) => {
                    if (Element.houseid) Element.choice = 'liked';
                    else Element.choice = 'unliked';
                    Element.img = Element.id + '/' + Element.id + "_" + "1.jpg";
                })
                res.send(results);
                connection.release();
            });
        })
    });
})

app.get("/pg/:city/order", (req, res) => {
    const pool = mysql.createPool({
        host: process.env.MYSQL_HOST,
        user: process.env.MYSQL_USER,
        password: process.env.MYSQL_PASSWORD,
        database: process.env.MYSQL_DATABASE,
        connectionLimit: 10,
    });


    pool.getConnection((err, connection) => {
        if (err) {
            console.error('Error connecting to the database: ', err);
            res.send("failure");
            return;
        }

        let userid = undefined;
        connection.query('select id from users where email=?', [req.session.userId], (err, results) => {
            if (err) {
                console.error('Error executing the query: ', err);
                res.send("failure");
                return;
            }
            if (results.length != 0) {
                console.log(results);
                if (results[0].id != undefined) {
                    userid = parseInt(results[0].id);
                }
            }
            connection.query("SELECT * FROM houses LEFT JOIN(SELECT houseid FROM favorites WHERE userid = ?)AS fav ON houses.id = fav.houseid where houses.city=? order by houses.rent " + req.query.order, [userid, req.params.city], (err, results) => {
                if (err) {
                    console.error('Error executing the query: ', err);
                    res.send("failure");
                    return;
                }
                results.forEach((Element) => {
                    if (Element.houseid) Element.choice = 'liked';
                    else Element.choice = 'unliked';
                    Element.img = Element.id + '/' + Element.id + "_" + "1.jpg";
                })
                res.send(results);
                connection.release();
            });
        })
    });
})

app.post('/submit', (req, res) => {
    const { email, password } = req.body;
    const pool = mysql.createPool({
        host: process.env.MYSQL_HOST,
        user: process.env.MYSQL_USER,
        password: process.env.MYSQL_PASSWORD,
        database: process.env.MYSQL_DATABASE,
        connectionLimit: 10,
    });


    pool.getConnection((err, connection) => {
        if (err) {
            console.error('Error connecting to the database: ', err);
            res.send("unable to connect to server");
            return;
        }

        connection.query("select password from users where email='" + email + "'", (err, results) => {
            if (err) {
                console.error('Error executing the query: ', err);
                return;
            }

            if (results[0].password == password) {
                req.session.userId = email
                res.redirect(req.headers.referer)
            } else {
                res.send("error:wrong password")
            }

            connection.release();
        });
        connection.release();
    });
});

app.post('/user', (req, res) => {
    let userid = null
    const pool = mysql.createPool({
        host: process.env.MYSQL_HOST,
        user: process.env.MYSQL_USER,
        password: process.env.MYSQL_PASSWORD,
        database: process.env.MYSQL_DATABASE,
        connectionLimit: 10,
    });


    pool.getConnection((err, connection) => {
        if (err) {
            console.error('Error connecting to the database: ', err);
            res.send("failure")
            return;
        }

        connection.query("Insert into users(fullName,phone,email,password,gender) values('" + req.body.fullName + "','" + req.body.phone + "','" + req.body.email + "','" + req.body.password + "','" + req.body.gender + "')", (err, results) => {
            if (err) {
                console.error('Error executing the query: ', err);
                res.send("failure")
                return;
            }
            connection.query("select id from users where email=?", [req.body.email], (err, results) => {
                if (err) {
                    console.error('Error executing the query: ', err);
                    res.send("failure")
                    return;
                }
                userid = results[0].id;
                if (req.body.student) {
                    connection.query("Insert into students values(?,?)", [userid, req.body.collegeName], (err, results) => {
                        if (err) {
                            console.error('Error executing the query: ', err);
                            res.send("failure")
                            return;
                        }
                    });
                }
                res.send("success")
            });
        });

        connection.release();
    });
});

app.delete('/users/:id', (req, res) => {
    const userId = req.params.id;

    res.send(`User ${userId} deleted successfully!`);
});

app.put("/favourites", (req, res) => {
    if (!req.session.userId) {
        res.send("login first!S");
    }
    const pool = mysql.createPool({
        host: process.env.MYSQL_HOST,
        user: process.env.MYSQL_USER,
        password: process.env.MYSQL_PASSWORD,
        database: process.env.MYSQL_DATABASE,
        connectionLimit: 10,
    });

    pool.getConnection((err, connection) => {
        if (err) {
            console.error('Error connecting to the database: ', err);
            res.send("failure")
            return;
        }

        let email = req.session.userId;
        let userid;
        let houseid;
        connection.query("select id from users where email=?", [email], (err, results) => {
            if (err) {
                console.error('Error executing the query: ', err);
                res.send("failure")
                return;
            }
            if (results.length != 0) {
                console.log(results);
                if (results[0].id != undefined) {
                    userid = parseInt(results[0].id);
                    connection.query("select id from houses where name=? and address =?", [req.body.pgname, req.body.pgaddress], (err, results) => {
                        if (err) {
                            console.error('Error executing the query: ', err);
                            res.send("failure")
                            return;
                        }
                        houseid = parseInt(results[0].id);
                        connection.query("Insert into favorites(userid,houseid) values(?,?)", [userid, houseid], (err, results) => {
                            if (err) {
                                console.error('Error executing the query: ', err);
                                res.send("failure")
                                return;
                            }

                            connection.release();
                            if (results) res.send("success")
                            else res.send("failure")
                        })
                    })
                } else {
                    connection.release();
                    res.send("failure")
                    return;
                }
            }
            connection.release();
        })
    });
});

app.put("/unfavourites", (req, res) => {
    if (!req.session.userId) {
        res.send("login first!S");
    }
    const pool = mysql.createPool({
        host: process.env.MYSQL_HOST,
        user: process.env.MYSQL_USER,
        password: process.env.MYSQL_PASSWORD,
        database: process.env.MYSQL_DATABASE,
        connectionLimit: 10,
    });

    pool.getConnection((err, connection) => {
        if (err) {
            console.error('Error connecting to the database: ', err);
            res.send("failure")
            return;
        }

        let email = req.session.userId;
        let userid;
        let houseid;
        connection.query("select id from users where email=?", [email], (err, results) => {
            if (err) {
                console.error('Error executing the query: ', err);
                res.send("failure")
                return;
            }
            if (results.length != 0) {
                console.log(results);
                if (results[0].id != undefined) {
                    userid = parseInt(results[0].id);
                    connection.query("select id from houses where name=? and address =?", [req.body.pgname, req.body.pgaddress], (err, results) => {
                        if (err) {
                            console.error('Error executing the query: ', err);
                            res.send("failure")
                            return;
                        }
                        houseid = parseInt(results[0].id);
                        connection.query("delete from favorites where userid=? and houseid=?", [userid, houseid], (err, results) => {
                            if (err) {
                                console.error('Error executing the query: ', err);
                                res.send("failure")
                                return;
                            }
                            connection.release();
                            res.send("success")
                        })
                    })
                } else {
                    connection.release();
                    res.send("failure")
                    return;
                }
            }
            connection.release();
        })
    });
});

const upload = multer({ dest: 'uploads/' });

app.get("/addhouse", function (req, res,) {
    if (req.session.userId) {
        res.sendFile(__dirname + "/addhouse.html");
    } else {
        res.redirect("/");
    }
});

app.post("/addhouse", upload.array('images[]', 3), function (req, res) {
    const uploadedFiles = req.files;

    const pool = mysql.createPool({
        host: process.env.MYSQL_HOST,
        user: process.env.MYSQL_USER,
        password: process.env.MYSQL_PASSWORD,
        database: process.env.MYSQL_DATABASE,
    });

    let houseid = null

    pool.getConnection((err, connection) => {
        if (err) {
            console.error('Error connecting to the database: ', err);
            res.send("unable to connect to server");
            return;
        }

        connection.query("insert into houses(name,address,city,gender,rent,details) values(?,?,?,?,?,?) ", [req.body.housename, req.body.address, req.body.city, req.body.gender, req.body.rent, req.body.description], (err, results) => {
            if (err) {
                console.error('Error executing the query: ', err);
                return;
            }

            connection.query("select id from houses where name=? and address=? ", [req.body.housename, req.body.address], (err, results) => {
                if (err) {
                    console.error('Error executing the query: ', err);
                    return;
                }
                console.log(results);
                houseid = results[0].id;
                const folderPath = './img/properties/' + houseid;
                let count = 0;
                fs.mkdir(folderPath, (err) => {
                    if (err) {
                        console.error('Error creating folder:', err);
                    }
                    uploadedFiles.forEach((file) => {
                        const fileName = houseid + '_' + (++count);
                        const filePath = path.join(folderPath, fileName + '.jpg');

                        fs.rename(file.path, filePath, (err) => {
                            if (err) {
                                console.error(err);
                                return res.status(500).send('Failed to upload the image.');
                            }
                        });
                    });
                });

            })
        });
        connection.release();
    });
    res.redirect("/dashboard");
});


const server = app.listen(process.env.PORT, () => {
    const port = server.address().port;
    console.log(`Server is running on port ${port}`);
});