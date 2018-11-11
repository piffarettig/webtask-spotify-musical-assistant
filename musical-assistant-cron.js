const SpotifyWebApi = require('spotify-web-api-node');
const MongoClient = require('mongodb').MongoClient;

const listenedTracksCollectionName = "ListenedTracks";
const databaseName = "mussical-assistant";

module.exports = async function(context, cb) {
    const result = await main(context);
    cb(null, { result });
};

async function main(context) {
    const credentials = loadCredentialsFromConfiguration(context.secrets);
    const spotifyApi = initSpotifyWebApi(credentials);
    await refreshAuthToken(spotifyApi);
    const data = await getUserRecentlyPlayedTracks(spotifyApi);
    storeTracksOnDatabase(data, context.secrets);
    return { data };
}

function loadCredentialsFromConfiguration(secrets) {
    const accessToken = secrets.ACCESS_TOKEN;
    const refreshToken = secrets.REFRESH_TOKEN;
    const clientId = secrets.CLIENT_ID;
    const clientSecret = secrets.CLIENT_SECRET;
    return {
        accessToken,
        refreshToken,
        clientId,
        clientSecret
    };
}

function initSpotifyWebApi(credentials) {
    const spotifyApi = new SpotifyWebApi(credentials);
    return spotifyApi;
}

async function refreshAuthToken(spotifyApi) {
    var data = {};
    try {
        data = await spotifyApi.refreshAccessToken();
        spotifyApi.setAccessToken(data.body.access_token);
    } catch(err) {
         console.log('Could not refresh access token', err);
    }
    return data;
}

async function getUserRecentlyPlayedTracks(spotifyApi) {
    await refreshAuthToken(spotifyApi);
    var tracks = [];
    try {
        var rawData = await spotifyApi.getMyRecentlyPlayedTracks({ limit: 10 });
        tracks = parseTracksFromResponseBody(rawData);
    } catch(err) {
         console.log('Could not refresh access token', err);
    }
    return tracks;
}

async function storeTracksOnDatabase(tracks, secrets) {
    const inserted = [];
    if(tracks) {
        try {
            const db = await connectToMongoDbCollection(secrets);
            const collection = db.collection(listenedTracksCollectionName);
            tracks.forEach(async (track) => {
                tryToInsertTrackOnDatabase(collection, track, inserted);
            });
        } catch (err) {
            console.log(err);
        }
    }
    return inserted;
}

function parseTracksFromResponseBody(rawData) {
    var parsedTracks = [];
    if(rawData && rawData.body) {
        const spotifyRawItems = rawData.body.items;
        if (spotifyRawItems) {
            parsedTracks = spotifyRawItems.map(item => ({
                date: item.played_at,
                id: item.track.id,
                name: item.track.name,
                album: parseAlbum(item.track.album),
                artist: parseMainArtist(item.track.artists)
            }));
        }
    }
    return parsedTracks;
}

function parseAlbum(album) {
    var parsedAlbum = { };
    if (album) {
        parsedAlbum = {
            name: album.name,
            id: album.id,
            imageUrl: album.images[0].url
        };
    }
    return parsedAlbum;
}

function parseMainArtist(artists) {
    var parsedMainArtist = { };
    if (artists && artists.length > 0) {
        var mainArtist = artists[0];
        parsedMainArtist = {
            id: mainArtist.id,
            name: mainArtist.name
        };
    }
    return parsedMainArtist;
}

async function tryToInsertTrackOnDatabase(collection, track, inserted) {
    try {
        const insertedTrack = await collection.insertOne(track);
        inserted.push(insertedTrack);
    } catch (trackAlreadyExistsError) {
        console.log(trackAlreadyExistsError);
    }
}

async function connectToMongoDbCollection(secrets) {
    const user = secrets.MONGO_USER;
    const pass = secrets.MONGO_PASS;
    const domain = secrets.MONGO_DOMAIN;
    const url = `mongodb://${user}:${pass}@${domain}:35747/${databaseName}`;
    const client = await MongoClient.connect(url);
    return client.db(databaseName);
}