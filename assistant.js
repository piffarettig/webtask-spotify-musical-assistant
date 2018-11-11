const SpotifyWebApi = require('spotify-web-api-node');
const MongoClient = require('mongodb').MongoClient;

module.exports = async function(context, cb) {
    const result = await main(context);
    cb(null, { result });
};

async function main(context) {
     var completeTrackInfo = {};
     try {
        var mostListenedTracks = await getMostListenedTracksFromDb(context);
        mostListenedTracks = await mostListenedTracks.toArray();
        completeTrackInfo = await parseTrackInfo(mostListenedTracks, context);
     } catch (err) {
        console.log(err);
    }
    return completeTrackInfo;
}

async function getMostListenedTracksFromDb(context) {
    const db = await connectToMongoDbCollection(context.secrets);
    const collection = db.collection("ListenedTracks");
    var mostListenedTracks = await collection.aggregate([
        {
            $group: {
                _id: { artist: "$artist.name", album: "$album.name", name: "$name", id: "$id" },
                uniqueIds: { $addToSet: "$date" },
                count: { $sum: 1 }
            }
        },
        {
            $match: {
                count: { $gte: 2 }
            }
        },
        {
            $sort: { count: -1}
        }
    ]);
    return mostListenedTracks;
}

async function parseTrackInfo(mostListenedTracks, context) {
    var completeTrackInfo = {};
    if (mostListenedTracks) {
        const mostListenedTrack = mostListenedTracks[0];
        const trackId = mostListenedTrack._id.id;
        var trackInfo = await getTrackInfoFromSpotify(context.secrets, trackId);
        completeTrackInfo = {
            bpm: trackInfo.body.tempo,
            id: trackInfo.body.id,
            key: parseKeyFromTrackKeyIndex(trackInfo.body.key),
            name: mostListenedTrack._id.name,
            artist: mostListenedTrack._id.artist,
            album: mostListenedTrack._id.album,
            amountOfListens: mostListenedTrack.count
        };
    }
    return completeTrackInfo;
}

async function getTrackInfoFromSpotify(secrets, trackId) {
   var trackInfo = {};
   try {
        const credentials = loadCredentialsFromConfiguration(secrets);
        const spotifyApi = initSpotifyWebApi(credentials);
        await refreshAuthToken(spotifyApi);
        trackInfo = await spotifyApi.getAudioFeaturesForTrack(trackId);
    } catch (err) {
        console.log(err);
    }
    return trackInfo;
}

function loadCredentialsFromConfiguration(secrets) {
    var accessToken = secrets.ACCESS_TOKEN;
    var refreshToken = secrets.REFRESH_TOKEN;
    var clientId = secrets.CLIENT_ID;
    var clientSecret = secrets.CLIENT_SECRET;
    return {
        accessToken,
        refreshToken,
        clientId,
        clientSecret
    };
}

function initSpotifyWebApi(credentials) {
    var spotifyApi = new SpotifyWebApi(credentials);
    return spotifyApi;
}

async function refreshAuthToken(spotifyApi) {
    try {
        var data = await spotifyApi.refreshAccessToken();
        spotifyApi.setAccessToken(data.body.access_token);
    } catch(err) {
        console.log('Could not refresh access token', err);
    }
}

async function connectToMongoDbCollection(secrets) {
    const user = secrets.MONGO_USER;
    const pass = secrets.MONGO_PASS;
    const domain = secrets.MONGO_DOMAIN;
    const url = `mongodb://${user}:${pass}@${domain}:35747/mussical-assistant`;
    const client = await MongoClient.connect(url);
    const db = client.db('mussical-assistant');
    return db;
}

function parseKeyFromTrackKeyIndex(index) {
   var keys = [ 'C', 'C♯/D♭', 'D', 'D♯/E♭', 'E', 'F', 'F♯/G♭', 'G', 'G♯/A♭', 'A', 'A♯/B♭', 'B'];
   if (index >= 0 && index < keys.length) {
       return keys[index];
   }
   return index;
}