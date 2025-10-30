from flask import Blueprint, render_template, request, jsonify, session, redirect, url_for
from datetime import datetime
import sqlite3
import os

main_bp = Blueprint('main', __name__)

# ---------------- HOME & AUTH ----------------

@main_bp.route("/")
def index():
    return render_template("index.html")

@main_bp.route("/login")
def login():
    return render_template("login.html")

@main_bp.route("/signup")
def signup():
    return render_template("signup.html")

# ---------------- EMERGENCY COMMUNICATION SYSTEM ----------------

@main_bp.route("/emergency-chat")
def emergency_chat():
    """Emergency chat interface - accessible to all roles"""
    return render_template("emergency_chat.html")

@main_bp.route("/emergency-dashboard")
def emergency_dashboard():
    """Emergency dashboard for rescuers/admins"""
    if session.get("role") not in ["admin", "analyst"]:
        return redirect(url_for("main.login"))
    return render_template("emergency_dashboard.html")

@main_bp.route("/admin/emergency-monitor")
def admin_emergency_monitor():
    """Admin emergency monitoring dashboard"""
    if session.get("role") != "admin":
        return redirect(url_for("main.login"))
    return render_template("admin_emergency_monitor.html")

@main_bp.route("/api/emergency/sos")
def get_emergency_sos():
    """API endpoint to get all SOS messages"""
    conn = sqlite3.connect('emergency_messages.db')
    c = conn.cursor()
    c.execute('''
        SELECT sender, msg, latitude, longitude, timestamp 
        FROM messages 
        WHERE type = 'sos' 
        ORDER BY timestamp DESC
    ''')
    sos_messages = []
    for row in c.fetchall():
        sos_messages.append({
            'sender': row[0],
            'message': row[1],
            'latitude': row[2],
            'longitude': row[3],
            'timestamp': row[4],
            'datetime': datetime.fromtimestamp(row[4]).strftime('%Y-%m-%d %H:%M:%S')
        })
    conn.close()
    return jsonify(sos_messages)

@main_bp.route("/api/emergency/messages")
def get_emergency_messages():
    """API endpoint to get all messages"""
    conn = sqlite3.connect('emergency_messages.db')
    c = conn.cursor()
    c.execute('''
        SELECT sender, msg, type, latitude, longitude, timestamp 
        FROM messages 
        ORDER BY timestamp DESC
        LIMIT 100
    ''')
    messages = []
    for row in c.fetchall():
        messages.append({
            'sender': row[0],
            'message': row[1],
            'type': row[2],
            'latitude': row[3],
            'longitude': row[4],
            'timestamp': row[5],
            'datetime': datetime.fromtimestamp(row[5]).strftime('%Y-%m-%d %H:%M:%S')
        })
    conn.close()
    return jsonify(messages)

# ---------------- SESSION ROLES ----------------

@main_bp.route("/set-role/<role>")
def set_role(role):
    if role in ["citizen", "admin", "analyst"]:
        session["role"] = role
        return jsonify({"status": "success", "role": role})
    return jsonify({"status": "error", "message": "Invalid role"}), 400

# ---------------- DASHBOARDS ----------------

@main_bp.route("/citizen/dashboard")
def citizen_dashboard():
    if session.get("role") != "citizen":
        return redirect(url_for("main.login"))
    return render_template("citizen_dashboard.html")

@main_bp.route("/admin/dashboard")
def admin_dashboard():
    if session.get("role") != "admin":
        return redirect(url_for("main.login"))
    return render_template("admin_dashboard.html")

# ---------------- HAZARD MAP ----------------

@main_bp.route("/hazard-map")
def hazard_map():
    return render_template("hazard-map.html")

# ---------------- DATA ENDPOINTS ----------------

@main_bp.route("/api/reports")
def get_reports():
    import json
    import os
    
    try:
        json_path = os.path.join(main_bp.root_path, 'static', 'data', 'reports.json')
        with open(json_path, 'r') as f:
            data = json.load(f)
        return jsonify(data)
    except FileNotFoundError:
        return jsonify({"error": "Reports data not found"}), 404
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# ---------------- LOGOUT ----------------

@main_bp.route("/logout")
def logout():
    session.clear()
    return redirect(url_for("main.login"))

# ---------------- USER PROFILE ----------------

@main_bp.route("/user_profile")
def user_profile():
    if not session.get("role"):
        return redirect(url_for("main.login"))
    return render_template("user_profile.html")

# ---------------- CITIZEN PROFILE ----------------

@main_bp.route("/citizen/profile")
def citizen_profile():
    if session.get("role") != "citizen":
        return redirect(url_for("main.login"))
    return render_template("citizen_profile.html")

@main_bp.route("/citizen/report")
def citizen_report():
    if session.get("role") != "citizen":
        return redirect(url_for("main.login"))
    return render_template("citizen_report.html")

# ---------------- ADMIN ADD OFFICIAL ----------------
@main_bp.route("/admin/add-official")
def admin_add_official():
    if session.get("role") != "admin":
        return redirect(url_for("main.login"))
    return render_template("admin_addOfficial.html")

# ---------------- ANALYST ROUTES ----------------

@main_bp.route("/analyst/dashboard")
def analyst_dashboard():
    if session.get("role") != "analyst":
        return redirect(url_for("main.login"))
    return render_template("analyst_dashboard.html")

@main_bp.route("/analyst/report-detail")
def analyst_report_detail():
    if session.get("role") != "analyst":
        return redirect(url_for("main.login"))
    report_id = request.args.get('reportId')
    return render_template("analyst_reportsdetail.html", report_id=report_id)

@main_bp.route('/hotspots')
def hotspots():
    return render_template('hotspots.html')

# ---------------- CITIZEN NEAREST REPORTS ----------------

@main_bp.route("/citizen/nearest-reports")
def citizen_nearest_reports():
    if session.get("role") != "citizen":
        return redirect(url_for("main.login"))
    return render_template("citizen_nearestReports.html")

# ---------------- ADMIN PROFILE ----------------
@main_bp.route("/admin/profile")
def admin_profile():
    if session.get("role") != "admin":
        return redirect(url_for("main.login"))
    return render_template("admin_profile.html")