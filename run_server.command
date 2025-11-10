#!/bin/zsh

# 1) 우리 프로젝트 폴더로 이동
cd "$HOME/Desktop/my_page/app" || exit 1

# 2) 가상환경 켜기 (너는 app 폴더 안에 .venv 있으니까 이렇게)
source "$HOME/Desktop/my_page/app/.venv/bin/activate"

# 3) 플라스크 서버 실행
python3 app.py