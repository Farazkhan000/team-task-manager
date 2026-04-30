import { useEffect, useState } from 'react';
import { dashboardApi } from '../services/api';

function formatDate(dateStr) {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  });
}

function isOverdue(dateStr) {
  return new Date(dateStr) < new Date() ;
}

const statusBadge = (status) => {
  const map = { TODO: 'badge-todo', IN_PROGRESS: 'badge-in-progress', DONE: 'badge-done' };
  const label = { TODO: 'To Do', IN_PROGRESS: 'In Progress', DONE: 'Done' };
  return <span className={`badge ${map[status] || ''}`}>{label[status] || status}</span>;
};

export default function DashboardPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    dashboardApi.get()
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className="loading-center"><div className="spinner"></div></div>;
  }

  if (!data) {
    return <div className="page-body"><div className="alert alert-error">Failed to load dashboard data.</div></div>;
  }

  const { stats, recentTasks, overdueTasksList } = data;

  const statCards = [
    { label: 'Total Projects', value: stats.totalProjects, color: '#6366f1' },
    { label: 'Total Tasks', value: stats.totalTasks, color: '#8b5cf6' },
    { label: 'To Do', value: stats.todoTasks, color: '#3b82f6' },
    { label: 'In Progress', value: stats.inProgressTasks, color: '#f59e0b' },
    { label: 'Completed', value: stats.doneTasks, color: '#22c55e' },
    { label: 'Overdue', value: stats.overdueTasks, color: '#ef4444' },
    { label: 'Team Members', value: stats.totalMembers, color: '#06b6d4' },
  ];

  return (
    <>
      <div className="page-header">
        <h1 className="page-title">Dashboard</h1>
      </div>
      <div className="page-body">
        {/* Stats Grid */}
        <div className="stats-grid">
          {statCards.map(({ label, value, color }) => (
            <div className="stat-card" key={label}>
              <span className="stat-value" style={{
                background: `linear-gradient(135deg, ${color}, ${color}cc)`,
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}>
                {value}
              </span>
              <span className="stat-label">{label}</span>
            </div>
          ))}
        </div>

        {/* Overdue Tasks */}
        {overdueTasksList.length > 0 && (
          <div className="dashboard-section">
            <h2 className="section-title">
              <span style={{ color: 'var(--danger)' }}>⚠</span> Overdue Tasks
            </h2>
            {overdueTasksList.map((task) => (
              <div className="task-item overdue" key={task.id}>
                <div className="task-info">
                  <div className="task-title">{task.title}</div>
                  <div className="task-meta">
                    <span>{task.project?.name}</span>
                    <span>•</span>
                    <span style={{ color: 'var(--danger)' }}>Due {formatDate(task.dueDate)}</span>
                    {task.assignedTo && (
                      <>
                        <span>•</span>
                        <span>{task.assignedTo.name}</span>
                      </>
                    )}
                  </div>
                </div>
                {statusBadge(task.status)}
              </div>
            ))}
          </div>
        )}

        {/* Recent Tasks */}
        <div className="dashboard-section">
          <h2 className="section-title">📋 Recent Tasks</h2>
          {recentTasks.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">📝</div>
              <div className="empty-state-title">No tasks yet</div>
              <div className="empty-state-text">Create a project and add tasks to get started.</div>
            </div>
          ) : (
            recentTasks.map((task) => (
              <div className={`task-item${isOverdue(task.dueDate) && task.status !== 'DONE' ? ' overdue' : ''}`} key={task.id}>
                <div className="task-info">
                  <div className="task-title">{task.title}</div>
                  <div className="task-meta">
                    <span>{task.project?.name}</span>
                    <span>•</span>
                    <span>Due {formatDate(task.dueDate)}</span>
                    {task.assignedTo && (
                      <>
                        <span>•</span>
                        <span>{task.assignedTo.name}</span>
                      </>
                    )}
                  </div>
                </div>
                {statusBadge(task.status)}
              </div>
            ))
          )}
        </div>
      </div>
    </>
  );
}
