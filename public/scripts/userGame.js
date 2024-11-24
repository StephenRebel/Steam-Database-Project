function unixDateToStr(date) {
    let dateObj = new Date(date * 1000)
    const options = { day: '2-digit', month: 'long', year: 'numeric' };

    return dateObj.toLocaleDateString('en-CA', options);
}

function minutesToHours(time) {
    hours = Math.floor(time / 60);
    minutes = time % 60;

    return { hours, minutes };
}

async function queryUserGameData(user_id, game_id) {
    try {
        const response1 = await fetch('./game', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ gameId: game_id })
        });

        const response2 = await fetch('./userGame', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ gameId: game_id, userId: user_id })
        });

        if (!response1.ok) {
            throw new Error(`HTTP Error: ${response1.status}`);
        }

        if (!response2.ok) {
            throw new Error(`HTTP Error: ${response2.status}`);
        }

        let gameData = await response1.json();
        let userGameData = await response2.json();

        let data = {...gameData, ...userGameData};

        displayUserGameData(data, user_id)
    } catch (error) {
        console.log("Data retieval Error: ", error);
    }
}

function displayUserGameData(data, user_id) {
    // Add button to go back to user page from previous click
    let backButton = document.createElement('button');
    backButton.textContent = '< User Profile';
    backButton.addEventListener('click', () => {
        window.location.href = `http://localhost:3000/user?id=${user_id}`;
    });
    backButton.id = 'user-profile-back';

    let mainTag = document.getElementById('info-main');
    mainTag.insertBefore(backButton, mainTag.firstChild);

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

    let gameInfoDiv = document.getElementById('game-info');
    let timePlayedField = document.createElement('p');

    hourMinsPlayed = minutesToHours(data.gamePlay.time_played);
    timePlayedField.innerHTML = `<p><strong>Time Played:</strong> <span id="playtime-field">${hourMinsPlayed.hours}hr ${hourMinsPlayed.minutes}mins</span></p>`;
    gameInfoDiv.appendChild(timePlayedField);

    // Achievements fields
    let achievsDiv = document.getElementById('achievements-container');
    if (data.achievements && data.achievements.length > 0) {
        renderAchievements(data, achievsDiv);
    } else {
        achievsDiv.innerHTML = '<p>No achievements listed.</p>'
    }

    // Reviews section
    let reviewsDiv = document.getElementById('reviews-container');
    if (data.reviews && data.reviews.length > 0) {
        renderReviews(data.reviews, reviewsDiv)
    } else {
        reviewsDiv.innerHTML = '<p>No reviews found.</p>';
    }
}

// Change functionality to reflect achievement unlocked.
function renderAchievements(data, container) {
    // Merge the seperate sql queries
    const key = 'achievement_number';

    mergedAchievs = data.achievements.map(obj1 => {
        let match = data.unlockAchievs.find(obj2 => obj2[key] === obj1[key]);
        if (match) {
            return { ...obj1, ...match };
        } else {
            obj1.date_unlocked = -1;
            return obj1;
        }
    });

    mergedAchievs.forEach(achievement => {
        let achievContainer = document.createElement('div');
        achievContainer.classList.add('achiev-container');

        if (achievement.date_unlocked === -1) {
            achievContainer.classList.add('locked');
        }

        let achievOverview = document.createElement('div');
        achievOverview.classList.add('achiev-overview');
        achievOverview.innerHTML = `<strong>${achievement.achievement_number}</strong> - <em>${achievement.title}</em>`;
        achievOverview.style.cursor = 'pointer';

        let achievContent = document.createElement('div');
        achievContent.classList.add('achiev-content');
        achievContent.style.display = 'none';
        let achieveStatusHTML = achievement.date_unlocked === -1 ? '<strong>Achievement Locked</strong>' : `<strong>Achievement Unlocked:</strong> ${unixDateToStr(achievement.date_unlocked)}`;
        achievContent.innerHTML = `<p>${achieveStatusHTML}</p><p><strong>Description:</strong> ${!achievement.description ? 'None Provided' : achievement.description}</p>`;

        achievOverview.addEventListener('click', () => {
            achievContent.style.display = achievContent.style.display === 'none' ? 'block' : 'none';
        });

        achievContainer.appendChild(achievOverview);
        achievContainer.appendChild(achievContent);

        container.appendChild(achievContainer);
    });
}

function renderReviews(data, container) {
    data.forEach(review => {
        let reviewContainer = document.createElement('div');
        reviewContainer.classList.add('review-container');

        let reviewSummary = document.createElement('div');
        reviewSummary.classList.add('review-summary');
        reviewSummary.innerHTML = `<strong>${review.title}</strong> (${review.rating === 'P' ? 'Positive' : 'Negative'}) - <em>${review.username}</em>`;
        reviewSummary.style.cursor = 'pointer';

        let reviewDetails = document.createElement('div');
        reviewDetails.classList.add('review-details');
        reviewDetails.style.display = 'none';
        reviewDetails.innerHTML = `<p><strong>Date:</strong> ${unixDateToStr(review.review_date)}</p><p><strong>Content:</strong> ${review.content}</p>`;

        reviewSummary.addEventListener('click', () => {
            reviewDetails.style.display = reviewDetails.style.display === 'none' ? 'block' : 'none';
        });

        reviewContainer.appendChild(reviewSummary);
        reviewContainer.appendChild(reviewDetails);

        container.appendChild(reviewContainer);
    });
}

//Add event listeners
document.addEventListener('DOMContentLoaded', function() {
    //This function is called after the browser has loaded the web page
    let urlSearch = new URLSearchParams(window.location.search)
    const user_id = urlSearch.get("uid")
    const game_id = urlSearch.get("gid");

    queryUserGameData(user_id, game_id);
})