from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from models import db, Project

projects_bp = Blueprint('projects', __name__)

@projects_bp.route('/', methods=['GET'])
@jwt_required()
def get_projects():
    user_id = get_jwt_identity()
    projects = Project.query.filter_by(owner_id=user_id).all()
    return jsonify([p.to_dict() for p in projects]), 200

@projects_bp.route('/<id>', methods=['GET'])
@jwt_required()
def get_project(id):
    user_id = get_jwt_identity()
    project = Project.query.filter_by(id=id, owner_id=user_id).first()
    if not project:
        return jsonify({"error": "Project not found"}), 404
    return jsonify(project.to_dict()), 200

@projects_bp.route('/', methods=['POST'])
@jwt_required()
def create_project():
    user_id = get_jwt_identity()
    data = request.get_json()
    
    if not data.get('name'):
        return jsonify({"error": "Project name is required"}), 400
        
    new_project = Project(
        name=data['name'],
        description=data.get('description', ''),
        owner_id=user_id
    )
    
    db.session.add(new_project)
    db.session.commit()
    
    return jsonify(new_project.to_dict()), 201

@projects_bp.route('/<id>', methods=['PUT'])
@jwt_required()
def update_project(id):
    user_id = get_jwt_identity()
    project = Project.query.filter_by(id=id, owner_id=user_id).first()
    if not project:
        return jsonify({"error": "Project not found"}), 404
        
    data = request.get_json()
    project.name = data.get('name', project.name)
    project.description = data.get('description', project.description)
    
    db.session.commit()
    return jsonify(project.to_dict()), 200

@projects_bp.route('/<id>', methods=['DELETE'])
@jwt_required()
def delete_project(id):
    user_id = get_jwt_identity()
    project = Project.query.filter_by(id=id, owner_id=user_id).first()
    if not project:
        return jsonify({"error": "Project not found"}), 404
        
    db.session.delete(project)
    db.session.commit()
    return jsonify({"message": "Project deleted successfully"}), 200
