import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Check, CheckCircle2, Circle, Edit3, Plus, RotateCcw, Trash2, X } from 'lucide-react';
import './styles.css';

const STORAGE_KEY = 'todolist-mvp.todos';
const UNDO_TIMEOUT_MS = 5000;

const seedTodos = [
  {
    id: 'welcome-1',
    title: '新增第一条待办',
    completed: false,
    createdAt: '2026-05-22T00:00:00.000Z',
  },
  {
    id: 'welcome-2',
    title: '点击圆圈切换完成状态',
    completed: true,
    createdAt: '2026-05-22T00:01:00.000Z',
  },
];

function loadTodos() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return seedTodos;
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return seedTodos;
    return parsed.filter((todo) => typeof todo?.id === 'string' && typeof todo?.title === 'string');
  } catch {
    return seedTodos;
  }
}

function createTodo(title) {
  return {
    id: crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    title,
    completed: false,
    createdAt: new Date().toISOString(),
  };
}

function App() {
  const [todos, setTodos] = useState(loadTodos);
  const [draft, setDraft] = useState('');
  const [error, setError] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editingTitle, setEditingTitle] = useState('');
  const [pendingDelete, setPendingDelete] = useState(null);
  const undoTimerRef = useRef(null);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(todos));
  }, [todos]);

  useEffect(() => {
    return () => window.clearTimeout(undoTimerRef.current);
  }, []);

  const stats = useMemo(() => {
    const completed = todos.filter((todo) => todo.completed).length;
    return {
      total: todos.length,
      completed,
      active: todos.length - completed,
    };
  }, [todos]);

  const sortedTodos = useMemo(
    () => [...todos].sort((left, right) => Number(left.completed) - Number(right.completed)),
    [todos],
  );

  function addTodo(event) {
    event.preventDefault();
    const title = draft.trim();
    if (!title) {
      setError('待办内容不能为空，请输入具体事项。');
      return;
    }

    setTodos((current) => [createTodo(title), ...current]);
    setDraft('');
    setError('');
  }

  function toggleTodo(id) {
    setTodos((current) =>
      current.map((todo) => (todo.id === id ? { ...todo, completed: !todo.completed } : todo)),
    );
  }

  function startEditing(todo) {
    setEditingId(todo.id);
    setEditingTitle(todo.title);
    setError('');
  }

  function saveEditing(id) {
    const title = editingTitle.trim();
    if (!title) {
      setError('编辑后的待办内容不能为空。');
      return;
    }

    setTodos((current) => current.map((todo) => (todo.id === id ? { ...todo, title } : todo)));
    setEditingId(null);
    setEditingTitle('');
    setError('');
  }

  function cancelEditing() {
    setEditingId(null);
    setEditingTitle('');
    setError('');
  }

  function deleteTodo(todo) {
    window.clearTimeout(undoTimerRef.current);
    setPendingDelete(todo);
    setTodos((current) => current.filter((item) => item.id !== todo.id));
    undoTimerRef.current = window.setTimeout(() => setPendingDelete(null), UNDO_TIMEOUT_MS);
  }

  function undoDelete() {
    if (!pendingDelete) return;
    window.clearTimeout(undoTimerRef.current);
    setTodos((current) => [pendingDelete, ...current]);
    setPendingDelete(null);
  }

  return (
    <main className="app-shell">
      <section className="hero" aria-labelledby="page-title">
        <div>
          <p className="eyebrow">Local-first MVP</p>
          <h1 id="page-title">今日待办清单</h1>
          <p className="hero-copy">新增、编辑、完成与撤销删除都会保存在当前浏览器中。</p>
        </div>
        <div className="score-card" aria-label="待办统计">
          <span>{stats.completed}/{stats.total}</span>
          <small>已完成</small>
        </div>
      </section>

      <form className="todo-form" onSubmit={addTodo} noValidate>
        <label htmlFor="new-todo">新增待办</label>
        <div className="input-row">
          <input
            id="new-todo"
            value={draft}
            onChange={(event) => {
              setDraft(event.target.value);
              if (error) setError('');
            }}
            placeholder="例如：整理 MVP 验收清单"
            aria-invalid={Boolean(error)}
            aria-describedby={error ? 'form-error' : undefined}
          />
          <button type="submit" className="primary-button">
            <Plus size={18} aria-hidden="true" />
            添加
          </button>
        </div>
        {error ? <p id="form-error" className="error-message">{error}</p> : null}
      </form>

      <section className="summary-grid" aria-label="待办概览">
        <StatCard label="全部" value={stats.total} />
        <StatCard label="未完成" value={stats.active} />
        <StatCard label="已完成" value={stats.completed} />
      </section>

      <section className="todo-panel" aria-label="待办列表">
        <div className="panel-header">
          <h2>列表</h2>
          <span>{stats.active ? `${stats.active} 项待完成` : '全部完成'}</span>
        </div>

        {sortedTodos.length ? (
          <ul className="todo-list">
            {sortedTodos.map((todo) => (
              <TodoItem
                key={todo.id}
                todo={todo}
                isEditing={editingId === todo.id}
                editingTitle={editingTitle}
                setEditingTitle={setEditingTitle}
                onToggle={() => toggleTodo(todo.id)}
                onEdit={() => startEditing(todo)}
                onSave={() => saveEditing(todo.id)}
                onCancel={cancelEditing}
                onDelete={() => deleteTodo(todo)}
              />
            ))}
          </ul>
        ) : (
          <div className="empty-state">
            <CheckCircle2 size={44} aria-hidden="true" />
            <p>清单为空，添加一条待办开始规划今天。</p>
          </div>
        )}
      </section>

      {pendingDelete ? (
        <aside className="undo-toast" role="status" aria-live="polite">
          <span>已删除“{pendingDelete.title}”</span>
          <button type="button" onClick={undoDelete}>
            <RotateCcw size={16} aria-hidden="true" />
            撤销
          </button>
        </aside>
      ) : null}
    </main>
  );
}

function StatCard({ label, value }) {
  return (
    <div className="stat-card">
      <strong>{value}</strong>
      <span>{label}</span>
    </div>
  );
}

function TodoItem({
  todo,
  isEditing,
  editingTitle,
  setEditingTitle,
  onToggle,
  onEdit,
  onSave,
  onCancel,
  onDelete,
}) {
  return (
    <li className={todo.completed ? 'todo-item completed' : 'todo-item'}>
      <button className="toggle-button" type="button" onClick={onToggle} aria-label="切换完成状态">
        {todo.completed ? <CheckCircle2 size={24} /> : <Circle size={24} />}
      </button>

      {isEditing ? (
        <input
          className="edit-input"
          value={editingTitle}
          onChange={(event) => setEditingTitle(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') onSave();
            if (event.key === 'Escape') onCancel();
          }}
          autoFocus
          aria-label="编辑待办标题"
        />
      ) : (
        <span className="todo-title">{todo.title}</span>
      )}

      <div className="actions">
        {isEditing ? (
          <>
            <button type="button" className="icon-button save" onClick={onSave} aria-label="保存编辑">
              <Check size={18} />
            </button>
            <button type="button" className="icon-button" onClick={onCancel} aria-label="取消编辑">
              <X size={18} />
            </button>
          </>
        ) : (
          <>
            <button type="button" className="icon-button" onClick={onEdit} aria-label="编辑待办">
              <Edit3 size={18} />
            </button>
            <button type="button" className="icon-button danger" onClick={onDelete} aria-label="删除待办">
              <Trash2 size={18} />
            </button>
          </>
        )}
      </div>
    </li>
  );
}

createRoot(document.getElementById('root')).render(<App />);
