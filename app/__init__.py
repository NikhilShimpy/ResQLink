import os
from flask import Flask

def create_app():
    # Get the absolute path to the project root
    base_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))

    app = Flask(
        __name__,
        template_folder=os.path.join(base_dir, 'templates'),
        static_folder=os.path.join(base_dir, 'static')
    )

    app.secret_key = "supersecretkey"
    
    return app