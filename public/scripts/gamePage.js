function unixDateToStr(date) {
    let dateObj = new Date(date * 1000)
    const options = { day: '2-digit', month: 'long', year: 'numeric' };

    return dateObj.toLocaleDateString('en-CA', options);
}

async function queryGameData(game_id) {
    try {
        const response = await fetch('./game', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ gameId: game_id })
        });

        if (!response.ok) {
            throw new Error(`HTTP Error: ${response.status}`);
        }

        let data = await response.json();

        displayUserData(data, game_id)
    } catch (error) {
        console.log("Data retieval Error: ", error);
    }
}

function displayGameData(data, game_id) {
    // Write game information
    let titleField = document.getElementById('title-field');
    let pubField = document.getElementById('publishers-field');
    let genreField = document.getElementById('genre-field');
    let relDatField = document.getElementById('release-date-field');
    let priceField = document.getElementById('price-field');

    titleField.innerText = data.game.game_name;
    pubField.innerText = data.game.publishers;
    genreField.innerText = data.game.genres;
    relDatField.innerText = unixDateToStr(data.game.release_date);
    priceField.innerText = `$${data.game.price / 100}`;

    // Achievements fields
    let achievsDiv = document.getElementById('achievements-container');
}

//Add event listeners
document.addEventListener('DOMContentLoaded', function() {
    //This function is called after the browser has loaded the web page
    const game_id = new URLSearchParams(window.location.search).get("id");
    queryGameData(game_id);
})