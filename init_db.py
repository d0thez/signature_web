
import sqlite3

conn = sqlite3.connect('users.db')
c = conn.cursor()

c.execute('''
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    phone_last4 TEXT NOT NULL,
    has_signed INTEGER DEFAULT 0
)
''')

users = [
    ('김도현', '1234'),
    ('홍길동', '5678'),
    ('이해솔', '7677')
]

c.executemany('INSERT INTO users (name, phone_last4) VALUES (?, ?)', users)

conn.commit()
conn.close()
print("DB 초기화 완료")
