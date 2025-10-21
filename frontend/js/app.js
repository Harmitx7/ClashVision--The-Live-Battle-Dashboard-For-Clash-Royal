// Main application logic
class ClashRoyaleApp {
    constructor() {
        this.apiBaseUrl = 'http://localhost:8000/api/v1';
        this.currentPlayer = null;
        this.predictionActive = false;
        this.websocket = null;
        
        this.init();
    }
    
    init() {
        this.bindEvents();
        this.initializeCharts();
        this.checkConnection();
    }
    
    bindEvents() {
        // Search player
        const searchBtn = document.getElementById('searchBtn');
        if (searchBtn) {
            searchBtn.addEventListener('click', () => {
                this.searchPlayer();
            });
        }
        
        // Enter key for search
        const playerInput = document.getElementById('playerTagInput');
        if (playerInput) {
            playerInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    this.searchPlayer();
                }
            });
        }
        
        // Start prediction
        const startPredictionBtn = document.getElementById('startPredictionBtn');
        if (startPredictionBtn) {
            startPredictionBtn.addEventListener('click', () => {
                this.togglePrediction();
            });
        }
        
        // Predict next match
        const predictNextMatchBtn = document.getElementById('predictNextMatchBtn');
        if (predictNextMatchBtn) {
            predictNextMatchBtn.addEventListener('click', () => {
                this.predictNextMatch();
            });
        }
        
        // Theme toggle (optional since it's not in the new UI)
        const themeToggle = document.getElementById('themeToggle');
        if (themeToggle) {
            themeToggle.addEventListener('click', () => {
                this.toggleTheme();
            });
        }
    }
    
    async searchPlayer() {
        const playerTag = document.getElementById('playerTagInput').value.trim();
        
        if (!playerTag) {
            this.showNotification('Please enter a player tag', 'error');
            return;
        }
        
        this.showLoading(true);
        
        try {
            // Clean player tag
            const cleanTag = playerTag.replace('#', '').toUpperCase();
            
            // Fetch player data
            const response = await fetch(`${this.apiBaseUrl}/players/${cleanTag}?refresh=true`);
            
            if (!response.ok) {
                throw new Error(`Player not found: ${response.status}`);
            }
            
            const playerData = await response.json();
            this.currentPlayer = playerData;
            
            // Update UI
            this.displayPlayerInfo(playerData);
            await this.loadPlayerBattles(cleanTag);
            await this.loadPlayerStats(cleanTag);
            
            // Enable prediction buttons
            document.getElementById('startPredictionBtn').disabled = false;
            document.getElementById('predictNextMatchBtn').disabled = false;
            
            this.showNotification('Player loaded successfully!', 'success');
            
        } catch (error) {
            console.error('Error searching player:', error);
            this.showNotification(`Error: ${error.message}`, 'error');
        } finally {
            this.showLoading(false);
        }
    }
    
    displayPlayerInfo(player) {
        const playerInfoDiv = document.getElementById('playerInfo');
        
        if (!playerInfoDiv) return;
        
        const winRate = (player.wins || 0) / Math.max(1, (player.wins || 0) + (player.losses || 0));
        
        let html = '<div class="space-y-3">';
        
        html += '<div class="flex items-center justify-between">' +
            '<span class="text-gray-500 dark:text-gray-400">Name:</span>' +
            '<span class="font-semibold text-gray-900 dark:text-white">' + (player.name || 'Unknown') + '</span>' +
        '</div>';
        
        html += '<div class="flex items-center justify-between">' +
            '<span class="text-gray-500 dark:text-gray-400">Tag:</span>' +
            '<span class="font-mono text-gray-900 dark:text-white">#' + (player.tag || 'Unknown') + '</span>' +
        '</div>';
        
        html += '<div class="flex items-center justify-between">' +
            '<span class="text-gray-500 dark:text-gray-400">Trophies:</span>' +
            '<span class="font-semibold text-orange-600 dark:text-orange-400">' + ((player.trophies || 0).toLocaleString()) + '</span>' +
        '</div>';
        
        html += '<div class="flex items-center justify-between">' +
            '<span class="text-gray-500 dark:text-gray-400">Best:</span>' +
            '<span class="font-semibold text-gray-900 dark:text-white">' + ((player.best_trophies || player.bestTrophies || 0).toLocaleString()) + '</span>' +
        '</div>';
        
        html += '<div class="flex items-center justify-between">' +
            '<span class="text-gray-500 dark:text-gray-400">Win Rate:</span>' +
            '<span class="font-semibold text-green-600 dark:text-green-400">' + (winRate * 100).toFixed(1) + '%</span>' +
        '</div>';
        
        html += '<div class="flex items-center justify-between">' +
            '<span class="text-gray-500 dark:text-gray-400">Level:</span>' +
            '<span class="font-semibold text-gray-900 dark:text-white">' + (player.exp_level || player.expLevel || 1) + '</span>' +
        '</div>';
        
        html += '<div class="flex items-center justify-between">' +
            '<span class="text-gray-500 dark:text-gray-400">Arena:</span>' +
            '<span class="font-semibold text-gray-900 dark:text-white">' + (player.arena_name || player.arena?.name || 'Unknown') + '</span>' +
        '</div>';
        
        html += '</div>';
        
        playerInfoDiv.innerHTML = html;
        
        // Refresh tilted cards after content update
        if (window.TiltedCards) {
            window.TiltedCards.refresh();
        }
        
        // Refresh animated scroll effects
        if (window.AnimatedScroll) {
            window.AnimatedScroll.refresh();
        }
        
        // Animate the update
        anime({
            targets: playerInfoDiv,
            opacity: [0, 1],
            translateY: [20, 0],
            duration: 500,
            easing: 'easeOutQuart'
        });
    }
    
    async loadPlayerBattles(playerTag) {
        try {
            console.log('Loading battles for player:', playerTag);
            const response = await fetch(`${this.apiBaseUrl}/players/${playerTag}/battles?limit=10`);
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            console.log('Battles data received:', data);
            
            // Handle different possible response formats
            let battles = data.battles || data.items || data || [];
            console.log('Battles to display:', battles);
            
            // If no real battles, generate some mock data for demo
            if (!battles || battles.length === 0) {
                battles = this.generateMockBattles();
                console.log('Generated mock battles:', battles);
            }
            
            this.displayRecentBattles(battles);
            
        } catch (error) {
            console.error('Error loading battles:', error);
            const battlesDiv = document.getElementById('recentBattles');
            if (battlesDiv) {
                battlesDiv.innerHTML = '<p class="text-red-500 dark:text-red-400">Error loading battles: ' + error.message + '</p>';
            }
        }
    }
    
    generateMockBattles() {
        const battleTypes = ['1v1', 'Tournament', 'Challenge', 'Ladder', 'Party Mode'];
        const battles = [];
        
        for (let i = 0; i < 5; i++) {
            const playerCrowns = Math.floor(Math.random() * 4); // 0-3 crowns
            const opponentCrowns = Math.floor(Math.random() * 4);
            
            // Ensure not all battles are draws
            const adjustedOpponentCrowns = playerCrowns === opponentCrowns && Math.random() > 0.3 
                ? (Math.random() > 0.5 ? playerCrowns + 1 : Math.max(0, playerCrowns - 1))
                : opponentCrowns;
            
            battles.push({
                player_crowns: playerCrowns,
                opponent_crowns: adjustedOpponentCrowns,
                type: battleTypes[Math.floor(Math.random() * battleTypes.length)],
                battle_time: new Date(Date.now() - (i + 1) * 3600000).toISOString() // Hours ago
            });
        }
        
        return battles;
    }
    
    displayRecentBattles(battles) {
        const battlesDiv = document.getElementById('recentBattles');
        
        if (!battlesDiv) return;
        
        if (!battles || !battles.length) {
            battlesDiv.innerHTML = '<p class="text-gray-500 dark:text-gray-400">No recent battles found</p>';
            return;
        }
        
        console.log('Processing battles:', battles);
        
        let battlesHtml = '';
        const app = this;
        
        battles.slice(0, 5).forEach(function(battle) {
            console.log('Processing battle:', battle);
            
            // Determine battle result based on different possible data structures
            let result = 'unknown';
            let playerCrowns = 0;
            let opponentCrowns = 0;
            
            // Handle different API response formats
            if (battle.team && battle.opponent) {
                // Standard Clash Royale API format
                playerCrowns = battle.team[0] ? (battle.team[0].crowns || 0) : 0;
                opponentCrowns = battle.opponent[0] ? (battle.opponent[0].crowns || 0) : 0;
            } else if (battle.player_crowns !== undefined && battle.opponent_crowns !== undefined) {
                // Custom format
                playerCrowns = battle.player_crowns || 0;
                opponentCrowns = battle.opponent_crowns || 0;
            } else if (battle.crowns !== undefined && battle.opponentCrowns !== undefined) {
                // Alternative format
                playerCrowns = battle.crowns || 0;
                opponentCrowns = battle.opponentCrowns || 0;
            }
            
            // Determine result
            if (playerCrowns > opponentCrowns) {
                result = 'victory';
            } else if (playerCrowns < opponentCrowns) {
                result = 'defeat';
            } else {
                result = 'draw';
            }
            
            let resultColor = 'text-gray-600 dark:text-gray-400';
            let bgColor = 'bg-gray-500';
            let displayResult = result;
            
            if (result === 'victory') {
                resultColor = 'text-green-600 dark:text-green-400';
                bgColor = 'bg-green-500';
                displayResult = 'WIN';
            } else if (result === 'defeat') {
                resultColor = 'text-red-600 dark:text-red-400';
                bgColor = 'bg-red-500';
                displayResult = 'LOSS';
            } else if (result === 'draw') {
                resultColor = 'text-orange-600 dark:text-orange-400';
                bgColor = 'bg-orange-500';
                displayResult = 'DRAW';
            }
            
            // Get battle type and time
            const battleType = battle.type || battle.gameMode || battle.mode || 'Battle';
            const battleTime = battle.battleTime || battle.battle_time || battle.time || new Date().toISOString();
            const formattedTime = app.formatBattleTime ? app.formatBattleTime(battleTime) : 'Recent';
            
            battlesHtml += 
                '<div class="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600 mb-2">' +
                    '<div class="flex items-center space-x-3">' +
                        '<div class="w-3 h-3 rounded-full ' + bgColor + '"></div>' +
                        '<div>' +
                            '<div class="font-semibold ' + resultColor + '">' + displayResult + '</div>' +
                            '<div class="text-sm text-gray-500 dark:text-gray-400">' + battleType + '</div>' +
                        '</div>' +
                    '</div>' +
                    '<div class="text-right">' +
                        '<div class="font-semibold text-gray-900 dark:text-white">' + playerCrowns + ' - ' + opponentCrowns + '</div>' +
                        '<div class="text-sm text-gray-500 dark:text-gray-400">' + formattedTime + '</div>' +
                    '</div>' +
                '</div>';
        });
        
        battlesDiv.innerHTML = battlesHtml;
        
        // Refresh tilted cards after content update
        if (window.TiltedCards) {
            window.TiltedCards.refresh();
        }
        
        // Refresh animated scroll effects
        if (window.AnimatedScroll) {
            window.AnimatedScroll.refresh();
        }
        
        // Animate battles
        anime({
            targets: '#recentBattles > div',
            opacity: [0, 1],
            translateX: [-30, 0],
            delay: anime.stagger(100),
            duration: 600,
            easing: 'easeOutQuart'
        });
    }
    
    determineBattleResult(battle) {
        const playerCrowns = battle.player_crowns || 0;
        const opponentCrowns = battle.opponent_crowns || 0;
        
        if (playerCrowns > opponentCrowns) return 'win';
        if (playerCrowns < opponentCrowns) return 'loss';
        return 'draw';
    }
    
    formatBattleTime(battleTime) {
        try {
            const date = new Date(battleTime);
            
            // Check if date is valid
            if (isNaN(date.getTime())) {
                return 'Unknown';
            }
            
            const now = new Date();
            const diffMs = now - date;
            const diffMins = Math.floor(diffMs / (1000 * 60));
            const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
            const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
            
            // Show relative time for recent battles
            if (diffMins < 1) {
                return 'Just now';
            } else if (diffMins < 60) {
                return diffMins + 'm ago';
            } else if (diffHours < 24) {
                return diffHours + 'h ago';
            } else if (diffDays < 7) {
                return diffDays + 'd ago';
            } else {
                // Show actual date for older battles
                return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
            }
        } catch (error) {
            console.error('Error formatting battle time:', error);
            return 'Unknown';
        }
    }
    
    async loadPlayerStats(playerTag) {
        try {
            const response = await fetch(`${this.apiBaseUrl}/players/${playerTag}/stats`);
            const stats = await response.json();
            
            this.displayPlayerStats(stats);
            
        } catch (error) {
            console.error('Error loading player stats:', error);
        }
    }
    
    displayPlayerStats(stats) {
        // Update influencing factors with null checks
        const deckSynergyElement = document.getElementById('deckSynergyScore');
        if (deckSynergyElement) {
            deckSynergyElement.textContent = stats.deck_mastery ? (stats.deck_mastery * 100).toFixed(0) + '%' : '--';
        }
        
        const elixirEfficiencyElement = document.getElementById('elixirEfficiencyScore');
        if (elixirEfficiencyElement) {
            elixirEfficiencyElement.textContent = stats.average_elixir_cost ? stats.average_elixir_cost.toFixed(1) : '--';
        }
        
        const skillScoreElement = document.getElementById('skillScore');
        if (skillScoreElement) {
            skillScoreElement.textContent = stats.skill_rating ? (stats.skill_rating * 100).toFixed(0) + '%' : '--';
        }
        
        const recentFormElement = document.getElementById('recentFormScore');
        if (recentFormElement) {
            recentFormElement.textContent = stats.win_rate ? (stats.win_rate * 100).toFixed(0) + '%' : '--';
        }
        
        const counterScoreElement = document.getElementById('counterScore');
        if (counterScoreElement) {
            counterScoreElement.textContent = stats.consistency_score ? (stats.consistency_score * 100).toFixed(0) + '%' : '--';
        }
        
        // Update player stats section
        const playerStatsDiv = document.getElementById('playerStats');
        if (playerStatsDiv && stats) {
            let html = '<div class="space-y-3">';
            
            html += '<div class="flex items-center justify-between">' +
                '<span class="text-gray-500 dark:text-gray-400">Battles:</span>' +
                '<span class="font-semibold text-gray-900 dark:text-white">' + (stats.total_battles || '--') + '</span>' +
            '</div>';
            
            html += '<div class="flex items-center justify-between">' +
                '<span class="text-gray-500 dark:text-gray-400">Win Rate:</span>' +
                '<span class="font-semibold text-green-600 dark:text-green-400">' + (stats.win_rate ? (stats.win_rate * 100).toFixed(1) + '%' : '--') + '</span>' +
            '</div>';
            
            html += '<div class="flex items-center justify-between">' +
                '<span class="text-gray-500 dark:text-gray-400">Avg Elixir:</span>' +
                '<span class="font-semibold text-purple-600 dark:text-purple-400">' + (stats.average_elixir_cost ? stats.average_elixir_cost.toFixed(1) : '--') + '</span>' +
            '</div>';
            
            html += '<div class="flex items-center justify-between">' +
                '<span class="text-gray-500 dark:text-gray-400">Skill Rating:</span>' +
                '<span class="font-semibold text-blue-600 dark:text-blue-400">' + (stats.skill_rating ? (stats.skill_rating * 100).toFixed(0) + '%' : '--') + '</span>' +
            '</div>';
            
            html += '</div>';
            
            playerStatsDiv.innerHTML = html;
            
            // Refresh tilted cards after content update
            if (window.TiltedCards) {
                window.TiltedCards.refresh();
            }
            
            // Refresh animated scroll effects
            if (window.AnimatedScroll) {
                window.AnimatedScroll.refresh();
            }
        }
    }
    
    async togglePrediction() {
        if (!this.currentPlayer) {
            this.showNotification('Please search for a player first', 'error');
            return;
        }
        
        const button = document.getElementById('startPredictionBtn');
        
        if (!this.predictionActive) {
            // Start prediction
            this.predictionActive = true;
            button.textContent = 'Stop Prediction';
            button.className = 'bg-clash-red hover:bg-red-600 px-6 py-3 rounded-lg text-white font-semibold transition-colors';
            
            await this.startLivePrediction();
        } else {
            // Stop prediction
            this.predictionActive = false;
            button.textContent = 'Start Live Prediction';
            button.className = 'bg-clash-green hover:bg-green-600 px-6 py-3 rounded-lg text-white font-semibold transition-colors';
            
            this.stopLivePrediction();
        }
    }
    
    async startLivePrediction() {
        try {
            // Initialize WebSocket connection
            this.websocket = new WebSocket(`ws://localhost:8000/ws/predictions/${this.currentPlayer.tag}`);
            
            this.websocket.onopen = () => {
                this.updateConnectionStatus(true);
                this.showNotification('Live prediction started!', 'success');
            };
            
            this.websocket.onmessage = (event) => {
                const data = JSON.parse(event.data);
                this.handlePredictionUpdate(data);
            };
            
            this.websocket.onclose = () => {
                this.updateConnectionStatus(false);
                if (this.predictionActive) {
                    this.showNotification('Connection lost. Retrying...', 'warning');
                    // Auto-retry connection
                    setTimeout(() => {
                        if (this.predictionActive) {
                            this.startLivePrediction();
                        }
                    }, 3000);
                }
            };
            
            this.websocket.onerror = (error) => {
                console.error('WebSocket error:', error);
                this.showNotification('Connection error', 'error');
            };
            
            // Start simulation for demo purposes
            this.startPredictionSimulation();
            
        } catch (error) {
            console.error('Error starting prediction:', error);
            this.showNotification('Failed to start prediction', 'error');
        }
    }
    
    stopLivePrediction() {
        if (this.websocket) {
            this.websocket.close();
            this.websocket = null;
        }
        
        this.updateConnectionStatus(false);
        this.clearPredictionData();
        this.showNotification('Live prediction stopped', 'info');
    }
    
    startPredictionSimulation() {
        // Simulate live predictions for demo
        let simulationStep = 0;
        
        const simulate = () => {
            if (!this.predictionActive) return;
            
            simulationStep++;
            
            // Generate simulated prediction data
            const baseWinProb = 0.5 + (Math.sin(simulationStep * 0.1) * 0.3);
            const winProbability = Math.max(0.1, Math.min(0.9, baseWinProb + (Math.random() - 0.5) * 0.2));
            const confidence = 0.6 + Math.random() * 0.3;
            
            const predictionData = {
                type: 'prediction_update',
                prediction: {
                    win_probability: winProbability,
                    confidence: confidence,
                    influencing_factors: {
                        deck_synergy: Math.random(),
                        elixir_efficiency: Math.random(),
                        opponent_counter: Math.random(),
                        player_skill: Math.random(),
                        recent_performance: Math.random()
                    },
                    recommendations: this.generateRandomRecommendations()
                }
            };
            
            this.handlePredictionUpdate(predictionData);
            
            // Continue simulation
            setTimeout(simulate, 2000 + Math.random() * 3000);
        };
        
        simulate();
    }
    
    generateRandomRecommendations() {
        const recommendations = [
            "Focus on positive elixir trades",
            "Defend and counter-attack",
            "Build a strong push",
            "Maintain constant pressure",
            "Play defensively",
            "Look for spell value",
            "Cycle to your win condition",
            "Protect your towers"
        ];
        
        const count = Math.floor(Math.random() * 3) + 1;
        const selected = [];
        
        for (let i = 0; i < count; i++) {
            const index = Math.floor(Math.random() * recommendations.length);
            if (!selected.includes(recommendations[index])) {
                selected.push(recommendations[index]);
            }
        }
        
        return selected;
    }
    
    handlePredictionUpdate(data) {
        if (data.type === 'prediction_update' && data.prediction) {
            const prediction = data.prediction;
            
            // Update win probability gauge
            this.updateWinProbability(prediction.win_probability, prediction.confidence);
            
            // Update influencing factors
            if (prediction.influencing_factors) {
                this.updateInfluencingFactors(prediction.influencing_factors);
            }
            
            // Update recommendations
            if (prediction.recommendations) {
                this.updateRecommendations(prediction.recommendations);
            }
            
            // Update live chart
            this.updateWinProbability(prediction.win_probability, prediction.confidence);
            
            // Update battle status
            this.updateBattleStatus(prediction);
        }
    }
    
    updateWinProbability(probability, confidence) {
        const percentage = Math.round(probability * 100);
        
        // Update text
        const winProbElement = document.getElementById('winProbability');
        const confidenceElement = document.getElementById('confidence');
        
        if (winProbElement) {
            winProbElement.textContent = percentage + '%';
        }
        
        if (confidenceElement) {
            confidenceElement.textContent = `${Math.round(confidence * 100)}%`;
        }
        
        // Update live chart
        this.updateLiveChart(probability);
        
        // Animate the update
        anime({
            targets: '#winProbability',
            scale: [1.2, 1],
            duration: 300,
            easing: 'easeOutBack'
        });
    }
    
    updateInfluencingFactors(factors) {
        const factorElements = {
            deck_synergy: 'deckSynergyScore',
            elixir_efficiency: 'elixirEfficiencyScore',
            opponent_counter: 'counterScore',
            player_skill: 'skillScore',
            recent_performance: 'recentFormScore'
        };
        
        Object.entries(factors).forEach(([key, value]) => {
            const elementId = factorElements[key];
            if (elementId) {
                const element = document.getElementById(elementId);
                if (element) {
                    element.textContent = Math.round(value * 100) + '%';
                    
                    // Add color based on value
                    element.className = `text-lg font-bold ${
                        value > 0.7 ? 'text-clash-green' :
                        value > 0.4 ? 'text-clash-orange' : 'text-clash-red'
                    }`;
                }
            }
        });
    }
    
    updateRecommendations(recommendations) {
        const recommendationsDiv = document.getElementById('recommendations');
        
        const html = recommendations.map((rec, index) => `
            <div class="flex items-start space-x-3 p-3 bg-white/10 rounded-lg card-animation">
                <div class="w-6 h-6 bg-clash-orange rounded-full flex items-center justify-center text-white text-sm font-bold">
                    ${index + 1}
                </div>
                <p class="text-white flex-1">${rec}</p>
            </div>
        `).join('');
        
        recommendationsDiv.innerHTML = html;
        
        // Animate recommendations
        anime({
            targets: '#recommendations > div',
            opacity: [0, 1],
            translateY: [20, 0],
            delay: anime.stagger(100),
            duration: 500,
            easing: 'easeOutQuart'
        });
    }
    
    updateBattleStatus(prediction) {
        const battleStatusDiv = document.getElementById('battleStatus');
        const battlePhaseElement = document.getElementById('battlePhase');
        
        // Simulate battle state
        const battlePhases = ['Early Game', 'Mid Game', 'Late Game', 'Overtime'];
        const currentPhase = battlePhases[Math.floor(Math.random() * battlePhases.length)];
        
        // Update battle phase in the live prediction section
        if (battlePhaseElement) {
            battlePhaseElement.textContent = currentPhase;
        }
        
        // Update battle status div if it exists
        if (battleStatusDiv) {
            const progressWidth = Math.random() * 100;
            battleStatusDiv.innerHTML = 
                '<div class="space-y-3">' +
                    '<div class="flex items-center justify-between">' +
                        '<span class="text-gray-500">Phase:</span>' +
                        '<span class="font-semibold text-orange-500">' + currentPhase + '</span>' +
                    '</div>' +
                    '<div class="flex items-center justify-between">' +
                        '<span class="text-gray-500">Your Towers:</span>' +
                        '<span class="font-semibold text-green-500">3</span>' +
                    '</div>' +
                    '<div class="flex items-center justify-between">' +
                        '<span class="text-gray-500">Enemy Towers:</span>' +
                        '<span class="font-semibold text-red-500">3</span>' +
                    '</div>' +
                '</div>';
        }
    }
    
    updateConnectionStatus(connected) {
        const statusElement = document.getElementById('connectionStatus');
        
        if (statusElement) {
            if (connected) {
                statusElement.innerHTML = '<div class="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse"></div>Connected';
            } else {
                statusElement.innerHTML = '<div class="w-2 h-2 bg-red-500 rounded-full mr-2"></div>Disconnected';
            }
        }
    }
    
    clearPredictionData() {
        const winProbElement = document.getElementById('winProbability');
        const confidenceElement = document.getElementById('confidence');
        
        if (winProbElement) {
            winProbElement.textContent = '--';
        }
        
        if (confidenceElement) {
            confidenceElement.textContent = '--';
        }
        
        // Reset influencing factors
        ['deckSynergyScore', 'elixirEfficiencyScore', 'counterScore', 'skillScore', 'recentFormScore'].forEach(id => {
            const element = document.getElementById(id);
            if (element) {
                element.textContent = '--';
                element.className = 'text-lg font-bold text-gray-900 dark:text-white';
            }
        });
        
        // Clear recommendations
        const recommendationsElement = document.getElementById('recommendations');
        if (recommendationsElement) {
            recommendationsElement.innerHTML = '<p class="text-gray-500 dark:text-gray-400">Start a prediction to see AI recommendations</p>';
        }
        
        // Clear battle status
        const battleStatusElement = document.getElementById('battleStatus');
        if (battleStatusElement) {
            battleStatusElement.innerHTML = 
                '<div class="flex items-center justify-center h-32">' +
                    '<p class="text-gray-500 dark:text-gray-400">No active battle</p>' +
                '</div>';
        }
    }
    
    initializeCharts() {
        // Initialize live prediction chart
        const chartCanvas = document.getElementById('liveChart');
        if (chartCanvas) {
            const ctx = chartCanvas.getContext('2d');
            
            this.liveChart = new Chart(ctx, {
                type: 'line',
                data: {
                    labels: [],
                    datasets: [{
                        label: 'Win Probability',
                        data: [],
                        borderColor: '#10b981',
                        backgroundColor: 'rgba(16, 185, 129, 0.1)',
                        borderWidth: 3,
                        fill: true,
                        tension: 0.4
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            display: false
                        }
                    },
                    scales: {
                        y: {
                            beginAtZero: true,
                            max: 100,
                            grid: {
                                color: 'rgba(156, 163, 175, 0.2)'
                            },
                            ticks: {
                                color: '#6b7280',
                                callback: function(value) {
                                    return value + '%';
                                }
                            }
                        },
                        x: {
                            grid: {
                                color: 'rgba(156, 163, 175, 0.2)'
                            },
                            ticks: {
                                color: '#6b7280'
                            }
                        }
                    },
                    elements: {
                        point: {
                            radius: 4,
                            hoverRadius: 6
                        }
                    }
                }
            });
        }
    }
    
    updateLiveChart(winProbability) {
        if (this.liveChart && winProbability !== undefined) {
            const now = new Date().toLocaleTimeString();
            const percentage = Math.round(winProbability * 100);
            
            // Add new data point
            this.liveChart.data.labels.push(now);
            this.liveChart.data.datasets[0].data.push(percentage);
            
            // Keep only last 10 data points
            if (this.liveChart.data.labels.length > 10) {
                this.liveChart.data.labels.shift();
                this.liveChart.data.datasets[0].data.shift();
            }
            
            // Update the chart
            this.liveChart.update('none');
        }
    }
    
    checkConnection() {
        // Check if backend is running
        fetch(`${this.apiBaseUrl.replace('/api/v1', '')}/health`)
            .then(response => response.json())
            .then(data => {
                if (data.status === 'healthy') {
                    this.showNotification('Connected to server', 'success');
                }
            })
            .catch(() => {
                this.showNotification('Server not available. Please start the backend.', 'warning');
            });
    }
    
    toggleTheme() {
        // Theme toggle functionality
        const body = document.body;
        const themeToggle = document.getElementById('themeToggle');
        
        if (body.classList.contains('dark-theme')) {
            body.classList.remove('dark-theme');
            themeToggle.textContent = '🌙';
        } else {
            body.classList.add('dark-theme');
            themeToggle.textContent = '☀️';
        }
    }
    
    showLoading(show) {
        const overlay = document.getElementById('loadingOverlay');
        if (show) {
            overlay.classList.remove('hidden');
            overlay.classList.add('flex');
        } else {
            overlay.classList.add('hidden');
            overlay.classList.remove('flex');
        }
    }
    
    async predictNextMatch() {
        if (!this.currentPlayer) {
            this.showNotification('Please search for a player first', 'error');
            return;
        }
        
        this.showLoading(true);
        
        try {
            const response = await fetch(`${this.apiBaseUrl}/match/${this.currentPlayer.tag}/predict-next-match`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({})
            });
            
            if (!response.ok) {
                throw new Error(`Failed to predict match: ${response.status}`);
            }
            
            const prediction = await response.json();
            this.displayMatchPrediction(prediction);
            
            this.showNotification('Next match predicted!', 'success');
            
        } catch (error) {
            console.error('Error predicting match:', error);
            this.showNotification(`Error: ${error.message}`, 'error');
        } finally {
            this.showLoading(false);
        }
    }
    
    displayMatchPrediction(prediction) {
        // Show the section
        document.getElementById('nextMatchSection').style.display = 'block';
        
        const pred = prediction.prediction;
        const analysis = prediction.analysis;
        
        // Update prediction result
        const resultElement = document.getElementById('matchPredictionResult');
        const textElement = document.getElementById('matchPredictionText');
        
        if (pred.will_win) {
            resultElement.textContent = '🏆 WIN';
            resultElement.className = 'text-4xl font-bold mb-2 text-clash-green';
        } else {
            resultElement.textContent = '💔 LOSE';
            resultElement.className = 'text-4xl font-bold mb-2 text-clash-red';
        }
        
        textElement.textContent = pred.prediction_text;
        
        // Update stats with progress bars
        const winProbPercent = Math.round(pred.win_probability * 100);
        const confidencePercent = Math.round(pred.confidence * 100);
        const formPercent = Math.round(analysis.form_rating * 100);
        
        const matchWinProbElement = document.getElementById('matchWinProb');
        const matchConfidenceElement = document.getElementById('matchConfidence');
        const currentFormElement = document.getElementById('currentForm');
        
        if (matchWinProbElement) matchWinProbElement.textContent = winProbPercent + '%';
        if (matchConfidenceElement) matchConfidenceElement.textContent = confidencePercent + '%';
        if (currentFormElement) currentFormElement.textContent = formPercent + '%';
        
        // Animate progress bars
        setTimeout(function() {
            const winProbBar = document.getElementById('matchWinProbBar');
            const confidenceBar = document.getElementById('matchConfidenceBar');
            const formBar = document.getElementById('currentFormBar');
            
            if (winProbBar) winProbBar.style.width = winProbPercent + '%';
            if (confidenceBar) confidenceBar.style.width = confidencePercent + '%';
            if (formBar) formBar.style.width = formPercent + '%';
        }, 500);
        
        // Update recommendations
        const recommendationsDiv = document.getElementById('matchRecommendations');
        if (recommendationsDiv && prediction.recommendations) {
            let html = '';
            prediction.recommendations.forEach(function(rec, index) {
                const delay = index * 0.1;
                html += '<div class="bg-white/10 rounded-lg p-3 mb-2" style="animation-delay: ' + delay + 's">' +
                    '<div class="flex items-start space-x-3">' +
                        '<div class="w-8 h-8 bg-gradient-to-br from-orange-400 to-red-500 rounded-full flex items-center justify-center flex-shrink-0">' +
                            '<span class="text-white text-sm font-bold">' + (index + 1) + '</span>' +
                        '</div>' +
                        '<p class="text-gray-900 dark:text-white text-sm font-medium leading-relaxed">' + rec + '</p>' +
                    '</div>' +
                '</div>';
            });
            recommendationsDiv.innerHTML = html;
        }
        
        // Animate the section
        anime({
            targets: '#nextMatchSection',
            opacity: [0, 1],
            translateY: [20, 0],
            duration: 800,
            easing: 'easeOutQuart'
        });
        
        // Animate the result
        anime({
            targets: '#matchPredictionResult',
            scale: [0, 1.2, 1],
            duration: 1000,
            easing: 'easeOutElastic(1, .8)'
        });
    }
    
    showNotification(message, type) {
        if (!type) type = 'info';
        
        // Create notification element
        const notification = document.createElement('div');
        let bgClass = 'bg-blue-500';
        if (type === 'success') bgClass = 'bg-green-500';
        else if (type === 'error') bgClass = 'bg-red-500';
        else if (type === 'warning') bgClass = 'bg-orange-500';
        
        notification.className = 'fixed top-4 right-4 p-4 rounded-lg text-white z-50 ' + bgClass;
        notification.textContent = message;
        
        document.body.appendChild(notification);
        
        // Animate in
        anime({
            targets: notification,
            translateX: [300, 0],
            opacity: [0, 1],
            duration: 300,
            easing: 'easeOutQuart'
        });
        
        // Remove after delay
        setTimeout(() => {
            anime({
                targets: notification,
                translateX: [0, 300],
                opacity: [1, 0],
                duration: 300,
                easing: 'easeInQuart',
                complete: () => {
                    document.body.removeChild(notification);
                }
            });
        }, 4000);
    }
}

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.app = new ClashRoyaleApp();
});
