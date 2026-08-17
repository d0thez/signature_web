from flask import Flask, render_template, request, redirect, session, send_from_directory, flash
import sqlite3
import os
import json
import base64
import io
from pathlib import Path
from werkzeug.utils import secure_filename
from PIL import Image
import pandas as pd
from datetime import datetime
from zoneinfo import ZoneInfo

BASE_DIR = Path(__file__).resolve().parent
CONFIG_FILE = BASE_DIR / "site_config.json"
SIGNATURE_DIR = BASE_DIR / "signatures"
UPLOAD_DIR = BASE_DIR / "static" / "uploads"

SIGNATURE_DIR.mkdir(exist_ok=True)
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

app = Flask(__name__)
app.secret_key = os.environ.get("SECRET_KEY", "change-this-secret-key")

ALLOWED_LOGO_EXTENSIONS = {".png", ".jpg", ".jpeg", ".webp"}


def load_config():
    """사이트에서 사용하는 문구/로고 설정을 읽습니다."""
    try:
        with open(CONFIG_FILE, "r", encoding="utf-8") as f:
            return json.load(f)
    except (FileNotFoundError, json.JSONDecodeError):
        return {
            "organization_name": "뉴맨",
            "academic_year": "2026",
            "semester": "2학기",
            "main_title": "동아리 재등록 시스템",
            "help_title": "인증이 어려우신가요?",
            "help_message": "회장에게 문의해 주세요.",
            "completion_title": "회원 명부에 서명되었습니다!",
            "completion_message": "서명해 주셔서 감사합니다 😊",
            "slogan": "언제나 당신의 곁에서, NEWMAN",
            "developer": "Developed by Stephen Kim",
            "logo": "newman_logo.jpg",
            "copyright": "All rights reserved."
        }


def save_config(config):
    """설정 파일을 안전하게 저장합니다."""
    temp_file = CONFIG_FILE.with_suffix(".tmp")
    with open(temp_file, "w", encoding="utf-8") as f:
        json.dump(config, f, ensure_ascii=False, indent=2)
    temp_file.replace(CONFIG_FILE)


@app.context_processor
def inject_site_config():
    """모든 템플릿에서 site 설정을 바로 사용할 수 있게 합니다."""
    return {"site": load_config()}


def admin_required():
    return session.get("admin") is True


def ensure_signed_at_column():
    """기존 users.db를 유지하면서 signed_at 컬럼만 필요한 경우 자동 추가합니다."""
    conn = sqlite3.connect(BASE_DIR / "users.db")
    c = conn.cursor()

    c.execute("PRAGMA table_info(users)")
    columns = [row[1] for row in c.fetchall()]

    if "signed_at" not in columns:
        c.execute("ALTER TABLE users ADD COLUMN signed_at DATETIME")
        conn.commit()

    conn.close()


ensure_signed_at_column()


@app.route("/")
def index():
    return render_template("index.html")


@app.route("/verify", methods=["POST"])
def verify():
    name = request.form["name"].strip()
    phone_last4 = request.form["phone_last4"].strip()

    conn = sqlite3.connect(BASE_DIR / "users.db")
    c = conn.cursor()
    c.execute(
        "SELECT * FROM users WHERE name=? AND phone_last4=?",
        (name, phone_last4)
    )
    user = c.fetchone()
    conn.close()

    if user:
        if user[7] == 1:
            return render_template("index.html", error="이미 서명을 완료하셨습니다.")

        session["user_id"] = user[0]
        return render_template("verify_info.html", user=user)

    return render_template(
        "index.html",
        error="입력하신 정보와 일치하는 회원 정보가 없습니다."
    )


@app.route("/sign")
def sign():
    if "user" not in session:
        return redirect("/")
    return render_template("sign.html", name=session["user"]["name"])


@app.route("/submit_signature", methods=["POST"])
def submit_signature():
    if "user" not in session:
        return redirect("/")

    data_url = request.form["signature"]
    header, encoded = data_url.split(",", 1)
    binary_data = base64.b64decode(encoded)
    image = Image.open(io.BytesIO(binary_data))

    filename = f"{session['user']['name']}.png"
    image.save(SIGNATURE_DIR / filename)

    conn = sqlite3.connect(BASE_DIR / "users.db")
    c = conn.cursor()
    c.execute(
        """
        UPDATE users
        SET has_signed=1,
            signed_at=?
        WHERE name=? AND phone_last4=?
        """,
        (
            datetime.now(ZoneInfo("Asia/Seoul")).strftime("%Y-%m-%d %H:%M:%S"),
            session["user"]["name"],
            session["user"]["phone_last4"]
        )
    )
    conn.commit()
    conn.close()

    return redirect("/thank_you")


@app.route("/admin")
def admin_login():
    return render_template("admin_login.html")


@app.route("/admin_login", methods=["POST"])
def admin_login_post():
    password = request.form["password"]
    admin_password = os.environ.get("ADMIN_PASSWORD", "admin123")

    if password == admin_password:
        session["admin"] = True
        return redirect("/admin_members")

    return render_template(
        "admin_login.html",
        error="비밀번호가 틀렸습니다."
    )


@app.route("/admin_panel")
def admin_panel():
    if not admin_required():
        return redirect("/admin")

    return render_template("admin_panel.html")


@app.route("/admin_members")
def admin_members():
    if not admin_required():
        return redirect("/admin")

    conn = sqlite3.connect(BASE_DIR / "users.db")
    c = conn.cursor()
    c.execute("SELECT * FROM users")
    users = c.fetchall()
    conn.close()

    return render_template("admin_members.html", users=users)


# -------------------------
# 사이트 설정
# -------------------------

@app.route("/admin/settings", methods=["POST"])
def update_settings():
    if not admin_required():
        return redirect("/admin")

    config = load_config()

    config["organization_name"] = request.form.get(
        "organization_name", config["organization_name"]
    ).strip()
    config["academic_year"] = request.form.get(
        "academic_year", config["academic_year"]
    ).strip()
    config["semester"] = request.form.get(
        "semester", config["semester"]
    ).strip()
    config["main_title"] = request.form.get(
        "main_title", config["main_title"]
    ).strip()
    config["help_title"] = request.form.get(
        "help_title", config["help_title"]
    ).strip()
    config["help_message"] = request.form.get(
        "help_message", config["help_message"]
    ).strip()
    config["completion_title"] = request.form.get(
        "completion_title", config["completion_title"]
    ).strip()
    config["completion_message"] = request.form.get(
        "completion_message", config["completion_message"]
    ).strip()
    config["slogan"] = request.form.get(
        "slogan", config["slogan"]
    ).strip()
    config["developer"] = request.form.get(
        "developer", config["developer"]
    ).strip()

    save_config(config)
    flash("사이트 설정이 저장되었습니다.")
    return redirect("/admin_panel")


@app.route("/admin/settings/logo", methods=["POST"])
def update_logo():
    if not admin_required():
        return redirect("/admin")

    file = request.files.get("logo")

    if not file or not file.filename:
        flash("로고 파일을 선택해주세요.")
        return redirect("/admin_panel")

    extension = Path(secure_filename(file.filename)).suffix.lower()

    if extension not in ALLOWED_LOGO_EXTENSIONS:
        flash("PNG, JPG, JPEG, WEBP 파일만 업로드할 수 있습니다.")
        return redirect("/admin_panel")

    filename = f"newman_logo{extension}"
    save_path = UPLOAD_DIR / filename
    file.save(save_path)

    config = load_config()
    config["logo"] = f"uploads/{filename}"
    save_config(config)

    flash("로고가 변경되었습니다.")
    return redirect("/admin_panel")


# -------------------------
# 회원 관리
# -------------------------

@app.route("/admin/add_user", methods=["POST"])
def add_user():
    if not admin_required():
        return redirect("/admin")

    name = request.form["name"]
    department = request.form["department"]
    grade = request.form["grade"]
    student_id = request.form["student_id"]
    phone = request.form["phone"]
    phone_last4 = request.form["phone_last4"]

    conn = sqlite3.connect(BASE_DIR / "users.db")
    c = conn.cursor()
    c.execute(
        """
        INSERT INTO users
        (name, department, grade, student_id, phone, phone_last4, has_signed)
        VALUES (?, ?, ?, ?, ?, ?, ?)
        """,
        (name, department, grade, student_id, phone, phone_last4, 0)
    )
    conn.commit()
    conn.close()

    flash(f"{name}님이 추가되었습니다.")
    return redirect("/admin_members")


@app.route("/admin/delete_user/<int:user_id>", methods=["POST"])
def delete_user(user_id):
    if not admin_required():
        return redirect("/admin")

    conn = sqlite3.connect(BASE_DIR / "users.db")
    c = conn.cursor()
    c.execute("DELETE FROM users WHERE id=?", (user_id,))
    conn.commit()
    conn.close()

    flash("회원이 삭제되었습니다.")
    return redirect("/admin_members")


@app.route("/confirm_info", methods=["POST"])
def confirm_info():
    user_id = request.form["id"]
    name = request.form["name"]
    department = request.form["department"]
    grade = request.form["grade"]
    student_id = request.form["student_id"]
    phone = request.form["phone"]
    phone_last4 = request.form["phone_last4"]

    conn = sqlite3.connect(BASE_DIR / "users.db")
    c = conn.cursor()
    c.execute(
        """
        UPDATE users
        SET name=?, department=?, grade=?, student_id=?, phone=?, phone_last4=?
        WHERE id=?
        """,
        (name, department, grade, student_id, phone, phone_last4, user_id)
    )
    conn.commit()
    conn.close()

    session["user"] = {
        "id": user_id,
        "name": name,
        "phone_last4": phone_last4
    }

    return redirect("/sign")


@app.route("/admin/update_user", methods=["POST"])
def update_user():
    if not admin_required():
        return redirect("/admin")

    user_id = request.form["id"]
    name = request.form["name"]
    department = request.form["department"]
    grade = request.form["grade"]
    student_id = request.form["student_id"]
    phone = request.form["phone"]
    phone_last4 = request.form["phone_last4"]

    conn = sqlite3.connect(BASE_DIR / "users.db")
    c = conn.cursor()
    c.execute(
        """
        UPDATE users
        SET name=?, department=?, grade=?, student_id=?, phone=?, phone_last4=?
        WHERE id=?
        """,
        (name, department, grade, student_id, phone, phone_last4, user_id)
    )
    conn.commit()
    conn.close()

    flash(f"{name}님의 정보가 수정되었습니다.")
    return redirect("/admin_members")


@app.route("/admin/upload_excel", methods=["POST"])
def upload_excel():
    if not admin_required():
        return redirect("/admin")

    file = request.files.get("file")

    if file and file.filename.endswith((".xlsx", ".xls")):
        try:
            df = pd.read_excel(file)

            conn = sqlite3.connect(BASE_DIR / "users.db")
            cursor = conn.cursor()

            for _, row in df.iterrows():
                name = str(row.get("이름", "")).strip()
                department = str(row.get("학과", "")).strip()
                grade = str(row.get("학년", "")).strip()
                student_id = str(row.get("학번", "")).strip()
                phone = str(row.get("전화번호", "")).strip()
                phone_last4 = str(row.get("암호", "")).strip()

                if (
                    name and name != "nan"
                    and student_id and student_id != "nan"
                ):
                    cursor.execute(
                        """
                        INSERT INTO users
                        (name, department, grade, student_id, phone, phone_last4, has_signed)
                        VALUES (?, ?, ?, ?, ?, ?, 0)
                        """,
                        (name, department, grade, student_id, phone, phone_last4)
                    )

            conn.commit()
            conn.close()
            flash("엑셀 회원 정보가 등록되었습니다.")
            return redirect("/admin_members")

        except Exception as e:
            return f"엑셀 업로드 중 오류가 발생했습니다: {e}"

    return "유효한 엑셀 파일을 업로드해주세요.", 400


@app.route("/download/<filename>")
def download_signature(filename):
    if not admin_required():
        return redirect("/")

    return send_from_directory(
        SIGNATURE_DIR,
        filename,
        as_attachment=True
    )


@app.route("/thank_you")
def thank_you():
    return render_template("thank_you.html")


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5001, debug=True)
