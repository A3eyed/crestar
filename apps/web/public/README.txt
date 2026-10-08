This folder exists to silence the "serveStatic: root path './public' is not found" warning.

The Anything platform's dev server looks for this folder, but our app doesn't use it.
We use Uploadcare for media storage instead of local static files.

This file can be safely deleted - it's just a placeholder.
