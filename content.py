suggestion_content = {
    "programming_language": [
        "C/C++",
        "C#",
        "Rust",
        "Lua",
        "Python",
        "GDScript",
        "Ruby",
        "Java",
        "ActionScript",
        "Haxe",
        "Javascript",
    ],
    "license": [
        "GPL/AGPL/LGPL",
        "MIT/BSD/zlib",
        "CC-BY-*",
        "CC0/Public Domain"
    ],
    "content": [
        "Commercial",
        "Free",
        "Open Source"
    ],
    "engine": [
        "LÖVE",
        "Godot 3.x",
        "Godot 4.x",
        "Game Maker",
        "GameMaker Studio",
        "GameMaker Studio 2",
        "XNA",
        "FNA",
        "MonoGame",
        "RPGMaker",
        "PyGame",
        "Ren'Py",
        "Flixel/OpenFL/Lime",
        "Adobe Flash/AIR",
        "AdventureGameStudio",
        "Unity",
        "Unreal"
    ],"unsupported_engine": [
        "Unity",
        "Godot 4.x",
        "Adobe Flash/AIR",
        "XNA"
    ],
    "category": ["Game", "Emulator","Engine"],
    "dependency": [
        "SDL 1.x",
        "SDL 2.x",
        "X11",
        "OpenGL",
        "Vulkan",
        "Steamworks",
        "Vorbis",
        "JVM",
        "libGDX",
        "Python",
        "Box86/Box64",
        "Allegro",
        "Qt"
    ],
    "status": ["Pending", "Open", "Complete", "Rejected"],
    "feasibility": ["Low", "Medium", "High"],
}

do_not_sort = ["feasibility","status"]

for item in suggestion_content:
    if item not in do_not_sort:
        suggestion_content[item].sort()


suggestion_content["programming_language"].append("Other/Unknown")
suggestion_content["license"].append("Other/Unknown")
suggestion_content["engine"].append("Other/Unknown")
suggestion_content["category"].append("Other")
suggestion_content["dependency"].append("Other/Unknown")