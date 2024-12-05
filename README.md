# padletime
# Backend

## Quick Start

Go inside the /backend folder

    cd backend

Start a virtual environment

    virtualenv env
    source env/Scripts/activate

Install the requirements

    pip install -r requirements.txt

Create *.env* with the following variables

    DATABATE_URL="host=localhost dbname=your_db user=your_user password=your_pass"
    EMAIL_USERNAME = "padle.time@gmail.com"
    EMAIL_PASSWORD = "nnvy flhp bhtz imen"

And create a *.flaskenv*

    FLASK_APP=api
    FLASK_DEBUG=1
    FLASK_RUN_PORT=8000 # Optional

Then finally, run the Flask API

    cd backend #Ensure that are in the right directory
    flask run

# Frontend

## Quick Start

Go inside the /frontend folder

    cd frontend

Create *.env* with the following variables

    PORT=5173
    VITE_API_BASE_URL=http://127.0.0.1:8000

Install yarn and dependencies

    yarn install

Then finally, run the Frontend

    yarn run dev