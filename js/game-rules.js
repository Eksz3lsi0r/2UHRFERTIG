// Backgammon Game Rules and Utility Functions

class BackgammonRules {
    // Standard Backgammon starting position
    static getInitialBoard() {
        const board = Array(24).fill(null).map(() => []);

        // Standard setup
        board[0] = ['white', 'white'];                     // Point 1
        board[5] = ['black', 'black', 'black', 'black', 'black'];   // Point 6
        board[7] = ['black', 'black', 'black'];           // Point 8
        board[11] = ['white', 'white', 'white', 'white', 'white'];  // Point 12
        board[12] = ['black', 'black', 'black', 'black', 'black'];  // Point 13
        board[16] = ['white', 'white', 'white'];          // Point 17
        board[18] = ['white', 'white', 'white', 'white', 'white'];  // Point 19
        board[23] = ['black', 'black'];                   // Point 24

        return board;
    }

    // Check if a player can bear off
    static canBearOff(board, bar, player) {
        const homeStart = player === 'white' ? 18 : 0;
        const homeEnd = player === 'white' ? 24 : 6;

        // Check bar first
        if (bar[player] > 0) return false;

        // Check if all checkers are in home board
        for (let i = 0; i < 24; i++) {
            if ((player === 'white' && i < homeStart) ||
                (player === 'black' && i >= homeEnd)) {
                if (board[i].some(checker => checker === player)) {
                    return false;
                }
            }
        }

        return true;
    }

    // Check if a move to a point is valid
    static canMoveTo(board, point, player) {
        if (point < 0 || point >= 24) return false;

        const pointCheckers = board[point];
        if (pointCheckers.length === 0) return true;           // Empty point
        if (pointCheckers[0] === player) return true;          // Own checkers
        if (pointCheckers.length === 1) return true;           // Can hit single opponent

        return false; // Blocked by opponent
    }

    // Get valid moves from a specific point
    static getValidMoves(board, bar, availableMoves, fromPoint, player) {
        const validMoves = [];

        // If player has checkers on bar, must enter first
        if (bar[player] > 0) {
            if (fromPoint !== 'bar') return [];

            for (const move of availableMoves) {
                const targetPoint = player === 'white' ? 24 - move : move - 1;
                if (this.canMoveTo(board, targetPoint, player)) {
                    validMoves.push(targetPoint);
                }
            }
            return validMoves;
        }

        if (fromPoint === 'bar') return [];

        const direction = player === 'white' ? 1 : -1;

        for (const move of availableMoves) {
            const targetPoint = fromPoint + (move * direction);

            // Regular board moves
            if (targetPoint >= 0 && targetPoint < 24 && this.canMoveTo(board, targetPoint, player)) {
                validMoves.push(targetPoint);
            }

            // Bearing off moves
            if (this.canBearOff(board, bar, player)) {
                const exactDistance = player === 'white' ? 24 - fromPoint : fromPoint + 1;

                if (move === exactDistance) {
                    validMoves.push('home');
                } else if (move > exactDistance) {
                    // Can use higher die if no checkers further back
                    let canUseHigherDie = true;
                    const startCheck = player === 'white' ? fromPoint + 1 : 0;
                    const endCheck = player === 'white' ? 24 : fromPoint - 1;

                    for (let i = startCheck; player === 'white' ? i < endCheck : i <= endCheck; i++) {
                        if (board[i].some(checker => checker === player)) {
                            canUseHigherDie = false;
                            break;
                        }
                    }

                    if (canUseHigherDie) {
                        validMoves.push('home');
                    }
                }
            }
        }

        return validMoves;
    }

    // Check if player has any valid moves
    static hasAnyValidMoves(board, bar, availableMoves, player) {
        // Check bar entry moves
        if (bar[player] > 0) {
            for (const move of availableMoves) {
                const targetPoint = player === 'white' ? 24 - move : move - 1;
                if (targetPoint >= 0 && targetPoint < 24 && this.canMoveTo(board, targetPoint, player)) {
                    return true;
                }
            }
            return false;
        }

        // Check regular board moves
        for (let i = 0; i < 24; i++) {
            if (board[i].length > 0 && board[i][board[i].length - 1] === player) {
                const validMoves = this.getValidMoves(board, bar, availableMoves, i, player);
                if (validMoves.length > 0) {
                    return true;
                }
            }
        }

        return false;
    }

    // Roll two dice
    static rollDice() {
        const die1 = Math.floor(Math.random() * 6) + 1;
        const die2 = Math.floor(Math.random() * 6) + 1;

        // Doubles give 4 moves
        if (die1 === die2) {
            return {
                dice: [die1, die2],
                moves: [die1, die1, die1, die1]
            };
        } else {
            return {
                dice: [die1, die2],
                moves: [die1, die2]
            };
        }
    }

    // Calculate pip count for a player
    static calculatePipCount(board, bar, player) {
        let pipCount = 0;

        // Count checkers on bar
        pipCount += bar[player] * 25;

        // Count checkers on board
        for (let i = 0; i < 24; i++) {
            const pointCheckers = board[i].filter(checker => checker === player);
            const distance = player === 'white' ? 24 - i : i + 1;
            pipCount += pointCheckers.length * distance;
        }

        return pipCount;
    }

    // Check for win conditions
    static checkWinCondition(home, board, bar, player) {
        if (home[player] === 15) {
            const opponent = player === 'white' ? 'black' : 'white';

            // Check for backgammon (opponent has pieces on bar or in winner's home board)
            if (bar[opponent] > 0) {
                return { winner: player, type: 'backgammon' };
            }

            const opponentInWinnerHome = player === 'white'
                ? board.slice(0, 6).some(point => point.some(checker => checker === opponent))
                : board.slice(18, 24).some(point => point.some(checker => checker === opponent));

            if (opponentInWinnerHome) {
                return { winner: player, type: 'backgammon' };
            }

            // Check for gammon (opponent hasn't borne off any pieces)
            if (home[opponent] === 0) {
                return { winner: player, type: 'gammon' };
            }

            // Regular win
            return { winner: player, type: 'single' };
        }

        return null;
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = BackgammonRules;
}
