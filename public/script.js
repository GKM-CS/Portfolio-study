let groups = [];
let todos = {};

// 로그인 상태 체크
function checkAuth() {
    const user = JSON.parse(localStorage.getItem('user'));
    if (!user) {
        window.location.href = '/login.html';
        return null;
    }
    return user;
}

// 사용자 정보 표시
function displayUserInfo() {
    const user = checkAuth();
    if (user) {
        document.getElementById('username-display').textContent = `${user.username}님 환영합니다!`;
    }
}

// 로그아웃 함수
function logout() {
    localStorage.removeItem('user');
    window.location.href = '/login.html';
}

// 페이지 로드 시 실행
document.addEventListener('DOMContentLoaded', () => {
    const user = checkAuth();
    if (user) {
        displayUserInfo();
        fetchGroups();
        
        // 그룹 추가 버튼 이벤트 리스너
        document.getElementById('add-group-btn').addEventListener('click', addGroup);
    }
});

// 그룹 목록 가져오기
async function fetchGroups() {
    try {
        const user = checkAuth();
        if (!user) return;

        console.log('그룹 조회 시도:', user.id); // 디버깅용

        const response = await fetch(`/api/groups?userId=${user.id}`);
        const data = await response.json();
        
        console.log('받아온 그룹 데이터:', data); // 디버깅용
        
        groups = data;
        renderGroups();
    } catch (error) {
        console.error('그룹 데이터 로딩 실패:', error);
    }
}

// 그룹 추가
async function addGroup() {
    const input = document.getElementById('group-input');
    const groupName = input.value.trim();
    const user = checkAuth();

    if (groupName && user) {
        try {
            console.log('그룹 추가 시도:', { name: groupName, userId: user.id }); // 디버깅용

            const response = await fetch('/api/groups', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ 
                    name: groupName,
                    userId: user.id 
                })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || '그룹 추가 실패');
            }

            const result = await response.json();
            console.log('그룹 추가 성공:', result); // 디버깅용

            await fetchGroups(); // 그룹 목록 새로고침
            input.value = ''; // 입력창 초기화
        } catch (error) {
            console.error('그룹 추가 중 오류:', error);
            alert(error.message);
        }
    }
}

// 그룹 삭제
async function deleteGroup(groupId) {
    try {
        const response = await fetch(`/api/groups/${groupId}`, {
            method: 'DELETE'
        });

        if (!response.ok) {
            throw new Error('그룹 삭제 실패');
        }

        await fetchGroups(); // 그룹 목록 새로고침
    } catch (error) {
        console.error('그룹 삭제 오류:', error);
        alert('그룹 삭제에 실패했습니다.');
    }
}

// 그룹 렌더링
function renderGroups() {
    const container = document.getElementById('groups-container');
    container.innerHTML = '';

    groups.forEach(group => {
        const groupDiv = document.createElement('div');
        groupDiv.className = 'group-container';
        groupDiv.id = `group-${group.id}`;
        
        groupDiv.innerHTML = `
            <div class="group-header">
                <h2 class="group-title">${group.name}</h2>
                <button class="delete-group-btn" onclick="deleteGroup(${group.id})">그룹 삭제</button>
            </div>
            <div class="input-container">
                <div class="input-row">
                    <input type="text" class="todo-input" placeholder="할 일을 입력하세요">
                </div>
                <div class="date-time-row">
                    <input type="date" class="date-input">
                    <input type="time" class="time-input">
                    <button class="add-btn" onclick="addTodo(${group.id})">추가</button>
                </div>
            </div>
            <ul class="todo-list"></ul>
        `;

        container.appendChild(groupDiv);
        fetchTodos(group.id);
    });
}

// 할일 목록 가져오기
async function fetchTodos(groupId) {
    try {
        const response = await fetch(`/api/todos/${groupId}`);
        const data = await response.json();
        todos[groupId] = data;
        renderTodos(groupId);
    } catch (error) {
        console.error('할일 로딩 실패:', error);
        todos[groupId] = [];
    }
}

// 할일 추가
async function addTodo(groupId) {
    const groupDiv = document.getElementById(`group-${groupId}`);
    const todoInput = groupDiv.querySelector('.todo-input');
    const dateInput = groupDiv.querySelector('.date-input');
    const timeInput = groupDiv.querySelector('.time-input');

    const text = todoInput.value.trim();
    const date = dateInput.value;
    const time = timeInput.value;

    if (text && date) {
        try {
            const response = await fetch('/api/todos', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    group_id: groupId,
                    text: text,
                    date: date,
                    time: time
                })
            });

            if (!response.ok) {
                throw new Error('할일 추가 실패');
            }

            // 입력 필드 초기화
            todoInput.value = '';
            dateInput.value = '';
            timeInput.value = '';

            // 할일 목록 새로고침
            await fetchTodos(groupId);
        } catch (error) {
            console.error('할일 추가 오류:', error);
            alert('할일 추가에 실패했습니다.');
        }
    }
}

// 할일 렌더링
function renderTodos(groupId) {
    const groupDiv = document.getElementById(`group-${groupId}`);
    const todoList = groupDiv.querySelector('.todo-list');
    todoList.innerHTML = '';

    if (!todos[groupId]) return;

    todos[groupId].forEach(todo => {
        const li = document.createElement('li');
        li.innerHTML = `
            <input type="checkbox" ${todo.completed ? 'checked' : ''} 
                onchange="toggleTodo(${groupId}, ${todo.id}, this.checked)">
            <span>${todo.text}</span>
            <span>${todo.date} ${todo.time || ''}</span>
            <button class="delete-btn" onclick="deleteTodo(${groupId}, ${todo.id})">삭제</button>
        `;
        todoList.appendChild(li);
    });
}

// 할일 상태 토글
async function toggleTodo(groupId, todoId, completed) {
    try {
        const response = await fetch(`/api/todos/${todoId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ completed })
        });

        if (!response.ok) {
            throw new Error('할일 상태 변경 실패');
        }

        await fetchTodos(groupId);
    } catch (error) {
        console.error('할일 상태 변경 오류:', error);
        alert('할일 상태 변경에 실패했습니다.');
    }
}

// 할일 삭제
async function deleteTodo(groupId, todoId) {
    try {
        const response = await fetch(`/api/todos/${todoId}`, {
            method: 'DELETE'
        });

        if (!response.ok) {
            throw new Error('할일 삭제 실패');
        }

        await fetchTodos(groupId);
    } catch (error) {
        console.error('할일 삭제 오류:', error);
        alert('할일 삭제에 실패했습니다.');
    }
}