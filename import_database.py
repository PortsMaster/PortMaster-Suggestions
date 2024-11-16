import appmysql as app
import os
import uuid
from datetime import date
import json

with open('db.json') as user_file:
    backup = json.loads(user_file.read())


try:
    pass
    #os.remove("instance/db.db")
except Exception as e:
    pass

app.app.app_context().push()
app.db.create_all()

if "User" in backup:
    for user in backup["User"]:
        dbuser = app.User(userid=user["userid"],idpid=user["idpid"],idpname=user["idpname"],contact=user["contact"],lastlogin=user["lastlogin"],status=user["status"],displayname=user["idpname"])
        app.db.session.add(dbuser)
        app.db.session.commit()

if "Admin" in backup:
    for admin in backup["Admin"]:
        dbadmin = app.Admin(id=admin["id"],userid=admin["userid"])
        app.db.session.add(dbadmin)
        app.db.session.commit()

if "Moderator" in backup:
    for moderator in backup["Moderator"]:
        dbmoderator = app.Moderator(id=moderator["id"],userid=moderator["userid"])
        app.db.session.add(dbmoderator)
        app.db.session.commit() 

if "Ban" in backup:
    for ban in backup["Ban"]:
        dbban = app.Ban(userid=ban["userid"],date=ban["date"])
        app.db.session.add(dbban)
        app.db.session.commit() 

if "SuggestionVote" in backup:
    for suggestion_vote in backup["SuggestionVote"]:
        dbsuggestion_vote = app.SuggestionVote(id=suggestion_vote["id"],userid=suggestion_vote["userid"])
        app.db.session.add(dbsuggestion_vote)
        app.db.session.commit() 

if "Suggestion" in backup:
    for suggestion in backup["Suggestion"]:
        dbsuggestion = app.Suggestion(id=suggestion["id"],userid=suggestion["userid"],title=suggestion["title"],weburl=suggestion["weburl"], imageurl=suggestion["imageurl"],license=suggestion["license"],content=suggestion["content"],dependencies=suggestion["dependencies"],comment=suggestion["comment"],engine=suggestion["engine"],feasibility=suggestion["feasibility"],status=suggestion["status"],category=suggestion["category"],tags=suggestion["tags"],date=suggestion["date"],language=suggestion["language"])
        app.db.session.add(dbsuggestion)
        app.db.session.commit() 

if "PortRating" in backup:
    for port_rating in backup["PortRating"]:
        dbport_rating = app.PortRating(id=port_rating["id"],port=port_rating["port"],rating=port_rating["rating"])
        app.db.session.add(dbport_rating)
        app.db.session.commit() 

if "AuditHistory" in backup:
    for audit_history in backup["AuditHistory"]:
        dbaudit_history = app.AuditHistory(id=audit_history["id"],source=audit_history["source"],target=audit_history["target"],type=audit_history["type"],date=audit_history["date"])

