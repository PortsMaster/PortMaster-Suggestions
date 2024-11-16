import app
import os
import uuid
from datetime import date
import json

with open('backup.json') as user_file:
    backup = json.loads(user_file.read())


try:
    os.remove("instance/db.db")
except Exception as e:
    pass

app.app.app_context().push()
app.db.create_all()