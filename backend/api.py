import os
import psycopg2
import psycopg2.extras
from psycopg2.errors import UniqueViolation
from functools import wraps
from dotenv import load_dotenv
from flask import Flask, request, jsonify
from flask_cors import CORS
from flask_jwt_extended import (
  JWTManager, jwt_required, create_access_token, 
  create_refresh_token, get_jwt_identity, decode_token
)
from werkzeug.security import generate_password_hash, check_password_hash
from flask_mail import Mail
from flask import render_template
import datetime
from email.message import EmailMessage
import ssl
import smtplib

load_dotenv()  # loads variables from .env file into environment

api = Flask(__name__)
api.config["JWT_SECRET_KEY"] = "padel-secret"

CORS(
  api,
  origins=['*'],
  methods=['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  supports_credentials=True
)
jwt = JWTManager(api)
mail = Mail(api)
url = os.environ.get("DATABATE_URL")
conn = psycopg2.connect(url) 

def admin_required(f):
  @wraps(f)
  def decorated_function(*args, **kwargs):
    user_id = get_jwt_identity()
    user_role = get_user_role(user_id)
    
    if user_role == 'regular':
      return jsonify({"error": "Admin role required"}), 403
    
    return f(*args, **kwargs)
  return decorated_function

def get_user_role(user_id):
  db_cur = conn.cursor(cursor_factory=psycopg2.extras.DictCursor)
  db_cur.execute("SELECT role FROM client WHERE id = %s;", (user_id,))
  user = db_cur.fetchone()
  db_cur.close()
  return user['role'] if user else None

@api.route("/")
def hello_world():
  return "<p>Hello, World!</p>"


# clients
@api.route("/client/register", methods=["POST"])
def register_user():
  data = request.json['data']
  db_cur = conn.cursor(cursor_factory=psycopg2.extras.DictCursor)
  
  try:
    db_cur.execute("SELECT * FROM client WHERE email = %s;", (data["email"],))
    user = db_cur.fetchone()

    if user:
      db_cur.close()
      return jsonify({"error": "User already exists"}), 400
    else: 
      db_cur.execute("INSERT INTO client (first_name, last_name, password, email, phone_number, nif, role) VALUES (%s, %s, %s, %s, %s, %s, %s);", (data["first_name"], data["last_name"], generate_password_hash(data["password"],"pbkdf2"), data["email"], data["phone_number"], data["nif"], data["role"],))
      conn.commit()

      db_cur.execute("SELECT * FROM client WHERE email = %s;", (data["email"],))
      user = db_cur.fetchone()
      access_token = create_access_token(identity=user[0], additional_claims={"role": user[6]})
      refresh_token = create_refresh_token(identity=user[0], additional_claims={"role": user[6]})
      db_cur.close()

      return jsonify({"access_token": access_token, "refresh_token": refresh_token}), 201
  except Exception as e:
    conn.rollback()
    db_cur.close()
    return jsonify({"error": str(e)}), 500

@api.route("/client/login", methods=["POST"])
def login_user():
  data = request.json['data']
  db_cur = conn.cursor(cursor_factory=psycopg2.extras.DictCursor)
  
  try:
    db_cur.execute("SELECT * FROM client WHERE email = %s;", (data["email"],))
    user = db_cur.fetchone()

    if not user:
      db_cur.close()
      return jsonify({"error": "User not found"}), 404
    else:
      if check_password_hash(user["password"], data["password"]):
        access_token = create_access_token(identity=user["id"], additional_claims={"role": user["role"]})
        refresh_token = create_refresh_token(identity=user["id"], additional_claims={"role": user["role"]})
        db_cur.close()
        return jsonify({"access_token": access_token, "refresh_token": refresh_token}), 200
      else:
        db_cur.close()
        return jsonify({"error": "Invalid credentials"}), 401
  except Exception as e:
    conn.rollback()
    db_cur.close()
    return jsonify({"error": str(e)}), 500

@api.route("/client/recover-password", methods=["POST"])
def recover_password():
  url =  "http://localhost:5173/client/reset/"
  data = request.json['data']
  db_cur = conn.cursor(cursor_factory=psycopg2.extras.DictCursor)
  
  try:
    email = data["email"]
    if not email:
      return jsonify({"error": "Email is required"}), 400

    db_cur.execute("SELECT * FROM client WHERE email = %s;", (data["email"],))
    user = db_cur.fetchone()
    if not user:
      db_cur.close()
      return jsonify({"error": "User not found"}), 404

    expires = datetime.timedelta(hours=24)
    reset_token = create_access_token(user["id"], expires_delta=expires)

    # substitutes the "." in the token for a "%" to avoid problems with the url
    reset_token = reset_token.replace(".", "+")

    email_sender = os.environ.get("EMAIL_USERNAME")
    email_password = os.environ.get("EMAIL_PASSWORD")

    subject = "Padle Time - Reset Password"
    text_body = "You requested to reset your password. Please click on the following link to reset it: " + url + reset_token
    html_body = "<p>You requested to reset your password. Please click on the following link to reset it: <a href='" + url + reset_token + "'>Reset Password</a></p>"
    msg = EmailMessage()
    msg.set_content(text_body)
    msg.add_alternative(html_body, subtype="html")
    msg["Subject"] = subject
    msg["From"] = email_sender
    msg["To"] = user["email"]

    context = ssl.create_default_context()
    
    with smtplib.SMTP_SSL("smtp.gmail.com", 465, context=context) as server:
      server.login(email_sender, email_password)
      server.sendmail(email_sender, user["email"], msg.as_string())
    
    db_cur.close()
    return jsonify({"reset_token": reset_token}), 200

  except Exception as e:
    conn.rollback()
    db_cur.close()
    return jsonify({"error": str(e)}), 500

@api.route("/client/reset-password", methods=["POST"])
def reset_password():
  data = request.json['data']
  db_cur = conn.cursor(cursor_factory=psycopg2.extras.DictCursor)
  
  try:
    reset_token = data["reset_token"]
    password = data["password"]

    if not reset_token or not password:
      return jsonify({"error": "Reset token and password are required"}), 400

    user_id = decode_token(reset_token)["sub"]
    db_cur.execute("SELECT * FROM client WHERE id = %s;", (user_id,))
    user = db_cur.fetchone()

    if not user:
      db_cur.close()
      return jsonify({"error": "User not found"}), 404
    
    db_cur.execute("UPDATE client SET password = %s WHERE id = %s;", (generate_password_hash(password,"pbkdf2"), user_id,))
    conn.commit()
    db_cur.close()
    return jsonify({"message": "Password updated"}), 200

  except Exception as e:
    conn.rollback()
    db_cur.close()
    return jsonify({"error": str(e)}), 500

@api.route("/client/password", methods=["PUT"])
@jwt_required()
def update_password():
  data = request.json['data']
  db_cur = conn.cursor(cursor_factory=psycopg2.extras.DictCursor)
  
  try:
    user_id = get_jwt_identity()
    db_cur.execute("SELECT * FROM client WHERE id = %s;", (user_id,))
    user = db_cur.fetchone()

    if not user:
      db_cur.close()
      return jsonify({"error": "User not found"}), 404
    else:
      if check_password_hash(user["password"], data["current_password"]):
        db_cur.execute("UPDATE client SET password = %s WHERE id = %s;", (generate_password_hash(data["password"],"pbkdf2"), user_id,))
        conn.commit()
        db_cur.close()
        return jsonify({"message": "Password updated"}), 200
      else:
        db_cur.close()
        return jsonify({"error": "Invalid credentials"}), 401

  except Exception as e:
    conn.rollback()
    db_cur.close()
    return jsonify({"error": str(e)}), 500

@api.route("/client/delete", methods=["POST"])
@jwt_required()
def delete_user():
  data = request.json['data']
  db_cur = conn.cursor(cursor_factory=psycopg2.extras.DictCursor)

  try:
    user_id = get_jwt_identity()
    db_cur.execute("SELECT * FROM client WHERE id = %s;", (user_id,))
    user = db_cur.fetchone()

    if not user:
      db_cur.close()
      return jsonify({"error": "User not found"}), 404
    else:
      if check_password_hash(user["password"], data["password"]):
        db_cur.execute("DELETE FROM client WHERE id = %s;", (user_id,))
        conn.commit()
        db_cur.close()
        return jsonify({"message": "User deleted"}), 200
      else:
        db_cur.close()
        return jsonify({"error": "Invalid credentials"}), 401

  except Exception as e:
    conn.rollback()
    db_cur.close()
    return jsonify({"error": str(e)}), 500

@api.route("/client/logout", methods=["POST"])
def logout_user():
  return jsonify({"message": "User logged out"}), 200

@api.route("/client/refresh", methods=["POST"])
@jwt_required()
def refresh_token():
  access_token = create_access_token(identity=request.json["id"], additional_claims={"role": request.json["role"]})
  refresh_token = create_refresh_token(identity=request.json["id"], additional_claims={"role": request.json["role"]})
  return jsonify({"access_token": access_token, "refresh_token": refresh_token}), 200

@api.route("/client", methods=["GET", "PUT"])
@jwt_required()
def get_client():
  user_id = get_jwt_identity()
  db_cur = conn.cursor(cursor_factory=psycopg2.extras.DictCursor)

  if request.method == "GET":
    db_cur.execute("SELECT * FROM client WHERE id = %s;", (user_id,))
    user = db_cur.fetchone()

    if user:
      db_cur.close()
      return jsonify({"user": {"first_name": user['first_name'], "last_name": user['last_name'], "email": user['email'], "phone_number": user['phone_number'], "nif": user['nif'], "role": user['role']}}), 200
    else:
      db_cur.close()
      return jsonify({"error": "User not found"}), 404

  if request.method == "PUT":
    db_cur.execute("SELECT * FROM client WHERE id = %s;", (user_id,))
    user = db_cur.fetchone()

    if user:
      data = request.json['data']
      db_cur.execute("UPDATE client SET first_name = %s, last_name = %s, email = %s, phone_number = %s WHERE id = %s;", (data["first_name"], data["last_name"], data["email"], data["phone_number"], user_id,))
      conn.commit()
      db_cur.close()
      return jsonify({"message": "User updated"}), 200
    else:
      db_cur.close()
      return jsonify({"error": "User not found"}), 404

@api.route("/clients", methods=["GET"])
@jwt_required()
def get_clients():
  user_id = get_jwt_identity()
  db_cur = conn.cursor(cursor_factory=psycopg2.extras.DictCursor)
  db_cur.execute("SELECT * FROM client WHERE id = %s;", (user_id,))
  user = db_cur.fetchone()

  if user:
    db_cur.execute("SELECT * FROM client;")
    users = db_cur.fetchall()
    db_cur.close()

    formated_users = []
    for user in users:
      formated_users.append({"first_name": user['first_name'], "last_name": user['last_name'], "email": user['email'], "phone_number": user['phone_number'], "nif": user['nif'], "role": user['role']})
    return jsonify(formated_users), 200
  else:
    db_cur.close()
    return jsonify({"error": "User not found"}), 404

@api.route("/client/admin", methods=["POST"])
@jwt_required()
@admin_required
def turn_client_into_admin():
  data = request.json['data']
  db_cur = conn.cursor(cursor_factory=psycopg2.extras.DictCursor)
  
  try:
    db_cur.execute("SELECT * FROM client WHERE email = %s;", (data["email"],))
    user = db_cur.fetchone()

    if not user:
      db_cur.close()
      return jsonify({"error": "User not found"}), 404
    else:
      db_cur.execute("SELECT change_role_to_admin({});".format((user["id"]),))
      db_cur.close()
      return jsonify({"message": "User turned into admin"}), 200
  except Exception as e:
    conn.rollback()
    db_cur.close()
    return jsonify({"error": str(e)}), 500

@api.route("/client/regular", methods=["POST"])
@jwt_required()
@admin_required
def turn_admin_into_client():
  data = request.json['data']
  db_cur = conn.cursor(cursor_factory=psycopg2.extras.DictCursor)
  
  try:
    db_cur.execute("SELECT * FROM client WHERE email = %s;", (data["email"],))
    user = db_cur.fetchone()

    if not user:
      db_cur.close()
      return jsonify({"error": "User not found"}), 404
    else:
      db_cur.execute("SELECT change_role_to_regular({});".format((user["id"]),))
      db_cur.close()
      return jsonify({"message": "Admin turned into regular"}), 200
  except Exception as e:
    conn.rollback()
    db_cur.close()
    return jsonify({"error": str(e)}), 500

@api.route("/client/delete", methods=["DELETE"])
@jwt_required()
def delete_client():
  user_id = get_jwt_identity()
  db_cur = conn.cursor(cursor_factory=psycopg2.extras.DictCursor)

  try:
    db_cur.execute("SELECT * FROM client WHERE id = %s;", (user_id,))
    user = db_cur.fetchone()

    if not user:
      db_cur.close()
      return jsonify({"error": "User not found"}), 404
    else:
      db_cur.execute("DELETE FROM client WHERE id = %s;", (user_id,))
      conn.commit()
      db_cur.close()
      return jsonify({"message": "User deleted"}), 200

  except Exception as e:
    conn.rollback()
    db_cur.close()
    return jsonify({"error": str(e)}), 500


# notifications
@api.route("/manual-notification/create", methods=["POST"])
@jwt_required()
@admin_required
def create_manual_notification():
  sender_user_id = get_jwt_identity()
  data = request.json['data']
  if "," in data["email"]:
    list_receivers_email = data["email"].replace(" ", "").split(",")
  else:
    list_receivers_email = [data["email"]]
  message = data["message"]
  db_cur = conn.cursor(cursor_factory=psycopg2.extras.DictCursor)

  for receiver_email in list_receivers_email:
    if receiver_email == "all.clients@gmail.com":
      try:
        db_cur.execute("SELECT * FROM client;")
        users = db_cur.fetchall()

        for user in users:
          if user["id"] != sender_user_id:
            db_cur.execute("INSERT INTO manual_notification (client_id, notification_client_id, notification_message, notification_is_read) VALUES (%s, %s, %s, %s);", (sender_user_id, user["id"], message, False,))
        conn.commit()
        return jsonify({"message": "Notification created"}), 201
      except Exception as e:
        conn.rollback()
        db_cur.close()
        return jsonify({"error": str(e)}), 500
    else:
      try:
        db_cur.execute("SELECT * FROM client WHERE email = %s;", (receiver_email,))
        user = db_cur.fetchone()

        if not user:
          db_cur.close()
          return jsonify({"error": "User not found"}), 404
        else:
          db_cur.execute("INSERT INTO manual_notification (client_id, notification_client_id, notification_message, notification_is_read) VALUES (%s, %s, %s, %s);", (sender_user_id, user["id"], message, False,))
          conn.commit()
          return jsonify({"message": "Notification created"}), 201
      except Exception as e:
        conn.rollback()
        db_cur.close()
        return jsonify({"error": str(e)}), 500

@api.route("/manual-notification", methods=["GET"])
@jwt_required()
def get_manual_notifications():
  user_id = get_jwt_identity()
  db_cur = conn.cursor(cursor_factory=psycopg2.extras.DictCursor)
  
  try:
    db_cur.execute("SELECT * FROM manual_notification WHERE notification_client_id = %s or client_id = %s;", (user_id, user_id,))
    notifications = db_cur.fetchall()

    formated_notifications = []
    for notification in notifications:
      # get the sender name
      db_cur.execute("SELECT * FROM client WHERE id = %s;", (notification['client_id'],))
      sender = db_cur.fetchone()

      # get the receiver name
      db_cur.execute("SELECT * FROM client WHERE id = %s;", (notification['notification_client_id'],))
      receiver = db_cur.fetchone()

      formated_notifications.append({"notification_id": notification['notification_id'], "sender": sender['first_name'] + " " + sender['last_name'], "sender_email": sender["email"], "receiver": receiver['first_name'] + " " + receiver['last_name'], "receiver_email": receiver["email"], "message": notification['notification_message'], "is_read": notification['notification_is_read']})
    db_cur.close()
    return jsonify(formated_notifications), 200
  except Exception as e:
    conn.rollback()
    db_cur.close()
    return jsonify({"error": str(e)}), 500

@api.route("/manual-notification/<int:notification_id>/read", methods=["PUT"])
@jwt_required()
def update_manual_notification(notification_id):
  user_id = get_jwt_identity()
  data = request.json['data']
  db_cur = conn.cursor(cursor_factory=psycopg2.extras.DictCursor)
  
  try:
    db_cur.execute("SELECT * FROM manual_notification WHERE notification_id = %s;", (notification_id,))
    notification = db_cur.fetchone()

    if not notification:
      db_cur.close()
      return jsonify({"error": "Notification not found"}), 404
    else:
      if user_id == notification["notification_client_id"]:
        db_cur.execute("UPDATE manual_notification SET notification_is_read = %s WHERE notification_id = %s;", (data["is_read"], notification_id,))
        conn.commit()
        db_cur.close()
        return jsonify({"message": "Notification updated"}), 200
      else:
        db_cur.close()
        return jsonify({"error": "Unauthorized"}), 403
  except Exception as e:
    conn.rollback()
    db_cur.close()
    return jsonify({"error": str(e)}), 500

@api.route("/automatic-notification", methods=["GET"])
@jwt_required()
def get_automatic_notifications():
  user_id = get_jwt_identity()
  db_cur = conn.cursor(cursor_factory=psycopg2.extras.DictCursor)
  
  try:
    db_cur.execute("SELECT * FROM automatic_notification WHERE notification_client_id = %s ORDER BY notification_id desc;", (user_id,))
    notifications = db_cur.fetchall()

    formated_notifications = []
    for notification in notifications:
      formated_notifications.append({"notification_id": notification['notification_id'], "message": notification['notification_message'], "is_read": notification['notification_is_read']})
    db_cur.close()
    return jsonify(formated_notifications), 200
  except Exception as e:
    conn.rollback()
    db_cur.close()
    return jsonify({"error": str(e)}), 500

@api.route("/automatic-notification/<int:notification_id>/read", methods=["PUT"])
@jwt_required()
def update_automatic_notification(notification_id):
  user_id = get_jwt_identity()
  data = request.json['data']
  db_cur = conn.cursor(cursor_factory=psycopg2.extras.DictCursor)
  
  try:
    db_cur.execute("SELECT * FROM automatic_notification WHERE notification_id = %s;", (notification_id,))
    notification = db_cur.fetchone()

    if not notification:
      db_cur.close()
      return jsonify({"error": "Notification not found"}), 404
    else:
      if user_id == notification["notification_client_id"]:
        db_cur.execute("UPDATE automatic_notification SET notification_is_read = %s WHERE notification_id = %s;", (data["is_read"], notification_id,))
        conn.commit()
        db_cur.close()
        return jsonify({"message": "Notification updated"}), 200
      else:
        db_cur.close()
        return jsonify({"error": "Unauthorized"}), 403
  except Exception as e:
    conn.rollback()
    db_cur.close()
    return jsonify({"error": str(e)}), 500


# fields
@api.route("/fields/create", methods=["POST"])
@jwt_required()
@admin_required
def create_field():
  data = request.json['data']
  db_cur = conn.cursor(cursor_factory=psycopg2.extras.DictCursor)
  
  try:
    db_cur.execute("INSERT INTO fields (name, available) VALUES (%s, %s);", (data["name"], data["available"],))
    conn.commit()
    db_cur.close()
    return jsonify({"message": "Field created"}), 201
  except Exception as e:
    conn.rollback()
    db_cur.close()
    return jsonify({"error": str(e)}), 500

@api.route("/fields", methods=["GET"])
@jwt_required()
def get_fields():
  db_cur = conn.cursor(cursor_factory=psycopg2.extras.DictCursor)

  try:
    db_cur.execute("SELECT * FROM fields;")
    fields = db_cur.fetchall()

    formated_fields = []
    for field in fields:
      formated_fields.append({"field_id": field['id'], "name": field['name'], "available": field['available']})
    db_cur.close()
    return jsonify(formated_fields), 200
  except Exception as e:
    conn.rollback()
    db_cur.close()
    return jsonify({"error": str(e)}), 500

@api.route("/fields/<int:field_id>", methods=["GET"])
@jwt_required()
def get_field(field_id):
  db_cur = conn.cursor(cursor_factory=psycopg2.extras.DictCursor)
  
  try:
    db_cur.execute("SELECT * FROM fields WHERE id = %s;", (field_id,))
    field = db_cur.fetchone()

    if field:
      db_cur.close()
      return jsonify({"field_id": field['id'], "name": field['name'], "available": field['available']}), 200
    else:
      db_cur.close()
      return jsonify({"error": "Field not found"}), 404
  except Exception as e:
    conn.rollback()
    db_cur.close()
    return jsonify({"error": str(e)}), 500
  
@api.route("/fields/<int:field_id>/update", methods=["PUT"])
@jwt_required()
@admin_required
def update_field(field_id):
  data = request.json['data']
  db_cur = conn.cursor(cursor_factory=psycopg2.extras.DictCursor)
  
  try:
    db_cur.execute("SELECT * FROM fields WHERE id = %s;", (field_id,))
    field = db_cur.fetchone()

    if not field:
      db_cur.close()
      return jsonify({"error": "Field not found"}), 404
    else:
      db_cur.execute("UPDATE fields SET name = %s, available = %s WHERE id = %s;", (data["name"], data["available"], field_id,))
      conn.commit()
      db_cur.close()
      return jsonify({"message": "Field updated"}), 200
  except Exception as e:
    conn.rollback()
    db_cur.close()
    return jsonify({"error": str(e)}), 500

@api.route("/fields/<int:field_id>/delete", methods=["DELETE"])
@jwt_required()
@admin_required
def delete_field(field_id):
  db_cur = conn.cursor(cursor_factory=psycopg2.extras.DictCursor)
  
  try:
    db_cur.execute("SELECT * FROM fields WHERE id = %s;", (field_id,))
    field = db_cur.fetchone()

    if not field:
      db_cur.close()
      return jsonify({"error": "Field not found"}), 404
    else:
      db_cur.execute("DELETE FROM fields WHERE id = %s;", (field_id,))
      conn.commit()
      db_cur.close()
      return jsonify({"message": "Field deleted"}), 200
  except Exception as e:
    conn.rollback()
    db_cur.close()
    return jsonify({"error": str(e)}), 500


# prices
@api.route("/prices/create", methods=["POST"])
@jwt_required()
@admin_required
def create_price():
  data = request.json['data']
  db_cur = conn.cursor(cursor_factory=psycopg2.extras.DictCursor)
  
  try:
    db_cur.execute("INSERT INTO price (price_value, price_type) VALUES (%s, %s);", (data["price_value"], data["price_type"],))
    conn.commit()
    db_cur.close()
    return jsonify({"message": "Price created"}), 201
  except Exception as e:
    conn.rollback()
    db_cur.close()
    return jsonify({"error": str(e)}), 500

@api.route("/prices", methods=["GET"])
@jwt_required()
def get_prices():
  db_cur = conn.cursor(cursor_factory=psycopg2.extras.DictCursor)

  try:
    db_cur.execute("SELECT * FROM price;")
    prices = db_cur.fetchall()

    formated_prices = []
    for price in prices:
      formated_prices.append({"price_id": price['id'], "price_value": price['price_value'], "price_type": price['price_type'], "start_time": price['start_time'], "is_active": price['is_active']})
    db_cur.close()
    return jsonify(formated_prices), 200
  except Exception as e:
    conn.rollback()
    db_cur.close()
    return jsonify({"error": str(e)}), 500

@api.route("/prices/active", methods=["GET"])
@jwt_required()
def get_active_prices():
  db_cur = conn.cursor(cursor_factory=psycopg2.extras.DictCursor)

  try:
    db_cur.execute("SELECT * FROM price WHERE is_active = %s;", (True,))
    prices = db_cur.fetchall()

    formated_prices = []
    for price in prices:
      formated_prices.append({"price_id": price['id'], "price_value": price['price_value'], "price_type": price['price_type']})
    db_cur.close()
    return jsonify(formated_prices), 200
  except Exception as e:
    conn.rollback()
    db_cur.close()
    return jsonify({"error": str(e)}), 500

@api.route("/prices/active/<string:date>", methods=["GET"])
@jwt_required()
def get_active_prices_by_date(date):
  db_cur = conn.cursor(cursor_factory=psycopg2.extras.DictCursor)

  try:
    # verifies if the date is a weekday or weekend
    date_obj = datetime.datetime.strptime(date, "%Y-%m-%d")
    if date_obj.weekday() < 5:
      price_type = "SEMANA"
    else:
      price_type = "FIM_SEMANA"
      
    db_cur.execute("SELECT * FROM price WHERE is_active = %s and price_type LIKE %s;", (True, price_type+'%',))
    prices = db_cur.fetchall()
    
    formated_prices = []
    for price in prices:
      formated_prices.append({"price_id": price['id'], "price_value": price['price_value'], "price_type": price['price_type']})
    db_cur.close()
    return jsonify(formated_prices), 200
  except Exception as e:
    conn.rollback()
    db_cur.close()
    return jsonify({"error": str(e)}), 500


# reservations
@api.route("/reservations/create", methods=["POST"])
@jwt_required()
def create_reservation():
  user_id = get_jwt_identity()
  data = request.json['data']
  db_cur = conn.cursor(cursor_factory=psycopg2.extras.DictCursor)

  try:
    db_cur.execute("SAVEPOINT inserted_reservation;")

    date_without_time = data["initial_time"].split(" ")[0]

    db_cur.execute(f"""
        INSERT INTO reservation (client_id, fields_id, price_id, initial_time, end_time)
        VALUES ({user_id}, {data["fields_id"]}, {data["price_id"]}, '{data["initial_time"]}', '{data["end_time"]}');
    """)

    db_cur.execute(f"""
        SELECT COUNT(*) FROM reservation
        WHERE TO_CHAR(initial_time, 'YYYY-MM-DD') = '{date_without_time}' AND client_id = {user_id} AND cancelled = false;
    """)
    reservation_count = db_cur.fetchone()[0]

    if reservation_count > 1:
        db_cur.execute("ROLLBACK TO inserted_reservation;")
        db_cur.close()
        return jsonify({"error": "You already make a reservation for today!"}), 400


    db_cur.execute(f"""
        SELECT COUNT(*) FROM reservation
        WHERE initial_time = '{data["initial_time"]}' AND fields_id = {data["fields_id"]} AND cancelled = false;
    """)
    reservation_count = db_cur.fetchone()[0]

    if reservation_count > 1:
        db_cur.execute("ROLLBACK TO inserted_reservation;")
        db_cur.close()
        return jsonify({"error": "Field already reserved"}), 400
    else:
        conn.commit()
        db_cur.close()
        return jsonify({"message": "Reservation created"}), 201
  except Exception as e:
    print(e)
    db_cur.execute("ROLLBACK TO inserted_reservation;")
    db_cur.close()
    return jsonify({"error": str(e)}), 500

@api.route("/reservations", methods=["GET"])
@jwt_required()
def get_reservations():
  user_id = get_jwt_identity()
  db_cur = conn.cursor(cursor_factory=psycopg2.extras.DictCursor)

  try:
    db_cur.execute("SELECT * FROM reservation WHERE client_id = %s;", (user_id,))
    reservations = db_cur.fetchall()

    formated_reservations = []
    for reservation in reservations:
      db_cur.execute("SELECT * FROM fields WHERE id = %s;", (reservation['fields_id'],))
      field = db_cur.fetchone()

      db_cur.execute("SELECT * FROM price WHERE id = %s;", (reservation['price_id'],))
      price = db_cur.fetchone()

      formated_reservations.append({"reservation_id": reservation['id'], "field": field['name'], "price": price['price_value'], "initial_time": reservation['initial_time'], "end_time": reservation['end_time']})
    db_cur.close()
    return jsonify(formated_reservations), 200
  except Exception as e:
    conn.rollback()
    db_cur.close()
    return jsonify({"error": str(e)}), 500

@api.route("/reservations/date/<string:reservation_date>", methods=["GET"])
@jwt_required()
def get_reservations_by_day(reservation_date):
  user_id = get_jwt_identity()
  db_cur = conn.cursor(cursor_factory=psycopg2.extras.DictCursor)
  order_time = request.args.get("order_time")
  order_price = request.args.get("order_price")
  field_condition = request.args.get("field_id")
  price_condition = request.args.get("price_id")

  try:
    order_query = f"ORDER BY pr.price_type {order_time}, pr.price_value {order_price}"

    if field_condition == '0':
      query_condition = ""
    else:
      query_condition = f"AND fi.id = {field_condition}"

    if price_condition == '0':
      query_condition = query_condition + ""
    else:
      query_condition = query_condition + f" AND pr.id = {price_condition}"

    date_obj = datetime.datetime.strptime(reservation_date, "%Y-%m-%d")
    if date_obj.weekday() < 5:
      query_condition = query_condition + " AND pr.price_type LIKE 'SEMANA%'"
    else:
      query_condition = query_condition + " AND pr.price_type LIKE 'FIM_SEMANA%'"

    query = f"""
        SELECT fi.id AS field_id, fi.name, pr.id AS price_id, pr.price_type, pr.price_value,
          CASE WHEN subquery.field_name IS NOT NULL THEN true ELSE false END AS reserved,
          CASE WHEN wait_query.init_time IS NOT NULL THEN true ELSE false END AS waiting
        FROM price pr 
        CROSS JOIN fields fi
        LEFT JOIN (
          SELECT DISTINCT fi.name as field_name, pr.id as pr_id, pr.price_value, pr.price_type as pr_type, re.initial_time AS time_init
          FROM reservation re 
          INNER JOIN price pr ON pr.id = re.price_id 
          INNER JOIN fields fi ON fi.id = re.fields_id
          WHERE TO_CHAR(initial_time, 'YYYY-MM-DD') LIKE {"'" + reservation_date + "'"} AND re.cancelled is false
        ) AS subquery ON fi.name = subquery.field_name AND pr.price_type = subquery.pr_type AND pr.id = subquery.pr_id
        LEFT JOIN(
          SELECT DISTINCT re.fields_id AS field_id, re.initial_time AS init_time FROM reservation re 
          INNER JOIN waitlist ON waitlist.interested_time = re.initial_time 
          WHERE TO_CHAR(initial_time, 'YYYY-MM-DD') LIKE {"'" + reservation_date + "'"}
          AND waitlist.client_id = {user_id}
        ) AS wait_query ON wait_query.init_time = subquery.time_init
        WHERE pr.is_active is true {query_condition} 
        GROUP BY fi.id, fi.name, pr.price_type, pr.id, pr.price_value, subquery.field_name, wait_query.init_time
        {order_query}; """
    
    db_cur.execute(query=query)

    
    reservations = db_cur.fetchall()
    
    formated_reservations = []
    for reservation in reservations:
      formated_reservations.append({"field_id": reservation["field_id"],"field": reservation['name'], "price_id": reservation["price_id"], "price": reservation['price_value'], "time": reservation['price_type'], "reserved": reservation['reserved'], "waitlist": reservation['waiting']})
    db_cur.close()
    return jsonify(formated_reservations), 200
  except Exception as e:
    print(e)
    conn.rollback()
    db_cur.close()
    return jsonify({"error": str(e)}), 500

@api.route("/reservations/time/<string:initial_time>", methods=["GET"])
@jwt_required()
def get_reservations_by_time(initial_time):
  db_cur = conn.cursor(cursor_factory=psycopg2.extras.DictCursor)

  try:
    db_cur.execute("SELECT * FROM reservation WHERE TO_CHAR(initial_time, 'HH24:MI') LIKE %s;", (initial_time.replace("H", ":"),))
    reservations = db_cur.fetchall()

    formated_reservations = []
    for reservation in reservations:
      db_cur.execute("SELECT * FROM fields WHERE id = %s;", (reservation['fields_id'],))
      field = db_cur.fetchone()

      formated_reservations.append({"reservation_id": reservation['id'], "field": field['name'], "initial_time": reservation['initial_time'], "end_time": reservation['end_time']})
    db_cur.close()
    return jsonify(formated_reservations), 200
  except Exception as e:
    conn.rollback()
    db_cur.close()
    return jsonify({"error": str(e)}), 500

@api.route("/reservations/future", methods=["GET"])
@jwt_required()
def get_client_future_reservations():
  user_id = get_jwt_identity()
  db_cur = conn.cursor(cursor_factory=psycopg2.extras.DictCursor)

  try:
    db_cur.execute("SELECT * FROM reservation WHERE client_id = %s and initial_time > now() ORDER BY initial_time asc;", (user_id,))
    reservations = db_cur.fetchall()

    formated_reservations = []
    for reservation in reservations:
      db_cur.execute("SELECT * FROM fields WHERE id = %s;", (reservation['fields_id'],))
      field = db_cur.fetchone()

      db_cur.execute("SELECT * FROM price WHERE id = %s;", (reservation['price_id'],))
      price = db_cur.fetchone()

      formated_reservations.append({"reservation_id": reservation['id'], "field": field['name'], "price": price['price_value'], "date": reservation['initial_time'].strftime("%a, %d %b %Y"), "initial_time": reservation['initial_time'].strftime("%HH%M"), "end_time": reservation['end_time'].strftime("%HH%M"), "cancelled": reservation['cancelled']})
    db_cur.close()
    return jsonify(formated_reservations), 200
  except Exception as e:
    conn.rollback()
    db_cur.close()
    return jsonify({"error": str(e)}), 500

@api.route("/reservations/future/all", methods=["GET"])
@jwt_required()
@admin_required
def get_all_future_reservations():
  db_cur = conn.cursor(cursor_factory=psycopg2.extras.DictCursor)

  try:
    db_cur.execute("SELECT * FROM reservation ORDER BY initial_time desc;")
    reservations = db_cur.fetchall()

    formated_reservations = []
    for reservation in reservations:
      db_cur.execute("SELECT * FROM fields WHERE id = %s;", (reservation['fields_id'],))
      field = db_cur.fetchone()

      db_cur.execute("SELECT * FROM price WHERE id = %s;", (reservation['price_id'],))
      price = db_cur.fetchone()

      db_cur.execute("SELECT * FROM client WHERE id = %s;", (reservation['client_id'],))
      client = db_cur.fetchone()

      formated_reservations.append({"reservation_id": reservation['id'], "field": field['name'], "price": price['price_value'], "date": reservation['initial_time'].strftime("%a, %d %b %Y"), "initial_time": reservation['initial_time'].strftime("%HH%M"), "end_time": reservation['end_time'].strftime("%HH%M"), "client": client['email'], "cancelled": reservation['cancelled']})
    db_cur.close()
    return jsonify(formated_reservations), 200
  except Exception as e:
    conn.rollback()
    db_cur.close()
    return jsonify({"error": str(e)}), 500

@api.route("/reservations/past", methods=["GET"])
@jwt_required()
def get_client_past_reservations():
  user_id = get_jwt_identity()
  db_cur = conn.cursor(cursor_factory=psycopg2.extras.DictCursor)

  try:
    db_cur.execute("SELECT * FROM reservation WHERE client_id = %s and initial_time < now() ORDER BY initial_time desc;", (user_id,))
    reservations = db_cur.fetchall()

    formated_reservations = []
    for reservation in reservations:
      db_cur.execute("SELECT * FROM fields WHERE id = %s;", (reservation['fields_id'],))
      field = db_cur.fetchone()

      db_cur.execute("SELECT * FROM price WHERE id = %s;", (reservation['price_id'],))
      price = db_cur.fetchone()

      formated_reservations.append({"reservation_id": reservation['id'], "field": field['name'], "price": price['price_value'], "date": reservation['initial_time'].strftime("%a, %d %b %Y"), "initial_time": reservation['initial_time'].strftime("%HH%M"), "end_time": reservation['end_time'].strftime("%HH%M"), "cancelled": reservation['cancelled']})
    db_cur.close()
    return jsonify(formated_reservations), 200
  except Exception as e:
    conn.rollback()
    db_cur.close()
    return jsonify({"error": str(e)}), 500

@api.route("/reservations/<int:reservation_id>/cancel", methods=["PUT"])
@jwt_required()
def cancel_reservation(reservation_id):
  user_id = get_jwt_identity()
  data = request.json['data']
  db_cur = conn.cursor(cursor_factory=psycopg2.extras.DictCursor)

  try:
    db_cur.execute("SELECT * FROM reservation WHERE id = %s;", (reservation_id,))
    reservation = db_cur.fetchone()

    if not reservation:
      db_cur.close()
      return jsonify({"error": "Reservation not found"}), 404
    else:
      # if the user is the client of the reservation or an admin
      db_cur.execute("SELECT * FROM client WHERE id = %s;", (user_id,))
      user = db_cur.fetchone()

      if user_id == reservation["client_id"] or user["role"] == "admin" or user["role"] == "superadmin":
        db_cur.execute("UPDATE reservation SET cancelled = %s WHERE id = %s;", (data["cancelled"], reservation_id,))
        conn.commit()
        db_cur.close()
        return jsonify({"message": "Reservation updated"}), 200
      else:
        db_cur.close()
        return jsonify({"error": "Unauthorized"}), 403
  except Exception as e:
    conn.rollback()
    db_cur.close()
    return jsonify({"error": str(e)}), 500

@api.route("/reservations/<int:reservation_id>/update", methods=["PUT"])
@jwt_required()
@admin_required
def update_reservation(reservation_id):
  data = request.json['data']
  db_cur = conn.cursor(cursor_factory=psycopg2.extras.DictCursor)

  try:
    db_cur.execute("SELECT * FROM reservation WHERE id = %s;", (reservation_id,))
    reservation = db_cur.fetchone()

    if not reservation:
      db_cur.close()
      return jsonify({"error": "Reservation not found"}), 404
    else:
      date = data["date"]
      time = data["time"].replace(":", "H")
      
      # verifie if the date is a weekday or weekend
      date_obj = datetime.datetime.strptime(date, "%Y-%m-%d")
      if date_obj.weekday() < 5:
        price_type = "SEMANA"
      else:
        price_type = "FIM_SEMANA"
      
      # get the price id for the date and time
      db_cur.execute("SELECT * FROM price WHERE price_type LIKE %s;", (price_type+'_'+time+'%',))
      price = db_cur.fetchone()

      time = time.replace("H", ":") + ":00"
      timestamp = datetime.datetime.strptime(date + " " + time, "%Y-%m-%d %H:%M:%S")

      # verify if there is any field available for that date and time
      db_cur.execute("SELECT * FROM fields WHERE id NOT IN (SELECT fields_id FROM reservation WHERE initial_time = %s);", (timestamp,))
      field = db_cur.fetchone()
      
      if not field:
        db_cur.close()
        return jsonify({"error": "No field available"}), 400
      else:
        # get client id of reservation
        db_cur.execute("SELECT * FROM reservation WHERE id = %s;", (reservation_id,))
        reservation = db_cur.fetchone()
        
        # update reservation
        db_cur.execute("UPDATE reservation SET fields_id = %s, price_id = %s, initial_time = %s, end_time = %s, client_id = %s WHERE id = %s;", (field['id'], price['id'], timestamp, timestamp + datetime.timedelta(hours=1, minutes=30), reservation['client_id'], reservation_id,))
        conn.commit()
        db_cur.close()
        return jsonify({"message": "Reservation updated"}), 200
  except Exception as e:
    conn.rollback()
    db_cur.close()
    return jsonify({"error": str(e)}), 500


# statistics
@api.route("/statistics/frequent-field/<string:time>", methods=["GET"])
@jwt_required()
@admin_required
def get_most_frequent_field(time):
  db_cur = conn.cursor(cursor_factory=psycopg2.extras.DictCursor)

  try:
    db_cur.execute("SELECT fields_id, COUNT(fields_id) as count FROM reservation WHERE initial_time > now() - interval %s GROUP BY fields_id ORDER BY count desc LIMIT 1;", (time,))
    field = db_cur.fetchone()

    if field:
      db_cur.execute("SELECT * FROM fields WHERE id = %s;", (field['fields_id'],))
      field_name = db_cur.fetchone()
      db_cur.close()
      return jsonify({"label": field_name['name'], "count": field['count']}), 200
    else:
      db_cur.close()
      return jsonify({"error": "Field not found"}), 404
  except Exception as e:
    conn.rollback()
    db_cur.close()
    return jsonify({"error": str(e)}), 500

@api.route("/statistics/frequent-time/<string:time>", methods=["GET"])
@jwt_required()
@admin_required
def get_most_frequent_time(time):
  db_cur = conn.cursor(cursor_factory=psycopg2.extras.DictCursor)

  try:
    db_cur.execute("SELECT TO_CHAR(initial_time, 'HH24:MI') as time, COUNT(TO_CHAR(initial_time, 'HH24:MI')) as count FROM reservation WHERE initial_time > now() - interval %s GROUP BY TO_CHAR(initial_time, 'HH24:MI') ORDER BY count desc LIMIT 1;", (time,))
    time = db_cur.fetchone()

    if time:
      db_cur.close()
      # return time as like the time plus one hour and a half 16:00 -> 17:30
      return jsonify({"label": time['time'] + " - " + (datetime.datetime.strptime(time['time'], "%H:%M") + datetime.timedelta(hours=1, minutes=30)).strftime("%H:%M"), "count": time['count']}), 200
    else:
      db_cur.close()
      return jsonify({"error": "Time not found"}), 404
  except Exception as e:
    conn.rollback()
    db_cur.close()
    return jsonify({"error": str(e)}), 500

@api.route("/statistics/fields-not-used/<string:time>", methods=["GET"])
@jwt_required()
@admin_required
def get_fields_not_used(time):
  db_cur = conn.cursor(cursor_factory=psycopg2.extras.DictCursor)

  try:
    db_cur.execute("SELECT * FROM fields WHERE id NOT IN (SELECT fields_id FROM reservation WHERE initial_time > now() - interval %s);", (time,))
    fields = db_cur.fetchall()

    formated_fields = []
    for field in fields:
      formated_fields.append({"field_id": field['id'], "name": field['name']})
    db_cur.close()
    return jsonify(formated_fields), 200
  except Exception as e:
    conn.rollback()
    db_cur.close()
    return jsonify({"error": str(e)}), 500
  
@api.route("/statistics/fields-unused/<filter_type>/<filter>", methods=["GET"])
@jwt_required()
@admin_required
def get_unused_fields(filter_type, filter):
  db_cur = conn.cursor(cursor_factory=psycopg2.extras.DictCursor)

  try:
    if filter_type == "day":
      db_cur.execute("""
        SELECT * FROM fields
        WHERE fields.name NOT IN (
          SELECT fields.name FROM fields
          RIGHT JOIN reservation ON reservation.fields_id = fields.id
          WHERE to_char(reservation.initial_time, 'YYYY-MM-DD') = %s
          GROUP BY fields.name
        );
      """, (filter,))
    elif filter_type == "month":
      db_cur.execute("""
        SELECT * FROM fields
        WHERE fields.name NOT IN (
          SELECT fields.name FROM fields
          RIGHT JOIN reservation ON reservation.fields_id = fields.id
          WHERE to_char(reservation.initial_time, 'YYYY-MM') = %s
          GROUP BY fields.name
        );
      """, (filter,))
    elif filter_type == "year":
      db_cur.execute("""
        SELECT * FROM fields
        WHERE fields.name NOT IN (
          SELECT fields.name FROM fields
          RIGHT JOIN reservation ON reservation.fields_id = fields.id
          WHERE to_char(reservation.initial_time, 'YYYY') = %s
          GROUP BY fields.name
        );
      """, (filter,))
    fields = db_cur.fetchall()

    formated_fields = []
    for field in fields:
      formated_fields.append({"label":field['name']})
    db_cur.close()
    return jsonify(formated_fields), 200
  except Exception as e:
    conn.rollback()
    db_cur.close()
    print(e)
    return jsonify({"error": str(e)}), 500
  
@api.route("/statistics/time-unused/<filter_type>/<filter>", methods=["GET"])
@jwt_required()
@admin_required
def get_unused_time(filter_type, filter):
  db_cur = conn.cursor(cursor_factory=psycopg2.extras.DictCursor)

  try:
    if filter_type == "day":
      db_cur.execute("""
        SELECT * FROM price
        WHERE price.price_type NOT IN (
          SELECT price.price_type FROM price
          RIGHT JOIN reservation ON reservation.price_id = price.id
          WHERE to_char(reservation.initial_time, 'YYYY-MM-DD') = %s
          GROUP BY price.price_type
        );
      """, (filter,))
    elif filter_type == "month":
      db_cur.execute("""
        SELECT * FROM price
        WHERE price.price_type NOT IN (
          SELECT price.price_type FROM price
          RIGHT JOIN reservation ON reservation.price_id = price.id
          WHERE to_char(reservation.initial_time, 'YYYY-MM') = %s
          GROUP BY price.price_type
        );
      """, (filter,))
    elif filter_type == "year":
      db_cur.execute("""
        SELECT * FROM price
        WHERE price.price_type NOT IN (
          SELECT price.price_type FROM price
          RIGHT JOIN reservation ON reservation.price_id = price.id
          WHERE to_char(reservation.initial_time, 'YYYY') = %s
          GROUP BY price.price_type
        );
      """, (filter,))
    prices = db_cur.fetchall()

    formated_fields = []
    for price in prices:
      formated_fields.append({"label":price['price_type']})
    db_cur.close()
    return jsonify(formated_fields), 200
  except Exception as e:
    conn.rollback()
    db_cur.close()
    print(e)
    return jsonify({"error": str(e)}), 500

@api.route("/statistics/reservations-audit/<filter_type>/<filter>", methods=["GET"])
@jwt_required()
@admin_required
def get_reservations_audit(filter_type, filter):
  db_cur = conn.cursor(cursor_factory=psycopg2.extras.DictCursor)

  try:
    if filter_type == "day":
      db_cur.execute("SELECT * FROM reservation_audit WHERE to_char(change_date, 'YYYY-MM-DD') = %s ORDER BY change_date asc;", (filter,))
    elif filter_type == "month":
      db_cur.execute("SELECT * FROM reservation_audit WHERE to_char(change_date, 'YYYY-MM') = %s ORDER BY change_date asc;", (filter,))
    elif filter_type == "year":
      db_cur.execute("SELECT * FROM reservation_audit WHERE to_char(change_date, 'YYYY') = %s ORDER BY change_date asc;", (filter,))
    reservations_audit = db_cur.fetchall()
    
    formated_reservations_audit = []
    for reservation_audit in reservations_audit:
      formated_reservations_audit.append({"id": reservation_audit['id'], "field": reservation_audit['field'], "old_value": reservation_audit['old_value'], "new_value": reservation_audit['new_value'], "change_date": reservation_audit['change_date'], "reservation_id": reservation_audit['reservation_id']})
    db_cur.close()
    return jsonify(formated_reservations_audit), 200
  except Exception as e:
    print(e)
    conn.rollback()
    db_cur.close()
    return jsonify({"error": str(e)}), 500


@api.route("/statistics/waitlist/more-requests", methods=["GET"])
@jwt_required()
@admin_required
def get_waitlist_more_requests():
  db_cur = conn.cursor(cursor_factory=psycopg2.extras.DictCursor)

  try:
    db_cur.execute("SELECT COUNT(waitlist.interested_time) AS counter, to_char(waitlist.interested_time, 'YYYY-MM-DD HH24:MI:SS') AS datetime FROM waitlist INNER JOIN client ON waitlist.client_id = client.id GROUP BY waitlist.interested_time ORDER BY counter DESC")
    waitlists = db_cur.fetchall()

    formated_fields = []
    for waitlist in waitlists:
      formated_fields.append({"counter": waitlist['counter'], "datetime": waitlist['datetime']})
    db_cur.close()
    return jsonify(formated_fields), 200
  except Exception as e:
    conn.rollback()
    db_cur.close()
    print(e)
    return jsonify({"error": str(e)}), 500



# waitlist
@api.route("/waitlist/create", methods=["POST"])
@jwt_required()
def create_waitlist():
  user_id = get_jwt_identity()
  data = request.json['data']
  db_cur = conn.cursor(cursor_factory=psycopg2.extras.DictCursor)

  try:
    # first verifies if there is any available field in that date and time
    db_cur.execute("SELECT * FROM fields WHERE id NOT IN (SELECT fields_id FROM reservation WHERE initial_time = %s);", (data["interested_time"],))
    
    # if there are no fields available, add the user to the waitlist
    if not db_cur.fetchone():
      db_cur.execute("INSERT INTO waitlist (client_id, interested_time, silence) VALUES (%s, %s, %s);", (user_id, data["interested_time"], False,))
      conn.commit()
      db_cur.close()
      return jsonify({"message": "Added to waitlist"}), 201
    else:
      # if there are fields available, return an error message saying the name of the fields available
      db_cur.execute("SELECT * FROM fields WHERE id NOT IN (SELECT fields_id FROM reservation WHERE initial_time = %s);", (data["interested_time"],))
      fields = db_cur.fetchall()
      
      formated_fields = []
      for field in fields:
        formated_fields.append(field['name'])
      db_cur.close()
      return jsonify({"error": "Fields already available: " + ", ".join(formated_fields)}), 400
  except UniqueViolation as e:
    conn.rollback()
    db_cur.close()
    return jsonify({"error": "Already in waitlist"}), 400
  except Exception as e:
    conn.rollback()
    db_cur.close()
    return jsonify({"error": str(e)}), 500

@api.route("/waitlist/all", methods=["GET"])
@jwt_required()
def get_waitlist():
  db_cur = conn.cursor(cursor_factory=psycopg2.extras.DictCursor)

  try:
    db_cur.execute("SELECT * FROM waitlist ORDER BY interested_time desc;")
    waitlist = db_cur.fetchall()

    formated_waitlist = []
    for wait in waitlist:
      db_cur.execute("SELECT * FROM client WHERE id = %s;", (wait['client_id'],))
      client = db_cur.fetchone()
      
      
      formated_waitlist.append({"waitlist_id": wait['id'], "date": wait['interested_time'].strftime("%a, %d %b %Y"), "time": wait['interested_time'].strftime("%HH%M") + " - " + (wait['interested_time'] + datetime.timedelta(hours=1, minutes=30)).strftime("%HH%M"), "silence": wait['silence'], "client": client['email']})
    db_cur.close()
    return jsonify(formated_waitlist), 200
  except Exception as e:
    conn.rollback()
    db_cur.close()
    return jsonify({"error": str(e)}), 500

@api.route("/waitlist", methods=["GET"])
@jwt_required()
def get_clients_waitlist():
  user_id = get_jwt_identity()
  db_cur = conn.cursor(cursor_factory=psycopg2.extras.DictCursor)

  try:
    db_cur.execute("SELECT * FROM waitlist WHERE client_id = %s and silence = false;", (user_id,))
    waitlist = db_cur.fetchall()

    formated_waitlist = []
    for wait in waitlist:
      formated_waitlist.append({"waitlist_id": wait['id'], "interested_time": wait['interested_time'], "silence": wait['silence']})
    db_cur.close()
    return jsonify(formated_waitlist), 200
  except Exception as e:
    conn.rollback()
    db_cur.close()
    return jsonify({"error": str(e)}), 500