/*
COMP3005 Term Project
Author: Stephen Rebel, 101260646

This is a simple server that will act as the back end for users to connect to and interact with my database.
The databse in question will simulate the use of something like SteamDB.
*/

const express = require('express');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');

app = express();
const PORT = 3000 || process.env.PORT;
const ROOT_DIR = 'public';

app.locals.pretty = true; // to generate pretty view-source code in browser

// Set up middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, ROOT_DIR)));

const db = new sqlite3.Database('SteamDB.db');

// Get Routes
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'landing.html'));
});

app.get('/dbo', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'dbOverview.html'));
});

app.get('/dbip', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'dbInteraction.html'));
});

app.get('/user', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'userProfile.html'));
});

app.get('/game', (req, res) => {
    const pageFile = path.join(__dirname, 'views', 'gamePage.html');

    fs.readFile(pageFile, 'utf-8', (err, data) => {
        if (err) {
            res.status(500).send('Error fetching html file');
            return;
        }

        let modifiedHTML = data.replace('<!--INSERT_SCRIPT-->', '<script src="scripts/gamePage.js"></script>');

        res.send(modifiedHTML);
    });
});

app.get('/userGame', (req, res) => {
    const pageFile = path.join(__dirname, 'views', 'gamePage.html');

    fs.readFile(pageFile, 'utf-8', (err, data) => {
        if (err) {
            res.status(500).send('Error fetching html file');
            return;
        }

        let modifiedHTML = data.replace('<!--INSERT_SCRIPT-->', '<script src="scripts/userGame.js"></script>');

        res.send(modifiedHTML);
    });
});

// Post
app.post('/queryDB', (req, res) => {
    const searchTerm = req.body.searchTerm;

    // Have to cast integer ids to text because javascript sucks and can't handle integers this large.
    const userQuery = 'SELECT CAST(user_id AS TEXT) AS user_id, username FROM user WHERE username LIKE ?';
    const gameQuery = 'SELECT CAST(game_id AS TEXT) AS game_id, game_name FROM game WHERE game_name LIKE ?';

    let users = [];
    let games = [];

    // Run query with pattern matching and collect results
    db.all(userQuery, [`%${searchTerm}%`], (err, userRows) => {
        if (err) {
            console.error("Error running SQL: ", err);
            return res.status(500).json({ error: 'SQL query error.' });
        }

        users = userRows;

        db.all(gameQuery, [`%${searchTerm}%`], (err, gameRows) => {
            if (err) {
                console.error("Error running SQL: ", err);
                return res.status(500).json({ error: 'SQL query error.' });
            }

            games = gameRows;

            res.json({ users, games });
        });
    });
});

// Write scripts to both send and interpret these POST requests
app.post('/user', (req, res) => {
    const userId = req.body.userId;

    // Again must cast to text because javascript is poorly designed
    const userQuery = 'SELECT CAST(user_id AS TEXT) AS user_id, username, date_created FROM user WHERE user_id = ?';
    const friendQuery = 'SELECT CAST(u.user_id AS TEXT) AS user_id, u.username, f.date_friended FROM user u JOIN friends f ON (f.user1 = u.user_id OR f.user2 = u.user_id) WHERE (f.user1 = ? OR f.user2 = ?) AND u.user_id <> ?';
    const reviewQuery = 'SELECT r.title, r.content, r.rating, r.review_date, g.game_name FROM review r JOIN game g ON r.posted_on_game = g.game_id WHERE r.posting_user = ?';
    const gameQuery = 'SELECT CAST(g.game_id AS TEXT) AS game_id, g.game_name FROM games_owned go JOIN game g ON go.game_id = g.game_id WHERE go.user_id = ?';

    let user = null;
    let friends = [];
    let reviews = [];
    let games = [];

    db.get(userQuery, [userId], (err, userRow) => {
        if (err) {
            console.log("Error running user SQL: ", err);
            return res.status(500).json({ error: 'SQL user query error.' });
        }

        user = userRow;

        db.all(friendQuery, [userId, userId, userId], (err, friendRows) => {
            if (err) {
                console.log("Error running friends SQL: ", err);
                return res.status(500).json({ error: 'SQL reviews friends error.' });
            }
    
            friends = friendRows;

            db.all(reviewQuery, [userId], (err, reviewRows) => {
                if (err) {
                    console.log("Error running reviews SQL: ", err);
                    return res.status(500).json({ error: 'SQL reviews query error.' });
                }
        
                reviews = reviewRows;

                db.all(gameQuery, [userId], (err, gameRows) => {
                    if (err) {
                        console.log("Error running games SQL: ", err);
                        return res.status(500).json({ error: 'SQL games query error.' });
                    }
            
                    games = gameRows;

                    res.json({ user, friends, reviews, games })
                });
            });
        });
    });
});

app.post('/game', (req, res) => {
    const gameId = req.body.gameId;

    // Further casting and my disdain for javascript
    const gameQuery = 'SELECT CAST(game_id AS TEXT) AS game_id, game_name, publishers, release_date, genres, price FROM game WHERE game_id = ?';
    const achievementQuery = 'SELECT a.achievement_number, a.title, a.description FROM achievement a WHERE a.game_id = ?';
    const reviewQuery = 'SELECT r.title, r.content, r.rating, r.review_date, u.username FROM review r JOIN user u ON r.posting_user = u.user_id WHERE r.posted_on_game = ?';

    let game = null;
    let achievements = [];
    let reviews = [];

    db.get(gameQuery, [gameId], (err, gameRow) => {
        if (err) {
            console.log("Error running game SQL: ", err);
            return res.status(500).json({ error: 'SQL game query error.' });
        }

        game = gameRow;

        db.all(achievementQuery, [gameId], (err, achievementRows) => {
            if (err) {
                console.log("Error running achievements SQL: ", err);
                return res.status(500).json({ error: 'SQL achievements query error.' });
            }
    
            achievements = achievementRows;

            db.all(reviewQuery, [gameId], (err, reviewRows) => {
                if (err) {
                    console.log("Error running reviews SQL: ", err);
                    return res.status(500).json({ error: 'SQL reviews query error.' });
                }
        
                reviews = reviewRows;

                res.json({ game, achievements, reviews })
            });
        });
    });
});

// Will act as a sort of follow up query to game data.
app.post('/userGame', (req, res) => {
    const userId = req.body.userId;
    const gameId = req.body.gameId;

    // SQL queries
    const gamePlayQuery = 'SELECT gp.time_played FROM games_owned AS gp WHERE gp.user_id = ? AND gp.game_id = ?';
    const unlockAchievsQuery = 'SELECT ua.achievement_number, ua.date_unlocked FROM unlocked_achievements AS ua WHERE ua.user_id = ? AND ua.game_id = ?';

    gamePlay = null;
    unlockAchievs = [];

    db.get(gamePlayQuery, [userId, gameId], (err, gamePlayRow) => {
        if (err) {
            console.log("Error running game play SQL: ", err);
            return res.status(500).json({ error: 'SQL game play query error.' });
        }

        gamePlay = gamePlayRow;

        db.all(unlockAchievsQuery, [userId, gameId], (err, unlockAchievsRows) => {
            if (err) {
                console.log("Error running unlocked achievements SQL: ", err);
                return res.status(500).json({ error: 'SQL unlocked achievements query error.' });
            }

            unlockAchievs = unlockAchievsRows;

            res.json({ gamePlay, unlockAchievs });
        });
    });
});

app.listen(PORT, (err) => {
    if (err) {
        console.log(err)
    } else {
        console.log(`Server Running at port ${PORT}  CNTL-C to quit`)
        console.log(`Open a brower to: http://localhost:${PORT}`)
    }
});