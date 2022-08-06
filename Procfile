# config for heroku deployment

# https://elements.heroku.com/buildpacks/mars/heroku-nextjs
# If the dyno is a web dyno, the $PORT variable will be set. The dyno must bind to this port number to receive incoming requests.
# see package.json:scripts.start

# https://stackoverflow.com/a/61364681/10200417
# npm ci does install both dependecies and dev dependencies

# compile static webpages
# launch npm webserver
# expose to external traffic
web: npm ci && npm run build && npm run start
