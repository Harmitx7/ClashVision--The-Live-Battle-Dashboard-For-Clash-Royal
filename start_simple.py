#!/usr/bin/env python3
"""
Simple startup script for Clash Royale Win Predictor AI
"""
import os
import sys
import subprocess
import time
import webbrowser
from pathlib import Path

def check_python_version():
    """Check if Python version is compatible"""
    if sys.version_info < (3, 9):
        print("❌ Python 3.9 or higher is required")
        sys.exit(1)
    print(f"✅ Python {sys.version_info.major}.{sys.version_info.minor} detected")

def check_basic_dependencies():
    """Check if basic dependencies are installed"""
    try:
        import fastapi
        import uvicorn
        import sqlalchemy
        print("✅ Core dependencies found")
        return True
    except ImportError as e:
        print(f"❌ Missing dependency: {e}")
        print("Please install basic dependencies first:")
        print("pip install fastapi uvicorn[standard] sqlalchemy alembic pydantic-settings python-dotenv httpx")
        return False

def check_environment():
    """Check if environment variables are set"""
    env_file = Path(".env")
    if not env_file.exists():
        print("❌ .env file not found")
        return False
    
    # Load environment variables
    from dotenv import load_dotenv
    load_dotenv()
    
    api_key = os.getenv("CLASH_ROYALE_API_KEY")
    if not api_key:
        print("❌ CLASH_ROYALE_API_KEY not set in .env file")
        return False
    
    print("✅ Environment variables configured")
    return True

def setup_database():
    """Set up database with migrations"""
    print("🗄️  Setting up database...")
    try:
        # Run migrations using python -m
        subprocess.run([sys.executable, "-m", "alembic", "upgrade", "head"], check=True)
        print("✅ Database migrations completed")
        return True
    except subprocess.CalledProcessError:
        print("⚠️  Database setup skipped (already exists)")
        return True
    except FileNotFoundError:
        print("⚠️  Alembic not found, database will be created automatically")
        return True

def start_backend():
    """Start the FastAPI backend"""
    print("🚀 Starting backend server...")
    
    # Start uvicorn server using python -m
    cmd = [
        sys.executable, "-m", "uvicorn",
        "app.main:app",
        "--host", "127.0.0.1",
        "--port", "8000",
        "--reload"
    ]
    
    return subprocess.Popen(cmd)

def wait_for_backend():
    """Wait for backend to be ready"""
    print("⏳ Waiting for backend to start...")
    
    for i in range(20):  # Wait up to 20 seconds
        try:
            import requests
            response = requests.get("http://127.0.0.1:8000/health", timeout=1)
            if response.status_code == 200:
                print("✅ Backend is ready!")
                return True
        except:
            pass
        
        time.sleep(1)
        print(f"   Attempt {i+1}/20...")
    
    print("❌ Backend failed to start")
    return False

def open_frontend():
    """Open the frontend in browser"""
    frontend_url = "http://127.0.0.1:8000/static/index.html"
    
    print(f"🌐 Opening frontend at {frontend_url}")
    webbrowser.open(frontend_url)

def main():
    """Main startup function"""
    print("🎮 Clash Royale Win Predictor AI - Simple Startup")
    print("=" * 55)
    
    # Check system requirements
    check_python_version()
    
    # Check dependencies
    if not check_basic_dependencies():
        sys.exit(1)
    
    # Check environment
    if not check_environment():
        print("\n📋 Setup Instructions:")
        print("1. Make sure your .env file exists with CLASH_ROYALE_API_KEY")
        print("2. Run this script again")
        sys.exit(1)
    
    # Setup database
    setup_database()
    
    # Start backend
    backend_process = start_backend()
    
    try:
        # Wait for backend to be ready
        if wait_for_backend():
            # Open frontend
            open_frontend()
            
            print("\n🎉 Application started successfully!")
            print("📊 Backend API: http://127.0.0.1:8000")
            print("🎮 Frontend: http://127.0.0.1:8000/static/index.html")
            print("📚 API Docs: http://127.0.0.1:8000/docs")
            print("\nPress Ctrl+C to stop the server")
            
            # Keep the script running
            backend_process.wait()
        else:
            backend_process.terminate()
            sys.exit(1)
            
    except KeyboardInterrupt:
        print("\n🛑 Shutting down...")
        backend_process.terminate()
        backend_process.wait()
        print("✅ Server stopped")

if __name__ == "__main__":
    main()
