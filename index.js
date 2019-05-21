var request = require('request'),
    fs = require('fs');

var recordDefinition = {
  score: '',
  id: '',
  name: '',
  link: '',
  urlname: '',
  //description: '',
  created: '',
  city: '',
  country: '',
  localized_country_name: '',
  state: '',
  join_mode: '',
  visibility: '',
  lat: '',
  lon: '',
  members: '',
  organizer_id: '', 
  organizer_name: '', 
  who: '',
  group_photo_id: '', 
  group_photo_highres_link: '', 
  group_photo_photo_link: '', 
  group_photo_thumb_link: '', 
  key_photo_id: '', 
  key_photo_highres_link: '', 
  key_photo_photo_link: '', 
  key_photo_thumb_link: '', 
  timezone: '',
  next_event_id: '', 
  next_event_name: '', 
  next_event_yes_rsvp_count: '', 
  next_event_time: '', 
  next_event_utc_offset: '', 
  category_id: '',
  category_name: '',
  category_shortname: '',
  category_sort_name: ''
};

// /2/categories
var techCategoryId = 34;
// /find/topic_categories
var techTopicCategoryId = 292;
// /find/topics

var topics = [
  //'web development',
  //'javascript',
  //'rust',
  //'css',
  //'web design',
  //'security',
  //'privacy',
  //'open source',
  'iot',
  'mobile',
  'kids'
];

var key = process.env.MEETUP_API_KEY, // your meetup api key
    pageSize = 100, // number of records per request (this is max)
    requestInterval = 3000, // microseconds between requests to not be throttled by meetup.com api
    findGroupsURL = 'https://api.meetup.com/find/groups?order=members&category=34&page=' + pageSize + '&radius=global&key=' + key;

(function harvest() {
  var offset = 0,
      topic = topics.shift();

  if (!topic) {
    return;
  }

  console.log('Harvesting topic', topic);

  function handleJSON(data) {
    // convert json to array of csv strings
    var csvArr = convertToCSV(data);

    // remove header row from pages after the first
    if (offset > 0) {
      csvArr.shift();
    }

    // join array into one giant string
    csvString = csvArr.join('\n');

    // save to file
    var filename = topic.replace(' ', '_') + '.csv';
    storeResults(filename, csvString); 

    console.log('Wrote page', offset);
  }

  (function repeater() {
    var url = findGroupsURL
      + '&text=' + encodeURIComponent(topic) 
      + '&offset=' + offset;

    request(url, function(error, response, body) {
      if (error) {
        console.log('ERROR harvesting', url, error);
      }
      else if (response.statusCode == 200) {
        // process and store results
        var data = JSON.parse(body);
        //console.log(data[0])
        handleJSON(data);
        // if we received the same number of results as our page size
        // then there could be more, so increase the offset and repeat.
        // wait 5 seconds to avoid throttling.
        if (data.length == pageSize) {
          offset++;
          setTimeout(repeater, requestInterval);
        }
        // we got less than our page size, so that must be all
        // the records for this topic.
        //
        // start harvesting next topic
        else {
          harvest();
        }
      }
      else {
        console.log(response);
      }
    });
  })();
})();

function byField(arr, name) {
  return arr.map(function(entry) {
    return entry[name];
  });
}

function escapeCSVField(str) {
  return '"' + (str.replace ? str.replace('"', '\"') : str) + '"';
  //return '"' + (str.replace ? str.replace(/[^a-zA-Z0-9 .]/g, '\"') : str) + '"';
}

function convertToCSV(arrayOfObj) {
  var rows = [];

  arrayOfObj.forEach(function(obj) {
    var row = Object.assign({}, recordDefinition);
    Object.keys(obj).forEach(function(k) {
      if (typeof(obj[k]) == 'object') {
        Object.keys(obj[k]).forEach(function(subk) {
          var testKey = k + '_' + subk;
          if (recordDefinition.hasOwnProperty(testKey)) {
            row[testKey] = obj[k][subk];
          }
        });
      }
      else if (recordDefinition.hasOwnProperty(k)) {
        row[k] = obj[k];
      }
    });
    
    rows.push(Object.keys(row).map(function(k) { return escapeCSVField(row[k]); }).join(','));
  });

  rows.unshift(Object.keys(recordDefinition).join(','));

  return rows;
}

function storeResults(f, text) {
  fs.appendFile(f, text + '\n', function(err){
    if (err)
      console.error(err);
  });
}
