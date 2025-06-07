const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const path = require('path');

const app = express();

// 미들웨어 설정
app.use(cors());
app.use(express.json());
app.use(express.static('public'));  // public 폴더의 정적 파일 제공

// 데이터베이스 연결
const db = new sqlite3.Database('todos.db', (err) => {
    if (err) {
        console.error('데이터베이스 연결 오류:', err);
    } else {
        console.log('데이터베이스 연결 성공');
        
        // 테이블 생성
        db.serialize(() => {
            // users 테이블 생성
            db.run(`CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT NOT NULL UNIQUE,
                password TEXT NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )`, (err) => {
                if (err) console.error('users 테이블 생성 오류:', err);
                else console.log('users 테이블 생성 완료');
            });

            // groups 테이블 생성
            db.run(`CREATE TABLE IF NOT EXISTS groups (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                user_id INTEGER NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id)
            )`, (err) => {
                if (err) console.error('groups 테이블 생성 오류:', err);
                else console.log('groups 테이블 생성 완료');
            });

            // todos 테이블 생성
            db.run(`CREATE TABLE IF NOT EXISTS todos (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                group_id INTEGER NOT NULL,
                text TEXT NOT NULL,
                date TEXT NOT NULL,
                time TEXT,
                completed INTEGER DEFAULT 0,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (group_id) REFERENCES groups(id)
            )`, (err) => {
                if (err) console.error('todos 테이블 생성 오류:', err);
                else console.log('todos 테이블 생성 완료');
            });
        });
    }
});

// 루트 경로 처리
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// API 엔드포인트
// 그룹 관련 API
app.get('/api/groups', (req, res) => {
    const userId = req.query.userId;
    
    if (!userId) {
        return res.status(400).json({ error: "사용자 ID가 필요합니다." });
    }

    console.log('그룹 조회 요청:', userId); // 디버깅용

    db.all(
        'SELECT * FROM groups WHERE user_id = ? ORDER BY id DESC', 
        [userId], 
        (err, rows) => {
            if (err) {
                console.error('그룹 조회 오류:', err); // 디버깅용
                res.status(500).json({ error: err.message });
                return;
            }
            
            console.log('조회된 그룹:', rows); // 디버깅용
            res.json(rows);
        }
    );
});

app.post('/api/groups', (req, res) => {
    const { name, userId } = req.body;
    
    if (!name || !userId) {
        return res.status(400).json({ error: "그룹 이름과 사용자 ID가 필요합니다." });
    }

    console.log('그룹 추가 요청:', { name, userId }); // 디버깅용

    db.run(
        'INSERT INTO groups (name, user_id) VALUES (?, ?)', 
        [name, userId], 
        function(err) {
            if (err) {
                console.error('그룹 추가 오류:', err); // 디버깅용
                res.status(500).json({ error: err.message });
                return;
            }
            
            const newGroup = {
                id: this.lastID,
                name: name,
                user_id: userId
            };
            
            console.log('생성된 그룹:', newGroup); // 디버깅용
            res.json(newGroup);
        }
    );
});

app.delete('/api/groups/:id', (req, res) => {
    const id = req.params.id;
    db.run('DELETE FROM groups WHERE id = ?', [id], (err) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json({ message: "삭제 완료" });
    });
});

// 할일 관련 API
app.get('/api/todos/:groupId', (req, res) => {
    const groupId = req.params.groupId;
    db.all('SELECT * FROM todos WHERE group_id = ?', [groupId], (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json(rows);
    });
});

app.post('/api/todos', (req, res) => {
    const { group_id, text, date, time } = req.body;
    db.run(
        'INSERT INTO todos (group_id, text, date, time) VALUES (?, ?, ?, ?)',
        [group_id, text, date, time],
        function(err) {
            if (err) {
                res.status(500).json({ error: err.message });
                return;
            }
            res.json({ id: this.lastID });
        }
    );
});

app.put('/api/todos/:id', (req, res) => {
    const { completed } = req.body;
    const id = req.params.id;
    db.run(
        'UPDATE todos SET completed = ? WHERE id = ?',
        [completed ? 1 : 0, id],
        (err) => {
            if (err) {
                res.status(500).json({ error: err.message });
                return;
            }
            res.json({ message: "업데이트 완료" });
        }
    );
});

app.delete('/api/todos/:id', (req, res) => {
    const id = req.params.id;
    db.run('DELETE FROM todos WHERE id = ?', [id], (err) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json({ message: "삭제 완료" });
    });
});

// 로그인 관련 API
app.post('/api/register', (req, res) => {
    const { username, password } = req.body;
    
    if (!username || !password) {
        return res.status(400).json({ error: "아이디와 비밀번호를 모두 입력해주세요." });
    }

    // 비밀번호 암호화 (실제 서비스에서는 bcrypt 등을 사용해야 함)
    db.run(
        'INSERT INTO users (username, password) VALUES (?, ?)',
        [username, password],
        function(err) {
            if (err) {
                if (err.message.includes('UNIQUE constraint failed')) {
                    return res.status(400).json({ error: "이미 존재하는 아이디입니다." });
                }
                return res.status(500).json({ error: err.message });
            }
            res.json({ 
                id: this.lastID, 
                username,
                message: "회원가입이 완료되었습니다." 
            });
        }
    );
});

app.post('/api/login', (req, res) => {
    const { username, password } = req.body;
    
    if (!username || !password) {
        return res.status(400).json({ error: "아이디와 비밀번호를 모두 입력해주세요." });
    }

    db.get(
        'SELECT * FROM users WHERE username = ? AND password = ?',
        [username, password],
        (err, user) => {
            if (err) {
                return res.status(500).json({ error: err.message });
            }
            if (!user) {
                return res.status(401).json({ error: "아이디 또는 비밀번호가 일치하지 않습니다." });
            }
            res.json({ 
                id: user.id, 
                username: user.username,
                message: "로그인 성공" 
            });
        }
    );
});

// 서버 시작
const PORT = 3000;
app.listen(PORT, () => {
    console.log(`서버가 http://localhost:${PORT}에서 실행 중입니다.`);
}); 