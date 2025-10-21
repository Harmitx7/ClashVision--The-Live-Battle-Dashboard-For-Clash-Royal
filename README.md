# Clash Royale Win Predictor AI

A real-time AI system that predicts and visualizes the probability of winning Clash Royale matches using live player, clan, and battle data.

## Features

- **Real-time Win Prediction**: AI-powered predictions using Transformer-LSTM hybrid model
- **Live Data Visualization**: Interactive charts and animations showing match progress
- **Comprehensive Analytics**: Player stats, deck analysis, and performance tracking
- **WebSocket Integration**: Real-time updates without page refresh
- **Clash Royale API Integration**: Live data from official API
- **Modern UI**: Responsive design with Clash Royale theming

## Architecture

### Frontend
- HTML5, TailwindCSS, JavaScript
- Chart.js for data visualization
- Anime.js for smooth animations
- Socket.IO for real-time communication

### Backend
- FastAPI with WebSocket support
- PostgreSQL database
- Redis for caching
- TensorFlow for ML model
- Clash Royale API integration

### Machine Learning
- Hybrid Transformer-LSTM model
- Real-time prediction updates
- Self-learning capabilities
- Feature engineering from battle data

## Quick Start

### Prerequisites
- Python 3.9+
- PostgreSQL
- Redis
- Clash Royale API key

### Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

3. Set up environment variables:
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

4. Initialize the database:
   ```bash
   alembic upgrade head
   ```

5. Start the backend:
   ```bash
   uvicorn app.main:app --reload
   ```

6. Open `frontend/index.html` in your browser

## API Endpoints

### REST API
- `GET /api/v1/players/{player_tag}` - Get player information
- `GET /api/v1/predictions/{player_tag}` - Get win predictions
- `POST /api/v1/battles/analyze` - Analyze battle data

### WebSocket
- `/ws/predictions` - Real-time prediction updates
- `/ws/battles` - Live battle monitoring

## Configuration

See `.env.example` for all configuration options.

## Development

### Project Structure
```
├── app/                 # Backend application
│   ├── api/            # API routes
│   ├── core/           # Core configuration
│   ├── models/         # Database models
│   ├── services/       # Business logic
│   └── ml/             # Machine learning components
├── frontend/           # Frontend application
├── migrations/         # Database migrations
└── tests/             # Test suite
```

### Running Tests
```bash
pytest tests/
```

## Deployment

- Frontend: Vercel
- Backend: Railway/Render
- Database: Neon PostgreSQL
- Monitoring: Prometheus + Grafana

## License

MIT License
