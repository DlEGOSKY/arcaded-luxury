"""
Dev server local para Arcaded Luxury.
Envia Cache-Control: no-store en todas las respuestas para evitar
que el browser use version cacheada de los modulos ES durante desarrollo.

Uso:
    python dev-server.py [puerto]

Por defecto escucha en 5176.
"""
import http.server
import socketserver
import sys


class NoCacheHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0')
        self.send_header('Pragma', 'no-cache')
        self.send_header('Expires', '0')
        super().end_headers()

    def log_message(self, fmt, *args):
        # Solo log de errores (no las peticiones OK, reduce ruido)
        if 'code 304' in (fmt % args) or '200' in (fmt % args):
            return
        super().log_message(fmt, *args)


if __name__ == '__main__':
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 5176
    with socketserver.TCPServer(('', port), NoCacheHandler) as httpd:
        print(f'Arcaded Luxury dev server en http://127.0.0.1:{port}')
        print('Cache-Control: no-store (nunca cachea)')
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print('\nDetenido.')
