/*
COMP3005 Term Project
Author: Stephen Rebel, 101260646

This is a simple server that will act as the back end for users to connect to and interact with my database.
The databse in question will simulate the use of something like SteamDB.
*/

const express = require('express');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();

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

// Write actual html for these two
app.get('/user', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'userView.html'));
});

app.get('/game', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'gameView.html'));
});

// Post
app.post('/queryDB', (req, res) => {
    const searchTerm = req.body.searchTerm;

    const userQuery = 'SELECT user_id, username FROM user WHERE username LIKE ?';
    const gameQuery = 'SELECT game_id, game_name FROM game WHERE game_name LIKE ?';

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

    const userQuery = 'SELECT * FROM user WHERE user_id = ?';
    const friendQuery = 'SELECT u.user_id, u.username FROM user u JOIN friends f ON (f.user1 = u.user_id OR f.user2 = u.user_id) WHERE (f.user1 = ? OR f.user2 = ?)';
    const reviewQuery = 'SELECT r.title, r.content, r.rating, r.review_date, g.game_name FROM review r JOIN game g ON r.posted_on_game = g.game_id WHERE r.posting_user = ?';
    const gameQuery = 'SELECT g.game_id, g.game_name FROM games_owned go JOIN games g ON go.game_id = g.game_id WHERE go.user_id = ?';

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

        db.all(friendQuery, [userId, userId], (err, friendRows) => {
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
    const gameID = req.body.gameId;

    const gameQuery = 'SELECT * FROM game WHERE game_id = ?';
    const achievementQuery = 'SELECT a.achievement_number, a.title, a.description FROM achievement a WHERE a.game_id = ?';
    const reviewQuery = 'SELECT r.title, r.content, r.rating, r.review_date, u.user_name FROM review r JOIN user u ON r.posting_user = u.user_id WHERE g.posted_on_game = ?';

    let game = null;
    let achievements = [];
    let reviews = [];

    db.get(gameQuery, [userId], (err, gameRow) => {
        if (err) {
            console.log("Error running game SQL: ", err);
            return res.status(500).json({ error: 'SQL game query error.' });
        }

        game = gameRow;

        db.all(achievementQuery, [userId], (err, achievementRows) => {
            if (err) {
                console.log("Error running achievements SQL: ", err);
                return res.status(500).json({ error: 'SQL achievements query error.' });
            }
    
            achievements = achievementRows;

            db.all(reviewQuery, [userId], (err, reviewRows) => {
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

app.listen(PORT, (err) => {
    if (err) {
        console.log(err)
    } else {
        console.log(`Server Running at port ${PORT}  CNTL-C to quit`)
        console.log(`Open a brower to: http://localhost:${PORT}`)
    }
});