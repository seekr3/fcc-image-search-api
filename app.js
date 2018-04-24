const log = console.log;
const db_url = process.env.MONGO_URI;
const col = process.env.COLLECTION;
const ID = process.env.ID;
const KEY = process.env.KEY;

const url = require('url');

const searchClient = new (require('google-images'))(ID, KEY);
const {MongoClient} = require('mongodb');
const app = require('express')();

function getClient(callback, next) {
  MongoClient.connect(db_url, (err, client) => {
    if (err) throw err;
    callback(client);
    next();
  });
}


app.get('/', (req, res) => res.end());

app.get('/history', (req, res) => {
  var client;
  getClient(c => client = c, () =>
    client.db().collection(col).find({}).toArray((err, docs) => {
      res.json(docs.sort((a, b) => new Date(b.date) - new Date(a.date)).map(x => ({
        query: x.query,
        when: x.date,
      })).slice(0,30));
      client.close();
    })
  );
});

app.get('/search/*', (req, res) => {
  const query = url.parse(req.url).pathname.slice(8);
  
  var client;
  searchClient.search(query, {page: req.query.offset || 1}).then(images => {
    res.json(images);
    getClient(c => client = c, insert);
  });
  
  function insert() {
    client.db().collection(col).insert({
      query: query,
      date: new Date,
    }, err => {
      if (err) throw err;
      client.close();
    });
  }
});

app.listen(process.env.PORT || 3000);
