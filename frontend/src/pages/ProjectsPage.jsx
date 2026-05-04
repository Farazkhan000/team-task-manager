import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { projectsApi } from '../services/api';
import Modal from '../components/Modal';

export default function ProjectsPage() {
  const navigate = useNavigate();
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ name: '', description: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const fetchProjects = () => {
    projectsApi.list()
      .then(setProjects)
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchProjects(); }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      await projectsApi.create(form);
      setForm({ name: '', description: '' });
      setShowModal(false);
      fetchProjects();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="loading-center"><div className="spinner"></div></div>;
  }

  return (
    <>
      <div className="page-header">
        <h1 className="page-title">Projects</h1>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>
          + New Project
        </button>
      </div>
      <div className="page-body">
        {projects.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">📂</div>
            <div className="empty-state-title">No projects yet</div>
            <div className="empty-state-text">Create your first project to get started.</div>
            <button className="btn btn-primary" onClick={() => setShowModal(true)}>
              + Create Project
            </button>
          </div>
        ) : (
          <div className="project-grid">
            {projects.map((project) => {
              const totalTasks = project.tasks?.length || 0;
              const doneTasks = project.tasks?.filter(t => t.status === 'DONE').length || 0;
              return (
                <div
                  className="project-card"
                  key={project.id}
                  onClick={() => navigate(`/projects/${project.id}`)}
                >
                  <div className="project-card-name">{project.name}</div>
                  <div className="project-card-desc">{project.description || 'No description'}</div>
                  <div className="project-card-meta">
                    <span className="project-task-count">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>
                      {doneTasks}/{totalTasks} tasks
                    </span>
                    <span>by {project.owner?.name}</span>
                  </div>
                  {/* Progress bar */}
                  {totalTasks > 0 && (
                    <div className="progress-container">
                      <div className="progress-bar" style={{ width: `${(doneTasks / totalTasks) * 100}%` }} />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Create Project Modal */}
      {showModal && (
        <Modal onClose={() => setShowModal(false)} title="New Project">
          {error && <div className="alert alert-error">{error}</div>}
          <form onSubmit={handleCreate}>
            <div className="form-group" style={{ marginBottom: '16px' }}>
              <label className="form-label" htmlFor="proj-name">Project Name</label>
              <input
                id="proj-name"
                className="form-input"
                type="text"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="My Awesome Project"
                required
              />
            </div>
            <div className="form-group" style={{ marginBottom: '16px' }}>
              <label className="form-label" htmlFor="proj-desc">Description</label>
              <textarea
                id="proj-desc"
                className="form-textarea"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="What is this project about?"
              />
            </div>
            <div className="modal-actions">
              <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
              <button type="submit" className="btn btn-primary" disabled={saving}>
                {saving ? 'Creating…' : 'Create Project'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </>
  );
}
