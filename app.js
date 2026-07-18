const express = require('express');
const mysql = require('mysql2');
const app = express();
const port = 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const db = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT || 3306
});

// Create table if not exists (runs on startup)
db.query(`
  CREATE TABLE IF NOT EXISTS todos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    task VARCHAR(255) NOT NULL,
    done BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )
`, (err) => {
  if (err) console.error('Table creation failed:', err.message);
  else console.log('Todos table ready');
});

// Health check for ALB/ECS
app.get('/health', (req, res) => res.status(200).send('OK'));

// Get all todos
app.get('/api/todos', (req, res) => {
  db.query('SELECT * FROM todos ORDER BY id DESC', (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(results);
  });
});

// Add todo
app.post('/api/todos', (req, res) => {
  const { task } = req.body;
  if (!task) return res.status(400).json({ error: 'Task is required' });
  db.query('INSERT INTO todos (task) VALUES (?)', [task], (err, result) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ id: result.insertId, task, done: false });
  });
});

// Toggle done
app.patch('/api/todos/:id', (req, res) => {
  const { done } = req.body;
  db.query('UPDATE todos SET done = ? WHERE id = ?', [done, req.params.id], (err) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ success: true });
  });
});

// Delete todo
app.delete('/api/todos/:id', (req, res) => {
  db.query('DELETE FROM todos WHERE id = ?', [req.params.id], (err) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ success: true });
  });
});

// Serve frontend
app.get('/', (req, res) => {
  res.send(getHtml());
});

app.listen(port, () => console.log(`Todo app listening on port ${port}`));

function getHtml() {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>SHOWDOWN // Todo List</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Rajdhani:wght@500;600;700&display=swap');

  :root {
    --hero-color: #00e5ff;
    --rival-color: #ff2d55;
    --bg: #0b0d14;
    --panel: #12151f;
    --line: #232838;
    --text: #e8ecf5;
    --muted: #7b8299;
  }

  * { box-sizing: border-box; margin: 0; padding: 0; }

  body {
    font-family: 'Rajdhani', sans-serif;
    background: var(--bg);
    color: var(--text);
    min-height: 100vh;
    overflow-x: hidden;
    position: relative;
  }

  /* speed line background */
  body::before {
    content: '';
    position: fixed;
    inset: 0;
    background:
      repeating-linear-gradient(115deg, rgba(0,229,255,0.035) 0px, rgba(0,229,255,0.035) 2px, transparent 2px, transparent 40px),
      repeating-linear-gradient(65deg, rgba(255,45,85,0.035) 0px, rgba(255,45,85,0.035) 2px, transparent 2px, transparent 40px);
    pointer-events: none;
    z-index: 0;
  }

  .wrap {
    max-width: 640px;
    margin: 0 auto;
    padding: 28px 20px 60px;
    position: relative;
    z-index: 1;
  }

  /* VS banner */
  .vs-banner {
    position: relative;
    height: 150px;
    display: flex;
    align-items: center;
    justify-content: center;
    margin-bottom: 8px;
  }

  .fighter {
    position: absolute;
    top: 0;
    width: 44%;
    height: 150px;
    display: flex;
    align-items: flex-end;
    justify-content: center;
  }

  .fighter.left { left: 0; transform: skewX(-6deg); }
  .fighter.right { right: 0; transform: skewX(6deg); }

  .fighter svg { width: 100%; height: 100%; }

  .vs-text {
    font-family: 'Bebas Neue', sans-serif;
    font-size: 54px;
    letter-spacing: 2px;
    color: var(--text);
    text-shadow: 0 0 18px rgba(255,255,255,0.25);
    z-index: 3;
    -webkit-text-stroke: 1px #000;
  }

  .title {
    text-align: center;
    font-family: 'Bebas Neue', sans-serif;
    font-size: 34px;
    letter-spacing: 6px;
    background: linear-gradient(90deg, var(--hero-color), var(--rival-color));
    -webkit-background-clip: text;
    background-clip: text;
    color: transparent;
    margin-bottom: 4px;
  }

  .subtitle {
    text-align: center;
    color: var(--muted);
    font-size: 13px;
    letter-spacing: 3px;
    text-transform: uppercase;
    margin-bottom: 26px;
  }

  .input-row {
    display: flex;
    gap: 10px;
    margin-bottom: 22px;
  }

  #task {
    flex: 1;
    background: var(--panel);
    border: 2px solid var(--line);
    border-radius: 6px;
    padding: 14px 16px;
    color: var(--text);
    font-family: 'Rajdhani', sans-serif;
    font-size: 16px;
    font-weight: 600;
    outline: none;
    transition: border-color .2s, box-shadow .2s;
  }

  #task:focus {
    border-color: var(--hero-color);
    box-shadow: 0 0 0 3px rgba(0,229,255,0.15);
  }

  #task::placeholder { color: var(--muted); }

  button.add-btn {
    background: linear-gradient(135deg, var(--hero-color), #0077ff);
    border: none;
    border-radius: 6px;
    padding: 0 26px;
    font-family: 'Bebas Neue', sans-serif;
    font-size: 18px;
    letter-spacing: 2px;
    color: #001018;
    cursor: pointer;
    transition: transform .15s, box-shadow .15s;
    clip-path: polygon(10% 0, 100% 0, 90% 100%, 0% 100%);
  }

  button.add-btn:hover {
    transform: translateY(-2px);
    box-shadow: 0 6px 20px rgba(0,229,255,0.35);
  }

  .stats {
    display: flex;
    justify-content: space-between;
    color: var(--muted);
    font-size: 13px;
    letter-spacing: 1px;
    margin-bottom: 14px;
    padding: 0 4px;
  }

  .stats span b { color: var(--text); }

  ul#list { list-style: none; }

  li.todo-item {
    background: var(--panel);
    border: 1px solid var(--line);
    border-left: 4px solid var(--hero-color);
    border-radius: 6px;
    padding: 14px 16px;
    margin-bottom: 10px;
    display: flex;
    align-items: center;
    gap: 12px;
    animation: slideIn .25s ease;
    transition: border-color .2s, opacity .2s;
  }

  li.todo-item:nth-child(even) { border-left-color: var(--rival-color); }

  li.todo-item.done {
    opacity: 0.45;
    border-left-color: var(--line);
  }

  li.todo-item.done .task-text {
    text-decoration: line-through;
  }

  @keyframes slideIn {
    from { opacity: 0; transform: translateX(-14px); }
    to { opacity: 1; transform: translateX(0); }
  }

  .check {
    width: 22px;
    height: 22px;
    border: 2px solid var(--muted);
    border-radius: 50%;
    cursor: pointer;
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 13px;
    color: transparent;
    transition: all .15s;
  }

  .check:hover { border-color: var(--hero-color); }

  li.todo-item.done .check {
    background: var(--hero-color);
    border-color: var(--hero-color);
    color: #001018;
  }

  .task-text {
    flex: 1;
    font-size: 16px;
    font-weight: 600;
  }

  .del-btn {
    background: transparent;
    border: 1px solid var(--rival-color);
    color: var(--rival-color);
    border-radius: 4px;
    padding: 6px 12px;
    font-family: 'Rajdhani', sans-serif;
    font-weight: 700;
    font-size: 12px;
    letter-spacing: 1px;
    cursor: pointer;
    transition: all .15s;
  }

  .del-btn:hover {
    background: var(--rival-color);
    color: #fff;
  }

  .empty {
    text-align: center;
    color: var(--muted);
    padding: 40px 0;
    font-size: 14px;
    letter-spacing: 1px;
  }
</style>
</head>
<body>
<div class="wrap">

  <div class="vs-banner">
    <div class="fighter left">
      <svg viewBox="0 0 200 150" preserveAspectRatio="xMidYMax meet">
        <polygon points="0,150 30,20 100,0 130,40 90,150" fill="#00e5ff" opacity="0.15"/>
        <path d="M100 30 L120 60 L110 150 L90 150 L80 60 Z" fill="#0b0d14" stroke="#00e5ff" stroke-width="2"/>
        <circle cx="100" cy="18" r="16" fill="#0b0d14" stroke="#00e5ff" stroke-width="2"/>
        <path d="M84 12 Q100 -8 116 12" fill="none" stroke="#00e5ff" stroke-width="3"/>
      </svg>
    </div>
    <div class="vs-text">VS</div>
    <div class="fighter right">
      <svg viewBox="0 0 200 150" preserveAspectRatio="xMidYMax meet">
        <polygon points="200,150 170,20 100,0 70,40 110,150" fill="#ff2d55" opacity="0.15"/>
        <path d="M100 30 L80 60 L90 150 L110 150 L120 60 Z" fill="#0b0d14" stroke="#ff2d55" stroke-width="2"/>
        <circle cx="100" cy="18" r="16" fill="#0b0d14" stroke="#ff2d55" stroke-width="2"/>
        <path d="M84 12 Q100 -8 116 12" fill="none" stroke="#ff2d55" stroke-width="3"/>
      </svg>
    </div>
  </div>

  <div class="title">TASK SHOWDOWN</div>
  <div class="subtitle">Clear every task before the bell rings</div>

  <div class="input-row">
    <input id="task" placeholder="Enter your next challenge..." onkeydown="if(event.key==='Enter')addTodo()">
    <button class="add-btn" onclick="addTodo()">FIGHT</button>
  </div>

  <div class="stats">
    <span>PENDING: <b id="pendingCount">0</b></span>
    <span>CLEARED: <b id="doneCount">0</b></span>
  </div>

  <ul id="list"></ul>
</div>

<script>
  async function loadTodos() {
    const res = await fetch('/api/todos');
    const todos = await res.json();
    const list = document.getElementById('list');

    if (todos.length === 0) {
      list.innerHTML = '<div class="empty">No challenges yet. Add one to begin the match.</div>';
    } else {
      list.innerHTML = todos.map(t => \`
        <li class="todo-item \${t.done ? 'done' : ''}">
          <div class="check" onclick="toggleTodo(\${t.id}, \${!t.done})">\${t.done ? '✓' : ''}</div>
          <div class="task-text">\${escapeHtml(t.task)}</div>
          <button class="del-btn" onclick="deleteTodo(\${t.id})">KO</button>
        </li>
      \`).join('');
    }

    document.getElementById('pendingCount').textContent = todos.filter(t => !t.done).length;
    document.getElementById('doneCount').textContent = todos.filter(t => t.done).length;
  }

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  async function addTodo() {
    const input = document.getElementById('task');
    const task = input.value.trim();
    if (!task) return;
    await fetch('/api/todos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ task })
    });
    input.value = '';
    loadTodos();
  }

  async function toggleTodo(id, done) {
    await fetch('/api/todos/' + id, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ done })
    });
    loadTodos();
  }

  async function deleteTodo(id) {
    await fetch('/api/todos/' + id, { method: 'DELETE' });
    loadTodos();
  }

  loadTodos();
</script>
</body>
</html>`;
}
