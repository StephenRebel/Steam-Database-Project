// JavaScript function to handle tab switching
function openTab(event, tabId) {
    const tabContents = document.querySelectorAll('.tab-content');
    tabContents.forEach(content => content.classList.remove('active'));

    const tabButtons = document.querySelectorAll('.tab-button');
    tabButtons.forEach(button => button.classList.remove('active'));

    document.getElementById(tabId).classList.add('active');
    event.currentTarget.classList.add('active');
}

// Add event listeners
document.addEventListener('DOMContentLoaded', function() {
    // Add listener to buttons
    document.getElementById('tab1-button').addEventListener('click', function(event) {
        openTab(event, 'tab1');
    });
    document.getElementById('tab2-button').addEventListener('click', function(event) {
        openTab(event, 'tab2');
    });
});