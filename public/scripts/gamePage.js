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

        displayGameData(data, game_id)
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
    if (data.achievements && data.achievements.length > 0) {
        renderAchievements(data.achievements, achievsDiv);
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

function renderAchievements(data, container) {
    data.forEach(achievement => {
        let achievContainer = document.createElement('div');
        achievContainer.classList.add('achiev-container');

        let achievOverview = document.createElement('div');
        achievOverview.classList.add('achiev-overview');
        achievOverview.innerHTML = `<strong>${achievement.achievement_number}</strong> - <em>${achievement.title}</em>`;
        achievOverview.style.cursor = 'pointer';

        let achievContent = document.createElement('div');
        achievContent.classList.add('achiev-content');
        achievContent.style.display = 'none';
        achievContent.innerHTML = `<p><strong>Description:</strong> ${!achievement.description ? 'None Provided' : achievement.description}</p>`;

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
    const game_id = new URLSearchParams(window.location.search).get("id");
    queryGameData(game_id);
})