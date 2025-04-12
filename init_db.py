import sqlite3

conn = sqlite3.connect('users.db')
c = conn.cursor()

# 기존 users 테이블 제거 (기존 데이터 삭제됨 - 주의!)
c.execute('DROP TABLE IF EXISTS users')

# 새로운 테이블 구조 생성
c.execute('''
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    department TEXT,
    grade TEXT,
    student_id TEXT,
    phone TEXT,
    phone_last4 TEXT NOT NULL,
    has_signed INTEGER DEFAULT 0
)
''')

# 테스트용 사용자 추가
users = [
    ('김도현', '컴퓨터교육과', '2', '202400326', '01034594678', '4678'),
    ('이해솔', '지구과학교육과', '3', '2023000', '0109528677', '7677')
]

c.executemany('INSERT INTO users (name, department, grade, student_id, phone, phone_last4) VALUES (?, ?, ?, ?, ?, ?)', users)

conn.commit()
conn.close()
print("DB 초기화 완료")
