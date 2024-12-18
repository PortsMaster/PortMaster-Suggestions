from flask_sqlalchemy import SQLAlchemy
from flask import Flask, render_template,session,redirect,url_for, jsonify, request
from flask_caching import Cache
from flask_compress import Compress
from config import config
from urllib.parse import quote_plus, urlencode
from authlib.integrations.flask_client import OAuth
from dataclasses import dataclass
from content import suggestion_content
import discord_webhook

import json
import uuid
from datetime import date
from functools import wraps



def to_pretty_json(obj: dict) -> str:
    return json.dumps(obj, default=lambda o: o.__dict__, indent=4)


def page_not_found(e):
    return render_template('404.html'), 404


def requires_auth(f):
    """
    Use on routes that require a valid session, otherwise it aborts with a 403
    """

    @wraps(f)
    def decorated(*args, **kwargs):
        admin = False
        moderator = False
        if session.get('user'):
            userinfo = session.get('user').get("userinfo")
            idpid = session.get('user').get("userinfo")["sub"]
            user = User.query.filter_by(idpid=idpid).first()
            banned = Ban.query.filter_by(userid=user.userid).first()
            if banned:
                return "Your account has been locked. Contact the PortMaster discord crew for more details. This may have happened if you did not follow the <a href='https://discord.com/channels/1122861252088172575/1232622554984878120/1232623360211423344'>suggestion guidelines</a>. Click <a href='/'>here</a> to go back to home page."
            if Admin.query.filter_by(userid=user.userid).first():
                admin = True
            if Moderator.query.filter_by(userid=user.userid).first():
                moderator = True
            kwargs["userinfo"] = userinfo
            kwargs["admin"] = admin
            kwargs["moderator"] = moderator
            return f(*args, **kwargs)

        else:
            return redirect(url_for('login',next=request.full_path))

    return decorated

"""
Configuration of the app
"""
app = Flask(__name__)
app.secret_key = config["WEBAPP"]["SECRET_KEY"]
app.jinja_env.filters['to_pretty_json'] = to_pretty_json

app.config['SQLALCHEMY_DATABASE_URI']='sqlite:///db.db'
app.config['SECRET_KEY']=config["FLASKCONFIG"]["SECRET_KEY"]
app.config['SQLALCHEMY_TRACK_MODIFICATIONS']=True
app.config['CACHE_TYPE']="SimpleCache"
app.config['CACHE_DEFAULT_TIMEOUT']=300
db = SQLAlchemy(app)
compress = Compress(app)
cache = Cache(app)

@dataclass
class Suggestion(db.Model):
   id:str = db.Column(db.String(200),primary_key=True)
   title:str = db.Column(db.String(100))
   weburl:str = db.Column(db.String(200))
   imageurl:str = db.Column(db.String(200))
   license:str = db.Column(db.String(10))
   dependencies:str = db.Column(db.String(300))
   content:str = db.Column(db.String(100))
   comment:str = db.Column(db.String(300))
   engine:str = db.Column(db.String(50))
   feasibility:str = db.Column(db.String(50))
   status:str = db.Column(db.String(50))
   category:str = db.Column(db.String(50))
   tags:str = db.Column(db.String(200))
   userid:str = db.Column(db.String(100))
   date:str = db.Column(db.String(50))
   language:str = db.Column(db.String(50))

@dataclass
class Admin(db.Model):
   id:str = db.Column(db.String(200),primary_key=True)
   userid:str = db.Column(db.String(100))

@dataclass
class Moderator(db.Model):
   id:str = db.Column(db.String(200),primary_key=True)
   userid:str = db.Column(db.String(100))

@dataclass
class User(db.Model):
   userid:str = db.Column(db.String(200),primary_key=True)
   idpid:str = db.Column(db.String(100))
   idpname:str = db.Column(db.String(100))
   displayname:str = db.Column(db.String(100))
   contact:str = db.Column(db.String(100))
   lastlogin:str = db.Column(db.String(20))
   status:str = db.Column(db.String(20))

@dataclass
class Ban(db.Model):
   userid:str = db.Column(db.String(100),primary_key=True)
   date:str = db.Column(db.String(20))

@dataclass
class PortRating(db.Model):
   id:str = db.Column(db.String(200),primary_key=True)
   port:str = db.Column(db.String(100))
   rating:str = db.Column(db.String(100))

@dataclass
class SuggestionVote(db.Model):
   id:str = db.Column(db.String(200),primary_key=True)
   userid:str = db.Column(db.String(200))
   suggestionid:str = db.Column(db.String(100))

@dataclass
class AuditHistory(db.Model):
   id:str = db.Column(db.String(200),primary_key=True)
   source:str = db.Column(db.String(100))
   target:str = db.Column(db.String(100))
   type:str = db.Column(db.String(50))
   date:str = db.Column(db.String(20))

@cache.cached(timeout=50,key_prefix='get_suggestions')
def getSuggestions():
    return Suggestion.query.all()

@cache.cached(timeout=50,key_prefix='get_admins')
def getAdmins():
    return Admin.query.all()

@cache.cached(timeout=50,key_prefix='get_moderators')
def getModerators():
    return Moderator.query.all()


def add_user(userinfo):
    isUser = User.query.filter_by(idpid=userinfo["sub"]).first()
    if not isUser:
        user = User(userid=uuid.uuid4().hex,idpid=userinfo["sub"],contact=userinfo["email"],displayname=userinfo["name"],idpname=userinfo["name"],lastlogin=date.today(),status="Active")
        db.session.add(user)
        db.session.commit()
    else:
        isUser.idpname=userinfo["name"]
        isUser.lastlogin=date.today()
        db.session.commit()

def check_priviledges_new():
    username = None
    userid = None
    loggedin = False
    isadmin = False
    ismoderator = False
    if session.get('user'):
        loggedin = True
        idpid = session.get('user').get("userinfo")["sub"]
        user = User.query.filter_by(idpid=idpid).first()
        username = user.idpname
        userid = user.userid
        for admin in getAdmins():
            if admin.userid == userid:
                isadmin = True
                break
        for moderator in getModerators():
            if moderator.userid == userid:
                ismoderator = True
                break
    return (loggedin,username,userid,ismoderator,isadmin)

def check_priviledges():
    username = None
    userid = None
    loggedin = False
    admin = False
    moderator = False
    if session.get('user'):
        loggedin = True
        idpid = session.get('user').get("userinfo")["sub"]
        user = User.query.filter_by(idpid=idpid).first()
        username = user.idpname
        userid = user.userid
        if Admin.query.filter_by(userid=user.userid).first():
            admin = True
        if Moderator.query.filter_by(userid=user.userid).first():
            moderator = True
    return (loggedin,username,userid,moderator,admin)


def log_change(source,target,type):
    if config["WEBAPP"].getboolean("LOG_HOSTORY"):
        log = AuditHistory(id=uuid.uuid4().hex,source=source,target=target,type=type,date=date.today())
        db.session.add(log)
        db.session.commit()

def has_session():
    if session.get('user'):
        return True
    else:
        return False


auth0_config = config['AUTH0']
oauth = OAuth(app)

domain = auth0_config["DOMAIN"]
client_id = auth0_config["CLIENT_ID"]
client_secret = auth0_config["CLIENT_SECRET"]

oauth.register(
    "auth0",
    client_id=client_id,
    client_secret=client_secret,
    client_kwargs={
        "scope": "openid profile email",
    },
    server_metadata_url=f'https://{domain}/.well-known/openid-configuration'
)

# Auth related views

@app.route("/login")
def login():
    """
    Redirects the user to the Auth0 Universal Login (https://auth0.com/docs/authenticate/login/auth0-universal-login)
    """
    return oauth.auth0.authorize_redirect(
        redirect_uri=url_for("callback", _external=True,next=request.args.get('next'))
    )


@app.route("/signup")
def signup():
    """
    Redirects the user to the Auth0 Universal Login (https://auth0.com/docs/authenticate/login/auth0-universal-login)
    """
    return oauth.auth0.authorize_redirect(
        redirect_uri=url_for("callback", _external=True),
        screen_hint="signup"
    )


@app.route("/callback", methods=["GET", "POST"])
def callback():
    """
    Callback redirect from Auth0
    """
    redirecturl = "/"
    if request.args.get('next'):
        redirecturl = request.args.get('next')
    try:
        token = oauth.auth0.authorize_access_token()
    except Exception as e:
        return redirect("/")
    session["user"] = token
    add_user(token["userinfo"])
    idpid = session.get('user').get("userinfo")["sub"]
    user = User.query.filter_by(idpid=idpid).first()
    banned = Ban.query.filter_by(userid=user.userid).first()
    if banned:
        session.clear()
        return "Your account has been locked. Contact the PortMaster discord crew for more details. This may have happened if you did not follow the <a href='https://discord.com/channels/1122861252088172575/1232622554984878120/1232623360211423344'>suggestion guidelines</a>. Click <a href='/'>here</a> to go back to home page"
    return redirect(redirecturl)


@app.route("/logout")
def logout():
    """
    Logs the user out of the session and from the Auth0 tenant
    """
    session.clear()
    return redirect(
        "https://" + domain
        + "/v2/logout?"
        + urlencode(
            {
                "returnTo": url_for("home", _external=True),
                "client_id": client_id,
            },
            quote_via=quote_plus,
        )
    )



@app.route("/")
def home():
    suggestions = []
    loggedin,username,userid,moderator,admin = check_priviledges_new()
    canEdit = False
    if moderator or admin:
        canEdit = True
    for suggestion in Suggestion.query.all():
        user = User().query.filter_by(userid=suggestion.userid).first()
        if user:
            suggestion = jsonify(suggestion).json
            votes = SuggestionVote.query.filter_by(suggestionid=suggestion["id"]).all()
            suggestion["voteCount"] = len(votes)
            if loggedin:
                idpid = session.get('user').get("userinfo")["sub"]
                currentUser = User.query.filter_by(idpid=idpid).first()
                vote = SuggestionVote.query.filter_by(userid=currentUser.userid,suggestionid=suggestion["id"]).first()
                if vote:
                    suggestion["voted"] = True
                else:
                    suggestion["voted"] = False
            #suggestion["author"] = user.displayname
            suggestion["author"] = ""
            suggestions.append(suggestion)
    return render_template("suggestions.html", suggestions=suggestions,userid=userid,loggedin=loggedin,username=username,canEdit=canEdit,moderator=moderator,admin=admin)

@app.route("/rate-port")
@requires_auth
def rate_port(userinfo,admin,moderator):
        port = request.args.get('port') + ".zip"
        loggedin,username,userid,moderator,admin = check_priviledges()
        print(request.referrer)
        return render_template('rate_port.html',loggedin=loggedin,admin=admin,moderator=moderator,port=port,userid=userid)

@app.route("/post-rating",methods=['POST'])
@requires_auth
def post_rating(userinfo,admin,moderator):
    id = request.form['id']
    suggestion = Suggestion.query.filter_by(id=id).first()
    loggedin,username,userid,moderator,admin = check_priviledges()
    idpid = session.get('user').get("userinfo")["sub"]
    user = User.query.filter_by(idpid=idpid).first()
    if admin or moderator or suggestion.userid == user.userid :
        if request.form['action'] == "delete":
            Suggestion.query.filter_by(id=id).delete()
        else:
            suggestion.title = request.form['title']
            suggestion.weburl = request.form['weburl']
            suggestion.imageurl = request.form['imageurl']
            suggestion.license = request.form['license']
            suggestion.content = request.form['content']
            suggestion.dependencies = ",".join(request.form.getlist('dependencies'))
            suggestion.comment = request.form['comment']
            suggestion.engine = request.form['engine']
            suggestion.category = request.form['category']
            suggestion.language = request.form['language']

        db.session.commit()

    return redirect('/')


@app.route("/suggestion-details")
def suggestion_details():
        id = request.args.get('id')
        loggedin,username,userid,moderator,admin = check_priviledges()
        if not id:
            return redirect('/')

        suggestion = Suggestion.query.filter_by(id=id).first()
        user = User.query.filter_by(userid=suggestion.userid).first()
        suggestion.author = user.displayname
        votes = SuggestionVote.query.filter_by(suggestionid=suggestion.id).all()
        suggestion.votes = len(votes)
        return render_template('suggestion_details.html',suggestion=suggestion,userid=userid,loggedin=loggedin,username=username,moderator=moderator,admin=admin)


@app.route("/suggestion-moderator")
@requires_auth
def suggestion_moderator(userinfo,admin,moderator):
    if admin or moderator:
        id = request.args.get('id')
        loggedin = True
        suggestion = Suggestion.query.filter_by(id=id).first()
        canEdit = True
        if session.get('user'):
            user = User.query.filter_by(userid=suggestion.userid).first()
        return render_template('suggestion_moderator.html',user=user,admin=admin,moderator=moderator,suggestion=suggestion,loggedin=loggedin,suggestion_content=suggestion_content,canEdit=canEdit)


@app.route("/api/backup")
def api_backup():
    loggedin,username,userid,moderator,admin = check_priviledges()
    if admin:
        backup = {}
        backup["Suggestion"] = jsonify(Suggestion.query.all()).json
        backup["SuggestionVote"] = jsonify(SuggestionVote.query.all()).json
        backup["User"] = jsonify(User.query.all()).json
        backup["Ban"] = jsonify(Ban.query.all()).json
        backup["Admin"] = jsonify(Admin.query.all()).json
        backup["Moderator"] = jsonify(Moderator.query.all()).json
        backup["PortRating"] = jsonify(PortRating.query.all()).json
        backup["AuditHistory"] = jsonify(AuditHistory.query.all()).json
        return (jsonify(backup))
    else:
        return redirect('/')


@app.route("/api/suggestions")
def api_suggestions():
    suggestions = []
    loggedin = False
    #loggedin,username,userid,moderator,admin = check_priviledges_new()
    if session.get('user'):
        loggedin = True
    for suggestion in getSuggestions():
        user = User().query.filter_by(userid=suggestion.userid).first()
        if user:
            suggestion = jsonify(suggestion).json
            votes = SuggestionVote.query.filter_by(suggestionid=suggestion["id"]).all()
            suggestion["voteCount"] = len(votes)
            if loggedin:
                idpid = session.get('user').get("userinfo")["sub"]
                currentUser = User.query.filter_by(idpid=idpid).first()
                vote = SuggestionVote.query.filter_by(userid=currentUser.userid,suggestionid=suggestion["id"]).first()
                if vote:
                    suggestion["voted"] = True
                else:
                    suggestion["voted"] = False
            #suggestion["author"] = user.displayname
            suggestion["author"] = ""
            suggestions.append(suggestion)
    return (suggestions)

@app.route("/api/suggestions_new")
def api_suggestions_new():
    currentUser = None
    if has_session():
        idpid = session.get('user').get("userinfo")["sub"]
        currentUser = User.query.filter_by(idpid=idpid).first()
    suggestions = []
    for suggestion in getSuggestions():
        user = User().query.filter_by(userid=suggestion.userid).first()
        if user:
            suggestion = jsonify(suggestion).json
            votes = SuggestionVote.query.filter_by(suggestionid=suggestion["id"]).all()
            suggestion["voteCount"] = len(votes)
            if has_session():
                vote = SuggestionVote.query.filter_by(userid=currentUser.userid,suggestionid=suggestion["id"]).first()
                if vote:
                    suggestion["voted"] = True
                else:
                    suggestion["voted"] = False
            #suggestion["author"] = user.displayname
            suggestion["author"] = ""
            suggestions.append(suggestion)
    return (suggestions)

@app.route("/suggestion")
@requires_auth
def suggestion(userinfo,admin,moderator):
    id = request.args.get('id')
    loggedin = True
    suggestion = Suggestion.query.filter_by(id=id).first()
    canEdit = False
    idpid = session.get('user').get("userinfo")["sub"]
    user = User.query.filter_by(idpid=idpid).first()
    admin = Admin.query.filter_by(userid=user.userid).first()
    moderator = Moderator.query.filter_by(userid=user.userid).first()
    if user.userid == suggestion.userid or admin or moderator:
        canEdit = True
    return render_template('suggestion.html',suggestion=suggestion,loggedin=loggedin,suggestion_content=suggestion_content,canEdit=canEdit)

@app.route("/new-suggestion")
@requires_auth
def new_suggestion(userinfo,admin,moderator):
    loggedin = True
    suggestions = Suggestion.query.all()
    if admin or moderator:
        return render_template('new_suggestion.html',admin=admin,moderator=moderator,loggedin=loggedin,suggestion_content=suggestion_content,suggestions=suggestions)
    else:
        return redirect('/')


@app.route("/remove-privilege",methods=['GET'])
@requires_auth
def remove_privilege(userinfo,admin,moderator):
    loggedin,username,userid,moderator,admin = check_priviledges()
    if admin:
        privilegeType = request.args.get('privilege')
        targetuserid = request.args.get('userid')
        if privilegeType == "admin":
            Admin.query.filter_by(userid=targetuserid).delete()
            db.session.commit()
            log_change(userid,targetuserid,"Remove Admin")
        if privilegeType == "moderator":
            Moderator.query.filter_by(userid=targetuserid).delete()
            db.session.commit()
            log_change(userid,targetuserid,"Remove Moderator")

    return redirect('/admin')

@app.route("/ban-user",methods=['GET'])
@requires_auth
def ban_user(userinfo,admin,moderator):
    if admin:
        userid = request.args.get('userid')
        ban = Ban(userid=userid,date=date.today())
        user = User.query.filter_by(userid=userid).first()
        idpid = userinfo["sub"]
        source_user = User.query.filter_by(idpid=idpid).first()
        user.status = "Banned"
        db.session.add(ban)
        db.session.commit()
        log_change(source_user.userid,userid,"Ban User")

    return redirect('/moderator')

@app.route("/unban-user",methods=['GET'])
@requires_auth
def unban_user(userinfo,admin,moderator):
    if admin or moderator:
        userid = request.args.get('userid')
        Ban.query.filter_by(userid=userid).delete()
        user = User.query.filter_by(userid=userid).first()
        idpid = userinfo["sub"]
        source_user = User.query.filter_by(idpid=idpid).first()
        user.status = "Active"
        db.session.commit()
        log_change(source_user.userid,userid,"Unban User")

    return redirect('/moderator')

@app.route("/add-privilege",methods=['GET'])
@requires_auth
def add_privilege(userinfo,admin,moderator):
    loggedin,username,sourceuserid,moderator,admin = check_priviledges()
    if admin:
        privilegeType = request.args.get('privilege')
        userid = request.args.get('userid')
        if privilegeType == "admin":
            existingAdmin = Admin.query.filter_by(userid=userid).first()
            if not existingAdmin:
                admin = Admin(id=uuid.uuid4().hex,userid=userid)
                db.session.add(admin)
                db.session.commit()
                log_change(sourceuserid,userid,"Add Admin")
        if privilegeType == "moderator":
            existingModerator = Moderator.query.filter_by(userid=userid).first()
            if not existingModerator:
                moderator = Moderator(id=uuid.uuid4().hex,userid=userid)
                db.session.add(moderator)
                db.session.commit()
                log_change(sourceuserid,userid,"Add Moderator")

    return redirect('/admin')



@app.route("/vote-suggestion",methods=['POST'])
@requires_auth
def vote_suggestion(userinfo,admin,moderator):
    userid = request.get_json()["userid"]
    suggestionid = request.get_json()["suggestionid"]
    idpid = userinfo["sub"]
    user = User.query.filter_by(idpid=idpid).first()
    if user.userid == userid:
        vote = SuggestionVote.query.filter_by(userid=userid,suggestionid=suggestionid).first()
        if not vote:
            upvote = SuggestionVote(id=uuid.uuid4().hex,userid=userid,suggestionid=suggestionid)
            db.session.add(upvote)
            db.session.commit()
            count = SuggestionVote.query.filter_by(suggestionid=suggestionid).all()
            return json.dumps({'count':len(count)}), 200, {'ContentType':'application/json'}
        else:
            SuggestionVote.query.filter_by(userid=userid,suggestionid=suggestionid).delete()
            db.session.commit()
            count = SuggestionVote.query.filter_by(suggestionid=suggestionid).all()
            return json.dumps({'count':len(count)}), 200, {'ContentType':'application/json'}
    else:
        return json.dumps({'success':False}), 404, {'ContentType':'application/json'}


@app.route("/edit-suggestion-moderator",methods=['POST'])
@requires_auth
def edit_suggestion_moderator(userinfo,admin,moderator):
    loggedin,username,userid,moderator,admin = check_priviledges()
    if admin or moderator:
        id = request.form['id']
        if request.form['action'] == "delete":
            Suggestion.query.filter_by(id=id).delete()
            #log_change(userid,request.form['id'],"Moderator Delete Suggestion")
        else:
            suggestion = Suggestion.query.filter_by(id=id).first()
            suggestion.title = request.form['title']
            suggestion.weburl = request.form['weburl']
            suggestion.imageurl = request.form['imageurl']
            suggestion.license = request.form['license']
            suggestion.content = request.form['content']
            suggestion.dependencies = ",".join(request.form.getlist('dependencies'))
            suggestion.comment = request.form['comment']
            suggestion.engine = request.form['engine']
            suggestion.category = request.form['category']
            suggestion.language = request.form['language']
            suggestion.feasibility = request.form['feasibility']
            suggestion.status = request.form['status']
            #log_change(userid,request.form['id'],"Moderator Edit Suggestion")
        db.session.commit()

    return redirect('/')

@app.route("/edit-suggestion",methods=['POST'])
@requires_auth
def edit_suggestion(userinfo,admin,moderator):
    id = request.form['id']
    suggestion = Suggestion.query.filter_by(id=id).first()
    loggedin,username,userid,moderator,admin = check_priviledges()
    idpid = session.get('user').get("userinfo")["sub"]
    user = User.query.filter_by(idpid=idpid).first()
    if admin or moderator or suggestion.userid == user.userid :
        if request.form['action'] == "delete":
            Suggestion.query.filter_by(id=id).delete()
            #log_change(userid,request.form['id'],"User Delete Suggestion")
        else:
            suggestion.title = request.form['title']
            suggestion.weburl = request.form['weburl']
            suggestion.imageurl = request.form['imageurl']
            suggestion.license = request.form['license']
            suggestion.content = request.form['content']
            suggestion.dependencies = ",".join(request.form.getlist('dependencies'))
            suggestion.comment = request.form['comment']
            suggestion.engine = request.form['engine']
            suggestion.category = request.form['category']
            suggestion.language = request.form['language']
            #log_change(userid,request.form['id'],"User Edit Suggestion")

        db.session.commit()

    return redirect('/')

@app.route("/add-suggestion",methods=['POST'])
@requires_auth
def add_suggestion(userinfo,admin,moderator):
    title = request.form['title']
    exisistingSugegstion = Suggestion.query.filter_by(title=title).first()
    if not exisistingSugegstion:
        weburl = request.form['weburl']
        imageurl = request.form['imageurl']
        license = request.form['license']
        content = request.form['content']
        dependencies = ",".join(request.form.getlist('dependencies'))
        comment = request.form['comment']
        engine = request.form['engine']
        feasibility = "low"
        status = "Pending"
        category = request.form['category']
        tags = ""
        dateadded = date.today()
        language = request.form['language']
        id = uuid.uuid4().hex
        idpid = userinfo["sub"]
        user = User.query.filter_by(idpid=idpid).first()
        userid = user.userid
        suggestion = Suggestion(id=id,userid=userid,title=title,weburl=weburl, imageurl=imageurl,license=license,dependencies=dependencies,comment=comment,engine=engine,feasibility=feasibility,status=status,category=category,tags=tags,date=dateadded,language=language,content=content)
        db.session.add(suggestion)
        db.session.commit()
        if "127.0.0.1" not in request.host:
            discord_webhook.post_message(title=title,link= "https://" + request.host + "/suggestion-moderator?id="+id,image=imageurl,author=user.displayname,comment=comment,profileimage=userinfo["picture"])
        #log_change(user.userid,id,"Add Suggestion")
        return redirect('/')
    else:
        return redirect('/')


@app.route("/update-profile",methods=['POST'])
@requires_auth
def update_profile(userinfo,admin,moderator):
    userid = request.form['userid']
    idpid = session.get('user').get("userinfo")["sub"]
    user = User.query.filter_by(idpid=idpid).first()
    if user.userid == userid:
        displayname = request.form['displayname']
        contact = request.form['contact']
        user.displayname = displayname
        user.contact = contact
        db.session.commit()
        return redirect('/profile')
    else:
        return redirect('/')

@app.route("/view-user")
@requires_auth
def view_user(userinfo,admin,moderator):
    loggedin = has_session()
    if admin or moderator:
        userid = request.args.get('userid')
        user = User.query.filter_by(userid=userid).first()
        canEdit = False
        if moderator or admin:
            canEdit = True
        return render_template('view_user.html', user_profile=userinfo,user=user,canEdit=canEdit,moderator=moderator,admin=admin,loggedin=loggedin)
    else:
        return redirect('/')

@app.route("/edit-profile")
@requires_auth
def edit_profile(userinfo,admin,moderator):
    loggedin = has_session()
    idpid = session.get('user').get("userinfo")["sub"]
    user = User.query.filter_by(idpid=idpid).first()
    canEdit = False
    if moderator or admin:
        canEdit = True
    return render_template('edit_profile.html',user_profile=userinfo,user=user,canEdit=canEdit,moderator=moderator,admin=admin,loggedin=loggedin)

@app.route("/profile")
@requires_auth
def profile(userinfo,admin,moderator):
    loggedin,username,userid,moderator,admin = check_priviledges()
    suggestions = []
    idpid = session.get('user').get("userinfo")["sub"]
    user = User.query.filter_by(idpid=idpid).first()
    canEdit = False
    if moderator or admin:
        canEdit = True
    for suggestion in Suggestion.query.all():
        if suggestion.userid == user.userid:
            suggestion = jsonify(suggestion).json
            votes = SuggestionVote.query.filter_by(suggestionid=suggestion["id"]).all()
            suggestion["voteCount"] = len(votes)
            if loggedin:
                idpid = session.get('user').get("userinfo")["sub"]
                currentUser = User.query.filter_by(idpid=idpid).first()
                vote = SuggestionVote.query.filter_by(userid=currentUser.userid,suggestionid=suggestion["id"]).first()
                if vote:
                    suggestion["voted"] = True
                else:
                    suggestion["voted"] = False
            #suggestion["author"] = user.displayname
            suggestion["author"] = ""
            suggestions.append(suggestion)
    return render_template('profile.html',userid=userid,loggedin=loggedin,user_profile=userinfo,user=user,suggestions=suggestions,canEdit=canEdit,moderator=moderator,admin=admin)



@app.route("/moderator")
@requires_auth
def moderator(userinfo,admin,moderator):
    loggedin,username,userid,moderator,admin = check_priviledges()
    if moderator or admin:
        admins = Admin.query.all()
        moderators = Moderator.query.all()
        suggestions = Suggestion.query.all()
        for suggestion in suggestions:
            if "https" not in suggestion.imageurl:
                suggestion.brokenimage = True
        users = User.query.all()
        for user in users:
            isAdmin = Admin.query.filter_by(userid=user.userid).first()
            if isAdmin:
                user.admin = True
        for suggestion in suggestions:
            user = User().query.filter_by(userid=suggestion.userid).first()
            if user:
                suggestion.creator = user.idpname
        bans = Ban.query.all()
        for ban in bans:
            user = User().query.filter_by(userid=ban.userid).first()
            if user:
                ban.idpname = user.idpname
                ban.displayname = user.displayname
                ban.contact = user.contact
        return render_template('moderator.html',admin=admin,moderator=moderator,loggedin=loggedin,admins=admins,moderators=moderators,suggestions=suggestions,users=users,bans=bans)
    else:
        return redirect('/')

@app.route("/admin")
@requires_auth
def admin(userinfo,admin,moderator):
    if not admin:
        return redirect('/')
    loggedin = has_session()
    admins = Admin.query.all()
    for dbadmin in admins:
        user = User.query.filter_by(userid=dbadmin.userid).first()
        if user:
            dbadmin.idpname = user.idpname
            dbadmin.displayname = user.displayname
            dbadmin.contact = user.contact
    moderators =  Moderator.query.all()
    for dbmoderator in moderators:
        user = User.query.filter_by(userid=dbmoderator.userid).first()
        if user:
            dbmoderator.idpname = user.idpname
            dbmoderator.displayname = user.displayname
            dbmoderator.contact = user.contact

    users = User.query.all()
    history = AuditHistory.query.all()
    for item in history:
        source_user = User.query.filter_by(userid=item.source).first()
        item.source_idpname = source_user.idpname
        target_user = User.query.filter_by(userid=item.target).first()
        item.target_idpname = target_user.idpname
    return render_template('admin.html',admin=admin,moderator=moderator,loggedin=loggedin,admins=admins,moderators=moderators,users=users,history=history)



if __name__ == '__main__':
    app.run(host='0.0.0.0',debug=True,port=4040)

    print("test")
