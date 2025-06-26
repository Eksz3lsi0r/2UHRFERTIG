// Game Data Management System

// Save/Load game data - 1:1 from Python version
function saveGameData() {
    const data = {
        coins: gameState.coins,
        startLevel: gameState.startLevel,
        talentpoints: gameState.talentpoints,
        allocatedTalents: gameState.allocatedTalents
    };
    localStorage.setItem('runnerShooterSave', JSON.stringify(data));

    // Send to WebSocket server
    wsClient.send({
        type: 'saveGame',
        data: data
    });
}

function loadGameData() {
    const saved = localStorage.getItem('runnerShooterSave');
    if (saved) {
        const data = JSON.parse(saved);
        gameState.coins = data.coins || 1000;
        gameState.startLevel = data.startLevel || 1;
        gameState.talentpoints = data.talentpoints || 1;
        gameState.allocatedTalents = data.allocatedTalents || 0;
    }
    updateUI();
}
