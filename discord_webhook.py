import requests
from config import config

webhook_url = config["DISCORD"]["WEBHOOK_URL"]

def post_message(title, link, image, author, comment,profileimage):
    # https://gist.github.com/Birdie0/78ee79402a4301b1faf412ab5f1cdcf9
    data = {
        "username": "Suggestion Bot",
        "content": "New Port Suggestion",
        "embeds": [
            {
                "author": {
                    "name": f"{author}",
                    "icon_url": f"{profileimage}",
                },
                "title": f"{title}",
                "url": f"{link}",
                "description": f"{comment}",
               
                "image": {
                    "url": f"{image}"
                },
            }
        ],
    }

    response = requests.post(webhook_url, json=data)


if __name__ == "__main__":
    post_message(title="Halo: The Master Chief Collection",author="_bambozler",link="https://portmaster.pythonanywhere.com",image="https://cdn.cloudflare.steamstatic.com/steam/apps/976730/ss_fdaf8ebd7f3c62e08398f39c9bfa486294ea5a0a.1920x1080.jpg?t=1670458602",comment="This needs to be ported now!",profileimage="https://cdn.discordapp.com/avatars/201787182975811585/44d29d947cdb980e3fe101f9bc9155b6.png")
