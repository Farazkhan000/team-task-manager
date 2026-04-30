import { useEffect, useState } from 'react';
import { tasksApi, usersApi } from '../services/api';
import Modal from '../components/Modal';

function formatDate(d) {
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

const statusBadge = (status) => {
  const map = { TODO: 'badge-todo', IN_PROGRESS: 'badge-in-progress', DONE: 'badge-done' };
  const label = { TODO: 'To Do', IN_PROGRESS: 'In Progress', DONE: 'Done' };
  return <span className={`badge ${map[status] || ''}`}>{label[status] || status}</span>;
};

export default function TasksPage() {
  const [tasks, setTasks] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('ALL');
  const [editTask, setEditTask] = useState(null);
  const [taskForm, setTaskForm] = useState({ title: '', description: '', dueDate: '', assignedToId: '', status: 'TODO' });
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const fetchTasks = () => {
    tasksApi.list()
      .then(setTasks)
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchTasks();
    usersApi.list().then(setUsers).catch(console.error);
  }, []);

  const handleStatusChange = async (taskId, newStatus) => {
    try {
      await tasksApi.update(taskId, { status: newStatus });
      fetchTasks();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleUpdateTask = async (e) => {
    e.preventDefault();
    if (!editTask) return;
    setSaving(true);
    setError('');
    try {
      await tasksApi.update(editTask.id, taskForm);
      setShowModal(false);
      setEditTask(null);
      fetchTasks();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const openEdit = (task) => {
    setEditTask(task);
    setTaskForm({
      title: task.title,
      description: task.description || '',
      dueDate: task.dueDate ? task.dueDate.split('T')[0] : '',
      assignedToId: task.assignedToId || '',
      status: task.status,
    });
    setError('');
    setShowModal(true);
  };

  const filtered = filter === 'ALL' ? tasks : tasks.filter(t => {
    if (filter === 'OVERDUE') return new Date(t.dueDate) < new Date() && t.status !== 'DONE';
    return t.status === filter;
  });

  const isOverdue = (d, status) => new Date(d) < new Date() && status !== 'DONE';

  if (loading) {
    return <div className="loading-center"><div className="spinner"></div></div>;
  }

  return (
    <>
      <div className="page-header">
        <h1 className="page-title">All Tasks</h1>
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          {['ALL', 'TODO', 'IN_PROGRESS', 'DONE', 'OVERDUE'].map(f => (
            <button
              key={f}
              className={`btn btn-sm ${filter === f ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setFilter(f)}
            >
              {f === 'ALL' ? 'All' : f === 'IN_PROGRESS' ? 'In Progress' : f === 'TODO' ? 'To Do' : f === 'OVERDUE' ? '⚠ Overdue' : 'Done'}
            </button>
          ))}
        </div>
      </div>
      <div className="page-body">
        {filtered.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">✅</div>
            <div className="empty-state-title">No tasks found</div>
            <div className="empty-state-text">
              {filter === 'ALL'
                ? 'Create a project and add tasks to see them here.'
                : 'No tasks match this filter.'}
            </div>
          </div>
        ) : (
          <div className="table-wrapper">
            <table className="table">
              <thead>
                <tr>
                  <th>Task</th>
                  <th>Project</th>
                  <th>Assigned To</th>
                  <th>Due Date</th>
                  <th>Status</th>
                  <th style={{ width: 100 }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(task => (
                  <tr key={task.id} style={isOverdue(task.dueDate, task.status) ? { borderLeft: '3px solid var(--danger)' } : {}}>
                    <td>
                      <div style={{ fontWeight: 600 }}>{task.title}</div>
                      {task.description && (
                        <div style={{ fontSize: 'var(--font-xs)', color: 'var(--text-muted)', marginTop: '2px' }}>
                          {task.description.substring(0, 80)}{task.description.length > 80 ? '…' : ''}
                        </div>
                      )}
                    </td>
                    <td>{task.project?.name || '—'}</td>
                    <td>{task.assignedTo?.name || <span style={{ color: 'var(--text-muted)' }}>Unassigned</span>}</td>
                    <td style={isOverdue(task.dueDate, task.status) ? { color: 'var(--danger)', fontWeight: 600 } : {}}>
                      {formatDate(task.dueDate)}
                      {isOverdue(task.dueDate, task.status) && (
                        <span className="badge badge-overdue" style={{ marginLeft: 6 }}>Overdue</span>
                      )}
                    </td>
                    <td>
                      <select
                        className="form-select"
                        value={task.status}
                        onChange={(e) => handleStatusChange(task.id, e.target.value)}
                        style={{ padding: '4px 28px 4px 8px', fontSize: 'var(--font-xs)' }}
                      >
                        <option value="TODO">To Do</option>
                        <option value="IN_PROGRESS">In Progress</option>
                        <option value="DONE">Done</option>
                      </select>
                    </td>
                    <td>
                      <button className="btn btn-ghost btn-sm" onClick={() => openEdit(task)}>Edit</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Edit Task Modal */}
      {showModal && editTask && (
        <Modal onClose={() => { setShowModal(false); setEditTask(null); }} title="Edit Task">
          {error && <div className="alert alert-error">{error}</div>}
          <form onSubmit={handleUpdateTask}>
            <div className="form-group" style={{ marginBottom: '14px' }}>
              <label className="form-label">Title</label>
              <input className="form-input" type="text" value={taskForm.title} onChange={(e) => setTaskForm({ ...taskForm, title: e.target.value })} required />
            </div>
            <div className="form-group" style={{ marginBottom: '14px' }}>
              <label className="form-label">Description</label>
              <textarea className="form-textarea" value={taskForm.description} onChange={(e) => setTaskForm({ ...taskForm, description: e.target.value })} />
            </div>
            <div className="form-group" style={{ marginBottom: '14px' }}>
              <label className="form-label">Due Date</label>
              <input className="form-input" type="date" value={taskForm.dueDate} onChange={(e) => setTaskForm({ ...taskForm, dueDate: e.target.value })} required />
            </div>
            <div className="form-group" style={{ marginBottom: '14px' }}>
              <label className="form-label">Assign To</label>
              <select className="form-select" value={taskForm.assignedToId} onChange={(e) => setTaskForm({ ...taskForm, assignedToId: e.target.value })}>
                <option value="">Unassigned</option>
                {users.map(u => <option key={u.id} value={u.id}>{u.name} ({u.email})</option>)}
              </select>
            </div>
            <div className="form-group" style={{ marginBottom: '14px' }}>
              <label className="form-label">Status</label>
              <select className="form-select" value={taskForm.status} onChange={(e) => setTaskForm({ ...taskForm, status: e.target.value })}>
                <option value="TODO">To Do</option>
                <option value="IN_PROGRESS">In Progress</option>
                <option value="DONE">Done</option>
              </select>
            </div>
            <div className="modal-actions">
              <button type="button" className="btn btn-secondary" onClick={() => { setShowModal(false); setEditTask(null); }}>Cancel</button>
              <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Saving…' : 'Update Task'}</button>
            </div>
          </form>
        </Modal>
      )}
    </>
  );
}
