var Alexa = require('alexa-sdk');
var https = require('https');

var states = {
    RECOMMENDATION: '_RECOMMENDATION'
};


var numberOfResults = 3;

var welcomeMessage = "Welcome to Similar Scavenger. I can tell you similar movie, songs or books recommendations. What will it be?";

var welcomeRepromt = "You can ask me for recommendations based on the items you like. What will it be?";

var HelpMessage = "Here are some things you can say: recommend me, suggest me. What would you like to do?";

var tryAgainMessage = "please try again."

var goodbyeMessage = "OK, have a nice time.";

var recommendations = "These are the " + numberOfResults + " similar items based on the items and preferences you provided. ";

var newline = "\n";

var output = "";

var alexa;

var apiKey = process.env.TASTEDIVE_KEY;

var newSessionHandlers = {
    'LaunchRequest': function () {
        this.handler.state = states.RECOMMENDATION;
        output = welcomeMessage;
        this.emit(':ask', output, welcomeRepromt);
    },
    'getRecommendations': function () {
        this.handler.state = states.RECOMMENDATION;
        this.emitWithState('getRecommendations');
    },
    'getType': function () {
        this.handler.state = states.RECOMMENDATION;
        this.emitWithState('getType');
    },
    'getInfoForRecommendations': function () {
        this.handler.state = states.RECOMMENDATION;
        this.emitWithState('getInfoForRecommendations');
    },
    'finishRecommendationsIntent': function () {
        this.handler.state = states.RECOMMENDATION;
        this.emitWithState('finishRecommendations');
    },
    'AMAZON.StopIntent': function () {
        this.emit(':tell', goodbyeMessage);
    },
    'AMAZON.CancelIntent': function () {
        // Use this function to clear up and save any data needed between sessions
        this.emit(":tell", goodbyeMessage);
    },
    'SessionEndedRequest': function () {
        // Use this function to clear up and save any data needed between sessions
        this.emit('AMAZON.StopIntent');
    },
    'Unhandled': function () {
        output = HelpMessage;
        this.emit(':ask', output, welcomeRepromt);
    },
};

var recommendationsHandler = Alexa.CreateStateHandler(states.RECOMMENDATION, {

    'getRecommendations': function () {
        output = 'Ok, I will start collecting your preferred items. To stop at any point, you can say,' +
        ' that\'s it or stop. Now, please tell me which items you like?';
        this.attributes.recommendationsStarted = true;
        this.emit(':ask', output, tryAgainMessage);
    },
    'finishRecommendationsIntent': function () {
        if (this.attributes.fromItems) {
            this.attributes.fromItems = false;
            this.emit(':ask', "Will you want to add a recommendation type? Recommendation types should be one among music, movies, shows, books, authors or games. If yes, say the type, otherwise say no");
        } else {
            this.emitWithState('finishRecommendations');
        }
    },
   'getType': function () {
        console.log("Reached type handler");
        var slotValue = '';
        if(this.event.request.intent.slots.type) {
            if (this.event.request.intent.slots.type) {
                slotValue = this.event.request.intent.slots.type.value;
                this.attributes.type = slotValue;
            }
            this.handler.state = states.RECOMMENDATION;
            this.emitWithState('finishRecommendations');
        } else {
            this.emit(':tell', tryAgainMessage);
        }
    },
    'finishRecommendations': function () {
        console.log('Reached finish');
        var items = this.attributes.items ? this.attributes.items.join(', ') : '';
        var type = this.attributes.type;
        var that = this;

        if (items.length === 0) {
            if (this.attributes.recommendationsStarted) {
                this.attributes.recommendationsStarted = false;
                this.emit(":tell", "No items were provided, so not recommending anything. Have a nice time");
            } else {
                this.emit(":tell", goodbyeMessage);
            }
            return;
        }
        httpGet(items, type, function (response) {
            console.log(response);
            items = items.split(',');
            if (items.length == 0) {
                alexa.emit(":tell", "No items");
                return;
            }

            var finalIngredients = items[0];
            var i = 1;
            for(i = 1; i < items.length - 1; i++) {
                finalIngredients += items[i] + ", ";
            }

            if (items.length >= 2) {
                finalIngredients += " and " + items[i];
            }

            var output = 'Ok. Let me see what I can get. ';

            // Parse the response into a JSON object ready to be formatted.
            var responseData = JSON.parse(response);
            var cardContent = "Here are recommendations for you\n\n";

            // Check if we have correct data, If not create an error speech out to try again.
            if (responseData == null) {
                output = "There was a problem with getting data please try again";
            } else if (responseData.Similar.Results.length == 0) {
                output = "Sorry I couldn't find any results";
            }
            else {
                if (numberOfResults > responseData.Similar.Results.length) {
                    numberOfResults = responseData.Similar.Results.length;
                }

                output += recommendations;
                // If we have data.
                for (var i = 0; i < responseData.Similar.Results.length; i++) {

                    if (i < numberOfResults) {
                        // Get the name and description JSON structure.
                        var headline = responseData.Similar.Results[i].Name;
                        var index = i + 1;

                        output += " Recommendation " + index + ": " + headline.replace("\n", "").trim() + ". ";

                        cardContent += " Recommendation " + index + ".\n";
                        cardContent += headline + ".\n\n";
                    }
                }
            }

            output = output.replace(/\r?\n|\r/g, " ").trim();
            output = output.replace("&", "and").trim();
            var cardTitle =  "Recipes";
            console.log(that.event.request.intent.name + output);
            that.attributes.recommendationsStarted = false;
            alexa.emit(':tell', output);
        });
    },
    'getInfoForRecommendations': function () {
        if(this.event.request.intent.slots.item) {
            if (this.event.request.intent.slots.item.value) {
                var slotValue = this.event.request.intent.slots.item.value;
                this.attributes.items = this.attributes.items || [];
                this.attributes.items.push(slotValue);
            }
            this.attributes.fromItems = true;
            this.emit(':ask', 'Do you have any more? If you say no, we will select recommendation type next.', tryAgainMessage);
        } else {
            this.emit(':tell', tryAgainMessage);
        }

    },
    'AMAZON.StopIntent': function () {
        this.emit(':tell', goodbyeMessage);
    },
    'AMAZON.HelpIntent': function () {
        output = HelpMessage;
        this.emit(':ask', output, HelpMessage);
    },

    'AMAZON.CancelIntent': function () {
        // Use this function to clear up and save any data needed between sessions
        this.emit(":tell", goodbyeMessage);
    },
    'Unhandled': function () {
        output = HelpMessage;
        this.emit(':ask', output, welcomeRepromt);
    }

});

exports.handler = function (event, context, callback) {
    alexa = Alexa.handler(event, context);
    alexa.registerHandlers(newSessionHandlers, recommendationsHandler);
    alexa.execute();
};

// Create a web request and handle the response.
function httpGet(param1, param2, callback) {
    var path = '/api/similar?q=' + encodeURIComponent(param1);
    if (param2 && param2.length) {
        path += '&type=' + param2;
    }

    path += '&k=' + apiKey;
    console.log(path);
    var options = {
        host: 'tastedive.com',
        port: 443,
        path: path,
        method: 'GET'
    };

    var req = https.request(options, (res) => {

        var body = '';

        res.on('data', (d) => {
            body += d;
        });

        res.on('end', function () {
            callback(body);
        });

    });
    req.end();

    req.on('error', (e) => {
        console.error(e);
    });
}
