function unixDateToStr(date) {
    let dateObj = new Date(date * 1000)
    const options = { day: '2-digit', month: 'long', year: 'numeric' };

    return dateObj.toLocaleDateString('en-CA', options);
}

async function queryUserData(user_id) {
    try {
        const response = await fetch('./user', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: user_id })
        });

        if (!response.ok) {
            throw new Error(`HTTP Error: ${response.status}`);
        }

        let data = await response.json();

        displayUserData(data, user_id)
    } catch (error) {
        console.log("Data retieval Error: ", error);
    }
}

function displayUserData(data, user_id) {
    // Deal with user first
    let usernameField = document.getElementById('username-field');
    let userDateField = document.getElementById('user-created-date');

    usernameField.innerText = data.user.username;
    userDateField.innerText = unixDateToStr(data.user.date_created);
    // Could add the total achievements and total game time and total games, would need to calculate and change queries to return more info.

    // Friends next
    let friendList = document.getElementById('friends-list');

    if (data.friends && data.friends.length > 0) {
        data.friends.forEach(friend => {
            let friendEntry = document.createElement('li');
            friendEntry.innerHTML = `<a href="/user?id=${friend.user_id}">${friend.username}</a>. Friends since: ${unixDateToStr(friend.date_friended)}`;
            friendList.appendChild(friendEntry);
        });
    } else {
        friendList.innerHTML = '<li>No friends found.</li>';
    }

    // Games next
    let gameList = document.getElementById('games-list');

    if (data.games && data.games.length > 0) {
        data.games.forEach(game => {
            let gameEntry = document.createElement('li');
            gameEntry.innerHTML = `<a href="/userGame?uid=${user_id}&gid=${game.game_id}">${game.game_name}</a>`;
            gameList.appendChild(gameEntry);
        });
    } else {
        gameList.innerHTML = '<li>No games found.</li>';
    }

    // Finally reviews a bit more complicated
    let reviewsDiv = document.getElementById('reviews-container');

    if (data.reviews && data.reviews.length > 0) {
        data.reviews.forEach(review => {
            let reviewContainer = document.createElement('div');
            reviewContainer.classList.add('review-container');

            let reviewSummary = document.createElement('div');
            reviewSummary.classList.add('review-summary');
            reviewSummary.innerHTML = `<strong>${review.title}</strong> (${review.rating === 'P' ? 'Positive' : 'Negative'}) - <em>${review.game_name}</em>`;
            reviewSummary.style.cursor = 'pointer';

            let reviewDetails = document.createElement('div');
            reviewDetails.classList.add('review-details');
            reviewDetails.style.display = 'none';
            reviewDetails.innerHTML = `<p><strong>Date:</strong> ${unixDateToStr(review.review_date)}</p><p><strong>Content:</strong> ${review.content}</p>`;

            reviewSummary.addEventListener('click', () => {
                reviewDetails.style.display = 
                    reviewDetails.style.display === 'none' ? 'block' : 'none';
            });

            reviewContainer.appendChild(reviewSummary);
            reviewContainer.appendChild(reviewDetails);

            reviewsDiv.appendChild(reviewContainer);
        });
    } else {
        reviewsDiv.innerHTML = '<p>No reviews found.</p>';
    }
}

//Add event listeners
document.addEventListener('DOMContentLoaded', function() {
    //This function is called after the browser has loaded the web page
    const user_id = new URLSearchParams(window.location.search).get("id");
    queryUserData(user_id);
})