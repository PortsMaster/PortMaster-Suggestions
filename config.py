import configparser
from pathlib import Path


def load_config():
    config = configparser.ConfigParser()
    THIS_FOLDER = Path(__file__).parent.resolve()
    configfile = THIS_FOLDER / "config.ini"
    config.read(configfile)
    return config

config = load_config()


if __name__ == "__main__":
    auth0_config = config['AUTH0']
    print(auth0_config["DOMAIN"])