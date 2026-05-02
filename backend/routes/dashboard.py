from flask import Blueprint, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from models import Project, Task, User
from datetime import datetime

dashboard_bp = Blueprint('dashboard', __name__)

def task_to_dict_full(task):
    data = task.to_dict()
    data['project'] = {"name": task.project.name} if task.project else None
    data['assignedTo'] = {"name": task.assigned_to.name} if task.assigned_to else None
    return data

@dashboard_bp.route('/', methods=['GET'])
@jwt_required()
def get_dashboard():
    user_id = get_jwt_identity()
    now = datetime.utcnow()
    
    # Basic Counts
    total_projects = Project.query.filter_by(owner_id=user_id).count()
    total_members = User.query.count() # Or count members related to projects
    
    tasks_query = Task.query.join(Project).filter(
        (Task.assigned_to_id == user_id) | (Project.owner_id == user_id)
    )
    
    total_tasks = tasks_query.count()
    todo_tasks = tasks_query.filter(Task.status == 'TODO').count()
    in_progress_tasks = tasks_query.filter(Task.status == 'IN_PROGRESS').count()
    done_tasks = tasks_query.filter(Task.status == 'DONE').count()
    
    overdue_tasks_query = tasks_query.filter(Task.due_date < now, Task.status != 'DONE')
    overdue_tasks_count = overdue_tasks_query.count()
    
    recent_tasks = tasks_query.order_by(Task.created_at.desc()).limit(5).all()
    overdue_tasks_list = overdue_tasks_query.order_by(Task.due_date.asc()).all()
    
    return jsonify({
        "stats": {
            "totalProjects": total_projects,
            "totalTasks": total_tasks,
            "todoTasks": todo_tasks,
            "inProgressTasks": in_progress_tasks,
            "doneTasks": done_tasks,
            "overdueTasks": overdue_tasks_count,
            "totalMembers": total_members
        },
        "recentTasks": [task_to_dict_full(t) for t in recent_tasks],
        "overdueTasksList": [task_to_dict_full(t) for t in overdue_tasks_list]
    }), 200
