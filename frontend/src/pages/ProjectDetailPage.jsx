import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { projectsApi, tasksApi, usersApi } from '../services/api';
import { useAuth } from '../context/AuthContext';
import Modal from '../components/Modal';

function formatDate(d) {
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

const statusBadge = (status) => {
  const map = { TODO: 'badge-todo', IN_PROGRESS: 'badge-in-progress', DONE: 'badge-done' };
  const label = { TODO: 'To Do', IN_PROGRESS: 'In Progress', DONE: 'Done' };
  return <span className={`badge ${map[status] || ''}`}>{label[status] || status}</span>;
};

export default function ProjectDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [project, setProject] = useState(null);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editTask, setEditTask] = useState(null);
  const [taskForm, setTaskForm] = useState({ title: '', description: '', dueDate: '', assignedToId: '', status: 'TODO' });
  const [editForm, setEditForm] = useState({ name: '', description: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const fetchProject = () => {
    projectsApi.get(id)
      .then(setProject)
      .catch(() => navigate('/projects'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchProject();
    usersApi.list().then(setUsers).catch(console.error);
  }, [id]);

  const canManage = project && (project.ownerId === user?.id || user?.role === 'ADMIN');

  const handleCreateTask = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      await tasksApi.create({ ...taskForm, projectId: id });
      setTaskForm({ title: '', description: '', dueDate: '', assignedToId: '', status: 'TODO' });
      setShowTaskModal(false);
      fetchProject();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateTask = async (e) => {
    e.preventDefault();
    if (!editTask) return;
    setSaving(true);
    setError('');
    try {
      await tasksApi.update(editTask.id, taskForm);
      setEditTask(null);
      setShowTaskModal(false);
      fetchProject();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteTask = async (taskId) => {
    if (!confirm('Delete this task?')) return;
    try {
      await tasksApi.delete(taskId);
      fetchProject();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleStatusChange = async (taskId, newStatus) => {
    try {
      await tasksApi.update(taskId, { status: newStatus });
      fetchProject();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleDeleteProject = async () => {
    if (!confirm('Delete this project and all its tasks?')) return;
    try {
      await projectsApi.delete(id);
      navigate('/projects');
    } catch (err) {
      alert(err.message);
    }
  };

  const handleEditProject = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await projectsApi.update(id, editForm);
      setShowEditModal(false);
      fetchProject();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const openEditTask = (task) => {
    setEditTask(task);
    setTaskForm({
      title: task.title,
      description: task.description || '',
      dueDate: task.dueDate ? task.dueDate.split('T')[0] : '',
      assignedToId: task.assignedToId || '',
      status: task.status,
    });
    setError('');
    setShowTaskModal(true);
  };

  const openNewTask = () => {
    setEditTask(null);
    setTaskForm({ title: '', description: '', dueDate: '', assignedToId: '', status: 'TODO' });
    setError('');
    setShowTaskModal(true);
  };

  if (loading) {
    return <div className="loading-center"><div className="spinner"></div></div>;
  }

  if (!project) return null;

  const isOverdue = (d, status) => new Date(d) < new Date() && status !== 'DONE';

  // Group tasks by status
  const groups = [
    { key: 'TODO', label: 'To Do', color: 'var(--info)' },
    { key: 'IN_PROGRESS', label: 'In Progress', color: 'var(--warning)' },
    { key: 'DONE', label: 'Done', color: 'var(--success)' },
  ];

  return (
    <>
      <div className="page-header">
        <div>
          <button className="btn btn-ghost btn-sm" onClick={() => navigate('/projects')} style={{ marginBottom: '4px' }}>
            ← Back to Projects
          </button>
          <h1 className="page-title">{project.name}</h1>
          {project.description && (
            <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--font-sm)', marginTop: '4px' }}>
              {project.description}
            </p>
          )}
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          {canManage && (
            <>
              <button className="btn btn-secondary btn-sm" onClick={() => {
                setEditForm({ name: project.name, description: project.description || '' });
                setShowEditModal(true);
              }}>
                Edit
              </button>
              <button className="btn btn-danger btn-sm" onClick={handleDeleteProject}>Delete</button>
            </>
          )}
          <button className="btn btn-primary btn-sm" onClick={openNewTask}>+ Add Task</button>
        </div>
      </div>

      <div className="page-body">
        {/* Task columns by status */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 'var(--space-5)' }}>
          {groups.map(({ key, label, color }) => {
            const tasks = project.tasks?.filter(t => t.status === key) || [];
            return (
              <div key={key}>
                <h3 style={{
                  fontSize: 'var(--font-sm)',
                  fontWeight: 700,
                  color,
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  marginBottom: 'var(--space-4)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 'var(--space-2)',
                }}>
                  <span style={{
                    width: 8, height: 8, borderRadius: '50%', background: color, display: 'inline-block',
                  }} />
                  {label} ({tasks.length})
                </h3>
                {tasks.length === 0 ? (
                  <div style={{
                    padding: 'var(--space-6)',
                    textAlign: 'center',
                    color: 'var(--text-muted)',
                    fontSize: 'var(--font-sm)',
                    border: '1px dashed var(--border-color)',
                    borderRadius: 'var(--radius-md)',
                  }}>
                    No tasks
                  </div>
                ) : (
                  tasks.map((task) => (
                    <div
                      className={`task-item${isOverdue(task.dueDate, task.status) ? ' overdue' : ''}`}
                      key={task.id}
                      style={{ flexDirection: 'column', alignItems: 'stretch' }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div className="task-title">{task.title}</div>
                        {isOverdue(task.dueDate, task.status) && (
                          <span className="badge badge-overdue">Overdue</span>
                        )}
                      </div>
                      {task.description && (
                        <p style={{ fontSize: 'var(--font-xs)', color: 'var(--text-secondary)', margin: '4px 0 8px' }}>
                          {task.description}
                        </p>
                      )}
                      <div className="task-meta" style={{ marginBottom: '8px' }}>
                        <span>Due {formatDate(task.dueDate)}</span>
                        {task.assignedTo && (
                          <>
                            <span>•</span>
                            <span>{task.assignedTo.name}</span>
                          </>
                        )}
                      </div>
                      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                        <select
                          className="form-select"
                          value={task.status}
                          onChange={(e) => handleStatusChange(task.id, e.target.value)}
                          style={{ padding: '4px 28px 4px 8px', fontSize: 'var(--font-xs)', flex: 1 }}
                        >
                          <option value="TODO">To Do</option>
                          <option value="IN_PROGRESS">In Progress</option>
                          <option value="DONE">Done</option>
                        </select>
                        <button className="btn btn-ghost btn-sm" onClick={() => openEditTask(task)}>Edit</button>
                        {canManage && (
                          <button className="btn btn-ghost btn-sm" style={{ color: 'var(--danger)' }} onClick={() => handleDeleteTask(task.id)}>
                            Del
                          </button>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Create/Edit Task Modal */}
      {showTaskModal && (
        <Modal onClose={() => { setShowTaskModal(false); setEditTask(null); }} title={editTask ? 'Edit Task' : 'New Task'}>
          {error && <div className="alert alert-error">{error}</div>}
          <form onSubmit={editTask ? handleUpdateTask : handleCreateTask}>
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
            {editTask && (
              <div className="form-group" style={{ marginBottom: '14px' }}>
                <label className="form-label">Status</label>
                <select className="form-select" value={taskForm.status} onChange={(e) => setTaskForm({ ...taskForm, status: e.target.value })}>
                  <option value="TODO">To Do</option>
                  <option value="IN_PROGRESS">In Progress</option>
                  <option value="DONE">Done</option>
                </select>
              </div>
            )}
            <div className="modal-actions">
              <button type="button" className="btn btn-secondary" onClick={() => { setShowTaskModal(false); setEditTask(null); }}>Cancel</button>
              <button type="submit" className="btn btn-primary" disabled={saving}>
                {saving ? 'Saving…' : editTask ? 'Update Task' : 'Create Task'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Edit Project Modal */}
      {showEditModal && (
        <Modal onClose={() => setShowEditModal(false)} title="Edit Project">
          <form onSubmit={handleEditProject}>
            <div className="form-group" style={{ marginBottom: '14px' }}>
              <label className="form-label">Project Name</label>
              <input className="form-input" type="text" value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} required />
            </div>
            <div className="form-group" style={{ marginBottom: '14px' }}>
              <label className="form-label">Description</label>
              <textarea className="form-textarea" value={editForm.description} onChange={(e) => setEditForm({ ...editForm, description: e.target.value })} />
            </div>
            <div className="modal-actions">
              <button type="button" className="btn btn-secondary" onClick={() => setShowEditModal(false)}>Cancel</button>
              <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Saving…' : 'Save Changes'}</button>
            </div>
          </form>
        </Modal>
      )}
    </>
  );
}
