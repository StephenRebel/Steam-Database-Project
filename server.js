/*
COMP3005 Term Project
Author: Stephen Rebel, 101260646

This is a simple server that will act as the back end for users to connect to and interact with my database.
The databse in question will simulate the use of something like SteamDB.
*/

const express = require('express');
const path = require('path');

app = express();
const PORT = 3000 || process.env.PORT;
const ROOT_DIR = 'public';

app.locals.pretty = true; // to generate pretty view-source code in browser

// Set up middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, ROOT_DIR)));

// Get Routes
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'landing.html'));
});

app.get('/dbo', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'dbOverview.html'));
});

app.get('/dbip', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'landing.html'));
});


// Post



app.listen(PORT, (err) => {
    if (err) {
        console.log(err)
    } else {
        console.log(`Server Running at port ${PORT}  CNTL-C to quit`)
        console.log(`Open a brower to: http://localhost:${PORT}`)
    }
})