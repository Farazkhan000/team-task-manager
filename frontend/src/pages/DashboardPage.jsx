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
    { label: 'Total Projects', value: stats.totalProjects },
    { label: 'Total Tasks', value: stats.totalTasks },
    { label: 'To Do', value: stats.todoTasks },
    { label: 'In Progress', value: stats.inProgressTasks },
    { label: 'Completed', value: stats.doneTasks },
    { label: 'Overdue', value: stats.overdueTasks },
    { label: 'Team Members', value: stats.totalMembers },
  ];

  return (
    <>
      <div className="page-header">
        <h1 className="page-title">Dashboard</h1>
      </div>
      <div className="page-body">
        {/* Stats Grid */}
        <div className="stats-grid">
          {statCards.map(({ label, value }) => (
            <div className="stat-card" key={label}>
              <span className="stat-value">{value}</span>
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
