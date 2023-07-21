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

const { Pool } = require('pg');

app.use(session({
    secret: process.env.SECRET_KEY,
    resave: false,
    saveUninitialized: false
}));

const internalDBUrl = process.env.INTERNAL_DATABASE_URL;

app.get("/", (req, res) => {
    if (req.session.userId) {
        res.render(__dirname + "/index.ejs", { logged: true })
    } else {
        res.render(__dirname + "/index.ejs", { logged: false })
    }
});


app.get("/dashboard", (req, res) => {
    const pool = new Pool({
        connectionString: internalDBUrl,
    });

    let ans = {};

    pool.connect((err, client, release) => {
        if (err) {
            console.error('Error connecting to the database: ', err);
            res.redirect('/');
            return;
        }

        client.query(
            "SELECT id, fullName, email FROM users WHERE email = $1",
            [req.session.userId],
            (err, results) => {
                if (err) {
                    console.error('Error executing the query: ', err);
                    release();
                    res.redirect('/');
                    return;
                }

                if (results.rows.length === 0) {
                    release();
                    res.redirect('/');
                    return;
                }

                results.rows[0].logged = true;
                ans = results.rows[0];

                client.query(
                    "SELECT * FROM favorites JOIN houses ON favorites.houseid = houses.id WHERE userid = $1",
                    [parseInt(ans.id)],
                    (err, results) => {
                        if (err) {
                            console.error('Error executing the query: ', err);
                            release();
                            res.redirect('/');
                            return;
                        }
                        results.rows.forEach((Element) => {
                            Element.choice = 'liked';
                            Element.img = Element.id + '/' + Element.id + "_" + "1.jpg";
                        });

                        ans.info = results.rows;

                        release();

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
    const pool = new Pool({
        connectionString: internalDBUrl,
    });

    pool.connect((err, client, release) => {
        if (err) {
            console.error('Error connecting to the database: ', err);
            return;
        }

        client.query("SELECT * FROM houses WHERE name = $1", [req.params.prop_name], (err, results) => {
            if (err) {
                console.error('Error executing the query: ', err);
                release();
                return;
            }

            results.rows.forEach((result) => {
                result.img = result.id + "/" + result.id + "_" + "1.jpg";
            });

            if (req.session.userId) {
                results.rows[0].logged = true;
                res.render(__dirname + "/property_detail.ejs", results.rows[0]);
            } else {
                results.rows[0].logged = false;
                res.render(__dirname + "/property_detail.ejs", results.rows[0]);
            }

            release();
        });
    });

})

app.get("/pg/:city", (req, res) => {
    const pool = new Pool({
        connectionString: internalDBUrl,
    });

    pool.connect((err, client, release) => {
        if (err) {
            console.error('Error connecting to the database: ', err);
            res.send('unable to connect to server');
            return;
        }

        let userid = undefined;
        client.query('SELECT id FROM users WHERE email = $1', [req.session.userId], (err, results) => {
            if (err) {
                console.error('Error executing the query: ', err);
                release();
                return;
            }
            if (results.rows.length != 0) {
                console.log(results.rows);
                if (results.rows[0].id != undefined) {
                    userid = parseInt(results.rows[0].id);
                }
            }
            client.query(
                "SELECT * FROM houses LEFT JOIN (SELECT houseid FROM favorites WHERE userid = $1) AS fav ON houses.id = fav.houseid WHERE houses.city = $2",
                [userid, req.params.city],
                (err, results) => {
                    if (err) {
                        console.error('Error executing the query: ', err);
                        release();
                        return;
                    }
                    results.rows.forEach((Element) => {
                        if (Element.houseid) Element.choice = 'liked';
                        else Element.choice = 'unliked';
                        Element.img = Element.id + '/' + Element.id + '_' + '1.jpg';
                    });

                    if (req.session.userId) {
                        res.render(__dirname + '/property_list.ejs', { info: results.rows, city: req.params.city, logged: true });
                    } else {
                        res.render(__dirname + '/property_list.ejs', { info: results.rows, city: req.params.city, logged: false });
                    }

                    release();
                }
            );
        });
    });

})

app.get('/search', (req, res) => {
    const searchCity = req.query.citySearch;

    const pool = new Pool({
        connectionString: internalDBUrl,
    });

    pool.connect((err, client, release) => {
        if (err) {
            console.error('Error connecting to the database: ', err);
            res.send('unable to connect to server');
            return;
        }

        client.query("SELECT city FROM houses WHERE city = $1", [req.query.citySearch], (err, results) => {
            if (err) {
                console.error('Error executing the query: ', err);
                release();
                return;
            }

            if (results.rows.length > 0) {
                res.redirect('/pg/' + req.query.citySearch);
            } else {
                res.redirect('/');
            }

            release();
        });
    });


    // res.send('Hello, World!');
});

app.get("/pg/:city/filter", (req, res) => {
    const { Pool } = require('pg');

    const pool = new Pool({
        connectionString: internalDBUrl,
    });

pool.connect((err, client, release) => {
  if (err) {
    console.error('Error connecting to the database: ', err);
    res.send('failure');
    return;
  }

  let userid = undefined;
  client.query('SELECT id FROM users WHERE email = $1', [req.session.userId], (err, results) => {
    if (err) {
      console.error('Error executing the query: ', err);
      res.send('failure');
      release();
      return;
    }
    if (results.rows.length != 0) {
      console.log(results.rows);
      if (results.rows[0].id != undefined) {
        userid = parseInt(results.rows[0].id);
      }
    }

    client.query(
      "SELECT * FROM houses LEFT JOIN (SELECT houseid FROM favorites WHERE userid = $1) AS fav ON houses.id = fav.houseid WHERE houses.city = $2 AND (houses.gender = $3 OR $4 = 'clear')",
      [userid, req.params.city, req.query.gender, req.query.gender],
      (err, results) => {
        if (err) {
          console.error('Error executing the query: ', err);
          res.send('failure');
          release();
          return;
        }

        results.rows.forEach((Element) => {
          if (Element.houseid) Element.choice = 'liked';
          else Element.choice = 'unliked';
          Element.img = Element.id + '/' + Element.id + '_' + '1.jpg';
        });

        res.send(results.rows);
        release();
      }
    );
  });
});

})

app.get("/pg/:city/order", (req, res) => {
    const pool = new Pool({
        connectionString: internalDBUrl,
    });

pool.connect((err, client, release) => {
  if (err) {
    console.error('Error connecting to the database: ', err);
    res.send('failure');
    return;
  }

  let userid = undefined;
  client.query('SELECT id FROM users WHERE email = $1', [req.session.userId], (err, results) => {
    if (err) {
      console.error('Error executing the query: ', err);
      res.send('failure');
      release();
      return;
    }
    if (results.rows.length != 0) {
      console.log(results.rows);
      if (results.rows[0].id != undefined) {
        userid = parseInt(results.rows[0].id);
      }
    }

    client.query(
      "SELECT * FROM houses LEFT JOIN (SELECT houseid FROM favorites WHERE userid = $1) AS fav ON houses.id = fav.houseid WHERE houses.city = $2 ORDER BY houses.rent " + req.query.order,
      [userid, req.params.city],
      (err, results) => {
        if (err) {
          console.error('Error executing the query: ', err);
          res.send('failure');
          release();
          return;
        }

        results.rows.forEach((Element) => {
          if (Element.houseid) Element.choice = 'liked';
          else Element.choice = 'unliked';
          Element.img = Element.id + '/' + Element.id + '_' + '1.jpg';
        });

        res.send(results.rows);
        release();
      }
    );
  });
});

})

app.post('/submit', (req, res) => {
    const { email, password } = req.body;


    const pool = new Pool({
        connectionString: internalDBUrl,
    });

pool.connect((err, client, release) => {
  if (err) {
    console.error('Error connecting to the database: ', err);
    res.send('unable to connect to server');
    return;
  }

  client.query("SELECT password FROM users WHERE email = $1", [email], (err, results) => {
    if (err) {
      console.error('Error executing the query: ', err);
      release();
      return;
    }

    if (results.rows.length > 0 && results.rows[0].password === password) {
      req.session.userId = email;
      res.redirect(req.headers.referer);
    } else {
      res.send('error:wrong password');
    }

    release();
  });
});

});

app.post('/user', (req, res) => {
    let userid = null;
    
    const pool = new Pool({
        connectionString: internalDBUrl,
    });
    
    pool.connect((err, client, release) => {
      if (err) {
        console.error('Error connecting to the database: ', err);
        res.send('failure');
        return;
      }
    
      client.query(
        "INSERT INTO users (fullName, phone, email, password, gender) VALUES ($1, $2, $3, $4, $5) RETURNING id",
        [req.body.fullName, req.body.phone, req.body.email, req.body.password, req.body.gender],
        (err, results) => {
          if (err) {
            console.error('Error executing the query: ', err);
            res.send('failure');
            release();
            return;
          }
          userid = results.rows[0].id;
          if (req.body.student) {
            client.query(
              "INSERT INTO students (userid, collegeName) VALUES ($1, $2)",
              [userid, req.body.collegeName],
              (err, results) => {
                if (err) {
                  console.error('Error executing the query: ', err);
                  res.send('failure');
                  release();
                  return;
                }
                res.send('success');
                release();
              }
            );
          } else {
            res.send('success');
            release();
          }
        }
      );
    });
    
});

app.delete('/users/:id', (req, res) => {
    const userId = req.params.id;

    res.send(`User ${userId} deleted successfully!`);
});

app.put("/favourites", (req, res) => {
    if (!req.session.userId) {
        res.send("login first!");
      }
      
      const pool = new Pool({
        connectionString: internalDBUrl,
    });
      
      pool.connect((err, client, release) => {
        if (err) {
          console.error('Error connecting to the database: ', err);
          res.send("failure");
          return;
        }
      
        let email = req.session.userId;
        let userid;
        let houseid;
      
        client.query("SELECT id FROM users WHERE email = $1", [email], (err, results) => {
          if (err) {
            console.error('Error executing the query: ', err);
            res.send("failure");
            release();
            return;
          }
      
          if (results.rows.length != 0) {
            console.log(results.rows);
            if (results.rows[0].id != undefined) {
              userid = parseInt(results.rows[0].id);
              client.query(
                "SELECT id FROM houses WHERE name = $1 AND address = $2",
                [req.body.pgname, req.body.pgaddress],
                (err, results) => {
                  if (err) {
                    console.error('Error executing the query: ', err);
                    res.send("failure");
                    release();
                    return;
                  }
      
                  if (results.rows.length > 0) {
                    houseid = parseInt(results.rows[0].id);
                    client.query(
                      "INSERT INTO favorites (userid, houseid) VALUES ($1, $2)",
                      [userid, houseid],
                      (err, results) => {
                        if (err) {
                          console.error('Error executing the query: ', err);
                          res.send("failure");
                          release();
                          return;
                        }
      
                        res.send("success");
                        release();
                      }
                    );
                  } else {
                    res.send("failure");
                    release();
                  }
                }
              );
            } else {
              res.send("failure");
              release();
            }
          } else {
            res.send("failure");
            release();
          }
        });
      });
      
});

app.put("/unfavourites", (req, res) => {
    if (!req.session.userId) {
        res.send("login first!");
      }
      
      const pool = new Pool({
        connectionString: internalDBUrl,
    });
      
      pool.connect((err, client, release) => {
        if (err) {
          console.error('Error connecting to the database: ', err);
          res.send("failure");
          return;
        }
      
        let email = req.session.userId;
        let userid;
        let houseid;
      
        client.query("SELECT id FROM users WHERE email = $1", [email], (err, results) => {
          if (err) {
            console.error('Error executing the query: ', err);
            res.send("failure");
            release();
            return;
          }
      
          if (results.rows.length != 0) {
            console.log(results.rows);
            if (results.rows[0].id != undefined) {
              userid = parseInt(results.rows[0].id);
              client.query(
                "SELECT id FROM houses WHERE name = $1 AND address = $2",
                [req.body.pgname, req.body.pgaddress],
                (err, results) => {
                  if (err) {
                    console.error('Error executing the query: ', err);
                    res.send("failure");
                    release();
                    return;
                  }
      
                  if (results.rows.length > 0) {
                    houseid = parseInt(results.rows[0].id);
                    client.query(
                      "DELETE FROM favorites WHERE userid = $1 AND houseid = $2",
                      [userid, houseid],
                      (err, results) => {
                        if (err) {
                          console.error('Error executing the query: ', err);
                          res.send("failure");
                          release();
                          return;
                        }
      
                        res.send("success");
                        release();
                      }
                    );
                  } else {
                    res.send("failure");
                    release();
                  }
                }
              );
            } else {
              res.send("failure");
              release();
            }
          } else {
            res.send("failure");
            release();
          }
        });
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

app.post('/addhouse', upload.array('images[]',3), function (req, res) {
  const uploadedFiles = req.files;

  const pool = new Pool({
    connectionString: internalDBUrl,
});

  let houseid = null;

  pool.connect((err, client, release) => {
    if (err) {
      console.error('Error connecting to the database: ', err);
      res.send('unable to connect to server');
      return;
    }

    client.query(
      'INSERT INTO houses (name, address, city, gender, rent, details) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id',
      [req.body.housename, req.body.address, req.body.city, req.body.gender, req.body.rent, req.body.description],
      (err, results) => {
        if (err) {
          console.error('Error executing the query: ', err);
          res.status(500).send('Failed to add the house.');
          release();
          return;
        }

        houseid = results.rows[0].id;
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

          res.redirect('/dashboard');
          release();
        });
      }
    );
  });
});



const server = app.listen(process.env.PORT, () => {
    const port = server.address().port;
    console.log(`Server is running on port ${port}`);
});