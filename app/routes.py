from flask import Blueprint, render_template, request, jsonify, session, redirect, url_for

main_bp = Blueprint('main', __name__)

# ---------------- HOME & AUTH ----------------

@main_bp.route("/")
def index():
    return render_template("index.html")  # Opening index.html by default

@main_bp.route("/login")
def login():
    return render_template("login.html")

@main_bp.route("/signup")
def signup():
    return render_template("signup.html")

# ---------------- SESSION ROLES ----------------
# old
# @main_bp.route("/set-role/<role>")
# def set_role(role):
#     if role in ["citizen", "admin"]:
#         session["role"] = role
#         return jsonify({"status": "success", "role": role})
#     return jsonify({"status": "error", "message": "Invalid role"}), 400

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

# @main_bp.route("/hazard-map")
# def hazard_map():
#     # Check if user is logged in (has a role)
#     if not session.get("role"):
#         return redirect(url_for("main.login"))
#     return render_template("hazard-map.html")

@main_bp.route("/hazard-map")
def hazard_map():
    return render_template("hazard-map.html")


# ---------------- DATA ENDPOINTS ----------------

@main_bp.route("/api/reports")
def get_reports():
    # In a real application, this would fetch from a database
    # For now, we'll serve the static JSON file
    import json
    import os
    
    try:
        # Path to your reports.json file
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
    # Check if user is logged in
    if not session.get("role"):
        return redirect(url_for("main.login"))
    
    # You can fetch current user from session / Firebase auth
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
    # Check if user is logged in and is an admin
    if session.get("role") != "admin":
        return redirect(url_for("main.login"))
    
    return render_template("admin_addOfficial.html")


# for analyst new 
@main_bp.route("/set-role/<role>")
def set_role(role):
    if role in ["citizen", "admin", "analyst"]:   # Added "analyst"
        session["role"] = role
        return jsonify({"status": "success", "role": role})
    return jsonify({"status": "error", "message": "Invalid role"}), 400


# for analyst 
@main_bp.route("/analyst/dashboard")
def analyst_dashboard():
    if session.get("role") != "analyst":
        return redirect(url_for("main.login"))
    return render_template("analyst_dashboard.html")

# report details 
# @main_bp.route("/analyst/reports-detail")
# def analyst_reports_detail():
#     if session.get("role") != "analyst":
#         return redirect(url_for("main.login"))
#     return render_template("analyst_reportsdetail.html")

# Report details page for analysts
@main_bp.route("/analyst/report-detail")
def analyst_report_detail():
    if session.get("role") != "analyst":
        return redirect(url_for("main.login"))
    
    # Get the report ID from the query parameters
    report_id = request.args.get('reportId')
    
    # Pass the report ID to the template
    return render_template("analyst_reportsdetail.html", report_id=report_id)


@main_bp.route('/hotspots')
def hotspots():
    return render_template('hotspots.html')

# new citizen_nearestReports.html 
@main_bp.route("/citizen/nearest-reports")
def citizen_nearest_reports():
    if session.get("role") != "citizen":
        return redirect(url_for("main.login"))
    return render_template("citizen_nearestReports.html")


# ---------------- ADMIN PROFILE ----------------
@main_bp.route("/admin/profile")
def admin_profile():
    # Only allow access if the user is an admin
    if session.get("role") != "admin":
        return redirect(url_for("main.login"))
    return render_template("admin_profile.html")
