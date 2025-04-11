
from flask import Flask, render_template, request, redirect, url_for, session, send_from_directory
import sqlite3
import os
from datetime import datetime
from PIL import Image
import base64
import io

app = Flask(__name__)
app.secret_key = 'your_secret_key'

if not os.path.exists('signatures'):
    os.makedirs('signatures')

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/verify', methods=['POST'])
def verify():
    name = request.form['name']
    phone_last4 = request.form['phone_last4']

    conn = sqlite3.connect('users.db')
    c = conn.cursor()
    c.execute('SELECT * FROM users WHERE name=? AND phone_last4=?', (name, phone_last4))
    user = c.fetchone()
    conn.close()

    if user:
        if user[3] == 1:
            return render_template('index.html', error='이미 서명하셨습니다.')
        session['user'] = {'name': name, 'phone_last4': phone_last4}
        return redirect('/sign')
    else:
        return render_template('index.html', error='회원 정보가 없습니다.')

@app.route('/sign')
def sign():
    if 'user' not in session:
        return redirect('/')
    return render_template('sign.html', name=session['user']['name'])

@app.route('/submit_signature', methods=['POST'])
def submit_signature():
    if 'user' not in session:
        return redirect('/')
    data_url = request.form['signature']
    header, encoded = data_url.split(",", 1)
    binary_data = base64.b64decode(encoded)
    image = Image.open(io.BytesIO(binary_data))

    filename = f"{session['user']['name']}.png"
    image.save(os.path.join('signatures', filename))

    conn = sqlite3.connect('users.db')
    c = conn.cursor()
    c.execute('UPDATE users SET has_signed=1 WHERE name=? AND phone_last4=?', 
              (session['user']['name'], session['user']['phone_last4']))
    conn.commit()
    conn.close()

    # 서명 제출 처리 후
    return redirect('thank_you')


@app.route('/admin')
def admin_login():
    return render_template('admin_login.html')

@app.route('/admin_login', methods=['POST'])
def admin_login_post():
    password = request.form['password']
    if password == 'admin123':
        session['admin'] = True
        return redirect('/admin_panel')
    else:
        return render_template('admin_login.html', error='비밀번호가 틀렸습니다.')

@app.route('/admin_panel')
def admin_panel():
    if not session.get('admin'):
        return redirect('/admin')
    conn = sqlite3.connect('users.db')
    c = conn.cursor()
    c.execute('SELECT * FROM users')
    users = c.fetchall()
    conn.close()
    return render_template('admin_panel.html', users=users)

@app.route('/download/<filename>')
def download_signature(filename):
    if not session.get('admin'):
        return redirect('/')
    return send_from_directory('signatures', filename, as_attachment=True)

@app.route('/admin/members', methods=['GET', 'POST'])
def manage_members():
    if request.method == 'POST':
        name = request.form['name']
        phone = request.form['phone']
        db = get_db()
        db.execute('INSERT INTO users (name, phone, signed) VALUES (?, ?, 0)', (name, phone))
        db.commit()
        return redirect('/admin/members')

    db = get_db()
    members = db.execute('SELECT * FROM users').fetchall()
    return render_template('admin_members.html', members=members)

@app.route('/admin/update_member/<int:user_id>', methods=['POST'])
def update_member(user_id):
    name = request.form['name']
    phone = request.form['phone']
    db = get_db()
    db.execute('UPDATE users SET name = ?, phone = ? WHERE id = ?', (name, phone, user_id))
    db.commit()
    return redirect('/admin/members')

@app.route('/thank_you')
def thank_you():
    return render_template('thank_you.html')


if __name__ == '__main__':
    app.run(debug=True)
