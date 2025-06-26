// UI Management System

// Update UI - matching Python's display format
function updateUI() {
    document.getElementById('menuCoins').textContent = gameState.coins;
    document.getElementById('gameCoins').textContent = gameState.coins;
    document.getElementById('availableTalents').textContent = gameState.talentpoints - gameState.allocatedTalents;
}

// Update character window - matching Python's display
function updateCharacterWindow() {
    if (!player) return;

    const stats = document.getElementById('characterStats');
    const autoInterval = Math.round(60 / (1 + 0.02 * (player.level - 1))); // Python's threshold formula

    stats.innerHTML = `
        <div>Weapon: ${player.weapon}</div>
        <div>Weapon Upgraded: ${player.weaponUpgraded}</div>
        <div>Gate Collisions: ${player.gateCollision}</div>
        <div>Enemy Health Multiplier: ${gameState.enemyHealthMultiplier.toFixed(2)}</div>
        <div>Start Level: ${gameState.startLevel}</div>
        <div>Projectile Damage: ${fmt(player.level)}</div>
        <div>Auto-Shoot Threshold: ${autoInterval} frames</div>
    `;
}

// Show weapon upgrade notification
function showWeaponUpgradeNotification(weaponName) {
    // Create or get the notification element
    let notification = document.getElementById('weaponUpgradeNotification');
    if (!notification) {
        notification = document.createElement('div');
        notification.id = 'weaponUpgradeNotification';
        notification.className = 'weapon-upgrade-notification';
        document.body.appendChild(notification);
    }

    // Set the message
    notification.innerHTML = `
        <div class="notification-content">
            <h3>🔫 Waffen-Upgrade!</h3>
            <p><strong>${weaponName}</strong> wurde automatisch ausgerüstet!</p>
            <small>Erhöhte Feuerkraft und Geschwindigkeit</small>
        </div>
    `;

    // Show the notification
    notification.classList.remove('hidden');
    notification.classList.add('visible');

    // Auto-hide after 2 seconds
    setTimeout(() => {
        notification.classList.remove('visible');
        notification.classList.add('hidden');
    }, 2000);
}
