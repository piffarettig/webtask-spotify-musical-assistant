# webtask-spotify-musical-assistant
A small sample that integrates Auth0 Webtasks, Spotify's REST API and MongoDB in order to assist you in learning more about the music you listen everyday

## Summary

This project consist on two main componentes and a helper:

#### 1) musical-assistant.cron.js: 

Webtask that works as a cron and fetches informating of your Spotify's user recently played tracks. As its executed, it stores the track information on a MongoDB database.
I used a free MongoLab database for prototyping purposes.

#### 2) assistant.js: 

Webtask that is called as a REST endpoint (a simple HTTP GET) that has the logic of giving your daily most listened song, and uses Spotify API to get full information about the track, such as the tempo (in BPM) and Key of the song.

#### 3) spotify-auth.js:

A simple node script that allows you to authenticate as a User (via using the authorization url on a browser).
It allows you to get a code, which you need to copy. 
For example: 

```https://example.com/callback?code=AQCN-DskaaFRL82M9nU1qUVz4yLCyhX9KxBwo1wrmL8QPAIOtQdysQbpF4vFTU57yjd7USg4HUttbVbe-GLZVHKWBQxTYkw333n8zXU0IdtZc1n4lf3gql_j5RCDmxhLI7vIfgTcfuavyU7zeFwKrNHsYmduFbF8VVk1GvVsIjdG4n7BKz7ZA7N3ZYRBephHfEXZ2L15uep1cpFUjoX-Z7ur7sEuUPi7gvYOwaTn0IOK```

This code will work only once and will allow you to get an access token and refresh token, needed for future calls.  In case you don't want to access some user private data, you can use Client Credentials Flow, instead of this approach which is Authorization Code Grant. 

See Spotify's [Authorization guide](https://developer.spotify.com/documentation/general/guides/authorization-guide) for detailed information on these flows.

The authorization URL can be generated by calling craeteAuthorizationUrl(). In case you need more scopes, make sure to include them in the scopes array.
Also, make sure to pass as ENV variables the values for CLIENT_ID and CLIENT_SECRET. These are the ones of your spotify created app.
*/

#### 4) secrets.txt

A fourth file is very important in order for **musical-assistant.cron.js** and **assistant.js** to work properly, which is **secrets.txt**.

This file contains all the secrets needed in order for the webtasks to work properly.

## Try it

You can try calling the endpoint with the following url (a simple HTTP GET will return you the result):

https://wt-1ec3dadce3cec94a27b31f4b28f04d8c-0.sandbox.auth0-extend.com/assistant 

## Getting Started with the sample

#### 1) Create an Spotify app [here](https://developer.spotify.com/dashboard/applications)

Then copy the ClientId and ClientSecret, and replace the values on the secrets.txt file.

#### 2) Run spotify-auth.js

You will need to execute ```spotify-auth.js```, executing the function ```createAuthorizationUrl();``` This one will give you a url you need to copy on your browser.

Once logged in on Spotify and redirected to the redirection url, you will need to copy the code query string param value.

#### 3) Get access and refresh token. 

You will need to replace code value and execute ```node spotify-auth.js``` again, so you get the accessToken and refreshToken. 
Replace those values on the secrets.txt file.

#### 4) Create the first webtask (cron that runes every 2 mins)

```wt cron create --schedule "*/2 * * * *" musical-assistant-cron --secrets-file secrets.txt```

#### 5) Create the second webtask (http endpoint to retreive info)

```wt create assistant.js -n assistant --secrets-file secrets.txt```

## Possible improvements

#### 1) Parameterize spotify-auth.js

In order to keep it simpler and not losing the focus of the sample, the way of getting the access tokens nowadays is not quite smart. You need to comment and uncomment the line to get the authorizationUrl depending on if you want to get the code or you want to get the access and refresh tokens. Some environment variables could simply solve this. 

#### 2) Add a 'from' date parameter to the assistant webtask

The webtask is not filtering the tracks using a certain date. In the future, it could be useful to add a date parameter as a query parameter, that could filter the tracks from that date on.

The parameter could be easily accesed via the webtask context, with ```context.query.from```

#### 3) Proactive notification: integrate with Sendgrid or another notification service

The assistant webtask could also be croned to run at certain moment of the day (for example, at the end of my working day), so it sends me an emai via Sengrid of the song I listened most on that day. Then I can get home I practice it with the information read on my email. 

