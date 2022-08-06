# config for heroku deployment

# https://elements.heroku.com/buildpacks/mars/heroku-nextjs
# If the dyno is a web dyno, the $PORT variable will be set. The dyno must bind to this port number to receive incoming requests.
# see package.json:scripts.start

# compile static webpages
# launch npm webserver
# expose to external traffic
web: npm run build && npm run start
