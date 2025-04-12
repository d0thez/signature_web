
from flask import Flask, render_template, request, redirect, url_for, session, send_from_directory, flash
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
        if user[7] == 1:
            return render_template('index.html', error='이미 서명하셨습니다.')
        session['user_id'] = user[0]
        return render_template('verify_info.html', user=user)
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


@app.route('/thank_you')
def thank_you():
    return render_template('thank_you.html')


@app.route('/admin/add_user', methods=['POST'])
def add_user():
    name = request.form['name']
    department = request.form['department']
    grade = request.form['grade']
    student_id = request.form['student_id']
    phone = request.form['phone']
    phone_last4 = request.form['phone_last4']
    
    conn = sqlite3.connect('users.db')
    c = conn.cursor()
    c.execute('INSERT INTO users (name, department, grade, student_id, phone, phone_last4, has_signed) VALUES (?, ?, ?, ?, ?, ?, ?)', 
              (name, department, grade, student_id, phone, phone_last4, 0))  # 서명 여부는 기본값 0 (미완료)
    conn.commit()
    conn.close()

    return redirect('/admin_panel')  # 관리자 페이지로 리다이렉트

@app.route('/admin/delete_user/<int:user_id>', methods=['POST'])
def delete_user(user_id):
    conn = sqlite3.connect('users.db')
    c = conn.cursor()
    c.execute('DELETE FROM users WHERE id=?', (user_id,))
    conn.commit()
    conn.close()

    return redirect('/admin_panel')  # 관리자 페이지로 리다이렉트


@app.route('/confirm_info', methods=['POST'])
def confirm_info():
    user_id = request.form['id']
    name = request.form['name']
    department = request.form['department']
    grade = request.form['grade']
    student_id = request.form['student_id']
    phone = request.form['phone']
    phone_last4 = request.form['phone_last4']

    conn = sqlite3.connect('users.db')
    c = conn.cursor()
    # " , phone_last4=?"" 지움
    c.execute('''
        UPDATE users SET name=?, department=?, grade=?, student_id=?, phone=?, phone_last4=?
        WHERE id=?
    ''', (name, department, grade, student_id, phone, phone_last4, user_id))
    conn.commit()
    conn.close()

    session['user'] = {
        'id': user_id,
        'name': name,
        'phone_last4': phone_last4
    }
    return redirect('/sign')

@app.route('/admin/update_user', methods=['POST'])
def update_user():
    user_id = request.form['id']
    name = request.form['name']
    department = request.form['department']
    grade = request.form['grade']
    student_id = request.form['student_id']
    phone = request.form['phone']
    phone_last4 = request.form['phone_last4']

    conn = sqlite3.connect('users.db')
    c = conn.cursor()
    c.execute('''
        UPDATE users
        SET name=?, department=?, grade=?, student_id=?, phone=?, phone_last4=?
        WHERE id=?
    ''', (name, department, grade, student_id, phone, phone_last4, user_id))
    conn.commit()
    conn.close()

    flash(f"{name}님의 정보가 수정되었습니다.")
    return redirect('/admin_panel')

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)


#시작하기 python app.py