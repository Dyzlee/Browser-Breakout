document.addEventListener('DOMContentLoaded', () => {
    const start = document.getElementById('start');
    const maxBricks = document.getElementById('maxBricks');
    const lives = document.getElementById('lives');
    const showExplosion = document.getElementById('showExplosion');
    const ballColor = document.getElementById('ballColor');
    const platformColor = document.getElementById('platformColor');

    const resetSettings = document.getElementById('reset');
    resetSettings.addEventListener('click', () => {
        chrome.storage.sync.clear();
        location.reload();
        chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
            chrome.tabs.reload(tabs[0].id);
        });
    });

    // Set stored or default values
    chrome.storage.sync.get(null, (data) => {
        if (data.maxBricks != null) {
            maxBricks.value = data.maxBricks;
        } else {
            maxBricks.value = 30;
        }

        if (data.lives != null) {
            lives.value = data.lives;
        } else {
            lives.value = 3;
        }

        if (data.showExplosion != null) {
            showExplosion.checked = data.showExplosion;
        } else {
            showExplosion.checked = true;
        }

        if (data.ballColor != null) {
            ballColor.value = data.ballColor;
        } else {
            ballColor.value = "#ff0000";
        }

        if (data.platformColor != null) {
            platformColor.value = data.platformColor;
        } else {
            platformColor.value = "#000000";
        }
    });

    // Init game
    start.addEventListener('click', () => {
        chrome.tabs.query(
            { currentWindow: true, active: true },
            (tabs) => {
                chrome.tabs.sendMessage(tabs[0].id, { 'key': 'init', 'value': null });
            });
        window.close();
    });

    // Change maxBricks
    maxBricks.addEventListener('change', () => {
        chrome.tabs.query(
            { currentWindow: true, active: true },
            (tabs) => {
                chrome.tabs.sendMessage(tabs[0].id, { 'key': 'maxBricks', 'value': maxBricks.value });
            });
        chrome.storage.sync.set({ maxBricks: maxBricks.value });
    });

    // Change lives amount
    lives.addEventListener('change', () => {
        chrome.tabs.query(
            { currentWindow: true, active: true },
            (tabs) => {
                chrome.tabs.sendMessage(tabs[0].id, { 'key': 'lives', 'value': lives.value });
            });
        chrome.storage.sync.set({ lives: lives.value });
    });

    // Change showExplosion bool
    showExplosion.addEventListener('change', () => {
        chrome.tabs.query(
            { currentWindow: true, active: true },
            (tabs) => {
                chrome.tabs.sendMessage(tabs[0].id, { 'key': 'showExplosion', 'value': showExplosion.checked });
            });
        chrome.storage.sync.set({ showExplosion: showExplosion.checked });
    });

    // Change ball color
    ballColor.addEventListener('change', () => {
        chrome.tabs.query(
            { currentWindow: true, active: true },
            (tabs) => {
                chrome.tabs.sendMessage(tabs[0].id, { 'key': 'ballColor', 'value': ballColor.value });
            });
        chrome.storage.sync.set({ ballColor: ballColor.value });
    });

    // Change platform color
    platformColor.addEventListener('change', () => {
        chrome.tabs.query(
            { currentWindow: true, active: true },
            (tabs) => {
                chrome.tabs.sendMessage(tabs[0].id, { 'key': 'platformColor', 'value': platformColor.value });
            });
        chrome.storage.sync.set({ platformColor: platformColor.value });
    });
});
