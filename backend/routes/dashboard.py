from flask import Blueprint, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from models import Project, Task

dashboard_bp = Blueprint('dashboard', __name__)

@dashboard_bp.route('/', methods=['GET'])
@jwt_required()
def get_dashboard():
    user_id = get_jwt_identity()
    
    projects_count = Project.query.filter_by(owner_id=user_id).count()
    
    tasks_query = Task.query.join(Project).filter(
        (Task.assigned_to_id == user_id) | (Project.owner_id == user_id)
    )
    
    total_tasks = tasks_query.count()
    completed_tasks = tasks_query.filter(Task.status == 'DONE').count()
    pending_tasks = tasks_query.filter(Task.status != 'DONE').count()
    
    recent_tasks = tasks_query.order_by(Task.created_at.desc()).limit(5).all()
    
    return jsonify({
        "projectsCount": projects_count,
        "totalTasks": total_tasks,
        "completedTasks": completed_tasks,
        "pendingTasks": pending_tasks,
        "recentTasks": [t.to_dict() for t in recent_tasks]
    }), 200
