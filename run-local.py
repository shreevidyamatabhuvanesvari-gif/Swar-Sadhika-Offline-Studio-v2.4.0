#!/usr/bin/env python3
"""Serve Swar-Sadhika locally; binds only to loopback, never to the LAN."""
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from pathlib import Path
import os

ROOT = Path(__file__).resolve().parent
os.chdir(ROOT)

class QuietHandler(SimpleHTTPRequestHandler):
    def log_message(self, fmt, *args):
        print("[local] " + (fmt % args))

if __name__ == '__main__':
    address = ('127.0.0.1', 8765)
    print(f"स्वर-साधिका: http://{address[0]}:{address[1]}/")
    print("केवल इसी डिवाइस का loopback interface; कोई बाहरी नेटवर्क सेवा नहीं। Ctrl+C से बंद करें।")
    try:
        ThreadingHTTPServer(address, QuietHandler).serve_forever()
    except KeyboardInterrupt:
        print("\nस्थानीय सर्वर बंद हुआ।")
