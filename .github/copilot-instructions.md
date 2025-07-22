<!-- Use this file to provide workspace-specific custom instructions to Copilot. For more details, visit https://code.visualstudio.com/docs/copilot/copilot-customization#_use-a-githubcopilotinstructionsmd-file -->

# Backgammon Online Game Project

This is a Node.js WebSocket-based Backgammon game that provides an exact digital replica of the traditional board game.

## Project Structure
- **Server**: Node.js with Express and Socket.io for real-time multiplayer gameplay
- **Frontend**: Responsive HTML/CSS/JavaScript client that works on mobile and desktop
- **Game Logic**: Complete and accurate Backgammon rules implementation
- **Matchmaking**: Automatic player pairing system

## Key Technologies
- Node.js with Express for web server
- Socket.io for WebSocket real-time communication
- Vanilla JavaScript for client-side game logic
- Responsive CSS for mobile and desktop compatibility

## Game Features - Exact Board Game Replication
- **Board Layout**: 24 triangular points, bar, and home boards exactly as physical game
- **Game Pieces**: 15 checkers per player (white and black/red)
- **Dice System**: Two six-sided dice with doubling cube
- **Movement Rules**: All standard Backgammon movement rules including:
    - Moving checkers according to dice rolls
    - Hitting and entering from the bar
    - Bearing off from home board
    - Blocked points (prime)
    - Forced moves when possible
- **Doubling Cube**: Full implementation with values 2, 4, 8, 16, 32, 64
- **Win Conditions**: Single game, gammon, and backgammon victories
- **Crawford Rule**: For match play
- **Automatic dice rolling** with proper randomization
- **Legal move highlighting** to assist players
- **Turn-based gameplay** with time limits

## Development Guidelines
- **Accuracy First**: Every rule must match traditional Backgammon exactly
- **Validation**: Strict move validation to prevent illegal moves
- **Visual Clarity**: Board and pieces must be clearly distinguishable
- **Game State**: Complete game state tracking for all positions
- **Error-Free**: Comprehensive testing for all game scenarios
- Keep the code modular and well-organized
- Ensure mobile responsiveness for all UI components
- Maintain clean separation between client and server logic
- Follow modern JavaScript ES6+ practices
- Optimize for real-time performance

## Required Game Rules Implementation
1. **Setup**: Correct initial checker placement
2. **Movement**: Clockwise for one player, counter-clockwise for opponent
3. **Hitting**: Send opponent's single checker to bar
4. **Bar Re-entry**: Must re-enter before other moves
5. **Bearing Off**: Only when all checkers in home board
6. **Doubles**: Move four times the dice value
7. **Forced Moves**: Must use both dice if possible
8. **Match Play**: Series of games to predetermined points

