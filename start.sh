#!/bin/bash
python3 -m gunicorn -b 127.0.0.1:8000 --timeout 120 app:app
