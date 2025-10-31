from app import create_app
from flask_socketio import SocketIO, emit
from flask import request
import sqlite3
import time
from datetime import datetime
import socket

# Create app and socketio
app = create_app()
socketio = SocketIO(app, cors_allowed_origins="*")

# Initialize SQLite database for emergency messages
def init_emergency_db():
    conn = sqlite3.connect('emergency_messages.db')
    c = conn.cursor()
    c.execute('''
        CREATE TABLE IF NOT EXISTS messages (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            sender TEXT NOT NULL,
            msg TEXT,
            type TEXT DEFAULT 'chat',
            latitude REAL,
            longitude REAL,
            timestamp REAL NOT NULL
        )
    ''')
    conn.commit()
    conn.close()

init_emergency_db()

# Import routes after app creation to avoid circular imports
from app.routes import main_bp
app.register_blueprint(main_bp)

# SocketIO event handlers for emergency communication
@socketio.on('connect')
def handle_connect():
    print(f'Client connected: {request.sid} from {request.remote_addr}')
    emit('connected', {'message': 'Connected to emergency network'})

@socketio.on('disconnect')
def handle_disconnect():
    print(f'Client disconnected: {request.sid}')

@socketio.on('send_message')
def handle_message(data):
    print(f"Message received from {request.remote_addr}: {data}")
    
    # Store in database
    conn = sqlite3.connect('emergency_messages.db')
    c = conn.cursor()
    c.execute('''
        INSERT INTO messages (sender, msg, type, timestamp)
        VALUES (?, ?, 'chat', ?)
    ''', (data['sender'], data['message'], time.time()))
    conn.commit()
    conn.close()
    
    # Broadcast to all clients
    emit('new_message', {
        'sender': data['sender'],
        'message': data['message'],
        'timestamp': time.time(),
        'type': 'chat'
    }, broadcast=True)

@socketio.on('send_sos')
def handle_sos(data):
    print(f"SOS received from {data['sender']} at {request.remote_addr}: {data}")
    
    # Store in database
    conn = sqlite3.connect('emergency_messages.db')
    c = conn.cursor()
    c.execute('''
        INSERT INTO messages (sender, msg, type, latitude, longitude, timestamp)
        VALUES (?, ?, 'sos', ?, ?, ?)
    ''', (data['sender'], data.get('message', 'Emergency SOS'), data['latitude'], data['longitude'], time.time()))
    conn.commit()
    conn.close()
    
    # Broadcast to all clients
    emit('new_sos', {
        'sender': data['sender'],
        'message': data.get('message', 'Emergency SOS'),
        'latitude': data['latitude'],
        'longitude': data['longitude'],
        'timestamp': time.time(),
        'datetime': datetime.now().strftime('%Y-%m-%d %H:%M:%S')
    }, broadcast=True)

if __name__ == "__main__":
    your_ip = "10.69.31.30"  # Your actual IP address
    
    print("🚀 Starting ResQLink Emergency System...")
    print("")
    print("🌐 NETWORK ACCESS INFORMATION:")
    print("   ┌─────────────────────────────────────────────────┐")
    print("   │              YOUR SERVER IS READY!             │")
    print("   ├─────────────────────────────────────────────────┤")
    print(f"   │ 🔗 Your IP Address: {your_ip:<15}           │")
    print("   │                                                 │")
    print("   │ 📱 FOR YOUR FRIEND'S PHONE/COMPUTER:           │")
    print("   │    Open browser and go to:                      │")
    print(f"   │    http://{your_ip}:5000/emergency-chat        │")
    print("   │                                                 │")
    print("   │ 💻 FOR YOUR COMPUTER:                          │")
    print("   │    http://localhost:5000/emergency-chat         │")
    print("   └─────────────────────────────────────────────────┘")
    print("")
    print("📡 Real-time messaging is ACTIVE")
    print("🔒 Make sure both devices are on same Wi-Fi network")
    print("")
    print("💡 Testing Instructions:")
    print("   1. Keep this server running")
    print(f"   2. Tell your friend to visit: http://{your_ip}:5000/emergency-chat")
    print("   3. Both of you enter names and start chatting!")
    
    socketio.run(app, host='0.0.0.0', port=5000, debug=True)



# # for vercel 
# from app import create_app
# from flask import request, jsonify
# import sqlite3
# import time
# from datetime import datetime

# # Create Flask app
# app = create_app()

# # ====================================================
# # Initialize SQLite database for emergency messages
# # ====================================================
# def init_emergency_db():
#     conn = sqlite3.connect('emergency_messages.db')
#     c = conn.cursor()
#     c.execute('''
#         CREATE TABLE IF NOT EXISTS messages (
#             id INTEGER PRIMARY KEY AUTOINCREMENT,
#             sender TEXT NOT NULL,
#             msg TEXT,
#             type TEXT DEFAULT 'chat',
#             latitude REAL,
#             longitude REAL,
#             timestamp REAL NOT NULL
#         )
#     ''')
#     conn.commit()
#     conn.close()

# init_emergency_db()

# # ====================================================
# # Import Blueprints (your main routes)
# # ====================================================
# from app.routes import main_bp
# app.register_blueprint(main_bp)


# # ====================================================
# # REST API Endpoints (for fallback if WebSocket unavailable)
# # ====================================================

# @app.route("/api/send_message", methods=["POST"])
# def api_send_message():
#     data = request.get_json()
#     if not data or "sender" not in data or "message" not in data:
#         return jsonify({"error": "Invalid request"}), 400

#     conn = sqlite3.connect("emergency_messages.db")
#     c = conn.cursor()
#     c.execute('''
#         INSERT INTO messages (sender, msg, type, timestamp)
#         VALUES (?, ?, 'chat', ?)
#     ''', (data["sender"], data["message"], time.time()))
#     conn.commit()
#     conn.close()

#     return jsonify({
#         "status": "success",
#         "message": "Message stored successfully"
#     }), 200


# @app.route("/api/send_sos", methods=["POST"])
# def api_send_sos():
#     data = request.get_json()
#     if not data or "sender" not in data:
#         return jsonify({"error": "Invalid request"}), 400

#     conn = sqlite3.connect("emergency_messages.db")
#     c = conn.cursor()
#     c.execute('''
#         INSERT INTO messages (sender, msg, type, latitude, longitude, timestamp)
#         VALUES (?, ?, 'sos', ?, ?, ?)
#     ''', (
#         data["sender"],
#         data.get("message", "Emergency SOS"),
#         data.get("latitude"),
#         data.get("longitude"),
#         time.time()
#     ))
#     conn.commit()
#     conn.close()

#     return jsonify({
#         "status": "success",
#         "message": "SOS recorded successfully",
#         "datetime": datetime.now().strftime("%Y-%m-%d %H:%M:%S")
#     }), 200


# @app.route("/api/messages", methods=["GET"])
# def get_messages():
#     conn = sqlite3.connect("emergency_messages.db")
#     c = conn.cursor()
#     c.execute("SELECT sender, msg, type, timestamp FROM messages ORDER BY id DESC LIMIT 50")
#     rows = c.fetchall()
#     conn.close()

#     messages = [
#         {
#             "sender": r[0],
#             "message": r[1],
#             "type": r[2],
#             "timestamp": datetime.fromtimestamp(r[3]).strftime("%Y-%m-%d %H:%M:%S")
#         }
#         for r in rows
#     ]
#     return jsonify(messages)



# app = app