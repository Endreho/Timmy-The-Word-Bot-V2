const fs = require('fs');
const https = require('https');
const parseString = require('xml2js').parseString;
const Discord = require('discord.js');

const globalSettings = require('./globalSettings.json');
const prompts = require('./prompts.json');
const Pillow = require ('./Pillow.json');
const userDb = require('./users/users.json');
const serverSettings = require('./serverSettings.json');
const isUserAdmin = require('./src/isUserAdmin');

// Merge all languages
let lang = {};
let commands = {};
lang.english = require('./languages/english.json');
commands.english = require('./languages/commands/english.json');
lang.french = require('./languages/french.json');
commands.french = require('./languages/commands/french.json');

var minuteLength = 60;
if (globalSettings.debug) {
    minuteLength = 1;
}

const client = new Discord.Client();

const nanoWords = [1667, 3333, 5000, 6667, 8333, 10000, 11667, 13333, 15000, 16667, 18333, 20000, 21667, 23333, 25000, 26667, 28333, 30000, 31667, 33333, 35000, 36667, 38333, 40000, 41667, 43333, 45000, 46667, 48333, 50000];

String.prototype.replaceAll = function (search, replacement) {
    var target = this;
    return target.replace(new RegExp(search, 'g'), replacement);
};

const EventEmitter = require('events');

class MyEmitter extends EventEmitter {}

const myEmitter = new MyEmitter();
// increase the limit
myEmitter.setMaxListeners(11);

for(let i = 0; i < 11; i++) {
  myEmitter.on('event', _ => console.log(i));
}

myEmitter.emit('event');

client.on('ready', () => {
    console.log(lang.english.consoleLanguage);
});

var sprint = {};

// function to log a message in the console
function logMessage(msg, author, server) {
    var currentTime = new Date();
    var currentHour = currentTime.getHours();
    var currentMinutes = currentTime.getMinutes();
    var currentSeconds = currentTime.getSeconds();
    var currentDay = currentTime.getDate();
    var currentMonth = currentTime.getMonth() + 1;
    var currentYear = currentTime.getFullYear();
    if (currentDay < 10) {
        currentDay = "0" + currentDay;
    }
    if (currentMonth < 10) {
        currentMonth = "0" + currentMonth;
    }
    if (currentMinutes < 10) {
        currentMinutes = "0" + currentMinutes;
    }
    if (currentSeconds < 10) {
        currentSeconds = "0" + currentSeconds;
    }
    var timeNow = currentYear + "/" + currentMonth + "/" + currentDay + " : " + currentHour + ":" + currentMinutes + ":" + currentSeconds;
    console.log("[" + timeNow + "] " + "[" + server + "] " + author + " " + msg);
}

function addUserToDb(id, user, house) {
    let newUser = {
        "id": id,
        "NaNoUser": user,
        "house": house
    }
    userDb[id] = newUser;
    var pushDb = JSON.stringify(userDb);
    try {
        fs.writeFile('users/users.json', pushDb)
    }
    catch (e) {
        console.log("An error occurred while trying to save the user in the JSON:");
        console.log(e);
    }
}

function getNaNoWordcount(user) {
    return new Promise(function (resolve, reject) {
        urlToCall = "https://nanowrimo.org/wordcount_api/wc/" + user
        let req = https.request(urlToCall, res => {
            if (globalSettings.debug) {
                console.log('statusCode:', res.statusCode);
            }
            res.on('data', (d) => {
                parseString(d, function (err, result) {
                    if (result.wc.user_wordcount !== null) {
                        resolve(result.wc.user_wordcount);
                    } else if (result.wc.error == "user does not exist") {
                        resolve("userNoExist");
                    } else if (result.wc.error == "user does not have a current novel") {
                        resolve("userNoNovel");
                    }
                })
            });
        });
        req.on('error', (e) => {
            console.error("Error while fetching the user wordcount :" + e);
            reject("somethingWentWrong");
        });
        req.end();
    });
}
  
    function getNaNoCountryWordcount() {
    return new Promise(function (resolve, reject) {
        urlToCall = "https://nanowrimo.org/wordcount_api/wcregion/ europe-norway"
        let req = https.request(urlToCall, res => {
            if (globalSettings.debug) {
                console.log('statusCode:', res.statusCode);
     }
            res.on('data', (d) => {
                parseString(d, function (err, result) {
                    if (result.wcregion.region_wordcount != null) {
                        resolve(result.wc.user_wordcount);
                    }
                })
            });
        });
        req.on('error', (e) => {
            console.error("Error while fetching the user wordcount :" + e);
            reject("somethingWentWrong");
        });
        req.end();
    });
}
                    
client.on('message', message => {
    

     function sprintEnded() {
        message.channel.send(lang[messageLanguage].sprintEnd);
        sprint[guildprop.id].isSprintStarted = !sprint[guildprop.id].isSprintStarted;
        logMessage("Sprint finished", "", guildprop.name);
    }

    function sendRemainingSprintTime(x, min) {
        var minutesRemainingInTotal = min - ((x - 1) * 5) // A bit of math to calculate the right amount of time left
        setTimeout(function () {
            message.channel.send(lang[messageLanguage].remainingSprintTime + minutesRemainingInTotal + lang[messageLanguage].remainingSprintTime2);
        }, x * 5000 * minuteLength); // 5000 for seconds (testing purposes), 300000 for minutes
    }

    function startSprintDelay(length) {
        logMessage("asked for a " + length + " minute sprint", message.author.username, guildprop.name);
        message.channel.send(lang[messageLanguage].startSprintDelay + sprintTimeDemanded + lang[messageLanguage].startSprintDelay2);
        sprint[guildprop.id].isSprintStarted = !sprint[guildprop.id].isSprintStarted;
        setTimeout(function () {
            startSprint(length)
        }, 60000);
    }

    function startSprint(length) {
        message.channel.send(lang[messageLanguage].startSprint + sprintTimeDemanded + lang[messageLanguage].startSprint2);
        setTimeout(sprintEnded, length * 1000 * minuteLength) // 60000 is for minutes, 1000 is for seconds (testing purposes)
        var minutesLeftToSprint = sprintTimeDemanded - 5;
        for (var x = 1, ln = length / 5; x < ln; x++ , minutesLeftToSprint - 5) {
            sendRemainingSprintTime(x, minutesLeftToSprint);
        }
    }
    
    let guildprop = {};

    if (message.guild) {
        guildprop = {
            "id": message.guild.id,
            "name": message.guild.name
        }
    } else {
        if (message.channel.recipient) {
            // When the message is a DM
            guildprop = {
                "id": message.channel.id,
                "name": message.channel.recipient.username
            }
        } else {
            if (message.channel.name != null) {
                // When the message is a group DM and a name was set for this group
                guildprop = {
                    "id": message.channel.id,
                    "name": message.channel.name
                }
            } else {
                // When the message is a group DM, but no name was set for this group
                let dmNames = message.channel.recipients.nicks.array();
                guildprop = {
                    "id": message.channel.id,
                    "name": dmNames
                }
            }
        }
    }

    let messageLanguage = '';
    if (serverSettings[guildprop.id]) {
        messageLanguage = serverSettings[guildprop.id].language;
    } else {
        messageLanguage = 'english';
    }

    if (!sprint[guildprop.id]) {
        sprint[guildprop.id] = { "isSprintStarted": false };
    }

    // Register users
    if (message.content.toLowerCase().replaceAll(" ", "").startsWith(commands[messageLanguage].mynameis)) {
        let id = message.author.id;
        let usermsg = message.content.replaceAll(" ", "");
        let properUser = usermsg.substring(commands[messageLanguage].mynameis.length);
        let user = properUser.toLowerCase().replaceAll(" ", "-");
        let house = "none";
        console.log("That person's name is " + user);
        try {
            addUserToDb(id, user, house);
            console.log("user added successfully");
            message.channel.send(lang[messageLanguage].userAdded + properUser + " :)");
        }
        catch (e) {
            console.log("Could not add user.");
            message.channel.send(lang[messageLanguage].somethingWentWrong);
        }
    }

    // Give users their own current words
    if (message.content.toLowerCase().replaceAll(" ", "") == commands[messageLanguage].mywords) {
        id = message.author.id;
        try {
            username = userDb[id].NaNoUser;
            getNaNoWordcount(username).then(e => {
                if (e == "0") {
                    message.channel.send(lang[messageLanguage].noWordsYet);
                    logMessage("looked up their own words", message.author.username, guildprop.name);
                } else if (e == "userNoExist") {
                    message.channel.send(lang[messageLanguage].userNotFound);
                    logMessage("tried to look up their own words, but their username is wrong", message.author.username, guildprop.name);
                } else if (e == "userNoNovel") {
                    message.channel.send(lang[messageLanguage].userNotStarted);
                    logMessage("tried to look up their own words, but they haven't started yet", message.author.username, guildprop.name);
                } else {
                    message.channel.send(lang[messageLanguage].userWordcount + e);
                    logMessage("looked up their own words", message.author.username, guildprop.name);
                }
            }).catch(function () {
                console.log("Promise Rejected");
                message.channel.send(lang[messageLanguage].somethingWentWrong);
            })
        }
        catch (e) {
            message.channel.send(lang[messageLanguage].usernameInvalid);
        }
    }
    
     // Sprints
    if (message.content.startsWith(commands[messageLanguage].sprint)) {
        if (message.channel.id === 361905888086458368 || 512549392327376904) {
            var sprintTimeDemanded = message.content.substring(commands[messageLanguage].sprint.length + 1);
            if (sprintTimeDemanded % 1 == 0) {
                if (sprintTimeDemanded > 600) {
                    message.channel.send(lang[messageLanguage].sprintTooLong);
                } else {
                    startSprintDelay(sprintTimeDemanded);
                }
            } else {
                message.channel.send(lang[messageLanguage].sprintIntervalLength)
                
                }
        } else{
            message.channel.send("You're in the wrong channel, the war zone is in <#361905888086458368>.");
        }
    }
    
   if (message.content == "!Norway" || message.content == "!norway") {
       if (message.channel.id === '502047721524428801') {
        message.channel.send("Hi!");
       }else{
           message.channel.send("You're in the wrong channel, go to <#502047721524428801>");
       }
        
    }
    // bykrig
    if (message.content.startsWith("!bykrig")) {
        message.channel.send(lang[messageLanguage].byKrig);
    }
    // Get wordcount during NaNoWriMo
    if (message.content == commands[messageLanguage].wordcount) {
        let today = new Date();
        let dd = today.getDate();
        let mm = today.getMonth() + 1;
        if (mm < 11) {
            message.channel.send(lang[messageLanguage].NanoNotStartedYet);
        } else if (mm > 11) {
            message.channel.send(lang[messageLanguage].NanoOver);
        } else {
            let todayWords = nanoWords[dd - 1]
            message.channel.send(lang[messageLanguage].todayWordcount + todayWords + ".");
        }
    }
    // Who da best?
    if (message.content.toLowerCase() == 'who da best?') {
        let whoDaBestRand = Math.floor(Math.random() * 100)

        if (whoDaBestRand == 1) {
            message.channel.send("Omlahid is da best!");
        } else if (whoDaBestRand == 2) {
            message.channel.send("I am. I am the best.");
        } else {
            message.reply(lang[messageLanguage].whoDaBest)
        }
    }

    // Cheer! :cheer:
    if (message.content == commands[messageLanguage].cheer) {
        message.channel.send(lang[messageLanguage].cheeringMessage);
    }

    // Prompts
    if (message.content == commands[messageLanguage].prompt) {
        var themes = prompts.writingPrompts;
        var randomNumberRaw = Math.floor(Math.random() * (themes.length) - 1);
        var thisPrompt = themes[randomNumberRaw];
        message.channel.send(lang[messageLanguage].showPrompt + thisPrompt);
        logMessage("received prompt number " + randomNumberRaw, message.author.username, guildprop.name)
    }
    
    // client is an instance of Discord.Client
client.on("message", (message) => {
if(message.content == "!ping"){ // Check if content of message is "!ping"
		message.channel.send("pong!"); // Call .send() on the channel object the message was sent in
	}
});
    
    //propaganda
    if (message.content == "!propaganda"){
        if (message.channel.id == '510533490278662144') {
        message.channel.send(lang[messageLanguage].propaganda_1);
    }
     if (message.channel.id == '510533548369772569') {
         message.channel.send(lang[messageLanguage].propaganda_2);
         client.channels.get("510533373400186883").send(lang[messageLanguage].propaganda_2);
         client.channels.get("510533490278662144").send(lang[messageLanguage].propaganda_2);
    }
        }
    if (message.content == "!propaganda"){
     if (message.channel.id == '510533373400186883') {
         message.channel.send(lang[messageLanguage].propaganda_3);
         return
         
    }
    }
         // Foof
    if (message.content == commands[messageLanguage].foof) {
        var themes = Pillow.Pillowmessage;
        var randomNumberRaw = Math.floor(Math.random() * (themes.length) - 1);
        var thisPrompt = themes[randomNumberRaw];
         setTimeout(function(){
        message.channel.send ("**Timmy** grabs a " + lang[messageLanguage].foof + thisPrompt + " pillow, and throws it at " + message.author + ", hitting them squarely in the back of the head.");
        }, 5000);
        setTimeout(function(){
           message.channel.send ("**Timmy** surreptitiously works his way over to the couch, looking ever so casual...");
       }, 1500);
        message.channel.send ("Righto... ");
        logMessage("received pillow number " + randomNumberRaw, message.author.username, guildprop.name)
    }

    // !help
    if (message.content == commands[messageLanguage].help || message.content == "!help") {
        message.channel.send(lang[messageLanguage].helpMessage);
    }
    
    // Pokemon
    if (message.content.includes("Owner")) {
        logMessage(" mentioned pokemon", message.mentions.users, guildprop.name);
    }
    
    if (message.content == ("!crawl")) {
    message.channel.send("https://docs.google.com/spreadsheets/d/1onB9OT1gYRzhmeT7ZkKPfDBBXLBSlfVONkA9iex4064/edit#gid=1780993111");
        logMessage("did the Creepy Crawling!", message.author.username, guildprop.name);
    }
    
    if (message.content == ("!starwar")) {
    message.channel.send("A long time ago, in a novel far far away...");
        logMessage("shot first!", message.author.username, guildprop.name);
    }
    // Woot
    if (message.content == ("!woot")) {
    message.channel.send("cheers! Hooray!");
        logMessage("Woots", message.author.username, guildprop.name);
    } 

    
    //Roll Dice
    if (message.content == ("!d1")) {
      var randomDiceRaw = Math.floor(Math.random() * 1) + 1;
        message.channel.send("You got " + randomDiceRaw);
        
    }
    if (message.content == ("!d2")) {
      var randomDiceRaw = Math.floor(Math.random() * 2) + 1;
        message.channel.send("You got " + randomDiceRaw);
        
    }
    if (message.content == ("!d3")) {
      var randomDiceRaw = Math.floor(Math.random() * 3) + 1;
        message.channel.send("You got " + randomDiceRaw);
        
    }
    if (message.content == ("!d4")) {
      var randomDiceRaw = Math.floor(Math.random() * 4) + 1;
        message.channel.send("You got " + randomDiceRaw);
        
    }
    if (message.content == ("!d5")) {
      var randomDiceRaw = Math.floor(Math.random() * 5) + 1;
        message.channel.send("You got " + randomDiceRaw);
        
    }
    if (message.content == ("!d6")) {
      var randomDiceRaw = Math.floor(Math.random() * 6) + 1;
        message.channel.send("You got " + randomDiceRaw);
        
    } 
    if (message.content == ("!d7")) {
      var randomDiceRaw = Math.floor(Math.random() * 7) + 1;
        message.channel.send("You got " + randomDiceRaw);
        
    }
    if (message.content == ("!d8")) {
      var randomDiceRaw = Math.floor(Math.random() * 8) + 1;
        message.channel.send("You got " + randomDiceRaw);
        
    }
    if (message.content == ("!d9")) {
      var randomDiceRaw = Math.floor(Math.random() * 9) + 1;
        message.channel.send("You got " + randomDiceRaw);
        
    }
    if (message.content == ("!d10")) {
      var randomDiceRaw = Math.floor(Math.random() * 10) + 1;
        message.channel.send("You got " + randomDiceRaw);
        
    }
    if (message.content == ("!d11")) {
      var randomDiceRaw = Math.floor(Math.random() * 11) + 1;
        message.channel.send("You got " + randomDiceRaw);
        
    }
    if (message.content == ("!d12")) {
      var randomDiceRaw = Math.floor(Math.random() * 12) + 1;
        message.channel.send("You got " + randomDiceRaw);
        
    }
    if (message.content == ("!d13")) {
      var randomDiceRaw = Math.floor(Math.random() * 13) + 1;
        message.channel.send("You got " + randomDiceRaw);
        
    }
    if (message.content == ("!d14")) {
      var randomDiceRaw = Math.floor(Math.random() * 14) + 1;
        message.channel.send("You got " + randomDiceRaw);
        
    }
    if (message.content == ("!d15")) {
      var randomDiceRaw = Math.floor(Math.random() * 15) + 1;
        message.channel.send("You got " + randomDiceRaw);
        
    }
    if (message.content == ("!d16")) {
      var randomDiceRaw = Math.floor(Math.random() * 16) + 1;
        message.channel.send("You got " + randomDiceRaw);
        
    }
    if (message.content == ("!d17")) {
      var randomDiceRaw = Math.floor(Math.random() * 17) + 1;
        message.channel.send("You got " + randomDiceRaw);
        
    }
    if (message.content == ("!d18")) {
      var randomDiceRaw = Math.floor(Math.random() * 18) + 1;
        message.channel.send("You got " + randomDiceRaw);
        
    }
    if (message.content == ("!d19")) {
      var randomDiceRaw = Math.floor(Math.random() * 19) + 1;
        message.channel.send("You got " + randomDiceRaw);
        
    }
    if (message.content == ("!d20")) {
      var randomDiceRaw = Math.floor(Math.random() * 20) + 1;
        message.channel.send("You got " + randomDiceRaw);
        
    }
    if (message.content == ("!d21")) {
      var randomDiceRaw = Math.floor(Math.random() * 21) + 1;
        message.channel.send("You got " + randomDiceRaw);
        
    }
    if (message.content == ("!d22")) {
      var randomDiceRaw = Math.floor(Math.random() * 22) + 1;
        message.channel.send("You got " + randomDiceRaw);
        
    }
    if (message.content == ("!d23")) {
      var randomDiceRaw = Math.floor(Math.random() * 23) + 1;
        message.channel.send("You got " + randomDiceRaw);
        
    }
    if (message.content == ("!d24")) {
      var randomDiceRaw = Math.floor(Math.random() * 24) + 1;
        message.channel.send("You got " + randomDiceRaw);
        
    }
    if (message.content == ("!d25")) {
      var randomDiceRaw = Math.floor(Math.random() * 25) + 1;
        message.channel.send("You got " + randomDiceRaw);
        
    }
    if (message.content == ("!d26")) {
      var randomDiceRaw = Math.floor(Math.random() * 26) + 1;
        message.channel.send("You got " + randomDiceRaw);
        
    } 
    if (message.content == ("!d27")) {
      var randomDiceRaw = Math.floor(Math.random() * 27) + 1;
        message.channel.send("You got " + randomDiceRaw);
        
    }
    if (message.content == ("!d28")) {
      var randomDiceRaw = Math.floor(Math.random() * 28) + 1;
        message.channel.send("You got " + randomDiceRaw);
        
    }
    if (message.content == ("!d29")) {
      var randomDiceRaw = Math.floor(Math.random() * 29) + 1;
        message.channel.send("You got " + randomDiceRaw);
        
    }
    if (message.content == ("!d30")) {
      var randomDiceRaw = Math.floor(Math.random() * 30) + 1;
        message.channel.send("You got " + randomDiceRaw);
        
    }
        // Glow Cloud
    if (message.content.includes("glow cloud")) {
        message.channel.send("All Hail the Glow Cloud");
        logMessage("All Hail the Glow Cloud", "", guildprop.name);
    }
    //delete messages
    if (message.content == ("!delete")) {
message.channel.fetchMessages({ 
	limit: 10 // Fetch last 10 messages.
}).then((msgCollection) => { // Resolve promise
	msgCollection.forEach((msg) => { // forEach on message collection
		msg.delete(); // Delete each message
	})
});
    }
    
    // Give users someone else's wordcount
    if (message.content.toLowerCase().startsWith(commands[messageLanguage].words)) {
        if (message.content.includes("<@")) {
            const saneMessage = message.content.replaceAll("!", "");
            const id = saneMessage.substring(saneMessage.indexOf("@") + 1, saneMessage.indexOf(">"));
            try {
                const username = userDb[id].NaNoUser;
                getNaNoWordcount(username).then(e => {
                    if (e == "0") {
                        message.channel.send(username + lang[messageLanguage].noWordsYetOtherUser);
                        logMessage("looked up their own words", message.author.username, guildprop.name);
                    } else if (e == "userNoExist") {
                        message.channel.send(lang[messageLanguage].userNotFound);
                        logMessage("tried to look up " + username + ", but their username is wrong", message.author.username, guildprop.name);
                    } else if (e == "userNoNovel") {
                        message.channel.send(username + lang[messageLanguage].otherUserNotStarted);
                        logMessage("tried to look up " + username + ", but they haven't started yet", message.author.username, guildprop.name);
                    } else {
                        message.channel.send(username + lang[messageLanguage].otherUserWordcount + e);
                        logMessage("looked up the words of " + username, message.author.username, guildprop.name);
                    }
                }).catch(function () {
                    console.log("Promise Rejected");
                    message.channel.send(lang[messageLanguage].somethingWentWrong);
                })
            }
            catch (e) {
                message.channel.send(lang[messageLanguage].usernameInvalid);
            }
        } else {
            let properUser = message.content.substring(commands[messageLanguage].words.length + 1);
            let username = properUser.toLowerCase().replaceAll(" ", "-");
            getNaNoWordcount(username).then(e => {
                if (e == "0") {
                    message.channel.send(properUser + lang[messageLanguage].noWordsYetOtherUser);
                    logMessage("looked up their own words", message.author.username, guildprop.name);
                } else if (e == "userNoExist") {
                    message.channel.send(lang[messageLanguage].userNotFound);
                    logMessage("tried to look up " + properUser + ", but their username is wrong", message.author.username, guildprop.name);
                } else if (e == "userNoNovel") {
                    message.channel.send(properUser + lang[messageLanguage].otherUserNotStarted);
                    logMessage("tried to look up " + properUser + ", but they haven't started yet", message.author.username, guildprop.name);
                } else {
                    message.channel.send(properUser + lang[messageLanguage].otherUserWordcount + e);
                    logMessage("looked up the words of " + properUser, message.author.username, guildprop.name);
                }
            }).catch(function () {
                console.log("Promise Rejected");
                message.channel.send(lang[messageLanguage].somethingWentWrong);
            })
        }
    }

    if (message.content.startsWith("!language") && isUserAdmin(message.member)) {
        let id = guildprop.id;
        let enteredCommand = message.content.split(" ");
        let newServerLanguage = enteredCommand[1].toLowerCase();

        if (serverSettings[id]) {
            if (lang[newServerLanguage]) {
                serverSettings[id].language = newServerLanguage;
                try {
                    fs.writeFile('serverSettings.json', JSON.stringify(serverSettings));
                }
                catch (e) {
                    logMessage("An error occured while trying to save the server settings.", "", guildprop.name)
                    console.log(e);
                }

                message.channel.send("The language for this server was changed to " + newServerLanguage);
            } else {
                message.channel.send('This language is invalid. The available languages are: English and French.');
            }
        } else {
            let newServerSettings = {
                "language": newServerLanguage,
                "approvedAdmins": []
            }
            serverSettings[id] = newServerSettings;
            let pushSettings = JSON.stringify(serverSettings);
            try {
                fs.writeFile('serverSettings.json', pushSettings);
            }
            catch (e) {
                console.log("An error occured while trying to save the server settings.");
                console.log(e);
            }

            message.channel.send("The language for this server was changed to " + newServerLanguage + ".");
        }
    }
});

client.on("error", () => {
    console.log("An unexpected error occurred on Discord's end. The bot will continue to run as expected.");
});

// Client token, required for the bot to work
try {
    client.login(globalSettings.token);
}
catch (e) {
    console.log("ERROR: No account was linked to your bot. Please provide a valid authentication token. You can change it in the globalSettings.json file.")
}
