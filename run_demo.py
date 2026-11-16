"""Launch SRM ISM Case Study Interactive Demonstration Web Dashboard
Automatically opens the default web browser to the interactive GUI.
"""

import os
import sys
import time
import webbrowser
import http.server
import socketserver
import threading

PORT = 8080
DIRECTORY = os.path.dirname(os.path.abspath(__file__))

class QuietHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=DIRECTORY, **kwargs)
    def log_message(self, format, *args):
        # suppress normal requests for clean terminal output
        pass

def main():
    global PORT
    server = None
    for p in range(PORT, PORT + 20):
        try:
            server = socketserver.TCPServer(("", p), QuietHandler)
            PORT = p
            break
        except OSError:
            continue

    if not server:
        print(f"Error: Unable to bind to ports 8080-8099.")
        sys.exit(1)

    url = f"http://localhost:{PORT}/index.html"
    print("=" * 70)
    print("  SRM IST 21CSE359T INFORMATION STORAGE & MANAGEMENT DEMONSTRATION")
    print("  Case Study: RAID-Based Backup & Recovery for Hospital Info System")
    print("=" * 70)
    print(f"\n[+] Local HTTP server online at: {url}")
    print("[+] Opening interactive web demonstration in your default browser...")
    print("\nPress Ctrl+C at any time in this window to stop the server.\n")

    t = threading.Thread(target=server.serve_forever)
    t.daemon = True
    t.start()

    time.sleep(1)
    webbrowser.open(url)

    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        print("\n[!] Shutting down server. Goodbye!")
        server.shutdown()

if __name__ == "__main__":
    main()
