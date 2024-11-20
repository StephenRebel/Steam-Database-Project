// Handle search request to server then data rendering
async function queryDatabase(event) {
    event.preventDefault();

    // Get search term, terminate empty requests
    let search = document.getElementById('search-input').value.trim()
    if(!search) return

    try {
        const response = await fetch('./queryDB', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ searchTerm: search })
        });

        if (!response.ok) {
            throw new Error(`HTTP Error: ${response.status}`)
        }

        let data = await response.json();

        displayResults(data);
    } catch (error) {
        console.log("Database Query Error: ", error);
    }
}

// Function to perfrom the data rendering
function displayResults(data) {
    let userDisplay = document.getElementById('user-list');
    let gameDisplay = document.getElementById('game-list');

    userDisplay.innerHTML = '';
    gameDisplay.innerHTML = '';

    // Render user data if any returned
    if (data.users && data.users.length > 0) {
        data.users.forEach(user => {
            let userEntry = document.createElement('li');
            userEntry.innerHTML = `<a href="/user/?id=${user.id}">${user.name}</a>`;
            userDisplay.appendChild(userEntry);
        });
    } else {
        userDisplay.innerHTML = '<li>No users found.</li>';
    }

    // Render game data if any returned
    if (data.games && data.games.length > 0) {
        data.games.forEach(game => {
            let gameEntry = document.createElement('li');
            gameEntry.innerHTML = `<a href="/user/?id=${game.id}">${game.name}</a>`;
            gameDisplay.appendChild(gameEntry);
        });
    } else {
        gameDisplay.innerHTML = '<li>No games found.</li>';
    }
}

//Add event listeners
document.addEventListener('DOMContentLoaded', function() {
    //This function is called after the browser has loaded the web page

    //add listener to buttons
    document.getElementById('search-form').addEventListener('submit', queryDatabase);
})