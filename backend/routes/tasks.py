from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from models import db, Task, Project
from datetime import datetime

tasks_bp = Blueprint('tasks', __name__)

@tasks_bp.route('/', methods=['GET'])
@jwt_required()
def get_tasks():
    user_id = get_jwt_identity()
    # Find tasks where user is assigned or is owner of the project
    tasks = Task.query.join(Project).filter(
        (Task.assigned_to_id == user_id) | (Project.owner_id == user_id)
    ).all()
    return jsonify([t.to_dict() for t in tasks]), 200

@tasks_bp.route('/<id>', methods=['GET'])
@jwt_required()
def get_task(id):
    user_id = get_jwt_identity()
    task = Task.query.join(Project).filter(
        Task.id == id,
        ((Task.assigned_to_id == user_id) | (Project.owner_id == user_id))
    ).first()
    
    if not task:
        return jsonify({"error": "Task not found"}), 404
    return jsonify(task.to_dict()), 200

@tasks_bp.route('/', methods=['POST'])
@jwt_required()
def create_task():
    user_id = get_jwt_identity()
    data = request.get_json()
    
    if not data.get('title') or not data.get('projectId') or not data.get('dueDate'):
        return jsonify({"error": "Missing required fields"}), 400
        
    # Check if project exists and user owns it
    project = Project.query.filter_by(id=data['projectId'], owner_id=user_id).first()
    if not project:
        return jsonify({"error": "Project not found or unauthorized"}), 403
        
    try:
        due_date = datetime.fromisoformat(data['dueDate'].replace('Z', '+00:00'))
    except ValueError:
        return jsonify({"error": "Invalid date format"}), 400

    new_task = Task(
        title=data['title'],
        description=data.get('description', ''),
        status=data.get('status', 'TODO'),
        due_date=due_date,
        project_id=data['projectId'],
        assigned_to_id=data.get('assignedToId')
    )
    
    db.session.add(new_task)
    db.session.commit()
    
    return jsonify(new_task.to_dict()), 201

@tasks_bp.route('/<id>', methods=['PUT'])
@jwt_required()
def update_task(id):
    user_id = get_jwt_identity()
    task = Task.query.join(Project).filter(
        Task.id == id,
        ((Task.assigned_to_id == user_id) | (Project.owner_id == user_id))
    ).first()
    
    if not task:
        return jsonify({"error": "Task not found"}), 404
        
    data = request.get_json()
    task.title = data.get('title', task.title)
    task.description = data.get('description', task.description)
    task.status = data.get('status', task.status)
    task.assigned_to_id = data.get('assignedToId', task.assigned_to_id)
    
    if data.get('dueDate'):
        try:
            task.due_date = datetime.fromisoformat(data['dueDate'].replace('Z', '+00:00'))
        except ValueError:
            return jsonify({"error": "Invalid date format"}), 400
            
    db.session.commit()
    return jsonify(task.to_dict()), 200

@tasks_bp.route('/<id>', methods=['DELETE'])
@jwt_required()
def delete_task(id):
    user_id = get_jwt_identity()
    # Only project owner can delete tasks
    task = Task.query.join(Project).filter(
        Task.id == id,
        Project.owner_id == user_id
    ).first()
    
    if not task:
        return jsonify({"error": "Task not found or unauthorized"}), 404
        
    db.session.delete(task)
    db.session.commit()
    return jsonify({"message": "Task deleted successfully"}), 200
